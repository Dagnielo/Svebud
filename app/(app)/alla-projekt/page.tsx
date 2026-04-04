'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { getPipelineKolumn, type Projekt } from '@/components/ProjektKort'

type UserProfil = {
  fullnamn: string | null
  företag: string | null
  tier: string | null
  initialer: string
}

type AnbudInfo = {
  projekt_id: string
  kund_typ: string | null
  extraherad_data: Record<string, { värde: unknown }> | null
}

const statusFärg: Record<string, string> = {
  inkorg: 'var(--yellow)',
  under_arbete: 'var(--blue-accent)',
  inskickat: 'var(--green)',
  tilldelning: 'var(--orange)',
}

const statusLabel: Record<string, string> = {
  inkorg: 'Inkorg',
  under_arbete: 'Under arbete',
  inskickat: 'Inskickat',
  tilldelning: 'Tilldelning',
}

const kundTypLabel: Record<string, string> = {
  brf: 'BRF',
  konsument: 'Konsument',
  naringsidkare: 'Företag',
}

function formatKr(v: unknown): string | null {
  if (typeof v !== 'number' || v === 0) return null
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return v.toLocaleString('sv-SE')
}

function getAiStatus(p: Projekt): { label: string; färg: string } {
  if (p.rekommendation_status === 'klar') {
    // Check kravmatchning for go/no-go if available
    return { label: 'GO', färg: 'var(--green)' }
  }
  if (p.rekommendation_status === 'pågår') return { label: 'Analyserar...', färg: 'var(--blue-accent)' }
  if (p.analys_komplett) return { label: 'Analyserad', färg: 'var(--blue-accent)' }
  if (p.jämförelse_status === 'klar') return { label: 'Jämförd', färg: 'var(--blue-accent)' }
  return { label: 'Ej analyserad', färg: 'var(--slate)' }
}

