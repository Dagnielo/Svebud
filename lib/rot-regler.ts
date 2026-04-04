// Källreferenser:
// Skatteverket: https://skatteverket.se/privat/fastigheterochbostad/rotavdrag.html
// ELNÄT 2025 K / Energiföretagen
// Elinstallatören.se branschguide

export const ROT_REGLER = {
  // 2026: återgång till ordinarie nivå efter tillfällig höjning 2025
  avdragsprocent: {
    rot: 0.30,        // ROT: 30% av arbetskostnad
    gronteknik: {
      solceller: 0.20,     // 20% av arbete+material
      laddbox: 0.15,       // 15% från 1 juli 2025 (tidigare 20%)
      batteri: 0.20,       // 20% av arbete+material
    }
  },
  maxPerPerson: 50000,     // kr/år
  maxRotRutTotalt: 75000,  // kr/år inkl RUT
  gällerFrån: '2026-01-01',
  källa: 'https://skatteverket.se/privat/fastigheterochbostad/rotavdrag.html'
} as const

export type RotTyp = 'rot' | 'gronteknik_solceller' | 'gronteknik_laddbox' | 'gronteknik_batteri' | 'ej_rot'
export type FastighetsTyp = 'villa' | 'brf' | 'agarlagh' | 'fritidshus'

export interface RotKalkylInput {
  aktiverat: boolean
  typ: RotTyp
  antalAgare: number       // 1 eller 2
  tidligareUtnyttjat: number  // kr som redan använts detta år
  fastighetstyp: FastighetsTyp
  // Kalkylrader
  arbeteExMoms: number     // Total arbetskostnad exkl moms
  materialExMoms: number   // Total materialkostnad exkl moms
}

export interface RotKalkylResultat {
  totalExMoms: number
  totalInkMoms: number
  rotUnderlag: number      // Det belopp avdraget beräknas på
  rotBelopp: number        // Avdragets storlek
  kundBetalar: number
  kvarvarandeUtrymme: number
  takNåttVarning: boolean
  fastighetsVarning: string | null
  kälLänk: string | null
}

export function beräknaROT(input: RotKalkylInput): RotKalkylResultat {
  const totalExMoms = input.arbeteExMoms + input.materialExMoms
  const totalInkMoms = totalExMoms * 1.25

  if (!input.aktiverat || input.typ === 'ej_rot') {
    return {
      totalExMoms,
      totalInkMoms,
      rotUnderlag: 0,
      rotBelopp: 0,
      kundBetalar: totalInkMoms,
      kvarvarandeUtrymme: ROT_REGLER.maxPerPerson * input.antalAgare - input.tidligareUtnyttjat,
      takNåttVarning: false,
      fastighetsVarning: null,
      kälLänk: null
    }
  }

  // Beräkna underlag och procent
  let underlag = 0
  let procent = 0

  if (input.typ === 'rot') {
    // ROT: 30% på arbetskostnad inkl moms
    underlag = input.arbeteExMoms * 1.25
    procent = ROT_REGLER.avdragsprocent.rot
  } else if (input.typ === 'gronteknik_solceller') {
    // Grön teknik solceller: 20% på arbete + material inkl moms
    underlag = totalInkMoms
    procent = ROT_REGLER.avdragsprocent.gronteknik.solceller
  } else if (input.typ === 'gronteknik_laddbox') {
    underlag = totalInkMoms
    procent = ROT_REGLER.avdragsprocent.gronteknik.laddbox
  } else if (input.typ === 'gronteknik_batteri') {
    underlag = totalInkMoms
    procent = ROT_REGLER.avdragsprocent.gronteknik.batteri
  }

  const maxUtrymme = ROT_REGLER.maxPerPerson * input.antalAgare - input.tidligareUtnyttjat
  const beräknatBelopp = Math.round(underlag * procent)
  const rotBelopp = Math.min(beräknatBelopp, Math.max(0, maxUtrymme))
  const takNåttVarning = beräknatBelopp > maxUtrymme

  // Fastighetsvarningar
  let fastighetsVarning: string | null = null
  if (input.fastighetstyp === 'brf' && input.typ === 'rot') {
    fastighetsVarning = 'BRF: Avdraget gäller bara arbete inuti lägenheten som BRF-stadgarna lägger på ägaren (t.ex. el inuti lägenhet, ej gemensamma utrymmen).'
  }
  if (input.fastighetstyp === 'brf' && input.typ.startsWith('gronteknik')) {
    fastighetsVarning = 'BRF: Grön teknik-avdrag kan kräva separat elabonnemang för bostadsdelen. Kontrollera med Skatteverket.'
  }

  return {
    totalExMoms,
    totalInkMoms,
    rotUnderlag: Math.round(underlag),
    rotBelopp,
    kundBetalar: Math.round(totalInkMoms - rotBelopp),
    kvarvarandeUtrymme: maxUtrymme,
    takNåttVarning,
    fastighetsVarning,
    kälLänk: ROT_REGLER.källa
  }
}

export const ROT_TYPER = [
  {
    id: 'rot' as RotTyp,
    label: 'ROT-avdrag',
    emoji: '🔧',
    procent: '30%',
    underlag: 'Arbetskostnad inkl moms',
    beskrivning: 'Gäller reparation, ombyggnad och tillbyggnad av bostad.',
    lämpligFör: ['stamrenovering', 'elcentral', 'service'],
    källa: 'https://skatteverket.se/privat/fastigheterochbostad/rotavdrag.html'
  },
  {
    id: 'gronteknik_laddbox' as RotTyp,
    label: 'Grön teknik — Laddbox',
    emoji: '⚡',
    procent: '15%',
    underlag: 'Arbete + material inkl moms',
    beskrivning: 'Fast ansluten laddbox i eller i anslutning till bostad.',
    lämpligFör: ['laddbox', 'laddinfrastruktur'],
    källa: 'https://skatteverket.se/privat/fastigheterochbostad/gronteknikanlaggningar.html'
  },
  {
    id: 'gronteknik_solceller' as RotTyp,
    label: 'Grön teknik — Solceller',
    emoji: '☀️',
    procent: '20%',
    underlag: 'Arbete + material inkl moms',
    beskrivning: 'Nätanslutet solcellssystem på bostad.',
    lämpligFör: ['solceller'],
    källa: 'https://skatteverket.se/privat/fastigheterochbostad/gronteknikanlaggningar.html'
  },
  {
    id: 'gronteknik_batteri' as RotTyp,
    label: 'Grön teknik — Batteri',
    emoji: '🔋',
    procent: '20%',
    underlag: 'Arbete + material inkl moms',
    beskrivning: 'Lagringsbatteri kopplat till befintliga solceller.',
    lämpligFör: ['batteri', 'energilager'],
    källa: 'https://skatteverket.se/privat/fastigheterochbostad/gronteknikanlaggningar.html'
  },
  {
    id: 'ej_rot' as RotTyp,
    label: 'Inget avdrag',
    emoji: '🏢',
    procent: '–',
    underlag: '–',
    beskrivning: 'B2B-kund, hyresrätt eller arbete som ej berättigar till avdrag.',
    lämpligFör: ['alla_b2b'],
    källa: null
  }
] as const
