export type PipelineStatus = 'inkorg' | 'under_arbete' | 'inskickat' | 'tilldelning'
export type TilldelningStatus = 'vantar' | 'vunnet' | 'förlorat'
export type ProcessStatus = 'ej_startad' | 'pågår' | 'klar' | 'fel'

export type Anbudsläge = 'STARKT_LÄGE' | 'BRA_LÄGE' | 'OSÄKERT_LÄGE' | 'SVÅRT_LÄGE'

export type Kravmatchning = {
  anbudsläge?: Anbudsläge
  match_procent?: number
  sammanfattning?: string
  matchade_krav?: unknown[]
  kräver_bekräftelse?: unknown[]
  ej_uppfyllda?: unknown[]
  [key: string]: unknown
}

export type Projekt = {
  id: string
  namn: string
  beskrivning: string | null
  tier: string
  skapad: string
  deadline?: string | null

  jämförelse_status: ProcessStatus
  rekommendation_status: ProcessStatus
  analys_komplett: boolean | null

  pipeline_status?: PipelineStatus | null
  tilldelning_status?: TilldelningStatus | null

  tilldelning_datum?: string | null
  tilldelning_notering?: string | null
  vinnande_pris?: number | null
  skickat_datum?: string | null

  kravmatchning?: Kravmatchning | null
}

/**
 * Inskickning — versionshistorik-rad för anbudsutkast (detaljvyn).
 */
export type Inskickning = {
  datum: string
  version: number
  kommentar?: string
  utkast?: string
}

/**
 * ProjektDetalj — utökad typ för detaljvyn (/projekt/[id]).
 * Innehåller alla fält från Projekt PLUS detaljvy-specifika fält som
 * AI-genererat innehåll, inskickning-historik och anbudsutkast.
 *
 * OBS: Använd Projekt för listvyer (Pipeline, Alla projekt).
 * Använd ProjektDetalj endast i detaljvyn.
 */
export type ProjektDetalj = Projekt & {
  rekommendation: unknown
  anbudsutkast: string | null
  anbudsutkast_redigerat: string | null
  inskickningar: Inskickning[] | null
  uppdaterad: string | null
}
