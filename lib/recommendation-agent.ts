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

const SYSTEM_PROMPT = `Du genererar EXTREMT KORTA anbudsdokument för elfirmor. MAX 1500 tecken.

STRUKTUR — strikt ordning, inga extra sektioner:
1. Elfirmans namn, adress, org.nr, telefon — EN rad
2. Datum + "Giltigt 30 dagar"
3. "## Anbud avseende [beskrivning]"
4. "## VAD INGÅR" — max 6 punkter, max 10 ord per punkt
5. "## INGÅR EJ" — 3 punkter
6. "## FÖRUTSÄTTNINGAR" — 2 punkter
7. "## BETALNINGSVILLKOR" — EN rad
8. "## GARANTI" — EN rad
9. "## FÖRBEHÅLL" — 3 punkter, max 8 ord per punkt

INKLUDERA ABSOLUT INTE: kalkyl, priser, summor, ROT, skattereduktion, prissammanfattning.
Systemet lägger till dessa automatiskt.

KALKYL-JSON (separat, INTE i texten):
- Elfirmans timpriser, rimliga timmar, material separat

REGLER:
- Max 1500 tecken i anbudsdokumentet
- Bara punktlistor, ingen löptext
- Inga inledningar, avslutningar eller artighetsfraser
- Max 10 ord per punkt
- Klarspråk utan branschjargong
- Om elfirmans anbudsinställningar finns → ANVÄND DEM ORDAGRANT för betalningsvillkor, garanti, förbehåll, "ingår ej" och förutsättningar. Komplettera bara med projektspecifika punkter.

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
  console.log('[rekommendation] ROT-data:', JSON.stringify({ rot_aktiverat: projekt.rot_aktiverat, rot_typ: projekt.rot_typ, rot_belopp: projekt.rot_belopp, rot_kund_betalar: projekt.rot_kund_betalar }))
  console.log('[rekommendation] Projekt-keys:', Object.keys(projekt).filter(k => k.startsWith('rot')).join(', '))

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
      max_tokens: 4096,
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
${profil.webbadress ? `Webb: ${profil.webbadress}` : ''}
${profil.företagsbeskrivning ? `Om företaget: ${profil.företagsbeskrivning}` : ''}
Timpris standard: ${profil.timpris_standard ?? 650} kr/tim
Timpris jour: ${profil.timpris_jour ?? 950} kr/tim
${projekt.rekommendation?.kontaktperson_anbud ? `
Kontaktperson (signerar anbudet):
Namn: ${projekt.rekommendation.kontaktperson_anbud.namn}
Roll: ${projekt.rekommendation.kontaktperson_anbud.roll ?? ''}
E-post: ${projekt.rekommendation.kontaktperson_anbud.epost ?? ''}
Telefon: ${projekt.rekommendation.kontaktperson_anbud.telefon ?? ''}
` : ''}
${(profil.referensprojekt ?? []).length > 0 ? `
Referensprojekt:
${(profil.referensprojekt as Array<Record<string, unknown>>).map((r: Record<string, unknown>) => `- ${r.projektnamn} (${r.typ ?? 'Övrigt'}, ${r.datum ?? 'datum okänt'}) — ${r.beställare ?? ''}`).join('\n')}
` : ''}
${projekt.rot_aktiverat ? `
ROT/GRÖN TEKNIK (aktiverat av elfirman):
Typ: ${projekt.rot_typ}
OBS: Inkludera INTE ROT/prissammanfattning i anbudstexten — det infogas automatiskt av systemet.
` : ''}
${(() => {
  const ai = profil.anbudsinstallningar as Record<string, unknown> | null
  if (!ai) return ''
  const delar: string[] = []
  delar.push('ELFIRMANS ANBUDSINSTÄLLNINGAR (ANVÄND DESSA ORDAGRANT — ändra INTE):')
  if (ai.betalningsvillkor) delar.push(`Betalningsvillkor: ${ai.betalningsvillkor}`)
  if (ai.avtalsvillkor) delar.push(`Avtalsvillkor: Enligt ${ai.avtalsvillkor}. Ange detta i anbudets förbehåll.`)
  if (ai.garanti) delar.push(`Garanti: ${ai.garanti}`)
  if (ai.giltighetstid) delar.push(`Giltighetstid: ${ai.giltighetstid}`)
  if ((ai.forbehall as string[] ?? []).length > 0) delar.push(`Förbehåll:\n${(ai.forbehall as string[]).map(f => `- ${f}`).join('\n')}`)
  if ((ai.ingar_ej as string[] ?? []).length > 0) delar.push(`Ingår ej (standard — inkludera alltid dessa):\n${(ai.ingar_ej as string[]).map(i => `- ${i}`).join('\n')}`)
  if ((ai.forutsattningar as string[] ?? []).length > 0) delar.push(`Förutsättningar (standard):\n${(ai.forutsattningar as string[]).map(f => `- ${f}`).join('\n')}`)
  if (ai.ovriga_instruktioner) delar.push(`Övriga instruktioner: ${ai.ovriga_instruktioner}`)
  return delar.join('\n')
})()}
ANALYSRESULTAT (från AI-scanning av förfrågningsunderlaget):
${JSON.stringify(kravmatchning, null, 2).slice(0, 15000)}
${projekt.rekommendation?.kalkyl ? `
BEFINTLIG KALKYL (justerad av användaren — ANVÄND DENNA som grund, ändra INTE priser eller moment):
${JSON.stringify(projekt.rekommendation.kalkyl, null, 2)}

Baserat på analysresultatet och den BEFINTLIGA KALKYLEN ovan, generera ett komplett anbudsutkast. Behåll exakt samma moment och priser som i kalkylen.` : `Baserat på analysresultatet ovan, generera ett komplett anbudsutkast med kalkyl. Använd elfirmans timpriser.`}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar')

    const resultat = parseClaudeJSON<AnbudsResultat>(content.text)

    // ROT/prissammanfattning hanteras av byggRotBlock() i frontend — inget appendas här

    // Bevara användarens redigerade kalkyl om den finns
    if (projekt.rekommendation?.kalkyl) {
      resultat.kalkyl = projekt.rekommendation.kalkyl
    }

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
