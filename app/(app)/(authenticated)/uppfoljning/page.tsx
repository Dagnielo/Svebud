'use client'

import Link from 'next/link'
import {
  useUppföljningar,
  type Uppföljning,
  type UppföljningState,
  type UppföljningUtfall,
} from '@/lib/hooks/useUppföljningar'
import { EnvelopeOpen, Warning, Tray } from '@phosphor-icons/react'

const STATE_META: Record<UppföljningState, { label: string; färg: string; bg: string }> = {
  anbud_skickat:            { label: 'Skickat',                 färg: 'var(--light-blue)',    bg: 'var(--light-blue-bg)' },
  påminnelse_1_schemalagd:  { label: 'Påminnelse 1 schemalagd', färg: 'var(--light-t3)',      bg: 'var(--light-off)' },
  påminnelse_1_skickad:     { label: 'Påminnelse 1 skickad',    färg: 'var(--light-amber)',   bg: 'var(--light-amber-glow)' },
  påminnelse_2_schemalagd:  { label: 'Påminnelse 2 schemalagd', färg: 'var(--light-t3)',      bg: 'var(--light-off)' },
  påminnelse_2_skickad:     { label: 'Påminnelse 2 skickad',    färg: 'var(--light-orange)',  bg: 'var(--light-orange-bg)' },
  svar_mottaget:            { label: 'Svar mottaget',           färg: 'var(--light-green)',   bg: 'var(--light-green-bg)' },
  vunnet:                   { label: 'Vunnet',                  färg: 'var(--light-green)',   bg: 'var(--light-green-bg)' },
  förlorat:                 { label: 'Förlorat',                färg: 'var(--light-red)',     bg: 'var(--light-red-bg)' },
  avbrutet:                 { label: 'Avbrutet',                färg: 'var(--light-t3)',      bg: 'var(--light-off)' },
}

const UTFALL_META: Record<Exclude<UppföljningUtfall, null>, { label: string; färg: string; bg: string }> = {
  vunnet:     { label: 'Vunnet',     färg: 'var(--light-green)', bg: 'var(--light-green-bg)' },
  förlorat:   { label: 'Förlorat',   färg: 'var(--light-red)',   bg: 'var(--light-red-bg)' },
  inget_svar: { label: 'Inget svar', färg: 'var(--light-t3)',    bg: 'var(--light-off)' },
}

function Badge({ label, färg, bg }: { label: string; färg: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 12,
      background: bg,
      color: färg,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function formateraDatum(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function relativÅtgärd(iso: string | null, nu: number): { text: string; färg: string } {
  if (!iso) return { text: '—', färg: 'var(--light-t3)' }
  const dagar = Math.round((Date.parse(iso) - nu) / (1000 * 60 * 60 * 24))
  if (dagar < 0) {
    const abs = Math.abs(dagar)
    return { text: `Förfallen sedan ${abs} ${abs === 1 ? 'dag' : 'dagar'}`, färg: 'var(--light-red)' }
  }
  if (dagar === 0) return { text: 'Idag', färg: 'var(--light-amber)' }
  return { text: `Om ${dagar} ${dagar === 1 ? 'dag' : 'dagar'}`, färg: 'var(--light-t2)' }
}

const TH_STIL: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--light-t3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
const TD_STIL: React.CSSProperties = {
  padding: '12px',
  fontSize: 13,
  color: 'var(--light-t2)',
  verticalAlign: 'middle',
}

export default function UppföljningarPage() {
  const { uppföljningar, loading, fel, uppdateraUtfall } = useUppföljningar()

  const aktiva = uppföljningar.filter(
    u => !['vunnet', 'förlorat', 'avbrutet'].includes(u.state)
  )
  const avslutade = uppföljningar.filter(
    u => ['vunnet', 'förlorat', 'avbrutet'].includes(u.state)
  )

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--light-cream)' }}>
        <div
          className="flex items-center sticky top-0 z-40"
          style={{
            height: 60,
            background: 'var(--light-bg)',
            borderBottom: '1px solid var(--light-border)',
            padding: '0 32px',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--light-t1)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <EnvelopeOpen size={16} weight="bold" />
            Uppföljningar
          </span>
          {!loading && uppföljningar.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--light-t3)' }}>
              {aktiva.length} aktiva · {avslutade.length} avslutade
            </span>
          )}
        </div>

        <div style={{ padding: '28px 32px', flex: 1 }}>
          {loading && (
            <div className="space-y-3">
              <div className="animate-pulse h-12 rounded-lg" style={{ background: 'var(--light-off)' }} />
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 rounded-lg" style={{ background: 'var(--light-off)' }} />
              ))}
            </div>
          )}

          {!loading && fel && (
            <div style={{
              background: 'var(--light-red-bg)',
              border: '1px solid var(--light-red)',
              borderRadius: 12,
              padding: '20px 24px',
              color: 'var(--light-red)',
              fontSize: 14,
            }} className="flex items-center gap-2">
              <Warning size={14} weight="bold" />
              <span>Kunde inte ladda uppföljningar: {fel}</span>
            </div>
          )}

          {!loading && !fel && uppföljningar.length === 0 && (
            <div style={{
              background: 'var(--light-amber-glow)',
              border: '1px solid var(--light-amber-border)',
              borderRadius: 12,
              padding: '56px 24px',
              textAlign: 'center',
            }}>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--light-amber)' }}>
                <Tray size={48} weight="bold" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--light-t1)' }}>Inga uppföljningar än</h3>
              <p style={{ fontSize: 14, color: 'var(--light-t2)', maxWidth: 460, margin: '0 auto' }}>
                När du markerar ett anbud som &quot;Skickat&quot; i ett projekt börjar uppföljningen här.
              </p>
            </div>
          )}

          {!loading && !fel && aktiva.length > 0 && (
            <SektionAktiva rader={aktiva} onUtfall={uppdateraUtfall} />
          )}

          {!loading && !fel && avslutade.length > 0 && (
            <SektionAvslutade rader={avslutade} />
          )}
        </div>
    </div>
  )
}

