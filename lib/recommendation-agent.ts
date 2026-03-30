import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type GoNoGoResultat = {
  beslut: 'GO' | 'NO-GO' | 'PRELIMINÄRT'
  badge_färg: 'grön' | 'röd' | 'gul'
  rubrik: string
  sammanfattning: string
  kalkyl: {
    moment: Array<{
      beskrivning: string
      timmar: number
      timpris: number
      materialkostnad: number
      belopp: number
    }>
    totalt_arbete: number
    totalt_material: number
    totalbelopp: number
    moms: number
    totalt_inkl_moms: number
    rot_avdrag?: number
    gron_teknik_avdrag?: number
    kund_betalar?: number
  }
  anbudsdokument: string
  certifikat_uppfyllda: Array<{
    krav: string
    uppfyllt: boolean
    obligatoriskt: boolean
  }>
  kräver_granskning: boolean
  granskningsorsaker: string[]
}

async function hämtaBranschbenchmark(kategori: string) {
  try {
    const { data } = await supabase
      .from('bransch_benchmark')
      .select('*')
      .eq('kategori', kategori)
      .limit(1)
      .single()
    return data
  } catch {
    return null
  }
}

const SYSTEM_PROMPT = `Du är en AI-assistent som genererar rekommendationer och anbudsdokument för svenska elfirmor.

Vid generering av anbudsdokument, inkludera alltid en tydlig scopesektion med rubrik "Vad ingår i detta uppdrag". Skriv i enkel, klar svenska som en fastighetsförvaltare eller BRF-styrelsemedlem förstår utan teknisk bakgrund.

Generera alltid tre underrubriker:
- "Detta ingår" (bullrad lista, konkreta arbetsmoment)
- "Detta ingår inte" (bullrad lista, minst 3 exkluderingar relevanta för uppdraget)
- "Förutsättningar för priset" (bullrad lista)

Dokumenttyp styr rubrik och ton:
- Anbud: Formell ton, hänvisning till AB 04 eller ABT 06 om angivet
- Offert: Lite ledigare ton, inga avtalsreferenser krävs

STANDARDFÖRBEHÅLL (inkludera alltid):
"Priset kan justeras om oförutsedda problem uppstår som inte kunde identifieras vid offertlämnandet."

ÄNDRINGSHANTERING (inkludera alltid):
"Arbeten utöver ovanstående scope debiteras per löpande räkning till [timpris] kr/tim exkl. moms, efter skriftlig godkännande av beställaren."

GARANTI (inkludera alltid):
- Garanti på utfört arbete: 2 år
- Garanti på material: enligt tillverkarens garanti

BETALNINGSVILLKOR (standard):
- 30 dagars betalning efter slutfört arbete
- Större projekt: specificera delfakturering

ROT-AVDRAG:
Om kund_typ = 'konsument', beräkna ROT-avdrag (30% av arbetskostnad, max 50 000 kr/person/år).
ROT gäller ALDRIG material, resor eller servicebilsavgifter.

GRÖN TEKNIK:
Om gron_teknik = true:
- Solceller: 15% av arbete + material
- Batteri/laddbox: 50% av arbete + material
- Max 50 000 kr/person/år

Returnera ENDAST giltig JSON.`

