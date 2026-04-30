/**
 * Profilstyrka — beräknar 0-100% baserat på ifyllda fält i profiler-tabellen.
 *
 * Etapp A av Profil-systemet (steg 6 av 7).
 *
 * Spec: docs/PROMPT_profil_v1.md (Etapp A) — anpassad till verkligt schema.
 * Totalt 21 datapunkter över 7 kategorier.
 */

export type ProfilstyrkaInput = {
  // Grunddata (5p)
  företag?: string | null
  org_nr?: string | null
  adress?: string | null
  postnr?: string | null
  ort?: string | null

  // Företagsuppgifter (4p)
  telefon?: string | null
  antal_montorer?: number | null
  omsattning_msek?: number | null
  region?: string | null

  // Timpriser (3p)
  timpris_standard?: number | null
  timpris_jour?: number | null
  timpris_ob?: number | null

  // Företagsbeskrivning (2p)
  webbadress?: string | null
  företagsbeskrivning?: string | null

  // JSONB-arrays
  kontaktpersoner?: unknown[] | null  // 2p
  referensprojekt?: unknown[] | null  // 2p

  // JSONB-objekt med flera nycklar
  anbudsinstallningar?: {
    betalningsvillkor?: string
    garanti?: string
    avtalsvillkor?: string
  } | null  // 3p
}

export type ProfilstyrkaResultat = {
  procent: number              // 0-100
  poäng: number                // 0-21
  maxPoäng: number             // 21
  saknadeKategorier: string[]  // För UI-tip "Lägg till X för +Yp"
}

const fyllt = (v: unknown): boolean =>
  v !== null && v !== undefined && v !== '' && (typeof v !== 'number' || v > 0)

const fylltMin = (v: string | null | undefined, minLängd: number): boolean =>
  typeof v === 'string' && v.trim().length >= minLängd

export function beräknaProfilstyrka(input: ProfilstyrkaInput): ProfilstyrkaResultat {
  let poäng = 0
  const saknade: string[] = []

  // Grunddata (5p) — 1p per fält
  let grunddataPoäng = 0
  if (fyllt(input.företag)) grunddataPoäng++
  if (fyllt(input.org_nr)) grunddataPoäng++
  if (fyllt(input.adress)) grunddataPoäng++
  if (fyllt(input.postnr)) grunddataPoäng++
  if (fyllt(input.ort)) grunddataPoäng++
  poäng += grunddataPoäng
  if (grunddataPoäng < 5) saknade.push(`Grunddata (${grunddataPoäng}/5)`)

  // Företagsuppgifter (4p) — 1p per fält
  let företagsPoäng = 0
  if (fyllt(input.telefon)) företagsPoäng++
  if (fyllt(input.antal_montorer)) företagsPoäng++
  if (fyllt(input.omsattning_msek)) företagsPoäng++
  if (fyllt(input.region)) företagsPoäng++
  poäng += företagsPoäng
  if (företagsPoäng < 4) saknade.push(`Företagsuppgifter (${företagsPoäng}/4)`)

  // Timpriser (3p) — 1p per fält
  let timprisPoäng = 0
  if (fyllt(input.timpris_standard)) timprisPoäng++
  if (fyllt(input.timpris_jour)) timprisPoäng++
  if (fyllt(input.timpris_ob)) timprisPoäng++
  poäng += timprisPoäng
  if (timprisPoäng < 3) saknade.push(`Timpriser (${timprisPoäng}/3)`)

  // Kontaktpersoner (2p) — min 1 = 1p, min 2 = 2p
  const antalKontakter = Array.isArray(input.kontaktpersoner) ? input.kontaktpersoner.length : 0
  let kontaktPoäng = 0
  if (antalKontakter >= 1) kontaktPoäng++
  if (antalKontakter >= 2) kontaktPoäng++
  poäng += kontaktPoäng
  if (kontaktPoäng < 2) saknade.push(`Kontaktpersoner (${kontaktPoäng}/2)`)

  // Företagsbeskrivning (2p) — webbadress + beskrivning ≥50 tecken
  let beskrivningsPoäng = 0
  if (fyllt(input.webbadress)) beskrivningsPoäng++
  if (fylltMin(input.företagsbeskrivning, 50)) beskrivningsPoäng++
  poäng += beskrivningsPoäng
  if (beskrivningsPoäng < 2) saknade.push(`Företagsbeskrivning (${beskrivningsPoäng}/2)`)

  // Anbudsinställningar (3p) — 1p per nyckel ifylld
  const ai = input.anbudsinstallningar
  let anbudsPoäng = 0
  if (ai && fyllt(ai.betalningsvillkor)) anbudsPoäng++
  if (ai && fyllt(ai.garanti)) anbudsPoäng++
  if (ai && fyllt(ai.avtalsvillkor)) anbudsPoäng++
  poäng += anbudsPoäng
  if (anbudsPoäng < 3) saknade.push(`Anbudsinställningar (${anbudsPoäng}/3)`)

  // Referensprojekt (2p) — min 1 = 1p, min 3 = 2p
  const antalRef = Array.isArray(input.referensprojekt) ? input.referensprojekt.length : 0
  let refPoäng = 0
  if (antalRef >= 1) refPoäng++
  if (antalRef >= 3) refPoäng++
  poäng += refPoäng
  if (refPoäng < 2) saknade.push(`Referensprojekt (${refPoäng}/2)`)

  const maxPoäng = 21
  const procent = Math.round((poäng / maxPoäng) * 100)

  return { procent, poäng, maxPoäng, saknadeKategorier: saknade }
}
