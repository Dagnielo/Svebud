'use client'

import { Funnel, X } from '@phosphor-icons/react'
import { useState } from 'react'
import type { Anbudsläge, PipelineStatus } from '@/lib/types/projekt'

export type FilterState = {
  pipelineStatus: PipelineStatus | null
  kundtyp: string | null
  anbudsläge: Anbudsläge | null
}

type Props = {
  filter: FilterState
  onChange: (filter: FilterState) => void
}

const tomtFilter: FilterState = {
  pipelineStatus: null,
  kundtyp: null,
  anbudsläge: null,
}

export default function PipelineFilter({ filter, onChange }: Props) {
  const [öppen, setÖppen] = useState(false)
  const aktiva = [filter.pipelineStatus, filter.kundtyp, filter.anbudsläge].filter(Boolean).length

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
          background: aktiva > 0 ? 'var(--light-amber-glow)' : 'var(--light-bg)',
          border: `1px solid ${aktiva > 0 ? 'var(--light-amber-border)' : 'var(--light-border)'}`,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          color: aktiva > 0 ? 'var(--light-amber)' : 'var(--light-t2)',
          cursor: 'pointer',
        }}
      >
        <Funnel size={14} weight="bold" />
        Filtrera{aktiva > 0 ? ` (${aktiva})` : ''}
      </button>

      {öppen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--light-bg)',
            border: '1px solid var(--light-border)',
            borderRadius: 12,
            padding: 16,
            minWidth: 240,
            boxShadow: '0 8px 24px rgba(14,27,46,.08)',
            zIndex: 10,
          }}
        >
          <FilterGrupp
            label="Pipeline"
            options={[
              { value: 'inkorg', label: 'Inkorg' },
              { value: 'under_arbete', label: 'Under arbete' },
              { value: 'inskickat', label: 'Inskickat' },
              { value: 'tilldelning', label: 'Tilldelning' },
            ]}
            value={filter.pipelineStatus}
            onChange={(v) => onChange({ ...filter, pipelineStatus: v as PipelineStatus | null })}
          />
          <FilterGrupp
            label="Kundtyp"
            options={[
              { value: 'BRF', label: 'BRF' },
              { value: 'Fastighet', label: 'Fastighet' },
              { value: 'Industri', label: 'Industri' },
              { value: 'Service', label: 'Service' },
            ]}
            value={filter.kundtyp}
            onChange={(v) => onChange({ ...filter, kundtyp: v })}
          />
          <FilterGrupp
            label="Anbudsläge"
            options={[
              { value: 'STARKT_LÄGE', label: 'Starkt' },
              { value: 'BRA_LÄGE', label: 'Bra' },
              { value: 'OSÄKERT_LÄGE', label: 'Osäkert' },
              { value: 'SVÅRT_LÄGE', label: 'Svårt' },
            ]}
            value={filter.anbudsläge}
            onChange={(v) => onChange({ ...filter, anbudsläge: v as Anbudsläge | null })}
          />
          {aktiva > 0 && (
            <button
              type="button"
              onClick={() => onChange(tomtFilter)}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid var(--light-border)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--light-t3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <X size={12} weight="bold" /> Rensa filter
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FilterGrupp({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--light-t4)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {options.map((opt) => {
          const aktiv = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(aktiv ? null : opt.value)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${aktiv ? 'var(--light-amber-border)' : 'var(--light-border)'}`,
                background: aktiv ? 'var(--light-amber-glow)' : 'var(--light-bg)',
                color: aktiv ? 'var(--light-amber)' : 'var(--light-t3)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
