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
    .not('extraktion_status', 'eq', 'fel')
    .order('skapad', { ascending: true }) as { data: any[] | null }

  if (!anbud || anbud.length === 0) {
    throw new Error('Inga dokument uppladdade i projektet')
  }

  const delar: DokumentDel[] = []

  for (const a of anbud) {
    const ext = (a.filnamn as string).split('.').pop()?.toLowerCase() ?? ''
    const metod = a.inläsningsmetod as string

    if ((metod === 'claude-pdf' || metod === 'claude-direkt') && ext === 'pdf') {
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
    } else if ((metod === 'claude-pdf' || metod === 'claude-direkt') && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
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
    } else if (['docx', 'doc'].includes(ext)) {
      // DOCX — extrahera text med mammoth
      const { data: fileData } = await supabase.storage
        .from('anbudsdokument')
        .download(a.storage_path)

      if (fileData) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> }
          const buffer = Buffer.from(await fileData.arrayBuffer())
          const result = await mammoth.extractRawText({ buffer })
          if (result.value && result.value.length > 10) {
            delar.push({ filnamn: a.filnamn, typ: 'text', text: result.value })
          }
        } catch { /* ignore */ }
      }
    } else if (ext === 'xlsx') {
      // XLSX — extrahera med SheetJS
      const { data: fileData } = await supabase.storage
        .from('anbudsdokument')
        .download(a.storage_path)

      if (fileData) {
        try {
          const XLSX = await import('xlsx')
          const buffer = Buffer.from(await fileData.arrayBuffer())
          const wb = XLSX.read(buffer, { type: 'buffer' })
          const text = wb.SheetNames.map(name => `--- ${name} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`).join('\n\n')
          if (text.length > 10) delar.push({ filnamn: a.filnamn, typ: 'text', text })
        } catch { /* ignore */ }
      }
    } else {
      // Text redan extraherad (XML, TXT, EML, mammoth, xlsx)
      const text = a['rå_text'] as string | null
      if (text && text.length > 10 && !text.startsWith('[')) {
        delar.push({ filnamn: a.filnamn, typ: 'text', text })
      }
    }
  }

  if (delar.length === 0) {
    throw new Error('Inga läsbara dokument hittades')
  }

  // Begränsa total storlek — Claude max 200k tokens (~150k tecken)
  // Prioritera: PDF:er först (viktigast), sen text
  // Om för stora, ta bort de minst viktiga (instruktioner, ESPD etc.)
  const totalBase64 = delar.filter(d => d.base64).reduce((sum, d) => sum + (d.base64?.length ?? 0), 0)
  const MAX_BASE64 = 2_500_000 // ~1.8MB base64 ≈ ~120k tokens, lämnar utrymme för prompt + svar

  if (totalBase64 > MAX_BASE64) {
    // Sortera PDF:er: administrativa föreskrifter och rambeskrivningar först
    const pdfDelar = delar.filter(d => d.typ === 'pdf')
    const textDelar = delar.filter(d => d.typ === 'text')

    // Prioritera dokument med "administrativa", "ram", "krav" i namnet
    const prioriterade = ['administrativ', 'ram', 'krav', 'anbud', 'ordning']
    pdfDelar.sort((a, b) => {
      const aP = prioriterade.some(p => a.filnamn.toLowerCase().includes(p)) ? 0 : 1
      const bP = prioriterade.some(p => b.filnamn.toLowerCase().includes(p)) ? 0 : 1
      return aP - bP
    })

    // Ta med PDF:er tills vi når gränsen
    const inkluderadePdf: DokumentDel[] = []
    let running = 0
    for (const d of pdfDelar) {
      const size = d.base64?.length ?? 0
      if (running + size < MAX_BASE64) {
        inkluderadePdf.push(d)
        running += size
      }
    }

    return [...inkluderadePdf, ...textDelar]
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
