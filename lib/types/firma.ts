/**
 * Typer för Profil-systemet (Etapp A).
 * Speglar schemat i supabase/migrations/012_firma_profil.sql.
 *
 * VIKTIGT: Kolumnnamn med svenska tecken (åäö) måste matcha DB-schemat
 * EXAKT — inga antaganden, ingen översättning till engelska.
 */

// Källor enligt CHECK-constraint i firma_egenskap_källa
export type EgenskapsKälla =
  | 'bolagsverket'
  | 'scb'
  | 'skatteverket'
  | 'ai_extraherat'
  | 'manuellt'

export type FirmaProfil = {
  id: string
  användar_id: string

  // Auto-hämtat från Bolagsverket / SCB / Skatteverket
  organisationsnummer: string
  företagsnamn: string
  adress: string | null
  postnummer: string | null
  ort: string | null
  sni_kod: string | null
  sni_beskrivning: string | null
  antal_anställda: number | null
  omsättning_senaste_år: number | null  // BIGINT i DB → number i TS
  f_skatt_registrerad: boolean | null
  moms_registrerad: boolean | null
  bolagsverket_senast_hämtat: string | null  // TIMESTAMPTZ → ISO string

  // Manuellt bekräftat / uppdaterat
  antal_montörer: number | null
  verksamhetsområde_radie_km: number  // har default 50
  kollektivavtal: string | null
  miljöpolicy_text: string | null
  kvalitetspolicy_text: string | null
  logotyp_url: string | null
  företagspresentation: string | null

  // Beräknad
  profilstyrka_procent: number  // har default 0

  skapad: string  // ISO string
  uppdaterad: string  // ISO string
}

export type FirmaEgenskapKälla = {
  firma_id: string
  fält_namn: string
  källa: EgenskapsKälla
  hämtat: string  // ISO string
}

/**
 * Map från fält-namn till källa, för UI-rendering av källtaggar.
 * Byggs upp client-side från array av FirmaEgenskapKälla.
 */
export type KällMap = Record<string, EgenskapsKälla>

/**
 * Output från Bolagsverket-agenten — subset av FirmaProfil med
 * bara fälten som hämtas externt.
 */
export type BolagsverketData = Pick<
  FirmaProfil,
  | 'organisationsnummer'
  | 'företagsnamn'
  | 'adress'
  | 'postnummer'
  | 'ort'
  | 'sni_kod'
  | 'sni_beskrivning'
  | 'antal_anställda'
  | 'omsättning_senaste_år'
  | 'f_skatt_registrerad'
  | 'moms_registrerad'
>
