import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { parseClaudeJSON } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type MatchatKrav = {
  krav: string
  typ: 'ska' | 'bör'
  kategori: string
  källa: string
  status: 'uppfyllt' | 'ej_uppfyllt' | 'kräver_bekräftelse'
  matchning: string // Förklaring: "Matchar ert certifikat AL" eller "Ni har 5 montörer, kravet är 3"
}

export type AnalysResultat = {
  // Projektinfo
  beställare: string | null
  kontaktperson: string | null
  org_nr: string | null
  sista_anbudsdag: string | null
  avtalsvillkor: string | null
  prismodell: string | null
  uppdragsbeskrivning: string | null
  värde_kr: number | null
  // GO/NO-GO
  go_no_go: 'GO' | 'NO_GO' | 'GO_MED_RESERVATION'
  match_procent: number
  sammanfattning: string
  rekommendation: string
  // Krav — uppdelade efter matchningsstatus
  matchade_krav: MatchatKrav[]
  kräver_bekräftelse: MatchatKrav[]
  ej_uppfyllda: MatchatKrav[]
  // Extra
  risker: string[]
  möjligheter: string[]
}

function byggSystemPrompt(profil: Record<string, unknown>): string {
  return `Du är en AI-assistent som hjälper svenska elfirmor att snabbt bedöma förfrågningsunderlag (FU).

DIN UPPGIFT (gör allt i ETT steg):
1. Extrahera projektinformation (beställare, deadline, avtalsvillkor, scope etc.)
2. Identifiera ALLA ska-krav och bör-krav i dokumenten
3. MATCHA varje krav mot elfirmans profil (se nedan)
4. Ge GO/NO-GO-bedömning med matchningsprocent

ELFIRMANS PROFIL:
${JSON.stringify(profil, null, 2)}

MATCHNINGSREGLER:
- "uppfyllt" = Kravet matchar tydligt mot något i profilen (certifikat, erfarenhet, kapacitet)
- "kräver_bekräftelse" = Kravet KAN uppfyllas men profilen är inte tydlig nog (t.ex. omsättning, riskklass, specifika referensuppdrag)
- "ej_uppfyllt" = Kravet kan definitivt INTE uppfyllas (t.ex. kräver 50 montörer men firman har 5)

GO/NO-GO LOGIK:
- GO: Inga "ej_uppfyllt" ska-krav, max 3 "kräver_bekräftelse"
- GO_MED_RESERVATION: Inga "ej_uppfyllt" ska-krav men >3 "kräver_bekräftelse"
- NO_GO: Minst 1 ska-krav som är "ej_uppfyllt"

match_procent = (antal uppfyllda ska-krav / totalt antal ska-krav) * 100

SKA-KRAV sökord: "ska", "skall", "måste", "krav", "obligatoriskt", "krävs", "erfordras", "fordras", "villkor för"
BÖR-KRAV sökord: "bör", "önskvärt", "meriterande", "fördel om", "positivt om", "gärna"

KÄLLA: Ange dokumentnamn + avsnitt (t.ex. "06.1 Administrativa föreskrifter, AFB.522")

MATCHNING: Förklara VARFÖR kravet matchar eller inte:
- Bra: "Matchar ert certifikat 'Auktorisation AL'"
- Bra: "Ni har 10 montörer, kravet är minst 3 — uppfyllt"
- Bra: "Omsättningskrav 8 MSEK — er profil saknar omsättningsdata, behöver bekräftas"

PROJEKTINFO — extrahera NOGGRANT:
Sök igenom ALLA dokument. Om ett fält finns, MISSA det inte.

INFORMELLA DOKUMENT (mail, fritext):
Tolka implicit krav: "vi behöver" = ska-krav, "helst" = bör-krav

Returnera ENDAST giltig JSON:
{
  "beställare": string|null,
  "kontaktperson": string|null,
  "org_nr": string|null,
  "sista_anbudsdag": string|null,
  "avtalsvillkor": string|null,
  "prismodell": string|null,
  "uppdragsbeskrivning": string|null,
  "värde_kr": number|null,
  "go_no_go": "GO"|"NO_GO"|"GO_MED_RESERVATION",
  "match_procent": number,
  "sammanfattning": "Kort bedömning i 2-3 meningar",
  "rekommendation": "Detaljerad rekommendation",
  "matchade_krav": [
    { "krav": "...", "typ": "ska"|"bör", "kategori": "...", "källa": "...", "status": "uppfyllt", "matchning": "Matchar ert certifikat X" }
  ],
  "kräver_bekräftelse": [
    { "krav": "...", "typ": "ska", "kategori": "...", "källa": "...", "status": "kräver_bekräftelse", "matchning": "Er profil saknar denna uppgift" }
  ],
  "ej_uppfyllda": [
    { "krav": "...", "typ": "ska", "kategori": "...", "källa": "...", "status": "ej_uppfyllt", "matchning": "Ni har 5 montörer, kravet är 50" }
  ],
  "risker": ["..."],
  "möjligheter": ["..."]
}`
}

