import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { parseClaudeJSON } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Krav = {
  krav: string
  typ: 'ska' | 'bör'
  kategori: string
  källa: string
  konfidens: number
}

export type ExtraktionsResultat = {
  analys_komplett: boolean
  beställare: string | null
  kontaktperson: string | null
  org_nr: string | null
  sista_anbudsdag: string | null
  planerad_start: string | null
  avtalsvillkor: string | null
  prismodell: string | null
  uppdragsbeskrivning: string | null
  värde_kr: number | null
  utvärderingskriterier: string | null
  kund_typ: 'konsument' | 'naringsidkare' | 'brf' | null
  ska_krav: Krav[]
  bör_krav: Krav[]
  saknade_kritiska_falt: string[]
}

const SYSTEM_PROMPT = `Du är en AI-assistent som analyserar förfrågningsunderlag (FU) för elinstallationsuppdrag i Sverige.

HUVUDUPPGIFT: Scanna ALLA dokument och extrahera:
1. Grundläggande projektinformation
2. ALLA ska-krav (obligatoriska krav som måste uppfyllas)
3. ALLA bör-krav (meriterande krav som ger fördelar)

KATEGORIER FÖR KRAV:
- "certifikat" – Auktorisationer, behörigheter, utbildningar (AL, A, B, SSG, ID06 etc.)
- "erfarenhet" – Referensuppdrag, erfarenhet av liknande projekt
- "kapacitet" – Antal montörer, maskiner, resurser
- "ekonomi" – Omsättning, försäkringar, kreditvärdighet
- "kvalitet" – ISO-certifieringar, kvalitetssystem, miljöledning
- "säkerhet" – Arbetsmiljöplaner, riskanalyser, skyddsutrustning
- "tidsplan" – Deadlines, milstolpar, tillgänglighet
- "juridik" – Avtalsvillkor, garantier, ansvarsfrågor
- "övrigt" – Övriga krav

SKA-KRAV: Krav som uttryckligen anges som obligatoriska. Sökord: "ska", "skall", "måste", "krav", "obligatoriskt", "krävs", "erfordras", "fordras", "villkor för".
Notera: "ska" och "skall" är SAMMA sak — "skall" är äldre svenska och förekommer ofta i juridiska dokument och förfrågningsunderlag.
BÖR-KRAV: Krav som anges som meriterande. Sökord: "bör", "önskvärt", "meriterande", "fördel om", "positivt om", "gärna", "uppskattas".

KÄLLA: Ange EXAKT var i dokumentet kravet hittas (dokumentnamn + avsnitt/sida om möjligt).

VIKTIGT:
- Var NOGGRANN — missa inte krav som finns gömda i bilagor eller underkapitel
- Om osäker om ska/bör, markera som "ska" med lägre konfidens
- Sök efter krav i ALL text, inte bara uppenbara avsnitt

Returnera ENDAST giltig JSON:
{
  "analys_komplett": boolean,
  "beställare": string|null,
  "kontaktperson": string|null,
  "org_nr": string|null,
  "sista_anbudsdag": string|null,
  "planerad_start": string|null,
  "avtalsvillkor": string|null,
  "prismodell": string|null,
  "uppdragsbeskrivning": string|null,
  "värde_kr": number|null,
  "utvärderingskriterier": string|null,
  "kund_typ": "konsument"|"naringsidkare"|"brf"|null,
  "ska_krav": [
    { "krav": "Beskrivning av kravet", "typ": "ska", "kategori": "certifikat|erfarenhet|kapacitet|ekonomi|kvalitet|säkerhet|tidsplan|juridik|övrigt", "källa": "Dokument X, avsnitt Y", "konfidens": 0-100 }
  ],
  "bör_krav": [
    { "krav": "Beskrivning av kravet", "typ": "bör", "kategori": "...", "källa": "...", "konfidens": 0-100 }
  ],
  "saknade_kritiska_falt": ["fält som saknas i FU:et"]
}`

/**
 * Extraherar krav från ALLA dokument i ett projekt (samlat FU).
 */
export async function extraheraFrånProjekt(projektId: string): Promise<ExtraktionsResultat> {
  const { samlaFUText } = await import('@/lib/fu-agent')
  const samladText = await samlaFUText(projektId)

  if (!samladText) {
    throw new Error('Inga dokument med text hittades i projektet')
  }

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
      steg: 'fu_scanning',
      status: 'startad',
      meddelande: `Scannar ${samladText.length} tecken från alla dokument`,
    })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Scanna detta förfrågningsunderlag (kan bestå av flera dokument) och extrahera ALL projektinfo samt ALLA ska-krav och bör-krav:\n\n${samladText.slice(0, 80000)}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar från Claude')

    const resultat = parseClaudeJSON<ExtraktionsResultat>(content.text)
    const varaktighet = Date.now() - startTid
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Spara resultat på projektet
    await supabase
      .from('projekt')
      .update({
        analys_komplett: resultat.analys_komplett,
        saknade_falt: resultat.saknade_kritiska_falt,
        jämförelse_resultat: resultat as unknown as Record<string, unknown>,
      })
      .eq('id', projektId)

    // Markera alla anbud som extraherade
    await supabase
      .from('anbud')
      .update({ extraktion_status: 'extraherad' })
      .eq('projekt_id', projektId)

    // Logga
    if (firstAnbud) {
      await supabase.from('extraktion_log').insert({
        anbud_id: firstAnbud.id,
        steg: 'fu_scanning',
        status: 'klar',
        meddelande: `Scanning klar: ${resultat.ska_krav.length} ska-krav, ${resultat.bör_krav.length} bör-krav hittade`,
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
        steg: 'fu_scanning',
        status: 'fel',
        meddelande: err instanceof Error ? err.message : 'Okänt fel',
        varaktighet_ms: Date.now() - startTid,
      })
    }

    throw err
  }
}
