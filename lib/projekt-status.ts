import type { Projekt } from '@/lib/types/projekt'

export type CtaTyp =
  | 'starta_analys'
  | 'analyserar'
  | 'slutfor_kalkyl'
  | 'granska_anbud'
  | 'ingen'

export type CtaInfo = {
  typ: CtaTyp
  label: string
  href?: string
  disabled?: boolean
}

export function bestämCta(projekt: Projekt): CtaInfo {
  if (
    projekt.pipeline_status === 'inskickat' ||
    projekt.pipeline_status === 'tilldelning'
  ) {
    return { typ: 'ingen', label: '' }
  }

  if (projekt.jämförelse_status === 'pågår') {
    return { typ: 'analyserar', label: 'Analyserar...', disabled: true }
  }

  if (
    projekt.analys_komplett === null &&
    projekt.jämförelse_status === 'ej_startad'
  ) {
    return {
      typ: 'starta_analys',
      label: 'Starta analys →',
      href: `/projekt/${projekt.id}`,
    }
  }

  if (
    projekt.jämförelse_status === 'klar' &&
    projekt.rekommendation_status !== 'klar'
  ) {
    return {
      typ: 'slutfor_kalkyl',
      label: 'Slutför kalkyl →',
      href: `/projekt/${projekt.id}`,
    }
  }

  if (projekt.rekommendation_status === 'klar') {
    return {
      typ: 'granska_anbud',
      label: 'Granska anbud →',
      href: `/projekt/${projekt.id}`,
    }
  }

  return {
    typ: 'starta_analys',
    label: 'Öppna projekt →',
    href: `/projekt/${projekt.id}`,
  }
}

export function hämtaAnbudslägeFrånProjekt(projekt: Projekt) {
  return projekt.kravmatchning?.anbudsläge ?? null
}
