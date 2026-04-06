import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { parseClaudeJSON } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type GranskningsPunkt = {
  kategori: 'pris' | 'fullständighet' | 'språk' | 'juridik' | 'rot' | 'risk'
  allvarlighet: 'bra' | 'tips' | 'varning' | 'fel'
  titel: string
  beskrivning: string
  åtgärd: string | null
}

export type KvalitetsResultat = {
  betyg: number // 1-10
  sammanfattning: string
  punkter: GranskningsPunkt[]
  // Statistik
  antal_bra: number
  antal_tips: number
  antal_varningar: number
  antal_fel: number
}

const SYSTEM_PROMPT = `Du är en erfaren anbudskonsult som granskar anbud/offerter för svenska elfirmor.

Du ska granska anbudsutkastet och ge ett kvalitetsbetyg 1-10 samt konkreta punkter.

VIKTIGT — FLAGGA INTE dessa saker (de hanteras automatiskt av systemet):
- Momsberäkning — beräknas automatiskt av systemet, aldrig fel
- Kalkylsummor och prisbelopp — den separata kalkyltabellen styr, INTE siffror i löptexten
- Skillnader mellan kalkyl och löptext — kalkylen är separat och korrekt, texten är sekundär
- Timmar, material och totalsummor — dessa hanteras av kalkyltabellen
- Beställarens kontaktuppgifter — dessa läggs till separat av användaren
- Elfirmans e-postadress och kontaktperson — det är deras verkliga uppgifter, inte ett "fel"
- ROT-avdrag — hanteras av en separat ROT-modul, inte i anbudstexten

GRANSKA FÖLJANDE OMRÅDEN:

1. PRISER
- Är timpriser rimliga för el-branschen? (Standard: 550-850 kr/tim, Jour: 800-1200 kr/tim)
- Är materialkostnader realistiska för typen av arbete?
- Är totalpriset rimligt för uppdragets omfattning?

2. FULLSTÄNDIGHET
- Finns tydlig uppdragsbeskrivning?
- Finns "Vad ingår" och "Vad ingår inte"?
- Finns förutsättningar för priset?
- Finns betalningsvillkor?
- Finns garantivillkor?
- Finns datum och giltighetstid?

3. SPRÅK & TON
- Är texten skriven i klarspråk som en BRF-ordförande förstår?
- Undviks onödig branschjargong utan förklaring?
- Är tonen professionell men tillgänglig?
- Finns stavfel eller grammatiska fel?

4. JURIDIK & RISKER
- Finns standardförbehåll?
- Finns det risk för oklara åtaganden som kan leda till tvist?
- Är "ingår inte"-listan tillräckligt tydlig för att undvika missförstånd?
- Bör ansvarsbegränsning övervägas för projektets storlek?

5. ROT/GRÖN TEKNIK (om tillämpligt)
- Om ROT/Grön teknik nämns i texten, stämmer procentsatserna?
- Finns disclaimer om kundens ansvar vid avdrag?
- Om det INTE nämns trots att det borde (BRF + privatperson) — ge tips

ALLVARLIGHETSGRADER:
- "bra": Något som är bra gjort och bör behållas
- "tips": Förbättringsförslag som inte är kritiskt
- "varning": Bör åtgärdas innan inskickning
- "fel": Måste åtgärdas — risk för problem

BETYG 1-10:
- 9-10: Utmärkt — redo att skicka
- 7-8: Bra — några förbättringar möjliga
- 5-6: Godkänt — flera saker bör åtgärdas
- 3-4: Bristfälligt — behöver omarbetas
- 1-2: Allvarliga brister

Returnera ENDAST giltig JSON:
{
  "betyg": N,
  "sammanfattning": "2-3 meningar",
  "punkter": [
    {
      "kategori": "pris"|"fullständighet"|"språk"|"juridik"|"rot"|"risk",
      "allvarlighet": "bra"|"tips"|"varning"|"fel",
      "titel": "Kort titel",
      "beskrivning": "Förklaring av problemet eller det positiva",
      "åtgärd": "Konkret förslag på hur man åtgärdar (null om 'bra')"
    }
  ],
  "antal_bra": N,
  "antal_tips": N,
  "antal_varningar": N,
  "antal_fel": N
}`

export async function granskAnbud(projektId: string): Promise<KvalitetsResultat> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projekt } = await supabase
    .from('projekt')
    .select('*')
    .eq('id', projektId)
    .single() as { data: any }

  if (!projekt) throw new Error('Projekt hittades inte')

  const utkast = projekt.anbudsutkast_redigerat ?? projekt.anbudsutkast
  if (!utkast) throw new Error('Inget anbudsutkast att granska')

  // Hämta kalkyldata om det finns
  const kalkyl = projekt.rekommendation?.kalkyl
  const kalkylText = kalkyl
    ? `\n\nKALKYL:\n${JSON.stringify(kalkyl, null, 2)}`
    : ''

  // Hämta ROT-data
  const rotText = projekt.rot_aktiverat
    ? `\n\nROT-DATA:\nTyp: ${projekt.rot_typ}\nBelopp: ${projekt.rot_belopp} kr\nKund betalar: ${projekt.rot_kund_betalar} kr`
    : ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Granska detta anbudsutkast för projektet "${projekt.namn}":

ANBUDSUTKAST:
${utkast}
${kalkylText}
${rotText}

Ge ett kvalitetsbetyg och konkreta förbättringspunkter.`
    }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Oväntat svar')

  return parseClaudeJSON<KvalitetsResultat>(content.text)
}
