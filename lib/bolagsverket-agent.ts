/**
 * Bolagsverket-agent — hämtar företagsdata utifrån organisationsnummer.
 *
 * Etapp A använder ENDAST Firecrawl-fallback mot allabolag.se.
 * Bolagsverket-API (gratis tier "API för värdefulla datamängder")
 * pluggas in senare när nyckel ansökts om.
 *
 * Spec: docs/PROMPT_profil_v1.md (Etapp A, rad 134-152)
 */

import FirecrawlApp from '@mendable/firecrawl-js'
import type { BolagsverketData } from '@/lib/types/firma'

const FIRECRAWL_API_KEY = process.env.FIRECRAWLER_API_KEY

if (!FIRECRAWL_API_KEY) {
  console.warn('[bolagsverket-agent] FIRECRAWLER_API_KEY saknas — agent kommer fallera vid körning')
}

const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY ?? '' })

/**
 * Validerar svenskt organisationsnummer (10 siffror, eventuellt med bindestreck).
 * Returnerar normaliserad form: "5564251234" (utan bindestreck).
 */
function normaliseraOrgnr(orgnr: string): string | null {
  const rensad = orgnr.replace(/[\s-]/g, '')
  if (!/^\d{10}$/.test(rensad)) return null
  return rensad
}

/**
 * Hämtar företagsdata från allabolag.se via Firecrawl.
 *
 * @param orgnr Organisationsnummer (10 siffror, med eller utan bindestreck)
 * @returns BolagsverketData eller null om hämtning misslyckas
 * @throws Error vid ogiltigt orgnr-format eller saknad API-nyckel
 */
export async function hämtaFöretagsdata(orgnr: string): Promise<BolagsverketData | null> {
  const normaliserat = normaliseraOrgnr(orgnr)
  if (!normaliserat) {
    throw new Error(`Ogiltigt organisationsnummer: "${orgnr}". Förväntat 10 siffror.`)
  }
  if (!FIRECRAWL_API_KEY) {
    throw new Error('FIRECRAWLER_API_KEY saknas i environment')
  }

  const url = `https://www.allabolag.se/${normaliserat}`

  try {
    const result = await firecrawl.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: true,
    })

    if (!result.markdown) {
      console.error('[bolagsverket-agent] Firecrawl returnerade ingen markdown', result)
      return null
    }

    return parseAllabolagMarkdown(result.markdown, normaliserat)
  } catch (err) {
    console.error('[bolagsverket-agent] Firecrawl-fel:', err)
    return null
  }
}

/**
 * Parsar allabolag.se-markdown och extraherar BolagsverketData-fält.
 *
 * Regex-baserad — sköra extraktioner. Returnerar null på fält som inte hittas
 * istället för att kasta fel — UI:n visar källtagg "manuellt" som fallback.
 */
function parseAllabolagMarkdown(markdown: string, orgnr: string): BolagsverketData {
  // Företagsnamn — vanligen första H1 eller efter "## " i toppen
  const namnMatch = markdown.match(/^#\s+(.+)$/m) || markdown.match(/^##\s+(.+)$/m)
  const företagsnamn = namnMatch?.[1]?.trim() ?? `Företag ${orgnr}`

  // Adress — söker efter "Adress" eller "Besöksadress" följt av text
  const adressMatch = markdown.match(/(?:Adress|Besöksadress)[:\s]*\n?(.+?)(?:\n|$)/i)
  const adress = adressMatch?.[1]?.trim() ?? null

  // Postnummer + ort — vanligen format "12345 Stockholm"
  const postortMatch = markdown.match(/(\d{3}\s?\d{2})\s+([A-ZÅÄÖa-zåäö\s]+?)(?:\n|$)/)
  const postnummer = postortMatch?.[1]?.replace(/\s/g, '') ?? null
  const ort = postortMatch?.[2]?.trim() ?? null

  // SNI-kod — format "12345 (NN.NNN)" eller "Bransch: 12345"
  const sniKodMatch = markdown.match(/SNI[-\s]*kod[:\s]*(\d{5})/i) ||
                      markdown.match(/Bransch[:\s]*(\d{5})/i)
  const sni_kod = sniKodMatch?.[1] ?? null

  const sniBeskrivningMatch = markdown.match(/SNI[^:]*:\s*\d{5}\s*[-–]?\s*(.+?)(?:\n|$)/i)
  const sni_beskrivning = sniBeskrivningMatch?.[1]?.trim() ?? null

  // Antal anställda — "Anställda: NN" eller liknande
  const anställdaMatch = markdown.match(/(?:Anställda|Antal anställda)[:\s]*(\d+)/i)
  const antal_anställda = anställdaMatch ? parseInt(anställdaMatch[1], 10) : null

  // Omsättning — "Omsättning: X tkr" eller "X kkr"
  const omsättningMatch = markdown.match(/Omsättning[:\s]*(\d[\d\s]*)\s*(tkr|kkr|kr)/i)
  let omsättning_senaste_år: number | null = null
  if (omsättningMatch) {
    const tal = parseInt(omsättningMatch[1].replace(/\s/g, ''), 10)
    const enhet = omsättningMatch[2].toLowerCase()
    omsättning_senaste_år = enhet === 'tkr' || enhet === 'kkr' ? tal * 1000 : tal
  }

  // F-skatt och moms — kollar bara om orden förekommer som "Ja" eller checkmark
  const f_skatt_registrerad = /F[-\s]?skatt[:\s]*(?:Ja|Aktiv|Registrerad|✓)/i.test(markdown)
  const moms_registrerad = /Moms(?:registrerad)?[:\s]*(?:Ja|Aktiv|Registrerad|✓)/i.test(markdown)

  return {
    organisationsnummer: orgnr,
    företagsnamn,
    adress,
    postnummer,
    ort,
    sni_kod,
    sni_beskrivning,
    antal_anställda,
    omsättning_senaste_år,
    f_skatt_registrerad,
    moms_registrerad,
  }
}
