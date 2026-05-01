'use client'

import { ReactNode } from 'react'

type SidePanelProps = {
  title: string
  children: ReactNode
  räknare?: number
  bgFärg?: string
}

export default function SidePanel({ title, children, räknare, bgFärg }: SidePanelProps) {
  return (
    <div
      style={{
        background: bgFärg ?? 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--muted-custom)',
          marginBottom: 12,
        }}
      >
        {title}
        {typeof räknare === 'number' && ` (${räknare})`}
      </div>
      {children}
    </div>
  )
}
