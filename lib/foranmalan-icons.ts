import type { Icon } from '@phosphor-icons/react'
import {
  Lightning,
  Sun,
  BatteryCharging,
  Thermometer,
  Bathtub,
  Crane,
  PlugCharging,
  Buildings,
  Wrench,
  Trophy,
  ClipboardText,
  CheckCircle,
  Hammer,
  PaperPlaneTilt,
  SealCheck,
} from '@phosphor-icons/react'
import type { JobbTypId, StegId } from './foranmalan-regler'

export const FORANMALAN_JOBBTYP_ICON: Record<JobbTypId, Icon> = {
  laddinfrastruktur: Lightning,
  solceller: Sun,
  batterilager: BatteryCharging,
  varmepump: Thermometer,
  spabad_bastu: Bathtub,
  ny_anslutning: Crane,
  sakringshojning: PlugCharging,
  stamrenovering: Buildings,
  service_underhall: Wrench,
}

export const FORANMALAN_STEG_ICON: Record<StegId, Icon> = {
  vunnet: Trophy,
  fore: ClipboardText,
  medgivande: CheckCircle,
  installation: Hammer,
  fardig: PaperPlaneTilt,
  klar: SealCheck,
}