export default function AllaProjektPage() {
  const [projekt, setProjekt] = useState<Projekt[]>([])
  const [anbudMap, setAnbudMap] = useState<Record<string, AnbudInfo>>({})
  const [anbudCount, setAnbudCount] = useState<Record<string, number>>({})
  const [user, setUser] = useState<UserProfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('alla')
  const [sök, setSök] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const hämtaData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }

    if (!user) {
      const { data: profil } = await supabase
        .from('profiler')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profil) {
        const p = profil as Record<string, unknown>
        const namn = p.fullnamn as string | null
        setUser({
          fullnamn: namn,
          företag: p.företag as string | null,
          tier: p.tier as string | null,
          initialer: namn
            ? namn.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            : '?',
        })
      }
    }

    const { data: projektData } = await supabase
      .from('projekt')
      .select('*')
      .eq('användar_id', authUser.id)
      .order('skapad', { ascending: false })

    if (projektData) setProjekt(projektData as unknown as Projekt[])

    // Hämta anbud-data för värde, kundtyp, deadline och antal dokument
    const { data: anbudData } = await supabase
      .from('anbud')
      .select('projekt_id, kund_typ, extraherad_data')

    if (anbudData) {
      const map: Record<string, AnbudInfo> = {}
      const count: Record<string, number> = {}
      for (const a of anbudData as unknown as AnbudInfo[]) {
        map[a.projekt_id] = a
        count[a.projekt_id] = (count[a.projekt_id] ?? 0) + 1
      }
      setAnbudMap(map)
      setAnbudCount(count)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    hämtaData()
  }, [hämtaData])

  const filtrerade = projekt.filter(p => {
    const kolumn = getPipelineKolumn(p)
    if (filter !== 'alla' && kolumn !== filter) return false
    if (sök.trim()) {
      const s = sök.toLowerCase()
      return p.namn?.toLowerCase().includes(s) || p.beskrivning?.toLowerCase().includes(s)
    }
    return true
  })

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--navy)' }}>
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col" style={{ marginLeft: 220 }}>
        {/* Topbar */}
        <div
          className="flex items-center sticky top-0 z-40"
          style={{
            height: 60,
            background: 'var(--navy-mid)',
            borderBottom: '1px solid var(--navy-border)',
            padding: '0 32px',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>Alla projekt</span>
          <span
            style={{
              marginLeft: 10,
              fontSize: 11,
              fontWeight: 700,
              background: 'var(--navy-light)',
              color: 'var(--muted-custom)',
              padding: '2px 8px',
              borderRadius: 20,
            }}
          >
            {projekt.length}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1 }}>
          {/* Filter & Search */}
          <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
            <input
              value={sök}
              onChange={e => setSök(e.target.value)}
              placeholder="Sök projekt..."
              style={{
                flex: 1,
                maxWidth: 320,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'var(--navy-mid)',
                border: '1px solid var(--navy-border)',
                color: 'var(--white)',
                fontSize: 13,
              }}
            />
            <div className="flex gap-1.5">
              {['alla', 'inkorg', 'under_arbete', 'inskickat', 'tilldelning'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: filter === f ? 'var(--yellow)' : 'var(--navy-border)',
                    background: filter === f ? 'var(--yellow-glow)' : 'transparent',
                    color: filter === f ? 'var(--yellow)' : 'var(--muted-custom)',
                    cursor: 'pointer',
                  }}
                >
                  {f === 'alla' ? 'Alla' : statusLabel[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Tabell */}
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 rounded-lg" style={{ background: 'var(--navy-mid)' }} />
              ))}
            </div>
          ) : filtrerade.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center"
              style={{ padding: '80px 0', color: 'var(--muted-custom)' }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Inga projekt hittades</div>
              <div style={{ fontSize: 13 }}>
                {sök ? 'Prova ett annat sökord' : 'Skapa ditt första projekt för att komma igång'}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--navy-mid)',
                border: '1px solid var(--navy-border)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                className="grid items-center"
                style={{
                  gridTemplateColumns: '2fr 100px 110px 100px 110px 110px 100px 70px',
                  padding: '10px 20px',
                  borderBottom: '1px solid var(--navy-border)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--slate)',
                }}
              >
                <span>Projekt</span>
                <span>Värde</span>
                <span>Deadline</span>
                <span>Kundtyp</span>
                <span>AI-status</span>
                <span>Pipeline</span>
                <span>Skapad</span>
                <span></span>
              </div>

              {/* Rader */}
              {filtrerade.map(p => {
                const kolumn = getPipelineKolumn(p)
                const anbud = anbudMap[p.id]
                const docs = anbudCount[p.id] ?? 0
                const värde = anbud?.extraherad_data?.['värde_kr']?.värde
                const deadline = anbud?.extraherad_data?.['sista_anbudsdag']?.värde as string | undefined
                const kundTyp = anbud?.kund_typ
                const ai = getAiStatus(p)

                const deadlineDate = deadline ? new Date(deadline) : null
                const dagarKvar = deadlineDate
                  ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null
                const brådskande = dagarKvar !== null && dagarKvar <= 3 && dagarKvar >= 0

                return (
                  <div
                    key={p.id}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: '2fr 100px 110px 100px 110px 110px 100px 70px',
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--navy-border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => router.push(`/projekt/${p.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy-light)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Projekt */}
                    <div>
                      <div className="flex items-center gap-2">
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{p.namn}</div>
                        {docs > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--slate)' }} title={`${docs} dokument`}>
                            📄 {docs}
                          </span>
                        )}
                      </div>
                      {p.beskrivning && (
                        <div style={{ fontSize: 11, color: 'var(--muted-custom)', maxWidth: 300 }} className="truncate">
                          {p.beskrivning}
                        </div>
                      )}
                    </div>

                    {/* Värde */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: värde ? 'var(--white)' : 'var(--slate)' }}>
                      {formatKr(värde) ? `${formatKr(värde)} kr` : '—'}
                    </div>

                    {/* Deadline */}
                    <div>
                      {deadlineDate ? (
                        <div>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: brådskande ? 'var(--red)' : dagarKvar !== null && dagarKvar <= 7 ? 'var(--orange)' : 'var(--muted-custom)',
                          }}>
                            {deadlineDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                          </div>
                          {dagarKvar !== null && dagarKvar >= 0 && (
                            <div style={{
                              fontSize: 10,
                              color: brådskande ? 'var(--red)' : 'var(--slate)',
                            }}>
                              {dagarKvar === 0 ? 'Idag!' : `${dagarKvar}d kvar`}
                            </div>
                          )}
                          {dagarKvar !== null && dagarKvar < 0 && (
                            <div style={{ fontSize: 10, color: 'var(--red)' }}>Passerad</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--slate)' }}>—</span>
                      )}
                    </div>

                    {/* Kundtyp */}
                    <div>
                      {kundTyp ? (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'var(--navy)',
                          color: 'var(--muted-custom)',
                        }}>
                          {kundTypLabel[kundTyp] ?? kundTyp}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--slate)' }}>—</span>
                      )}
                    </div>

                    {/* AI-status */}
                    <div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: ai.färg,
                      }}>
                        {ai.label}
                      </span>
                    </div>

                    {/* Pipeline */}
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: `${statusFärg[kolumn]}20`,
                          color: statusFärg[kolumn],
                        }}
                      >
                        {statusLabel[kolumn] ?? kolumn}
                      </span>
                    </div>

                    {/* Skapad */}
                    <div style={{ fontSize: 12, color: 'var(--muted-custom)' }}>
                      {new Date(p.skapad).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                    </div>

                    {/* Öppna */}
                    <div style={{ fontSize: 12, color: 'var(--muted-custom)', textAlign: 'right' }}>
                      →
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--slate)' }}>
            {filtrerade.length} av {projekt.length} projekt
          </div>
        </div>
      </div>
    </div>
  )
}