/**
 * Analyserar FU OCH matchar krav mot profil i ETT steg.
 */
export async function analyseraOchMatcha(projektId: string): Promise<AnalysResultat> {
  const { samlaFUDokument, byggClaudeContent, samlaFUText } = await import('@/lib/fu-agent')

  // Samla alla dokument
  const delar = await samlaFUDokument(projektId)

  // Spara FU-text
  await samlaFUText(projektId)

  // Hämta projekt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projekt } = await supabase
    .from('projekt')
    .select('*')
    .eq('id', projektId)
    .single() as { data: any }

  if (!projekt) throw new Error('Projekt hittades inte')

  // Hämta elfirmans profil
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profil } = await supabase
    .from('profiler')
    .select('*')
    .eq('id', projekt['användar_id'])
    .single() as { data: any }

  const företagsProfil = profil ? {
    företag: profil.företag,
    org_nr: profil.org_nr,
    region: profil.region,
    antal_montorer: profil.antal_montorer,
    omsattning_msek: profil.omsattning_msek,
    certifikat: profil.certifikat ?? [],
    erfarenhet: profil.erfarenhet ?? [],
    timpris_standard: profil.timpris_standard,
  } : {}

  const startTid = Date.now()

  // Logga start
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
      steg: 'analys_matchning',
      status: 'startad',
      meddelande: `Analyserar ${delar.length} dokument och matchar mot företagsprofil`,
    })
  }

  try {
    const messageContent = byggClaudeContent(
      delar,
      `Analysera ALLA dokument ovan. Extrahera projektinfo, identifiera ALLA ska/bör-krav, och matcha varje krav mot elfirmans profil. Ge GO/NO-GO-bedömning.`
    )

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: byggSystemPrompt(företagsProfil),
      messages: [{ role: 'user', content: messageContent }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar')

    const resultat = parseClaudeJSON<AnalysResultat>(content.text)
    const varaktighet = Date.now() - startTid
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    const totalKrav = resultat.matchade_krav.length + resultat.kräver_bekräftelse.length + resultat.ej_uppfyllda.length

    // Spara allt på projektet
    const uppdatering: Record<string, unknown> = {
      analys_komplett: true,
      jämförelse_resultat: resultat as unknown as Record<string, unknown>,
      jämförelse_status: 'klar',
      kravmatchning: resultat as unknown as Record<string, unknown>,
    }

    // Auto-sätt deadline om AI:n hittade sista anbudsdag
    if (resultat.sista_anbudsdag) {
      const d = new Date(resultat.sista_anbudsdag)
      if (!isNaN(d.getTime())) {
        uppdatering.deadline = d.toISOString().split('T')[0]
      }
    }

    await supabase
      .from('projekt')
      .update(uppdatering)
      .eq('id', projektId)

    // Markera anbud som extraherade
    await supabase
      .from('anbud')
      .update({ extraktion_status: 'extraherad' })
      .eq('projekt_id', projektId)

    // Logga
    if (firstAnbud) {
      await supabase.from('extraktion_log').insert({
        anbud_id: firstAnbud.id,
        steg: 'analys_matchning',
        status: 'klar',
        meddelande: `${resultat.go_no_go} (${resultat.match_procent}%) — ${totalKrav} krav: ${resultat.matchade_krav.length} matchade, ${resultat.kräver_bekräftelse.length} att bekräfta, ${resultat.ej_uppfyllda.length} ej uppfyllda`,
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
        steg: 'analys_matchning',
        status: 'fel',
        meddelande: err instanceof Error ? err.message : 'Okänt fel',
        varaktighet_ms: Date.now() - startTid,
      })
    }

    throw err
  }
}
