import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type DokumentResultat = {
  text: string
  metod: 'claude-pdf' | 'mammoth' | 'xlsx' | 'text-extract' | 'manuell'
  antalSidor?: number
  fel?: string
}

export async function läsInDokument(
  filBuffer: Buffer,
  filnamn: string,
  filtyp: string
): Promise<DokumentResultat> {
  const ext = filnamn.split('.').pop()?.toLowerCase() ?? ''

  // PDF → Claude läser direkt (text sparas inte, PDF hämtas vid scanning)
  if (filtyp === 'application/pdf' || ext === 'pdf') {
    return { text: '[PDF — läses direkt av AI vid scanning]', metod: 'claude-pdf' }
  }

  // DOCX → mammoth extraherar text
  if (filtyp.includes('wordprocessingml') || ext === 'docx') {
    return await läsDocx(filBuffer)
  }

  // DOC (gamla Word)
  if (filtyp === 'application/msword' || ext === 'doc') {
    return await läsDocx(filBuffer) // mammoth klarar ibland doc också
  }

  // XLSX → SheetJS
  if (filtyp.includes('spreadsheetml') || ext === 'xlsx') {
    return await läsXlsx(filBuffer)
  }

  // Text-baserade (XML, TXT, EML, CSV, HTML)
  if (['xml', 'txt', 'csv', 'html', 'htm', 'json'].includes(ext) || filtyp.startsWith('text/') || filtyp === 'application/xml') {
    const text = filBuffer.toString('utf-8')
    if (ext === 'eml') return { text: parsaEml(text), metod: 'text-extract' }
    return { text, metod: 'text-extract' }
  }

  // MSG (Outlook)
  if (ext === 'msg') {
    return { text: '[Outlook-mail — ej stödd, spara som .eml istället]', metod: 'manuell', fel: 'Outlook .msg stöds ej. Spara mailet som .eml eller kopiera texten.' }
  }

  // Bilder → Claude läser direkt
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return { text: '[Bild — läses direkt av AI vid scanning]', metod: 'claude-pdf' }
  }

  return { text: '', metod: 'manuell', fel: `Filtypen .${ext} stöds inte.` }
}

async function läsDocx(buffer: Buffer): Promise<DokumentResultat> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> }
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value?.trim()
    if (!text || text.length < 10) return { text: '', metod: 'mammoth', fel: 'Filen verkar vara tom.' }
    return { text, metod: 'mammoth' }
  } catch (err) {
    return { text: '', metod: 'mammoth', fel: `Kunde inte läsa filen: ${err instanceof Error ? err.message : 'Okänt fel'}` }
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
    if (!text || text.length < 10) return { text: '', metod: 'xlsx', fel: 'Filen verkar vara tom.' }
    return { text, metod: 'xlsx' }
  } catch (err) {
    return { text: '', metod: 'xlsx', fel: `Kunde inte läsa filen: ${err instanceof Error ? err.message : 'Okänt fel'}` }
  }
}

function parsaEml(raw: string): string {
  const lines = raw.split('\n')
  let ämne = '', från = '', till = '', brödtext = '', blankLineHit = false
  for (const line of lines) {
    if (!blankLineHit) {
      if (line.startsWith('Subject:')) ämne = line.replace('Subject:', '').trim()
      else if (line.startsWith('From:')) från = line.replace('From:', '').trim()
      else if (line.startsWith('To:')) till = line.replace('To:', '').trim()
      else if (line.trim() === '') blankLineHit = true
    } else {
      brödtext += line + '\n'
    }
  }
  return `MAIL\nFrån: ${från}\nTill: ${till}\nÄmne: ${ämne}\n\n${brödtext.trim()}`
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

  const safeContentType = filtyp || 'application/octet-stream'
  const { error: uploadError } = await supabase.storage
    .from('anbudsdokument')
    .upload(storagePath, buffer, { contentType: safeContentType, upsert: true })

  if (uploadError) {
    throw new Error(`Uppladdning misslyckades: ${uploadError.message}`)
  }

  const resultat = await läsInDokument(buffer, filnamn, filtyp)

  const { data: anbud, error: anbudError } = await supabase
    .from('anbud')
    .insert({
      projekt_id: projektId,
      filnamn,
      filtyp,
      filstorlek: buffer.length,
      storage_path: storagePath,
      rå_text: resultat.text || null,
      extraktion_status: resultat.fel ? 'fel' : 'läst',
      inläsningsmetod: resultat.metod,
      bearbetning_startad: new Date().toISOString(),
      bearbetning_klar: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (anbudError || !anbud) {
    throw new Error(`Kunde inte skapa anbud: ${anbudError?.message}`)
  }

  return { anbudId: anbud.id, resultat }
}
