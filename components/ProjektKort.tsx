'use client'

import Link from 'next/link'

type Projekt = {
  id: string
  namn: string
  beskrivning: string | null
  jämförelse_status: string
  rekommendation_status: string
  analys_komplett: boolean | null
  pipeline_status?: string
  tilldelning_status?: string
  tier: string
  skapad: string
}

type Props = {
  projekt: Projekt
}

function dagarSedanSkapad(skapad: string) {
  const diff = Date.now() - new Date(skapad).getTime()
  const dagar = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (dagar === 0) return 'Idag'
  if (dagar === 1) return 'Igår'
  return `${dagar}d sedan`
}

function getPipelineLabel(p: Projekt): string {
  const ps = p.pipeline_status ?? 'inkorg'
  if (ps === 'tilldelning') {
    if (p.tilldelning_status === 'vunnet') return 'Vunnet'
    if (p.tilldelning_status === 'forlorat') return 'Förlorat'
    return 'Väntar på besked'
  }
  if (ps === 'inskickat') return 'Anbud inskickat'
  if (ps === 'under_arbete') return 'Under arbete'
  if (p.analys_komplett !== null) return 'AI-analys klar'
  return 'Väntar på analys'
}

function getStatusDotColor(p: Projekt): string {
  const ps = p.pipeline_status ?? 'inkorg'
  if (ps === 'tilldelning' && p.tilldelning_status === 'vunnet') return 'var(--green)'
  if (ps === 'tilldelning' && p.tilldelning_status === 'forlorat') return 'var(--red)'
  if (ps === 'inskickat') return 'var(--blue-accent)'
  if (ps === 'under_arbete') return 'var(--yellow)'
  if (p.analys_komplett === false) return 'var(--orange)'
  return 'var(--muted-custom)'
}

export default function ProjektKort({ projekt }: Props) {
  return (
    <Link href={`/projekt/${projekt.id}`} className="block" style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--navy-light)',
          border: '1px solid var(--navy-border)',
          borderRadius: 10,
          padding: 14,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <div className="flex items-start justify-between" style={{ marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--white)' }}>
              {projekt.namn}
            </div>
            {projekt.beskrivning && (
              <div style={{ fontSize: 11, color: 'var(--muted-custom)', marginTop: 2 }}>
                {projekt.beskrivning.slice(0, 50)}
              </div>
            )}
          </div>
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%',
              flexShrink: 0, marginTop: 3,
              background: getStatusDotColor(projekt),
            }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              background: 'var(--navy)', color: 'var(--muted-custom)',
            }}
          >
            {getPipelineLabel(projekt)}
          </span>
          <span
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              background: 'var(--navy)', color: 'var(--muted-custom)',
            }}
          >
            {dagarSedanSkapad(projekt.skapad)}
          </span>
        </div>

        {projekt.analys_komplett === false && (
          <span
            style={{
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 5,
              background: 'var(--orange-bg)', color: 'var(--orange)',
            }}
          >
            ⚠ Komplettera
          </span>
        )}

        <div
          className="flex items-center justify-between"
          style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--navy-border)' }}
        >
          <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>Öppna →</span>
        </div>
      </div>
    </Link>
  )
}

export function getPipelineKolumn(p: Projekt): string {
  return p.pipeline_status ?? 'inkorg'
}

export type { Projekt }
