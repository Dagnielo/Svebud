'use client'

import { Warning, Check } from '@phosphor-icons/react'
import { FORANMALAN_JOBBTYP_ICON } from '@/lib/foranmalan-icons'
import type { JobbTypId } from '@/lib/foranmalan-regler'

export function ForanmalanIkon({ id, size = 24 }: { id: JobbTypId; size?: number }) {
  const Icon = FORANMALAN_JOBBTYP_ICON[id]
  return <Icon size={size} weight="bold" />
}

export function KravBadgeIkon({ kravs, size = 11 }: { kravs: boolean; size?: number }) {
  const Icon = kravs ? Warning : Check
  return <Icon size={size} weight="bold" />
}
