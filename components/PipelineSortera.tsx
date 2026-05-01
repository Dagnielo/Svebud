'use client'

import { ArrowsDownUp } from '@phosphor-icons/react'
import { useState } from 'react'

export type SorteringNyckel = 'deadline' | 'värde' | 'anbudsläge' | 'skapad'

type Props = {
  värde: SorteringNyckel
  onChange: (v: SorteringNyckel) => void
}

const alternativ: { värde: SorteringNyckel; label: string }[] = [
  { värde: 'deadline', label: 'Deadline' },
  { värde: 'skapad', label: 'Senast skapad' },
  { värde: 'anbudsläge', label: 'Anbudsläge' },
  { värde: 'värde', label: 'Värde' },
]

export default function PipelineSortera({ värde, onChange }: Props) {
  const [öppen, setÖppen] = useState(false)
  const aktivLabel = alternativ.find((a) => a.värde === värde)?.label ?? 'Deadline'

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setÖppen(!öppen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: 'var(--light-bg)',
          border: '1px solid var(--light-border)',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--light-t2)',
          cursor: 'pointer',
        }}
      >
        <ArrowsDownUp size={14} weight="bold" />
        Sortera: {aktivLabel}
      </button>
      {öppen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--light-bg)',
            border: '1px solid var(--light-border)',
            borderRadius: 8,
            padding: 4,
            minWidth: 160,
            boxShadow: '0 8px 24px rgba(14,27,46,.08)',
            zIndex: 10,
          }}
        >
          {alternativ.map((opt) => (
            <button
              key={opt.värde}
              type="button"
              onClick={() => {
                onChange(opt.värde)
                setÖppen(false)
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: opt.värde === värde ? 'var(--light-amber-glow)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                color: opt.värde === värde ? 'var(--light-amber)' : 'var(--light-t2)',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
