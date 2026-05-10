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
        background: bgFärg ?? 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        boxShadow: '0 1px 2px rgba(14,27,46,.04)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--light-t3)',
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
