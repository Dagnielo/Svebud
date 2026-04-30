'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import {
  useUppföljningar,
  type Uppföljning,
  type UppföljningState,
  type UppföljningUtfall,
} from '@/lib/hooks/useUppföljningar'

type UserProfil = {
  fullnamn: string | null
  företag: string | null
  tier: string | null
  initialer: string
}

const STATE_META: Record<UppföljningState, { label: string; färg: string; bg: string }> = {
  anbud_skickat:            { label: 'Skickat',                 färg: 'var(--blue-accent)',   bg: 'rgba(74,158,255,0.12)' },
  påminnelse_1_schemalagd:  { label: 'Påminnelse 1 schemalagd', färg: 'var(--muted-custom)',  bg: 'rgba(128,153,181,0.12)' },
  påminnelse_1_skickad:     { label: 'Påminnelse 1 skickad',    färg: 'var(--yellow)',        bg: 'var(--yellow-glow)' },
  påminnelse_2_schemalagd:  { label: 'Påminnelse 2 schemalagd', färg: 'var(--muted-custom)',  bg: 'rgba(128,153,181,0.12)' },
  påminnelse_2_skickad:     { label: 'Påminnelse 2 skickad',    färg: 'var(--orange)',        bg: 'var(--orange-bg)' },
  svar_mottaget:            { label: 'Svar mottaget',           färg: 'var(--green)',         bg: 'var(--green-bg)' },
  vunnet:                   { label: 'Vunnet',                  färg: 'var(--green)',         bg: 'var(--green-bg)' },
  förlorat:                 { label: 'Förlorat',                färg: 'var(--red)',           bg: 'var(--red-bg)' },
  avbrutet:                 { label: 'Avbrutet',                färg: 'var(--muted-custom)',  bg: 'rgba(128,153,181,0.12)' },
}

const UTFALL_META: Record<Exclude<UppföljningUtfall, null>, { label: string; färg: string; bg: string }> = {
  vunnet:     { label: 'Vunnet',     färg: 'var(--green)',        bg: 'var(--green-bg)' },
  förlorat:   { label: 'Förlorat',   färg: 'var(--red)',          bg: 'var(--red-bg)' },
  inget_svar: { label: 'Inget svar', färg: 'var(--muted-custom)', bg: 'rgba(128,153,181,0.12)' },
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
  if (!iso) return { text: '—', färg: 'var(--muted-custom)' }
  const dagar = Math.round((Date.parse(iso) - nu) / (1000 * 60 * 60 * 24))
  if (dagar < 0) {
    const abs = Math.abs(dagar)
    return { text: `Förfallen sedan ${abs} ${abs === 1 ? 'dag' : 'dagar'}`, färg: 'var(--red)' }
  }
  if (dagar === 0) return { text: 'Idag', färg: 'var(--yellow)' }
  return { text: `Om ${dagar} ${dagar === 1 ? 'dag' : 'dagar'}`, färg: 'var(--soft)' }
}

const TH_STIL: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--muted-custom)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
const TD_STIL: React.CSSProperties = {
  padding: '12px',
  fontSize: 13,
  color: 'var(--soft)',
  verticalAlign: 'middle',
}

export default function UppföljningarPage() {
  const supabase = createClient()
  const [user, setUser] = useState<UserProfil | null>(null)
  const { uppföljningar, loading, fel, uppdateraUtfall } = useUppföljningar()

  useEffect(() => {
    async function hämtaUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: profil } = await supabase
        .from('profiler')
        .select('*')
        .eq('id', authUser.id)
        .single()
      if (profil) {
        const namn = (profil as Record<string, unknown>).fullnamn as string | null
        setUser({
          fullnamn: namn,
          företag: (profil as Record<string, unknown>).företag as string | null,
          tier: (profil as Record<string, unknown>).tier as string | null,
          initialer: namn
            ? namn.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : '?',
        })
      }
    }
    hämtaUser()
  }, [supabase])

  const aktiva = uppföljningar.filter(
    u => !['vunnet', 'förlorat', 'avbrutet'].includes(u.state)
  )
  const avslutade = uppföljningar.filter(
    u => ['vunnet', 'förlorat', 'avbrutet'].includes(u.state)
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--navy)' }}>
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col" style={{ marginLeft: 220 }}>
        <div
          className="flex items-center sticky top-0 z-40"
          style={{
            height: 60,
            background: 'var(--navy-mid)',
            borderBottom: '1px solid var(--navy-border)',
            padding: '0 32px',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>📬 Uppföljningar</span>
          {!loading && uppföljningar.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--muted-custom)' }}>
              {aktiva.length} aktiva · {avslutade.length} avslutade
            </span>
          )}
        </div>

        <div style={{ padding: '28px 32px', flex: 1 }}>
          {loading && (
            <div className="space-y-3">
              <div className="animate-pulse h-12 rounded-lg" style={{ background: 'var(--navy-mid)' }} />
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 rounded-lg" style={{ background: 'var(--navy-mid)' }} />
              ))}
            </div>
          )}

          {!loading && fel && (
            <div style={{
              background: 'var(--red-bg)',
              border: '1px solid rgba(255,77,77,0.3)',
              borderRadius: 12,
              padding: '20px 24px',
              color: 'var(--red)',
              fontSize: 14,
            }}>
              ⚠️ Kunde inte ladda uppföljningar: {fel}
            </div>
          )}

          {!loading && !fel && uppföljningar.length === 0 && (
            <div style={{
              background: 'var(--yellow-glow)',
              border: '1px solid rgba(245,196,0,0.3)',
              borderRadius: 12,
              padding: '56px 24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Inga uppföljningar än</h3>
              <p style={{ fontSize: 14, color: 'var(--muted-custom)', maxWidth: 460, margin: '0 auto' }}>
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
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-custom)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Aktiva ({rader.length})
      </h2>
      <div style={{
        background: 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--navy-border)', background: 'var(--navy-light)' }}>
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
                <tr key={u.id} style={{ borderBottom: '1px solid var(--navy-border)' }}>
                  <td style={TD_STIL}>
                    <Link
                      href={`/projekt/${u.projekt_id}`}
                      style={{ color: 'white', fontWeight: 600, textDecoration: 'none' }}
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
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted-custom)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Avslutade ({rader.length})
      </h2>
      <div style={{
        background: 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--navy-border)', background: 'var(--navy-light)' }}>
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
                <tr key={u.id} style={{ borderBottom: '1px solid var(--navy-border)' }}>
                  <td style={TD_STIL}>
                    <Link
                      href={`/projekt/${u.projekt_id}`}
                      style={{ color: 'white', fontWeight: 600, textDecoration: 'none' }}
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
    stil.background = 'var(--green)'
    stil.color = 'white'
    stil.border = 'none'
  } else if (variant === 'röd') {
    stil.background = 'var(--red)'
    stil.color = 'white'
    stil.border = 'none'
  } else {
    stil.background = 'transparent'
    stil.color = 'var(--muted-custom)'
    stil.border = '1px solid var(--navy-border)'
  }
  return (
    <button onClick={onClick} style={stil}>
      {children}
    </button>
  )
}
