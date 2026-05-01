'use client'

import type { ComponentType } from 'react'

export type KpiKortProps = {
  label: string
  value: string | number
  sub?: string
  färg?: 'amber' | 'green' | 'red' | 'orange' | 'blue' | 'neutral'
  ikon?: ComponentType<{ size?: number; weight?: 'bold' }>
}

const färgMap = {
  amber: 'var(--light-amber)',
  green: 'var(--light-green)',
  red: 'var(--light-red)',
  orange: 'var(--light-orange)',
  blue: 'var(--light-blue)',
  neutral: 'var(--light-t3)',
}

export default function KpiKort({ label, value, sub, färg = 'neutral', ikon: Ikon }: KpiKortProps) {
  return (
    <div
      style={{
        background: 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderRadius: 12,
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: färgMap[färg],
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            color: 'var(--light-t4)',
          }}
        >
          {label}
        </div>
        {Ikon && <Ikon size={16} weight="bold" />}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '-.03em',
          color: 'var(--light-t1)',
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>

      {sub && (
        <div style={{ fontSize: 13, color: 'var(--light-t3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
