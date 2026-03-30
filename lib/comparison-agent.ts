import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type JämförelseResultat = {
  sammanfattning: string
  anbud: Array<{
    anbud_id: string
    leverantör: string
    totalbelopp: number | null
    styrkor: string[]
    svagheter: string[]
    avvikelser: string[]
    poäng: number
  }>
  rekommenderat_anbud_id: string | null
  kräver_granskning: boolean
  granskningsorsaker: string[]
}

const SYSTEM_PROMPT = `Du är en AI-assistent som jämför anbud för elinstallationsuppdrag åt svenska elfirmor.

Din uppgift är att analysera och jämföra extraherade anbud mot varandra och mot förfrågningsunderlaget.

JÄMFÖRELSEPUNKTER:
1. Pris (totalbelopp, timpriser, materialkostnader)
2. Teknisk lösning (uppfyller kraven i FU?)
3. Certifikat och behörigheter (uppfyller obligatoriska krav?)
4. Tidsplan (realistisk? inom deadline?)
5. Avtalsvillkor (matchar FU:ets krav?)
6. Riskbedömning (förbehåll, oklarheter, saknade poster)

POÄNGSÄTTNING:
Ge varje anbud en poäng 0–100 baserat på:
- Priskonkurrenskraft (30%)
- Teknisk uppfyllnad (30%)
- Certifikat/behörighet (20%)
- Riskprofil (20%)

GRANSKNING KRÄVS OM:
- Prisavvikelse > 30% mellan anbuden
- Något anbud saknar obligatoriska certifikat
- Tidsplan överskrider deadline
- Oklara förbehåll som påverkar jämförbarheten

Returnera ENDAST giltig JSON med denna struktur:
{
  "sammanfattning": "Övergripande jämförelse i 2-3 meningar",
  "anbud": [
    {
      "anbud_id": "uuid",
      "leverantör": "Företagsnamn",
      "totalbelopp": number|null,
      "styrkor": ["..."],
      "svagheter": ["..."],
      "avvikelser": ["Avvikelser från FU"],
      "poäng": 0-100
    }
  ],
  "rekommenderat_anbud_id": "uuid"|null,
  "kräver_granskning": boolean,
  "granskningsorsaker": ["..."]
}`

export async function jämförAnbud(projektId: string): Promise<JämförelseResultat> {
  const startTid = Date.now()

  // Hämta projekt
  const { data: projekt, error: projektError } = await supabase
    .from('projekt')
    .select('*')
    .eq('id', projektId)
    .single()

  if (projektError || !projekt) {
    throw new Error(`Projekt hittades inte: ${projektError?.message}`)
  }

  const projektNamn = projekt?.namn ?? 'Okänt projekt'

  // Hämta alla extraherade anbud
  const { data: anbud, error: anbudError } = await supabase
    .from('anbud')
    .select('*')
    .eq('projekt_id', projektId)
    .eq('extraktion_status', 'extraherad')

  if (anbudError || !anbud || anbud.length < 2) {
    throw new Error(
      `Minst 2 extraherade anbud krävs för jämförelse. Hittade: ${anbud?.length ?? 0}`
    )
  }

  // Uppdatera projektstatus
  await supabase
    .from('projekt')
    .update({ jämförelse_status: 'pågår' })
    .eq('id', projektId)

  try {
    const anbudTexter = anbud.map((a, i) => {
      const data = a.extraherad_data ? JSON.stringify(a.extraherad_data, null, 2) : 'Ingen data'
      return `--- ANBUD ${i + 1} (ID: ${a.id}, fil: ${a.filnamn}) ---\n${data}`
    }).join('\n\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Projekt: "${projektNamn}"\n\nFörfrågningsunderlag:\n${projekt.förfrågningsunderlag_text?.slice(0, 20000) ?? 'Saknas'}\n\nJämför dessa ${anbud.length} anbud:\n\n${anbudTexter}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar från Claude')

    const resultat: JämförelseResultat = JSON.parse(content.text)
    const varaktighet = Date.now() - startTid
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Spara jämförelse
    await supabase.from('jämförelse').insert({
      projekt_id: projektId,
      anbud_ids: anbud.map(a => a.id),
      resultat: resultat as unknown as Record<string, unknown>,
      sammanfattning: resultat.sammanfattning,
      rekommenderat_anbud: resultat.rekommenderat_anbud_id,
      status: 'klar',
      kräver_granskning: resultat.kräver_granskning,
      granskningsorsaker: resultat.granskningsorsaker,
      tokens_använda: tokens,
      varaktighet_ms: varaktighet,
    })

    // Uppdatera projekt
    await supabase
      .from('projekt')
      .update({
        jämförelse_resultat: resultat as unknown as Record<string, unknown>,
        jämförelse_status: 'klar',
        jämförelse_kräver_granskning: resultat.kräver_granskning,
        jämförelse_granskningsorsaker: resultat.granskningsorsaker,
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
