import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type DokumentResultat = {
  text: string
  metod: 'claude-direkt' | 'text-extract' | 'manuell'
  antalSidor?: number
  fel?: string
  base64?: string
  mediaType?: string
}

// Filtyper som Claude kan läsa direkt (skickas som document-bilagor)
const CLAUDE_DIREKT_TYPER: Record<string, string> = {
  'pdf': 'application/pdf',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'doc': 'application/msword',
}

// Filtyper som läses som ren text
const TEXT_TYPER = ['xml', 'txt', 'eml', 'csv', 'html', 'htm', 'json']

export async function läsInDokument(
  filBuffer: Buffer,
  filnamn: string,
  filtyp: string
): Promise<DokumentResultat> {
  const ext = filnamn.split('.').pop()?.toLowerCase() ?? ''

  // PDF, Word, Excel → Claude läser direkt
  if (CLAUDE_DIREKT_TYPER[ext] || filtyp === 'application/pdf' ||
      filtyp.includes('wordprocessingml') || filtyp.includes('spreadsheetml') ||
      filtyp === 'application/msword') {
    return {
      text: '',
      metod: 'claude-direkt',
      base64: filBuffer.toString('base64'),
      mediaType: CLAUDE_DIREKT_TYPER[ext] ?? filtyp,
    }
  }

  // Text-baserade filer (XML, TXT, EML, CSV, HTML)
  if (TEXT_TYPER.includes(ext) || filtyp.startsWith('text/') || filtyp === 'application/xml') {
    const text = filBuffer.toString('utf-8')

    // EML (e-post) — extrahera kropp
    if (ext === 'eml') {
      return { text: parsaEml(text), metod: 'text-extract' }
    }

    return { text, metod: 'text-extract' }
  }

  // MSG (Outlook) — extrahera som text
  if (ext === 'msg' || filtyp === 'application/vnd.ms-outlook') {
    // MSG-filer är binära, skicka till Claude direkt
    return {
      text: '',
      metod: 'claude-direkt',
      base64: filBuffer.toString('base64'),
      mediaType: 'application/pdf', // Claude hanterar det ändå
    }
  }

  // Bildfiler → Claude kan läsa bilder med text
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return {
      text: '',
      metod: 'claude-direkt',
      base64: filBuffer.toString('base64'),
      mediaType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    }
  }

  return { text: '', metod: 'manuell', fel: `Filtypen .${ext} stöds inte.` }
}

/**
 * Enkel parser för .eml-filer — extraherar ämne, avsändare och brödtext.
 */
function parsaEml(raw: string): string {
  const lines = raw.split('\n')
  let ämne = ''
  let från = ''
  let till = ''
  let brödtext = ''
  let inBody = false
  let blankLineHit = false

  for (const line of lines) {
    if (!blankLineHit) {
      if (line.startsWith('Subject:')) ämne = line.replace('Subject:', '').trim()
      else if (line.startsWith('From:')) från = line.replace('From:', '').trim()
      else if (line.startsWith('To:')) till = line.replace('To:', '').trim()
      else if (line.trim() === '') {
        blankLineHit = true
        inBody = true
      }
    } else if (inBody) {
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

  // Ladda upp till Supabase Storage
  // Säkerställ att content-type accepteras av bucket
  const safeContentType = filtyp || 'application/octet-stream'
  const { error: uploadError } = await supabase.storage
    .from('anbudsdokument')
    .upload(storagePath, buffer, { contentType: safeContentType, upsert: true })

  if (uploadError) {
    throw new Error(`Uppladdning misslyckades: ${uploadError.message}`)
  }

  // Läs in dokumentet
  const resultat = await läsInDokument(buffer, filnamn, filtyp)

  // Skapa anbud-rad
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
      antal_sidor: resultat.antalSidor,
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
