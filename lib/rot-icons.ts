import type { Icon } from '@phosphor-icons/react'
import {
  Wrench,
  Lightning,
  Sun,
  BatteryCharging,
  Minus,
} from '@phosphor-icons/react'
import type { RotTyp } from './rot-regler'

export const ROT_TYP_ICON: Record<RotTyp, Icon> = {
  rot: Wrench,
  gronteknik_laddbox: Lightning,
  gronteknik_solceller: Sun,
  gronteknik_batteri: BatteryCharging,
  ej_rot: Minus,
}
