import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { parseClaudeJSON } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type SnabboffertResultat = {
  // Projektinfo extraherad ur förfrågan
  beställare: string | null
  kontaktperson: string | null
  epost: string | null
  telefon: string | null
  adress: string | null
  uppdragsbeskrivning: string
  // Kategorisering
  kategori: string       // "elcentral" | "laddbox" | "belysning" | "renovation" | "solceller" | "felsökning" | "övrigt"
  kundtyp: string         // "privatperson" | "brf" | "företag" | "fastighetsbolag"
  fastighetstyp: string   // "villa" | "brf" | "lokal" | "flerbostadshus"
  // Scope
  omfattning: string      // "liten" | "medel" | "stor"
  // AI-genererat scope
  föreslagna_moment: FöreslagetMoment[]
  // Summering
  uppskattat_pris_exkl_moms: number
  uppskattat_pris_inkl_moms: number
  tidsuppskattning: string
  sammanfattning: string
  // Extra
  rot_tillämpligt: boolean
  rot_typ: string | null   // "rot" | "gronteknik_laddbox" | "gronteknik_solceller" | "gronteknik_batteri" | null
  frågor_till_kund: string[]  // Saker som behöver klargöras innan offert
}

export type FöreslagetMoment = {
  beskrivning: string
  timmar: number
  timpris: number
  materialkostnad: number
  belopp: number
}

const SYSTEM_PROMPT = `Du är en erfaren elektriker och offertspecialist på en svensk elfirma.

Du har fått en INFORMELL förfrågan — kort mail, telefonanteckning, formulärtext eller liknande.
Det är INTE ett formellt förfrågningsunderlag. Kunden vet kanske inte exakt vad som behövs.

DIN UPPGIFT:
1. Förstå vad kunden vill ha gjort
2. Kategorisera jobbet
3. Föreslå konkreta arbetsmoment med realistiska tidsuppskattningar
4. Ge en prisuppskattning baserat på elfirmans timpriser
5. Identifiera frågor som behöver ställas till kunden

KATEGORIER (välj den som passar bäst):
- "elcentral" — byte/uppgradering av gruppcentral, jordfelsbrytare
- "laddbox" — installation av elbilsladdare
- "belysning" — LED-byte, armaturbyte, närvarostyrning
- "renovation" — badrum/kök/renovering (eldelen)
- "solceller" — solcellsinstallation
- "brandlarm" — brandlarm, nödbelysning, säkerhet
- "stamrenovering" — elstambyte i flerbostadshus
- "felsökning" — akut felsökning, reparation
- "övrigt" — allt annat

PRISSÄTTNING:
- Använd elfirmans timpris (se profil)
- Om timpris saknas: använd 650 kr/tim som default
- Var realistisk med timuppskattningar — elfirmor uppskattar att du inte lovar för lite tid
- Material: uppskatta baserat på vanliga marknadspriser
- Moment bör vara tillräckligt detaljerade för att kunden förstår vad de betalar för

ROT/GRÖN TEKNIK:
- Privatperson + villa/BRF → ROT troligen tillämpligt
- Laddbox → grön teknik (laddbox)
- Solceller → grön teknik (solceller)
- Företag/lokal → ej ROT

FRÅGOR TILL KUND:
Lista 2-5 saker du BEHÖVER veta för att ge en exakt offert, t.ex.:
- "Hur gammal är nuvarande elcentral?"
- "Hur många laddplatser behövs?"
- "Finns det befintlig dragning eller behövs ny?"

TIDSUPPSKATTNING:
Ge i format "X-Y dagar" eller "X timmar"

Returnera ENDAST giltig JSON:
{
  "beställare": string|null,
  "kontaktperson": string|null,
  "epost": string|null,
  "telefon": string|null,
  "adress": string|null,
  "uppdragsbeskrivning": "Sammanfattning av vad kunden vill ha gjort",
  "kategori": "elcentral"|"laddbox"|"belysning"|"renovation"|"solceller"|"brandlarm"|"stamrenovering"|"felsökning"|"övrigt",
  "kundtyp": "privatperson"|"brf"|"företag"|"fastighetsbolag",
  "fastighetstyp": "villa"|"brf"|"lokal"|"flerbostadshus",
  "omfattning": "liten"|"medel"|"stor",
  "föreslagna_moment": [
    { "beskrivning": "...", "timmar": N, "timpris": N, "materialkostnad": N, "belopp": N }
  ],
  "uppskattat_pris_exkl_moms": N,
  "uppskattat_pris_inkl_moms": N,
  "tidsuppskattning": "X-Y dagar",
  "sammanfattning": "2-3 meningar om uppdraget",
  "rot_tillämpligt": boolean,
  "rot_typ": "rot"|"gronteknik_laddbox"|"gronteknik_solceller"|"gronteknik_batteri"|null,
  "frågor_till_kund": ["..."]
}`

