import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { parseClaudeJSON } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ExtraktionsFält = {
  värde: string | number | null
  konfidens: number
}

export type ExtraktionsResultat = {
  analys_komplett: boolean
  saknade_kritiska_falt: string[]
  fält: {
    beställare: ExtraktionsFält
    kontaktperson: ExtraktionsFält
    org_nr: ExtraktionsFält
    sista_anbudsdag: ExtraktionsFält
    planerad_start: ExtraktionsFält
    avtalsvillkor: ExtraktionsFält
    prismodell: ExtraktionsFält
    uppdragsbeskrivning: ExtraktionsFält
    värde_kr: ExtraktionsFält
    utvärderingskriterier: ExtraktionsFält
  }
  kund_typ: 'konsument' | 'naringsidkare' | 'brf' | null
  rot_tillämpligt: boolean
  gron_teknik_tillämpligt: boolean
  gron_teknik_typ: string | null
  foreslaget_avtalsvillkor: string
  certifikat_krav: Array<{
    krav: string
    obligatoriskt: boolean
    konfidens: number
  }>
}

const SYSTEM_PROMPT = `Du är en AI-assistent som extraherar strukturerad information ur förfrågningsunderlag för elinstallationsuppdrag.

KRITISK REGEL – KONFIDENSVÄRDEN:
För varje extraherat fält, returnera ett konfidensvärde 0–100 som anger hur säker du är.
- 90–100: Uppgiften finns explicit angiven i underlaget
- 60–89:  Uppgiften kan härledas med rimlig säkerhet
- 30–59:  Uppgiften är oklar, tvetydig eller delvis angiven
- 0–29:   Uppgiften saknas eller kan inte läsas

KRITISK REGEL – ANALYS_KOMPLETT:
Sätt analys_komplett: false om NÅGOT av dessa fält har konfidens under 70:
  beställare, kontaktperson, sista_anbudsdag, avtalsvillkor, uppdragsbeskrivning

KRITISK REGEL – ALDRIG FABRICERA:
Om ett fält saknas, returnera null och ett lågt konfidensvärde.
Gissa ALDRIG ett datum, ett namn eller ett avtalsvillkor utan explicit stöd i texten.

KUNDTYP:
Identifiera kundtyp baserat på beställarens namn och org.nr:
- "BRF [namn]", "Bostadsrättsförening" → kund_typ: 'brf'
- Privatperson utan org.nr → kund_typ: 'konsument'
- Företagsnamn med org.nr → kund_typ: 'naringsidkare'
- Oklart → kund_typ: null

GRÖN TEKNIK:
Grön Teknik är tillämpligt om:
- kund_typ = 'konsument' (privatperson äger bostaden)
- Arbetet gäller installation av: solceller | laddbox | batteri

AVTALSVILLKOR:
- Konsument utan angivna villkor → 'EL 19 / Konsumenttjänstlagen'
- BRF utan angivna villkor → 'AB 04'
- Näringsidkare utan angivna villkor → 'AB 04'
- Om FU anger villkor → använd det som står

Returnera ENDAST giltig JSON med denna struktur (inga förklaringar):
{
  "analys_komplett": boolean,
  "saknade_kritiska_falt": string[],
  "fält": {
    "beställare":        { "värde": string|null, "konfidens": 0-100 },
    "kontaktperson":     { "värde": string|null, "konfidens": 0-100 },
    "org_nr":            { "värde": string|null, "konfidens": 0-100 },
    "sista_anbudsdag":   { "värde": string|null, "konfidens": 0-100 },
    "planerad_start":    { "värde": string|null, "konfidens": 0-100 },
    "avtalsvillkor":     { "värde": string|null, "konfidens": 0-100 },
    "prismodell":        { "värde": string|null, "konfidens": 0-100 },
    "uppdragsbeskrivning": { "värde": string|null, "konfidens": 0-100 },
    "värde_kr":          { "värde": number|null,  "konfidens": 0-100 },
    "utvärderingskriterier": { "värde": string|null, "konfidens": 0-100 }
  },
  "kund_typ": "konsument"|"naringsidkare"|"brf"|null,
  "rot_tillämpligt": boolean,
  "gron_teknik_tillämpligt": boolean,
  "gron_teknik_typ": string|null,
  "foreslaget_avtalsvillkor": string,
  "certifikat_krav": [
    { "krav": string, "obligatoriskt": boolean, "konfidens": 0-100 }
  ]
}`

