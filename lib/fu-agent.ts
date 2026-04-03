import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type DokumentDel = {
  filnamn: string
  typ: 'pdf' | 'text'
  // För PDF: base64-data
  base64?: string
  // För text (DOCX/XLSX/XML): extraherad text
  text?: string
}

/**
 * Samlar ALLA dokument i ett projekt och bygger en Claude-message
 * med PDF:er som direkta bilagor och textfiler som text.
 */
export async function samlaFUDokument(projektId: string): Promise<{
  delar: DokumentDel[]
  textSamling: string
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: anbud } = await supabase
    .from('anbud')
    .select('*')
    .eq('projekt_id', projektId)
    .order('skapad', { ascending: true }) as { data: any[] | null }

  if (!anbud || anbud.length === 0) {
    throw new Error('Inga dokument uppladdade i projektet')
  }

  const delar: DokumentDel[] = []
  const textDelar: string[] = []

  for (const a of anbud) {
    const ext = (a.filnamn as string).split('.').pop()?.toLowerCase()

    // Hämta filen från Supabase Storage
    const { data: fileData } = await supabase.storage
      .from('anbudsdokument')
      .download(a.storage_path)

    if (!fileData) continue

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64 = buffer.toString('base64')
    const metod = a.inläsningsmetod as string

    if (metod === 'claude-direkt') {
      // PDF, DOCX, XLSX — skickas direkt till Claude
      delar.push({ filnamn: a.filnamn, typ: 'pdf', base64 })
    } else {
      // Text-baserade (XML, EML, TXT, CSV)
      const text = a['rå_text'] as string | null
      if (text && text.length > 10) {
        delar.push({ filnamn: a.filnamn, typ: 'text', text })
        textDelar.push(`=== DOKUMENT: ${a.filnamn} ===\n\n${text}`)
      }
    }
  }

  return {
    delar,
    textSamling: textDelar.join('\n\n---\n\n'),
  }
}

/**
 * Bygger Claude API-meddelande med PDF:er som bilagor och text som content.
 * Claude läser PDF:er direkt — inget behov av pdf-parse.
 */
export function byggClaudeContent(
  delar: DokumentDel[],
  instruktion: string
): Anthropic.MessageCreateParams['messages'][0]['content'] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  // Lägg till alla binära filer (PDF, DOCX, XLSX) som document-blocks
  for (const del of delar) {
    if (del.typ === 'pdf' && del.base64) {
      const ext = del.filnamn.split('.').pop()?.toLowerCase() ?? ''
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)

      if (isImage) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            data: del.base64,
          },
        })
      } else {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: del.base64,
          },
          cache_control: { type: 'ephemeral' },
        })
      }
      content.push({
        type: 'text',
        text: `[Dokument: ${del.filnamn}]`,
      })
    }
  }

  // Lägg till textdokument (DOCX/XLSX/XML)
  for (const del of delar) {
    if (del.typ === 'text' && del.text) {
      content.push({
        type: 'text',
        text: `=== DOKUMENT: ${del.filnamn} ===\n\n${del.text}`,
      })
    }
  }

  // Lägg till instruktion sist
  content.push({
    type: 'text',
    text: instruktion,
  })

  return content
}

/**
 * Sparar samlad text (för bakåtkompatibilitet) på projektet.
 */
export async function samlaFUText(projektId: string): Promise<string | null> {
  const { delar, textSamling } = await samlaFUDokument(projektId)

  // För text-baserade dokument, spara samlingen
  if (textSamling.length > 10) {
    await supabase
      .from('projekt')
      .update({ förfrågningsunderlag_text: textSamling })
      .eq('id', projektId)
    return textSamling
  }

  // Om bara PDF:er, notera att de finns
  if (delar.length > 0) {
    await supabase
      .from('projekt')
      .update({
        förfrågningsunderlag_text: `[${delar.length} dokument uppladdade: ${delar.map(d => d.filnamn).join(', ')}]`,
      })
      .eq('id', projektId)
    return 'PDF-dokument skickas direkt till Claude för analys'
  }

  return null
}