export async function genereraRekommendation(projektId: string): Promise<GoNoGoResultat> {
  const startTid = Date.now()

  const { data: projekt } = await supabase
    .from('projekt')
    .select('*')
    .eq('id', projektId)
    .single()

  if (!projekt) throw new Error('Projekt hittades inte')

  const { data: anbud } = await supabase
    .from('anbud')
    .select('*')
    .eq('projekt_id', projektId)
    .eq('extraktion_status', 'extraherad')

  if (!anbud || anbud.length === 0) {
    throw new Error('Inga extraherade anbud hittades')
  }

  const benchmark = await hämtaBranschbenchmark('elinstallation')

  await supabase
    .from('projekt')
    .update({ rekommendation_status: 'pågår' })
    .eq('id', projektId)

  try {
    const anbudData = anbud.map(a => ({
      id: a.id,
      filnamn: a.filnamn,
      extraherad_data: a.extraherad_data,
      kund_typ: a.kund_typ,
      rot_tillämpligt: a.rot_tillämpligt,
      gron_teknik_tillämpligt: a.gron_teknik_tillämpligt,
    }))

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Projekt: "${projekt.namn}"
Dokumenttyp: ${projekt.dokument_typ ?? 'anbud'}
Förfrågningsunderlag: ${projekt.förfrågningsunderlag_text?.slice(0, 20000) ?? 'Saknas'}
Analys komplett: ${projekt.analys_komplett}
Grön teknik: ${projekt.gron_teknik ? `Ja (${projekt.gron_teknik_typ?.join(', ')})` : 'Nej'}

Anbud:
${JSON.stringify(anbudData, null, 2)}

${benchmark ? `Branschbenchmark:\n${JSON.stringify(benchmark, null, 2)}` : 'Ingen benchmark tillgänglig.'}

Generera:
1. Go/No-Go-beslut baserat på certifikat och kompetenskrav
2. Kalkyl med alla moment, timmar, material och belopp
3. Komplett anbudsdokument i markdown-format med alla obligatoriska sektioner

Returnera JSON med: beslut, badge_färg, rubrik, sammanfattning, kalkyl, anbudsdokument, certifikat_uppfyllda, kräver_granskning, granskningsorsaker`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar från Claude')

    const resultat: GoNoGoResultat = JSON.parse(content.text)
    const varaktighet = Date.now() - startTid
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Spara rekommendation
    await supabase.from('rekommendation').insert({
      projekt_id: projektId,
      go_no_go: resultat.beslut,
      badge_färg: resultat.badge_färg,
      rubrik: resultat.rubrik,
      sammanfattning: resultat.sammanfattning,
      kalkyl: resultat.kalkyl as unknown as Record<string, unknown>,
      anbudsdokument: resultat.anbudsdokument,
      certifikat_uppfyllda: resultat.certifikat_uppfyllda as unknown as Record<string, unknown>,
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
        rekommendation: resultat as unknown as Record<string, unknown>,
        rekommendation_status: 'klar',
        rekommendation_kräver_granskning: resultat.kräver_granskning,
        rekommendation_granskningsorsaker: resultat.granskningsorsaker,
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

export function formateraMarkdown(resultat: GoNoGoResultat): string {
  const { kalkyl, anbudsdokument } = resultat
  let md = anbudsdokument ?? ''

  if (kalkyl) {
    md += '\n\n## Kalkylsammanfattning\n\n'
    md += '| Moment | Timmar | Material | Belopp |\n'
    md += '|--------|--------|----------|--------|\n'
    for (const m of kalkyl.moment ?? []) {
      md += `| ${m.beskrivning} | ${m.timmar} | ${m.materialkostnad.toLocaleString('sv-SE')} kr | ${m.belopp.toLocaleString('sv-SE')} kr |\n`
    }
    md += `\n**Totalt exkl. moms:** ${kalkyl.totalbelopp?.toLocaleString('sv-SE')} kr\n`
    md += `**Moms (25%):** ${kalkyl.moms?.toLocaleString('sv-SE')} kr\n`
    md += `**Totalt inkl. moms:** ${kalkyl.totalt_inkl_moms?.toLocaleString('sv-SE')} kr\n`

    if (kalkyl.rot_avdrag) {
      md += `\n**ROT-avdrag:** -${kalkyl.rot_avdrag.toLocaleString('sv-SE')} kr\n`
    }
    if (kalkyl.gron_teknik_avdrag) {
      md += `**Grön Teknik-avdrag:** -${kalkyl.gron_teknik_avdrag.toLocaleString('sv-SE')} kr\n`
    }
    if (kalkyl.kund_betalar) {
      md += `**Kunden betalar:** ${kalkyl.kund_betalar.toLocaleString('sv-SE')} kr\n`
    }
  }

  return md
}
