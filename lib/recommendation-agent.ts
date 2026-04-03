import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { parseClaudeJSON } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type KalkylMoment = {
  beskrivning: string
  timmar: number
  timpris: number
  materialkostnad: number
  belopp: number
}

export type Kalkyl = {
  moment: KalkylMoment[]
  totalt_arbete: number
  totalt_material: number
  totalbelopp: number
  moms: number
  totalt_inkl_moms: number
  rot_avdrag?: number
  gron_teknik_avdrag?: number
  kund_betalar?: number
}

export type AnbudsResultat = {
  kalkyl: Kalkyl
  anbudsdokument: string
  sammanfattning: string
  scope_ingår: string[]
  scope_ingår_inte: string[]
  förutsättningar: string[]
  giltighetstid: string
  betalningsvillkor: string
  garanti: string
}

const SYSTEM_PROMPT = `Du är en AI-assistent som genererar anbudsdokument för svenska elfirmor.

Du har fått ett förfrågningsunderlag (FU), en kravmatchning och elfirmans priser.
Generera ett komplett anbudsutkast som elfirman kan justera och skicka.

ANBUDSDOKUMENTET SKA INNEHÅLLA:
1. Kontaktuppgifter (elfirman + beställare)
2. Datum och giltighetstid (standard 30 dagar)
3. Rubrik: "[Anbud/Offert] avseende [uppdragsbeskrivning]"
4. "Vad ingår i detta uppdrag" - tydligt, klarspråk
   - "Detta ingår" (konkreta arbetsmoment)
   - "Detta ingår inte" (minst 3 exkluderingar)
   - "Förutsättningar för priset"
5. Kalkyl med moment, timmar, material, belopp
6. Betalningsvillkor (standard 30 dagar)
7. Garanti (2 år arbete, tillverkarens garanti på material)
8. Standardförbehåll

PRISSÄTTNING:
- Använd elfirmans egna timpriser som grund
- Gör rimliga uppskattningar av timmar baserat på scope
- Specificera material separat
- Visa exkl. moms, moms, inkl. moms

VIKTIGT:
- Skriv i klarspråk som en BRF-ordförande förstår
- Undvik branschjargong utan förklaring
- Var specifik om vad som ingår och inte

Returnera ENDAST giltig JSON med denna struktur:
{
  "kalkyl": {
    "moment": [{ "beskrivning": "...", "timmar": N, "timpris": N, "materialkostnad": N, "belopp": N }],
    "totalt_arbete": N,
    "totalt_material": N,
    "totalbelopp": N,
    "moms": N,
    "totalt_inkl_moms": N
  },
  "anbudsdokument": "Komplett anbudsdokument i markdown",
  "sammanfattning": "Kort sammanfattning",
  "scope_ingår": ["..."],
  "scope_ingår_inte": ["..."],
  "förutsättningar": ["..."],
  "giltighetstid": "30 dagar",
  "betalningsvillkor": "30 dagar netto",
  "garanti": "2 år på utfört arbete"
}`

export async function genereraAnbud(projektId: string): Promise<AnbudsResultat> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projekt } = await supabase
    .from('projekt')
    .select('*')
    .eq('id', projektId)
    .single() as { data: any }

  if (!projekt) throw new Error('Projekt hittades inte')

  const kravmatchning = projekt.kravmatchning
  if (!kravmatchning) throw new Error('Kör analys först')

  // Hämta elfirmans profil
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profil } = await supabase
    .from('profiler')
    .select('*')
    .eq('id', projekt['användar_id'])
    .single() as { data: any }

  if (!profil) throw new Error('Företagsprofil saknas')

  await supabase
    .from('projekt')
    .update({ rekommendation_status: 'pågår' })
    .eq('id', projektId)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Projekt: "${projekt.namn}"

ELFIRMANS UPPGIFTER:
Företag: ${profil.företag}
Org.nr: ${profil.org_nr ?? 'Ej angivet'}
Adress: ${profil.adress ?? ''}, ${profil.postnr ?? ''} ${profil.ort ?? ''}
Telefon: ${profil.telefon ?? 'Ej angivet'}
Timpris standard: ${profil.timpris_standard ?? 650} kr/tim
Timpris jour: ${profil.timpris_jour ?? 950} kr/tim

ANALYSRESULTAT (från AI-scanning av förfrågningsunderlaget):
${JSON.stringify(kravmatchning, null, 2).slice(0, 15000)}

Baserat på analysresultatet ovan, generera ett komplett anbudsutkast med kalkyl. Använd elfirmans timpriser.`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar')

    const resultat = parseClaudeJSON<AnbudsResultat>(content.text)

    // Spara
    await supabase
      .from('projekt')
      .update({
        rekommendation: resultat as unknown as Record<string, unknown>,
        rekommendation_status: 'klar',
        anbudsutkast: resultat.anbudsdokument,
        pipeline_status: 'under_arbete',
      })
      .eq('id', projektId)

    return resultat
  } catch (err) {
    await supabase
      .from('projekt')
      .update({ rekommendation_status: 'fel' })
      .eq('id', projektId)
    throw err
  }
}

export function formateraMarkdown(resultat: AnbudsResultat | Record<string, unknown>): string {
  const r = resultat as AnbudsResultat
  let md = r.anbudsdokument ?? ''

  if (r.kalkyl) {
    md += '\n\n## Kalkylsammanfattning\n\n'
    md += '| Moment | Timmar | Material | Belopp |\n'
    md += '|--------|--------|----------|--------|\n'
    for (const m of r.kalkyl.moment ?? []) {
      md += `| ${m.beskrivning} | ${m.timmar} | ${m.materialkostnad.toLocaleString('sv-SE')} kr | ${m.belopp.toLocaleString('sv-SE')} kr |\n`
    }
    md += `\n**Totalt exkl. moms:** ${r.kalkyl.totalbelopp?.toLocaleString('sv-SE')} kr\n`
    md += `**Moms (25%):** ${r.kalkyl.moms?.toLocaleString('sv-SE')} kr\n`
    md += `**Totalt inkl. moms:** ${r.kalkyl.totalt_inkl_moms?.toLocaleString('sv-SE')} kr\n`
  }

  return md
}
