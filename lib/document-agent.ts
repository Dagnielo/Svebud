import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

type PdfParseResult = { text: string; numpages: number }
type MammothResult = { value: string }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type DokumentResultat = {
  text: string
  metod: 'pdf-parse' | 'mammoth' | 'xlsx' | 'manuell'
  antalSidor?: number
  fel?: string
}

export async function läsInDokument(
  filBuffer: Buffer,
  filnamn: string,
  filtyp: string
): Promise<DokumentResultat> {
  const ext = filnamn.split('.').pop()?.toLowerCase()

  if (filtyp === 'application/pdf' || ext === 'pdf') {
    return await läsPdf(filBuffer)
  }

  if (
    filtyp === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return await läsDocx(filBuffer)
  }

  if (
    filtyp === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    ext === 'xlsx'
  ) {
    return await läsXlsx(filBuffer)
  }

  if (filtyp === 'application/msword' || ext === 'doc') {
    return {
      text: '',
      metod: 'manuell',
      fel: 'Gamla .doc-filer stöds inte. Konvertera till .docx i Word innan uppladdning.',
    }
  }

  return {
    text: '',
    metod: 'manuell',
    fel: `Filtypen ${filtyp} stöds inte. Använd PDF, DOCX eller XLSX.`,
  }
}

async function läsPdf(buffer: Buffer): Promise<DokumentResultat> {
  try {
    // Importera lib direkt för att undvika pdf-parse:s inbyggda testfils-körning
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<PdfParseResult>
    const data = await pdfParse(buffer)
    const text = data.text?.trim()

    if (!text || text.length < 20) {
      return {
        text: '',
        metod: 'pdf-parse',
        antalSidor: data.numpages,
        fel: 'PDF:en verkar vara inskannad (bildfil). Texten kunde inte läsas. Använd manuell inmatning.',
      }
    }

    return { text, metod: 'pdf-parse', antalSidor: data.numpages }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    if (message.includes('password') || message.includes('encrypted')) {
      return {
        text: '',
        metod: 'pdf-parse',
        fel: 'PDF:en är lösenordsskyddad och kan inte läsas.',
      }
    }
    return { text: '', metod: 'pdf-parse', fel: `Kunde inte läsa PDF: ${message}` }
  }
}

async function läsDocx(buffer: Buffer): Promise<DokumentResultat> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<MammothResult> }
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value?.trim()

    if (!text || text.length < 10) {
      return { text: '', metod: 'mammoth', fel: 'DOCX-filen verkar vara tom.' }
    }

    return { text, metod: 'mammoth' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return { text: '', metod: 'mammoth', fel: `Kunde inte läsa DOCX: ${message}` }
  }
}

async function läsXlsx(buffer: Buffer): Promise<DokumentResultat> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const allText: string[] = []

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      allText.push(`--- ${sheetName} ---\n${csv}`)
    }

    const text = allText.join('\n\n').trim()
    if (!text || text.length < 10) {
      return { text: '', metod: 'xlsx', fel: 'Excel-filen verkar vara tom.' }
    }

    return { text, metod: 'xlsx' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return { text: '', metod: 'xlsx', fel: `Kunde inte läsa XLSX: ${message}` }
  }
}

export async function laddaUppOchLäs(
  projektId: string,
  användareId: string,
  fil: File
): Promise<{ anbudId: string; resultat: DokumentResultat }> {
  const filnamn = fil.name
  const filtyp = fil.type
  const buffer = Buffer.from(await fil.arrayBuffer())
  const safeFilnamn = filnamn.replace(/[^a-z0-9._-]/gi, '_')
  const storagePath = `${användareId}/${projektId}/${Date.now()}_${safeFilnamn}`

  // Ladda upp till Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('anbudsdokument')
    .upload(storagePath, buffer, { contentType: filtyp })

  if (uploadError) {
    throw new Error(`Uppladdning misslyckades: ${uploadError.message}`)
  }

  // Skapa anbud-rad
  const { data: anbud, error: anbudError } = await supabase
    .from('anbud')
    .insert({
      projekt_id: projektId,
      filnamn,
      filtyp,
      filstorlek: buffer.length,
      storage_path: storagePath,
      extraktion_status: 'läser_dokument',
      bearbetning_startad: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (anbudError || !anbud) {
    throw new Error(`Kunde inte skapa anbud: ${anbudError?.message}`)
  }

  // Läs in dokumentet
  const resultat = await läsInDokument(buffer, filnamn, filtyp)

  // Uppdatera anbud med resultat
  await supabase
    .from('anbud')
    .update({
      rå_text: resultat.text,
      extraktion_status: resultat.fel ? 'fel' : 'läst',
      inläsningsmetod: resultat.metod,
      antal_sidor: resultat.antalSidor,
      bearbetning_klar: new Date().toISOString(),
    })
    .eq('id', anbud.id)

  // Trigga samlad FU-extraktion för hela projektet
  if (!resultat.fel && resultat.text.length > 0) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/anbud/extrahera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projektId }),
      })
    } catch {
      // Extraktion triggas separat
    }
  }

  return { anbudId: anbud.id, resultat }
}
