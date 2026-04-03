import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type DokumentDel = {
  filnamn: string
  typ: 'pdf' | 'bild' | 'text'
  base64?: string
  mediaType?: string
  text?: string
}

/**
 * Samlar ALLA dokument i ett projekt.
 * PDF:er hämtas som base64 för direkt Claude-läsning.
 * DOCX/XLSX/XML har redan extraherad text i databasen.
 */
export async function samlaFUDokument(projektId: string): Promise<DokumentDel[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: anbud } = await supabase
    .from('anbud')
    .select('*')
    .eq('projekt_id', projektId)
    .eq('extraktion_status', 'läst')
    .order('skapad', { ascending: true }) as { data: any[] | null }

  if (!anbud || anbud.length === 0) {
    throw new Error('Inga dokument uppladdade i projektet')
  }

  const delar: DokumentDel[] = []

  for (const a of anbud) {
    const ext = (a.filnamn as string).split('.').pop()?.toLowerCase() ?? ''
    const metod = a.inläsningsmetod as string

    if (metod === 'claude-pdf' && ext === 'pdf') {
      // PDF — hämta från storage och skicka direkt till Claude
      const { data: fileData } = await supabase.storage
        .from('anbudsdokument')
        .download(a.storage_path)

      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer())
        delar.push({
          filnamn: a.filnamn,
          typ: 'pdf',
          base64: buffer.toString('base64'),
          mediaType: 'application/pdf',
        })
      }
    } else if (metod === 'claude-pdf' && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      // Bild — hämta och skicka som image
      const { data: fileData } = await supabase.storage
        .from('anbudsdokument')
        .download(a.storage_path)

      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer())
        delar.push({
          filnamn: a.filnamn,
          typ: 'bild',
          base64: buffer.toString('base64'),
          mediaType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        })
      }
    } else {
      // DOCX/XLSX/XML/TXT — text redan extraherad
      const text = a['rå_text'] as string | null
      if (text && text.length > 10 && !text.startsWith('[')) {
        delar.push({ filnamn: a.filnamn, typ: 'text', text })
      }
    }
  }

  if (delar.length === 0) {
    throw new Error('Inga läsbara dokument hittades')
  }

  return delar
}

/**
 * Bygger Claude API content-array med PDF:er som bilagor och text inline.
 */
export function byggClaudeContent(
  delar: DokumentDel[],
  instruktion: string
): Anthropic.MessageCreateParams['messages'][0]['content'] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  for (const del of delar) {
    if (del.typ === 'pdf' && del.base64) {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: del.base64,
        },
      })
      content.push({ type: 'text', text: `[Dokument: ${del.filnamn}]` })
    } else if (del.typ === 'bild' && del.base64 && del.mediaType) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: del.mediaType,
          data: del.base64,
        },
      })
      content.push({ type: 'text', text: `[Bild: ${del.filnamn}]` })
    } else if (del.typ === 'text' && del.text) {
      content.push({
        type: 'text',
        text: `=== DOKUMENT: ${del.filnamn} ===\n\n${del.text}`,
      })
    }
  }

  content.push({ type: 'text', text: instruktion })

  return content
}

/**
 * Bakåtkompatibilitet — sparar samlad text på projektet.
 */
export async function samlaFUText(projektId: string): Promise<string | null> {
  try {
    const delar = await samlaFUDokument(projektId)
    const beskrivning = delar.map(d => `${d.typ === 'pdf' ? '📄' : d.typ === 'bild' ? '🖼️' : '📝'} ${d.filnamn}`).join('\n')

    await supabase
      .from('projekt')
      .update({
        förfrågningsunderlag_text: `${delar.length} dokument:\n${beskrivning}`,
      })
      .eq('id', projektId)

    return beskrivning
  } catch {
    return null
  }
}