function SektionAktiva({
  rader,
  onUtfall,
}: {
  rader: Uppföljning[]
  onUtfall: (id: string, utfall: 'vunnet' | 'förlorat' | 'avbrutet') => Promise<void>
}) {
  const nu = Date.now()
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--light-t3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Aktiva ({rader.length})
      </h2>
      <div style={{
        background: 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(14,27,46,.04)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--light-border)', background: 'var(--light-off)' }}>
              <th style={TH_STIL}>Projekt</th>
              <th style={TH_STIL}>Status</th>
              <th style={TH_STIL}>Deadline</th>
              <th style={TH_STIL}>Nästa åtgärd</th>
              <th style={{ ...TH_STIL, textAlign: 'right' }}>Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {rader.map(u => {
              const meta = STATE_META[u.state]
              const åtgärd = relativÅtgärd(u.nästa_åtgärd, nu)
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--light-border)' }}>
                  <td style={TD_STIL}>
                    <Link
                      href={`/projekt/${u.projekt_id}`}
                      style={{ color: 'var(--light-t1)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {u.projekt_namn}
                    </Link>
                  </td>
                  <td style={TD_STIL}>
                    <Badge label={meta.label} färg={meta.färg} bg={meta.bg} />
                  </td>
                  <td style={TD_STIL}>{formateraDatum(u.sista_anbudsdag)}</td>
                  <td style={{ ...TD_STIL, color: åtgärd.färg, fontWeight: 600 }}>
                    {åtgärd.text}
                  </td>
                  <td style={{ ...TD_STIL, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Knapp variant="grön" onClick={() => onUtfall(u.id, 'vunnet')}>Vunnet</Knapp>
                    <Knapp variant="röd" onClick={() => onUtfall(u.id, 'förlorat')}>Förlorat</Knapp>
                    <Knapp variant="ghost" onClick={() => onUtfall(u.id, 'avbrutet')}>Avbryt</Knapp>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SektionAvslutade({ rader }: { rader: Uppföljning[] }) {
  return (
    <section>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--light-t3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Avslutade ({rader.length})
      </h2>
      <div style={{
        background: 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(14,27,46,.04)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--light-border)', background: 'var(--light-off)' }}>
              <th style={TH_STIL}>Projekt</th>
              <th style={TH_STIL}>Utfall</th>
              <th style={TH_STIL}>Avslutad</th>
            </tr>
          </thead>
          <tbody>
            {rader.map(u => {
              const utfall = u.utfall
              const meta = utfall ? UTFALL_META[utfall] : null
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--light-border)' }}>
                  <td style={TD_STIL}>
                    <Link
                      href={`/projekt/${u.projekt_id}`}
                      style={{ color: 'var(--light-t1)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {u.projekt_namn}
                    </Link>
                  </td>
                  <td style={TD_STIL}>
                    {meta ? <Badge label={meta.label} färg={meta.färg} bg={meta.bg} /> : '—'}
                  </td>
                  <td style={TD_STIL}>{formateraDatum(u.uppdaterad)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Knapp({
  variant,
  onClick,
  children,
}: {
  variant: 'grön' | 'röd' | 'ghost'
  onClick: () => void
  children: React.ReactNode
}) {
  const stil: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    padding: '5px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    marginLeft: 6,
  }
  if (variant === 'grön') {
    stil.background = 'var(--light-green)'
    stil.color = 'white'
    stil.border = 'none'
  } else if (variant === 'röd') {
    stil.background = 'var(--light-red)'
    stil.color = 'white'
    stil.border = 'none'
  } else {
    stil.background = 'transparent'
    stil.color = 'var(--light-t3)'
    stil.border = '1px solid var(--light-border)'
  }
  return (
    <button onClick={onClick} style={stil}>
      {children}
    </button>
  )
}
