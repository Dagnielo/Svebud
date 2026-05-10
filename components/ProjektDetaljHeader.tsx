'use client'

import { useRouter } from 'next/navigation'
import type { ProjektDetalj } from '@/lib/types/projekt'
import { ArrowLeft, Calendar } from '@phosphor-icons/react'

type ProjektDetaljHeaderProps = {
  projekt: ProjektDetalj
  bedömning: { kort: string; färg: string; bgFärg: string } | null
  matchProcent: number | null
  aktivTab: string
  visaSnabboffert: boolean
  kundtyp: string | null
  onDeadlineChange: (deadline: string | null) => void
}

export default function ProjektDetaljHeader({
  projekt,
  bedömning,
  matchProcent,
  aktivTab,
  visaSnabboffert,
  kundtyp,
  onDeadlineChange,
}: ProjektDetaljHeaderProps) {
  const router = useRouter()

  return (
    <div style={{ background: 'var(--light-bg)', borderBottom: '1px solid var(--light-border)', padding: '20px 32px' }}>
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            fontSize: 12,
            color: 'var(--light-t2)',
            fontWeight: 600,
            background: 'transparent',
            border: '1px solid var(--light-border)',
            borderRadius: 6,
            padding: '4px 10px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={12} weight="bold" />
          Tillbaka
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--light-t1)' }}>
              {projekt.namn}
            </h1>
            {kundtyp && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--light-cream)',
                  border: '1px solid var(--light-border)',
                  color: 'var(--light-t2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {kundtyp}
              </span>
            )}
            {visaSnabboffert && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--light-green-bg)',
                  border: '1px solid var(--light-green)',
                  color: 'var(--light-green)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Snabboffert
              </span>
            )}
            {bedömning && aktivTab !== 'foranmalan' && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 5,
                  background: bedömning.bgFärg,
                  color: bedömning.färg,
                }}
              >
                {bedömning.kort} {matchProcent !== null ? `${matchProcent}%` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
            {projekt.beskrivning && (
              <p style={{ fontSize: 12, color: 'var(--light-t3)', margin: 0 }}>{projekt.beskrivning}</p>
            )}
            {projekt.skapad && (
              <span style={{ fontSize: 11, color: 'var(--light-t4)' }}>
                Skapad {new Date(projekt.skapad).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        {/* Deadline — dölj på föranmälan-fliken */}
        {aktivTab !== 'foranmalan' && (
          <div className="flex items-center gap-1.5">
            <Calendar size={14} weight="bold" color="var(--light-t3)" />
            {!projekt.deadline && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--light-amber)', marginRight: 4 }}>
                Sätt deadline →
              </span>
            )}
            <input
              type="date"
              value={projekt.deadline ?? ''}
              onChange={(e) => onDeadlineChange(e.target.value || null)}
              style={{
                background: 'var(--light-bg)',
                border: projekt.deadline ? '1px solid var(--light-border)' : '1px dashed var(--light-amber)',
                borderRadius: 6,
                color: projekt.deadline ? 'var(--light-t1)' : 'var(--light-amber)',
                fontSize: 12,
                padding: '4px 8px',
                cursor: 'pointer',
                colorScheme: 'light',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