export async function genereraSnabboffert(projektId: string): Promise<SnabboffertResultat> {
  const { samlaFUDokument, byggClaudeContent, samlaFUText } = await import('@/lib/fu-agent')

  const delar = await samlaFUDokument(projektId)
  await samlaFUText(projektId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projekt } = await supabase
    .from('projekt')
    .select('*')
    .eq('id', projektId)
    .single() as { data: any }

  if (!projekt) throw new Error('Projekt hittades inte')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profil } = await supabase
    .from('profiler')
    .select('*')
    .eq('id', projekt['användar_id'])
    .single() as { data: any }

  const företagsInfo = profil ? `
ELFIRMANS UPPGIFTER:
Företag: ${profil.företag ?? 'Ej angivet'}
Region: ${profil.region ?? 'Sverige'}
Timpris standard: ${profil.timpris_standard ?? 650} kr/tim
Timpris jour: ${profil.timpris_jour ?? 950} kr/tim
Antal montörer: ${profil.antal_montorer ?? 'Ej angivet'}
Certifikat: ${(profil.certifikat ?? []).map((c: { namn: string }) => c.namn).join(', ') || 'Ej angivna'}
Erfarenhet: ${(profil.erfarenhet ?? []).join(', ') || 'Ej angivna'}` : ''

  const startTid = Date.now()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: firstAnbud } = await supabase
    .from('anbud')
    .select('id')
    .eq('projekt_id', projektId)
    .limit(1)
    .single() as { data: any }

  if (firstAnbud) {
    await supabase.from('extraktion_log').insert({
      anbud_id: firstAnbud.id,
      steg: 'snabboffert',
      status: 'startad',
      meddelande: `Analyserar ${delar.length} dokument för snabboffert`,
    })
  }

  try {
    const messageContent = byggClaudeContent(
      delar,
      `Analysera denna kundförfrågan. Det är en INFORMELL förfrågan (kort mail, telefonnotering, enkel text) — INTE ett formellt förfrågningsunderlag.

${företagsInfo}

Kategorisera jobbet, föreslå konkreta arbetsmoment med priser, och identifiera frågor som behöver ställas till kunden.`
    )

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar')

    const resultat = parseClaudeJSON<SnabboffertResultat>(content.text)
    const varaktighet = Date.now() - startTid
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Spara på projektet — använder samma fält men anpassat
    await supabase
      .from('projekt')
      .update({
        analys_komplett: true,
        jämförelse_status: 'klar',
        jämförelse_resultat: {
          ...resultat,
          analystyp: 'snabb',
        } as unknown as Record<string, unknown>,
        kravmatchning: {
          go_no_go: 'GO',
          sammanfattning: resultat.sammanfattning,
          analystyp: 'snabb',
          kategori: resultat.kategori,
          kundtyp: resultat.kundtyp,
          frågor_till_kund: resultat.frågor_till_kund,
        } as unknown as Record<string, unknown>,
        // Spara dokument-typ info
        dokument_typ: resultat.rot_tillämpligt ? 'offert' : 'anbud',
      })
      .eq('id', projektId)

    // Markera anbud som extraherade
    await supabase
      .from('anbud')
      .update({ extraktion_status: 'extraherad' })
      .eq('projekt_id', projektId)

    if (firstAnbud) {
      await supabase.from('extraktion_log').insert({
        anbud_id: firstAnbud.id,
        steg: 'snabboffert',
        status: 'klar',
        meddelande: `Snabboffert klar — ${resultat.kategori}, ${resultat.kundtyp}, ${resultat.föreslagna_moment.length} moment, ${resultat.uppskattat_pris_inkl_moms.toLocaleString('sv-SE')} kr inkl moms`,
        tokens_använda: tokens,
        varaktighet_ms: varaktighet,
      })
    }

    return resultat
  } catch (err) {
    await supabase
      .from('projekt')
      .update({ analys_komplett: false })
      .eq('id', projektId)

    if (firstAnbud) {
      await supabase.from('extraktion_log').insert({
        anbud_id: firstAnbud.id,
        steg: 'snabboffert',
        status: 'fel',
        meddelande: err instanceof Error ? err.message : 'Okänt fel',
        varaktighet_ms: Date.now() - startTid,
      })
    }

    throw err
  }
}

