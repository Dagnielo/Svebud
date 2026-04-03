'use client'

import Link from 'next/link'

type Projekt = {
  id: string
  namn: string
  beskrivning: string | null
  jämförelse_status: string
  rekommendation_status: string
  analys_komplett: boolean | null
  tier: string
  skapad: string
}

type Props = {
  projekt: Projekt
  deadline?: string | null
  antalAnbud?: number
}

function getSteg(p: Projekt) {
  return [
    { done: true },
    { done: p.jämförelse_status !== 'ej_startad' || p.analys_komplett !== null },
    { done: p.jämförelse_status === 'klar' },
    { done: p.rekommendation_status === 'klar' },
  ]
}

function dagarSedanSkapad(skapad: string) {
  const diff = Date.now() - new Date(skapad).getTime()
  const dagar = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (dagar === 0) return 'Idag'
  if (dagar === 1) return 'Igår'
  return `${dagar}d sedan`
}

function DeadlineChip({ deadline }: { deadline: string }) {
  const d = new Date(deadline)
  const dagar = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  let bg: string, color: string, text: string
  if (dagar < 0) {
    bg = 'var(--red-bg)'; color = 'var(--red)'; text = `${Math.abs(dagar)}d försenad`
  } else if (dagar <= 3) {
    bg = 'var(--red-bg)'; color = 'var(--red)'; text = `${dagar}d kvar`
  } else if (dagar <= 7) {
    bg = 'var(--orange-bg)'; color = 'var(--orange)'; text = `${dagar}d kvar`
  } else {
    bg = 'var(--green-bg)'; color = 'var(--green)'; text = `${dagar}d kvar`
  }

  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: bg, color }}>
      🕐 {text}
    </span>
  )
}

export default function ProjektKort({ projekt, deadline, antalAnbud }: Props) {
  const steg = getSteg(projekt)
  const aktivtSteg = steg.findIndex(s => !s.done)

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
        {/* Top */}
        <div className="flex items-start justify-between" style={{ marginBottom: 10 }}>
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
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              marginTop: 3,
              background:
                projekt.analys_komplett === false
                  ? 'var(--orange)'
                  : projekt.rekommendation_status === 'klar'
                    ? 'var(--green)'
                    : 'var(--blue-accent)',
            }}
          />
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 10 }}>
          {deadline && <DeadlineChip deadline={deadline} />}
          {antalAnbud !== undefined && antalAnbud > 0 && (
            <span
              style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(74,158,255,0.1)', color: 'var(--blue-accent)',
              }}
            >
              📄 {antalAnbud} anbud
            </span>
          )}
          <span
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              background: 'var(--navy)', color: 'var(--muted-custom)',
            }}
          >
            Steg {aktivtSteg === -1 ? steg.length : aktivtSteg + 1}/{steg.length}
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

        {/* Go/No-Go badge */}
        {projekt.analys_komplett === false && (
          <span
            style={{
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 5,
              background: 'var(--orange-bg)', color: 'var(--orange)',
            }}
          >
            ⚠ Komplettera
          </span>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--navy-border)' }}
        >
          <div className="flex gap-1">
            {steg.map((s, i) => (
              <div
                key={i}
                style={{
                  width: 20, height: 4, borderRadius: 2,
                  background: s.done ? 'var(--green)' : i === aktivtSteg ? 'var(--yellow)' : 'var(--steel)',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted-custom)', fontWeight: 600 }}>→</span>
        </div>
      </div>
    </Link>
  )
}

export type { Projekt }
