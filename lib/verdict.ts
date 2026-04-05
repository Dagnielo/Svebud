// Anbudsläge — ersätter GO/NO-GO med en 4-gradig, uppmuntrande skala

export type Anbudsläge = 'STARKT_LÄGE' | 'BRA_LÄGE' | 'OSÄKERT_LÄGE' | 'SVÅRT_LÄGE'

/**
 * Beräkna anbudsläge baserat på kravanalys.
 */
export function beräknaAnbudsläge(
  ejUppfylldaSkaKrav: number,
  kräverBekräftelse: number,
  _matchProcent: number
): Anbudsläge {
  if (ejUppfylldaSkaKrav === 0 && kräverBekräftelse <= 2) return 'STARKT_LÄGE'
  if (ejUppfylldaSkaKrav === 0 && kräverBekräftelse > 2) return 'BRA_LÄGE'
  if (ejUppfylldaSkaKrav <= 2) return 'OSÄKERT_LÄGE'
  return 'SVÅRT_LÄGE'
}

/**
 * Migrera gamla GO/NO-GO-värden till Anbudsläge.
 * Hanterar alla varianter som funnits i kodbasen.
 */
export function migreraBedömning(gammalt: string | undefined | null): Anbudsläge | null {
  if (!gammalt) return null
  const v = gammalt.toUpperCase().replace(/-/g, '_')
  if (v === 'GO') return 'STARKT_LÄGE'
  if (v === 'GO_MED_RESERVATION' || v === 'PRELIMINÄRT') return 'BRA_LÄGE'
  if (v === 'NO_GO' || v === 'NO_GO') return 'OSÄKERT_LÄGE'
  // Om det redan är ett Anbudsläge-värde
  if (['STARKT_LÄGE', 'BRA_LÄGE', 'OSÄKERT_LÄGE', 'SVÅRT_LÄGE'].includes(v)) return v as Anbudsläge
  return null
}

/**
 * Hämta anbudsläge från kravmatchning/analysdata med bakåtkompatibilitet.
 */
export function hämtaAnbudsläge(data: Record<string, unknown> | null): Anbudsläge | null {
  if (!data) return null
  // Nytt fält först
  if (data.anbudsläge) return data.anbudsläge as Anbudsläge
  // Fallback till gammalt
  return migreraBedömning(data.go_no_go as string | undefined)
}

/**
 * Visningsdata för ett anbudsläge.
 */
export function bedömningsVisning(bedömning: Anbudsläge): {
  label: string
  kort: string
  färg: string
  bgFärg: string
  beskrivning: string
} {
  switch (bedömning) {
    case 'STARKT_LÄGE':
      return {
        label: 'Starkt läge',
        kort: 'Starkt',
        färg: 'var(--green)',
        bgFärg: 'var(--green-bg)',
        beskrivning: 'Ni uppfyller alla ska-krav och har en stark position att lämna anbud.',
      }
    case 'BRA_LÄGE':
      return {
        label: 'Bra läge',
        kort: 'Bra',
        färg: 'var(--yellow)',
        bgFärg: 'var(--yellow-glow)',
        beskrivning: 'Bra position — några punkter behöver bekräftas innan anbud.',
      }
    case 'OSÄKERT_LÄGE':
      return {
        label: 'Osäkert läge',
        kort: 'Osäkert',
        färg: 'var(--orange)',
        bgFärg: 'var(--orange-bg)',
        beskrivning: 'Några ska-krav saknas. Ni kan fortfarande lämna anbud, men med kända gap.',
      }
    case 'SVÅRT_LÄGE':
      return {
        label: 'Svårt läge',
        kort: 'Svårt',
        färg: 'var(--red)',
        bgFärg: 'var(--red-bg)',
        beskrivning: 'Flera ska-krav saknas. Att lämna anbud innebär stor risk.',
      }
  }
}