export async function extraheraFrånText(
  anbudId: string,
  text: string
): Promise<ExtraktionsResultat> {
  const startTid = Date.now()

  // Logga start
  await supabase.from('extraktion_log').insert({
    anbud_id: anbudId,
    steg: 'extraktion',
    status: 'startad',
    meddelande: `Startar extraktion av ${text.length} tecken`,
  })

  // Uppdatera status
  await supabase
    .from('anbud')
    .update({ extraktion_status: 'extraherar' })
    .eq('id', anbudId)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analysera detta förfrågningsunderlag och extrahera all strukturerad information:\n\n${text.slice(0, 50000)}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Oväntat svar från Claude')
    }

    const resultat = parseClaudeJSON<ExtraktionsResultat>(content.text)
    const varaktighet = Date.now() - startTid
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Beräkna lägsta konfidens bland kritiska fält
    const kritiskaFält = ['beställare', 'kontaktperson', 'sista_anbudsdag', 'avtalsvillkor', 'uppdragsbeskrivning'] as const
    const lägstaKonfidens = Math.min(
      ...kritiskaFält.map(f => resultat.fält[f]?.konfidens ?? 0)
    )

    // Uppdatera anbud
    await supabase
      .from('anbud')
      .update({
        extraherad_data: resultat.fält,
        extraktion_status: 'extraherad',
        konfidensvärden: Object.fromEntries(
          Object.entries(resultat.fält).map(([k, v]) => [k, (v as ExtraktionsFält).konfidens])
        ),
        kund_typ: resultat.kund_typ,
        rot_tillämpligt: resultat.rot_tillämpligt,
        gron_teknik_tillämpligt: resultat.gron_teknik_tillämpligt,
        gron_teknik_typ: resultat.gron_teknik_typ,
        foreslaget_avtalsvillkor: resultat.foreslaget_avtalsvillkor,
      })
      .eq('id', anbudId)

    // Uppdatera projekt
    const { data: anbud } = await supabase
      .from('anbud')
      .select('projekt_id')
      .eq('id', anbudId)
      .single()

    if (anbud) {
      await supabase
        .from('projekt')
        .update({
          analys_komplett: resultat.analys_komplett,
          saknade_falt: resultat.saknade_kritiska_falt,
          lägsta_konfidens: lägstaKonfidens,
          gron_teknik: resultat.gron_teknik_tillämpligt,
          gron_teknik_typ: resultat.gron_teknik_typ ? [resultat.gron_teknik_typ] : [],
        })
        .eq('id', anbud.projekt_id)
    }

    // Logga framgång
    await supabase.from('extraktion_log').insert({
      anbud_id: anbudId,
      steg: 'extraktion',
      status: 'klar',
      meddelande: `Extraktion klar. Komplett: ${resultat.analys_komplett}. Lägsta konfidens: ${lägstaKonfidens}`,
      tokens_använda: tokens,
      varaktighet_ms: varaktighet,
    })

    return resultat
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'

    await supabase
      .from('anbud')
      .update({ extraktion_status: 'fel' })
      .eq('id', anbudId)

    await supabase.from('extraktion_log').insert({
      anbud_id: anbudId,
      steg: 'extraktion',
      status: 'fel',
      meddelande: message,
      varaktighet_ms: Date.now() - startTid,
    })

    throw err
  }
}

/**
 * Extraherar krav från ALLA dokument i ett projekt (samlat FU).
 * Samlar text från alla uppladdade filer och kör extraktion på helheten.
 */
export async function extraheraFrånProjekt(projektId: string): Promise<ExtraktionsResultat> {
  const { samlaFUText } = await import('@/lib/fu-agent')
  const samladText = await samlaFUText(projektId)

  if (!samladText) {
    throw new Error('Inga dokument med text hittades i projektet')
  }

  const startTid = Date.now()

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analysera detta förfrågningsunderlag (kan bestå av flera dokument) och extrahera all strukturerad information:\n\n${samladText.slice(0, 80000)}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Oväntat svar från Claude')

    const resultat = parseClaudeJSON<ExtraktionsResultat>(content.text)
    const varaktighet = Date.now() - startTid
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    const kritiskaFält = ['beställare', 'kontaktperson', 'sista_anbudsdag', 'avtalsvillkor', 'uppdragsbeskrivning'] as const
    const lägstaKonfidens = Math.min(
      ...kritiskaFält.map(f => resultat.fält[f]?.konfidens ?? 0)
    )

    // Uppdatera projektet med extraktionsresultat
    await supabase
      .from('projekt')
      .update({
        analys_komplett: resultat.analys_komplett,
        saknade_falt: resultat.saknade_kritiska_falt,
        lägsta_konfidens: lägstaKonfidens,
        gron_teknik: resultat.gron_teknik_tillämpligt,
        gron_teknik_typ: resultat.gron_teknik_typ ? [resultat.gron_teknik_typ] : [],
        jämförelse_resultat: resultat as unknown as Record<string, unknown>,
      })
      .eq('id', projektId)

    // Markera alla anbud som extraherade
    await supabase
      .from('anbud')
      .update({ extraktion_status: 'extraherad' })
      .eq('projekt_id', projektId)

    // Logga
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
        steg: 'fu_extraktion',
        status: 'klar',
        meddelande: `Samlad FU-extraktion klar. ${resultat.analys_komplett ? 'Komplett' : 'Ofullständig'}. Konfidens: ${lägstaKonfidens}`,
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
    throw err
  }
}
