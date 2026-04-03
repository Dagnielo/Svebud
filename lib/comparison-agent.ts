import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { parseClaudeJSON } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type KravTyp = 'ska' | 'bör'

export type Krav = {
  krav: string
  typ: KravTyp
  uppfyllt: boolean | null
  konfidens: number
  kommentar: string
  källa: string
}

export type KravmatchResultat = {
  sammanfattning: string
  go_no_go: 'GO' | 'NO-GO' | 'GO_MED_RESERVATION'
  ska_krav: Krav[]
  bör_krav: Krav[]
  saknade_certifikat: string[]
  matchade_certifikat: string[]
  matchad_erfarenhet: string[]
  risker: string[]
  möjligheter: string[]
  rekommendation: string
}

const SYSTEM_PROMPT = `Du är en AI-assistent som hjälper svenska elfirmor att bedöma förfrågningsunderlag (FU).

Din uppgift är att matcha kraven i FU:et mot elfirmans profil (certifikat, erfarenhet, resurser) och ge en Go/No-Go-bedömning.

UPPGIFT:
1. Identifiera ALLA krav i förfrågningsunderlaget
2. Kategorisera varje krav som SKA-KRAV (obligatoriskt) eller BÖR-KRAV (meriterande)
3. Matcha varje krav mot elfirmans profil
4. Ge en Go/No-Go-bedömning

REGLER:
- SKA-KRAV som inte uppfylls → flagga tydligt, men ge elfirman chansen att svara
- BÖR-KRAV som inte uppfylls → GO med reservation
- Om elfirman saknar certifikat men KAN ha det → markera som "oklart, kräver manuell bekräftelse"
- Var specifik om VAR i dokumentet kravet hittades

GO/NO-GO LOGIK:
- GO: Alla ska-krav uppfyllda
- GO_MED_RESERVATION: Alla ska-krav uppfyllda men bör-krav saknas, eller ska-krav kräver manuell bekräftelse
- NO-GO: Ska-krav som definitivt inte kan uppfyllas (t.ex. kräver 50 montörer men firman har 5)

Returnera ENDAST giltig JSON med denna struktur:
{
  "sammanfattning": "Kort bedömning i 2-3 meningar",
  "go_no_go": "GO" | "NO-GO" | "GO_MED_RESERVATION",
  "ska_krav": [
    { "krav": "Beskrivning", "typ": "ska", "uppfyllt": true|false|null, "konfidens": 0-100, "kommentar": "Matchning mot profil", "källa": "Var i dokumentet" }
  ],
  "bör_krav": [
    { "krav": "Beskrivning", "typ": "bör", "uppfyllt": true|false|null, "konfidens": 0-100, "kommentar": "Matchning", "källa": "Var i dokumentet" }
  ],
  "saknade_certifikat": ["Certifikat som saknas"],
  "matchade_certifikat": ["Certifikat som matchar"],
  "matchad_erfarenhet": ["Erfarenhetstyper som matchar"],
  "risker": ["Identifierade risker"],
  "möjligheter": ["Positiva aspekter för elfirman"],
  "rekommendation": "Detaljerad rekommendation"
}`

export async function matchaKrav(projektId: string): Promise<KravmatchResultat> {
  const startTid = Date.now()

  // Hämta projekt med FU-text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projekt } = await supabase
    .from('projekt')
    .select('*')
    .eq('id', projektId)
    .single() as { data: any }

  if (!projekt) throw new Error('Projekt hittades inte')

  const projektNamn = projekt.namn ?? 'Okänt projekt'
  const fuText = projekt['förfrågningsunderlag_text'] as string | null

  if (!fuText || fuText.length < 20) {
    throw new Error('Inget förfrågningsunderlag att analysera. Ladda upp dokument först.')
  }

  // Hämta elfirmans profil
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profil } = await supabase
    .from('profiler')
    .select('*')
    .eq('id', projekt['användar_id'])
    .single() as { data: any }

  if (!profil) throw new Error('Företagsprofil saknas')

  const företagsProfil = {
    företag: profil.företag,
    org_nr: profil.org_nr,
    region: profil.region,
    antal_montorer: profil.antal_montorer,
    omsattning_msek: profil.omsattning_msek,
    certifikat: profil.certifikat ?? [],
    erfarenhet: profil.erfarenhet ?? [],
    timpris_standard: profil.timpris_standard,
  }

  // Uppdatera status
  await supabase
    .from('projekt')
    .update({ jämförelse_status: 'pågår' })
    .eq('id', projektId)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Projekt: "${projektNamn}"

ELFIRMANS PROFIL:
${JSON.stringify(företagsProfil, null, 2)}

FÖRFRÅGNINGSUNDERLAG:
${fuText.slice(0, 60000)}

Matcha kraven i FU:et mot elfirmans profil och ge en Go/No-Go-bedömning.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar')

    const resultat = parseClaudeJSON<KravmatchResultat>(content.text)

    // Spara kravmatchning
    await supabase
      .from('projekt')
      .update({
        kravmatchning: resultat as unknown as Record<string, unknown>,
        jämförelse_status: 'klar',
        jämförelse_resultat: resultat as unknown as Record<string, unknown>,
      })
      .eq('id', projektId)

    return resultat
  } catch (err) {
    await supabase
      .from('projekt')
      .update({ jämförelse_status: 'fel' })
      .eq('id', projektId)
    throw err
  }
}