/**
 * Detekterar om en förfrågan är formell (FU) eller informell (snabboffert).
 * Kollar textlängd, antal dokument och nyckelord.
 */
export function detekteraFörfråganTyp(
  dokument: Array<{ filnamn: string; text?: string; typ: string }>,
): 'formell' | 'snabb' {
  // Flera PDF-dokument → troligen formellt FU
  const antalPdf = dokument.filter(d => d.typ === 'pdf').length
  if (antalPdf >= 3) return 'formell'

  // Samla all text
  const allText = dokument
    .filter(d => d.text)
    .map(d => d.text!)
    .join(' ')
    .toLowerCase()

  // Formella nyckelord som tyder på offentlig upphandling / formellt FU
  const formellaOrd = [
    'förfrågningsunderlag', 'administrativa föreskrifter', 'afb',
    'ama', 'anbudsformulär', 'skall uppfylla', 'obligatoriskt krav',
    'kvalificeringskrav', 'utvärderingskriterier', 'anbudstid',
    'upphandlande myndighet', 'anbud ska', 'anbudet ska',
    'ramavtal', 'tilldelningsbeslut', 'lou', 'luf',
    'espd', 'egenförsäkran',
  ]

  const formellaFynd = formellaOrd.filter(ord => allText.includes(ord)).length

  // Om 3+ formella nyckelord → formellt
  if (formellaFynd >= 3) return 'formell'

  // Lång text (>2000 ord) + minst 1 formellt nyckelord → formellt
  const ordCount = allText.split(/\s+/).length
  if (ordCount > 2000 && formellaFynd >= 1) return 'formell'

  // Kort text, inga formella ord → snabboffert
  // Även mellanläget med strukturerat BRF-FU men utan formella upphandlingsord → snabb
  // (dessa har ofta rubriknumrering men saknar AMA/AFB-terminologi)
  if (ordCount < 1500 && formellaFynd === 0) return 'snabb'

  // Filnamn kan ge ledtrådar
  const formellaFilnamn = ['afb', 'ama', 'föreskrift', 'espd', 'egenförsäkran']
  const harFormellFil = dokument.some(d =>
    formellaFilnamn.some(f => d.filnamn.toLowerCase().includes(f))
  )
  if (harFormellFil) return 'formell'

  // Default: om vi är osäkra, kör formellt (säkrare — missar inget)
  // Men om det bara är 1 dokument med kort text → snabb
  if (dokument.length === 1 && ordCount < 800) return 'snabb'

  return 'formell'
}
