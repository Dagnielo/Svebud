'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'
import KpiKort from '@/components/KpiKort'

type Projekt = {
  id: string
  namn: string
  beskrivning: string | null
  tilldelning_status: string | null
  tilldelning_datum: string | null
  tilldelning_notering: string | null
  vinnande_pris: number | null
  skickat_datum: string | null
  pipeline_status: string | null
  skapad: string
}

type Insikt = { ikon: string; rubrik: string; text: string }

type CacheInfo = {
  insikter: Insikt[]
  skapad: string
  från_cache: boolean
}

const PROJEKTTYP_REGEX: Array<{ label: string; rx: RegExp }> = [
  { label: 'BRF', rx: /brf|bostadsrätt/i },
  { label: 'Laddinfrastruktur', rx: /ladd|elbil/i },
  { label: 'Servicekontrakt', rx: /service|underhåll/i },
  { label: 'Industri', rx: /industri|fabrik|verkstad/i },
]

function projekttyp(p: Projekt): string {
  const text = `${p.namn ?? ''} ${p.beskrivning ?? ''}`
  for (const t of PROJEKTTYP_REGEX) {
    if (t.rx.test(text)) return t.label
  }
  return 'Övrigt'
}

function prisband(pris: number): string {
  if (pris < 500_000) return 'Under 500k'
  if (pris < 1_000_000) return '500k–1M'
  return 'Över 1M'
}

function formateraKr(belopp: number): string {
  if (belopp >= 1_000_000) return `${(belopp / 1_000_000).toFixed(1)}M`
  if (belopp >= 1_000) return `${(belopp / 1_000).toFixed(0)}k`
  return `${belopp}`
}

function timmarKvar(skapad: string): number {
  const ms = new Date(skapad).getTime() + 24 * 60 * 60 * 1000 - Date.now()
  return Math.max(0, Math.ceil(ms / (60 * 60 * 1000)))
}

export default function StatistikSida() {
  const supabase = createClient()
  const [projekt, setProjekt] = useState<Projekt[]>([])
  const [loading, setLoading] = useState(true)
  const [cache, setCache] = useState<CacheInfo | null>(null)
  const [genererarLaddar, setGenererarLaddar] = useState(false)
  const [genererarFel, setGenererarFel] = useState<string | null>(null)
  const [tabellSort, setTabellSort] = useState<{ key: 'datum' | 'värde'; desc: boolean }>({ key: 'datum', desc: true })

  const hämta = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setLoading(false); return }

    const [projektRes, cacheRes] = await Promise.all([
      supabase.from('projekt').select('*').eq('användar_id', authUser.id),
      supabase.from('ai_insikter_cache').select('*').eq('användar_id', authUser.id).order('skapad', { ascending: false }).limit(1).maybeSingle(),
    ])

    setProjekt((projektRes.data ?? []) as Projekt[])
    if (cacheRes.data) {
      setCache({
        insikter: (cacheRes.data.insikter ?? []) as Insikt[],
        skapad: cacheRes.data.skapad as string,
        från_cache: true,
      })
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { hämta() }, [hämta])

  // KPI-beräkningar
  const kpi = useMemo(() => {
    const nu = Date.now()
    const senaste90d = projekt.filter(p => {
      if (!p.tilldelning_datum) return false
      const dagar = (nu - new Date(p.tilldelning_datum).getTime()) / (1000 * 60 * 60 * 24)
      return dagar <= 90 && (p.tilldelning_status === 'vunnet' || p.tilldelning_status === 'förlorat')
    })
    const vunna90d = senaste90d.filter(p => p.tilldelning_status === 'vunnet')
    const winRate90d = senaste90d.length > 0 ? Math.round((vunna90d.length / senaste90d.length) * 100) : 0

    const vunnaMedPris = projekt.filter(p =>
      p.tilldelning_status === 'vunnet' && p.vinnande_pris !== null && p.vinnande_pris > 0
    )
    const totaltVunnetVärde = vunnaMedPris.reduce((sum, p) => sum + (p.vinnande_pris ?? 0), 0)
    const snittAnbudsvärde = vunnaMedPris.length > 0 ? Math.round(totaltVunnetVärde / vunnaMedPris.length) : 0

    const tre_mån_sen = nu - 90 * 24 * 60 * 60 * 1000
    const skapadeSenaste3Mån = projekt.filter(p => new Date(p.skapad).getTime() >= tre_mån_sen).length
    const snittPerMånad = (skapadeSenaste3Mån / 3).toFixed(1)

    const totaltAvslutade = projekt.filter(p =>
      p.tilldelning_status === 'vunnet' || p.tilldelning_status === 'förlorat'
    ).length

    return { winRate90d, totaltVunnetVärde, snittAnbudsvärde, snittPerMånad, totaltAvslutade, vunnaMedPrisAntal: vunnaMedPris.length }
  }, [projekt])

  // Win rate per projekttyp
  const winRatePerTyp = useMemo(() => {
    const grupper = new Map<string, { vunna: number; förlorade: number }>()
    for (const p of projekt) {
      if (p.tilldelning_status !== 'vunnet' && p.tilldelning_status !== 'förlorat') continue
      const typ = projekttyp(p)
      const g = grupper.get(typ) ?? { vunna: 0, förlorade: 0 }
      if (p.tilldelning_status === 'vunnet') g.vunna++
      else g.förlorade++
      grupper.set(typ, g)
    }
    return Array.from(grupper.entries())
      .map(([typ, g]) => ({
        typ,
        vunna: g.vunna,
        totalt: g.vunna + g.förlorade,
        winRate: g.vunna + g.förlorade > 0 ? Math.round((g.vunna / (g.vunna + g.förlorade)) * 100) : 0,
      }))
      .sort((a, b) => b.totalt - a.totalt)
  }, [projekt])

  // Antal vunna per prisnivå (Win rate kräver att förlorade har pris — vi har bara vunna)
  const fördelningPerPrisnivå = useMemo(() => {
    const band = new Map<string, number>([['Under 500k', 0], ['500k–1M', 0], ['Över 1M', 0]])
    for (const p of projekt) {
      if (p.tilldelning_status !== 'vunnet' || !p.vinnande_pris) continue
      const b = prisband(p.vinnande_pris)
      band.set(b, (band.get(b) ?? 0) + 1)
    }
    const max = Math.max(...band.values(), 1)
    return Array.from(band.entries()).map(([b, antal]) => ({ band: b, antal, andel: antal / max }))
  }, [projekt])

  const avslutadeAnbud = useMemo(() => {
    const list = projekt.filter(p => p.tilldelning_status === 'vunnet' || p.tilldelning_status === 'förlorat')
    return list.sort((a, b) => {
      if (tabellSort.key === 'datum') {
        const da = new Date(a.skickat_datum ?? a.tilldelning_datum ?? a.skapad).getTime()
        const db = new Date(b.skickat_datum ?? b.tilldelning_datum ?? b.skapad).getTime()
        return tabellSort.desc ? db - da : da - db
      }
      const va = a.vinnande_pris ?? 0
      const vb = b.vinnande_pris ?? 0
      return tabellSort.desc ? vb - va : va - vb
    })
  }, [projekt, tabellSort])

  // PostHog: statistik_visad när loading slutar
  useEffect(() => {
    if (!loading) {
      posthog.capture('statistik_visad', { antal_avslutade_anbud: kpi.totaltAvslutade })
    }
  }, [loading, kpi.totaltAvslutade])

  async function generera(force = false) {
    setGenererarLaddar(true)
    setGenererarFel(null)
    try {
      const res = await fetch('/api/statistik/insikter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenererarFel(data.fel ?? 'Okänt fel')
      } else {
        setCache({ insikter: data.insikter, skapad: data.skapad, från_cache: data.från_cache })
        posthog.capture('ai_insikter_genererade', {
          antal_insikter: data.insikter.length,
          antal_avslutade_anbud: kpi.totaltAvslutade,
          från_cache: data.från_cache,
        })
      }
    } catch {
      setGenererarFel('Nätverksfel')
    }
    setGenererarLaddar(false)
  }

  const cacheÄrFärsk = cache && (Date.now() - new Date(cache.skapad).getTime()) < 24 * 60 * 60 * 1000

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--navy)' }}>
        {/* Topbar */}
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
          <span style={{ fontSize: 16, fontWeight: 700 }}>📊 Statistik</span>
        </div>

        <div style={{ padding: '28px 32px', flex: 1 }}>
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse h-24 rounded-xl" style={{ background: 'var(--navy-mid)' }} />
              ))}
            </div>
          ) : kpi.totaltAvslutade === 0 ? (
            <div style={{
              background: 'var(--yellow-glow)',
              border: '1px solid rgba(245,196,0,0.3)',
              borderRadius: 12,
              padding: '36px 32px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Inga avslutade anbud än</h2>
              <p style={{ fontSize: 14, color: 'var(--muted-custom)', maxWidth: 440, margin: '0 auto' }}>
                Markera dina första utfall (vunnet/förlorat) på inskickade projekt för att se statistik.
              </p>
            </div>
          ) : (
            <>
              {/* KPI-rad */}
              <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
                <KpiKort
                  label="Win rate (90d)"
                  value={`${kpi.winRate90d}%`}
                  sub={kpi.totaltAvslutade < 5 ? `${kpi.totaltAvslutade} av 5 avslutade — ge gärna mer data` : `Senaste 90 dagarna`}
                  färg="green"
                />
                <KpiKort
                  label="Vunnet värde"
                  value={kpi.vunnaMedPrisAntal === 0 ? '—' : formateraKr(kpi.totaltVunnetVärde) + ' kr'}
                  sub={kpi.vunnaMedPrisAntal === 0 ? 'Vinnande pris saknas — fyll i för att se värde-statistik' : `${kpi.vunnaMedPrisAntal} vunna med pris`}
                  färg="amber"
                />
                <KpiKort
                  label="Snitt anbudsvärde"
                  value={kpi.snittAnbudsvärde === 0 ? '—' : formateraKr(kpi.snittAnbudsvärde) + ' kr'}
                  sub="Genomsnitt av vunna med pris"
                  färg="blue"
                />
                <KpiKort
                  label="Anbud per månad"
                  value={kpi.snittPerMånad}
                  sub="Snitt skapade per månad senaste 3 månaderna"
                  färg="orange"
                />
              </div>

              {/* Win rate per projekttyp */}
              {winRatePerTyp.length > 0 && (
                <Sektion rubrik="Win rate per projekttyp">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {winRatePerTyp.map(t => (
                      <div key={t.typ}>
                        <div className="flex items-center justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: 'var(--soft)' }}>{t.typ}</span>
                          <span style={{ color: 'var(--muted-custom)', fontFamily: 'var(--font-mono)' }}>
                            {t.vunna}/{t.totalt} · {t.winRate}%
                          </span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: 'var(--navy)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${t.winRate}%`,
                            background: t.winRate >= 50 ? 'var(--green)' : 'var(--orange)',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Sektion>
              )}

              {/* Vunna per prisnivå */}
              {kpi.vunnaMedPrisAntal > 0 && (
                <Sektion rubrik="Vunna anbud per prisnivå" beskrivning="Fördelning av vunna anbud baserat på vinnande pris.">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {fördelningPerPrisnivå.map(p => (
                      <div key={p.band}>
                        <div className="flex items-center justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: 'var(--soft)' }}>{p.band}</span>
                          <span style={{ color: 'var(--muted-custom)', fontFamily: 'var(--font-mono)' }}>
                            {p.antal} st
                          </span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: 'var(--navy)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${p.andel * 100}%`,
                            background: 'var(--yellow)',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Sektion>
              )}

              {/* AI-insikter */}
              <Sektion rubrik="AI-insikter">
                {kpi.totaltAvslutade < 5 ? (
                  <div style={{ fontSize: 13, color: 'var(--muted-custom)' }}>
                    Fyll i utfall på minst 5 anbud för att se insikter (just nu: {kpi.totaltAvslutade} av 5).
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
                      {!cache || !cacheÄrFärsk ? (
                        <button
                          onClick={() => generera(false)}
                          disabled={genererarLaddar}
                          style={{
                            background: 'var(--yellow)',
                            color: 'var(--navy)',
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            border: 'none',
                            cursor: genererarLaddar ? 'wait' : 'pointer',
                            opacity: genererarLaddar ? 0.6 : 1,
                          }}
                        >
                          {genererarLaddar ? '⏳ Genererar...' : '⚡ Generera insikter'}
                        </button>
                      ) : (
                        <>
                          <span style={{ fontSize: 12, color: 'var(--muted-custom)' }}>
                            Genererade {new Date(cache.skapad).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })} — uppdateras igen om {timmarKvar(cache.skapad)} h
                          </span>
                          <button
                            onClick={() => generera(true)}
                            disabled={genererarLaddar}
                            style={{
                              background: 'transparent',
                              color: 'var(--yellow)',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              border: '1px solid var(--yellow)',
                              cursor: genererarLaddar ? 'wait' : 'pointer',
                              opacity: genererarLaddar ? 0.6 : 1,
                            }}
                          >
                            {genererarLaddar ? '⏳ Genererar...' : 'Tvinga ny generering'}
                          </button>
                        </>
                      )}
                    </div>
                    {genererarFel && (
                      <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{genererarFel}</div>
                    )}
                    {cache && cache.insikter.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {cache.insikter.map((insikt, i) => (
                          <div
                            key={i}
                            style={{
                              background: 'var(--navy)',
                              borderLeft: '3px solid var(--yellow)',
                              borderRadius: 6,
                              padding: '12px 14px',
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                              {insikt.ikon} {insikt.rubrik}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted-custom)', lineHeight: 1.5 }}>
                              {insikt.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Sektion>

              {/* Tabell */}
              <Sektion rubrik="Avslutade anbud">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--navy-border)' }}>
                        <Th>Kund</Th>
                        <Th>Typ</Th>
                        <Th
                          klickbar
                          aktiv={tabellSort.key === 'värde'}
                          onClick={() => setTabellSort(prev => ({ key: 'värde', desc: prev.key === 'värde' ? !prev.desc : true }))}
                        >
                          Värde {tabellSort.key === 'värde' ? (tabellSort.desc ? '↓' : '↑') : ''}
                        </Th>
                        <Th
                          klickbar
                          aktiv={tabellSort.key === 'datum'}
                          onClick={() => setTabellSort(prev => ({ key: 'datum', desc: prev.key === 'datum' ? !prev.desc : true }))}
                        >
                          Datum {tabellSort.key === 'datum' ? (tabellSort.desc ? '↓' : '↑') : ''}
                        </Th>
                        <Th>Utfall</Th>
                        <Th>Notering</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {avslutadeAnbud.map(p => {
                        const datum = p.skickat_datum ?? p.tilldelning_datum
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--navy-border)' }}>
                            <Td>{p.namn}</Td>
                            <Td>{projekttyp(p)}</Td>
                            <Td>{p.vinnande_pris ? formateraKr(p.vinnande_pris) + ' kr' : '—'}</Td>
                            <Td>{datum ? new Date(datum).toLocaleDateString('sv-SE') : '—'}</Td>
                            <Td>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: p.tilldelning_status === 'vunnet' ? 'rgba(0,198,122,0.15)' : 'rgba(255,77,77,0.15)',
                                color: p.tilldelning_status === 'vunnet' ? 'var(--green)' : 'var(--red)',
                              }}>
                                {p.tilldelning_status === 'vunnet' ? '✓ Vunnet' : '✗ Förlorat'}
                              </span>
                            </Td>
                            <Td>{p.tilldelning_notering ? p.tilldelning_notering.slice(0, 60) : '—'}</Td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Sektion>
            </>
          )}
        </div>
    </div>
  )
}

function Sektion({ rubrik, beskrivning, children }: { rubrik: string; beskrivning?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--navy-mid)',
      border: '1px solid var(--navy-border)',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: beskrivning ? 4 : 14 }}>{rubrik}</div>
      {beskrivning && <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 14 }}>{beskrivning}</p>}
      {children}
    </div>
  )
}

function Th({ children, klickbar, aktiv, onClick }: { children: React.ReactNode; klickbar?: boolean; aktiv?: boolean; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '8px 10px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: aktiv ? 'var(--yellow)' : 'var(--muted-custom)',
        cursor: klickbar ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: '10px', color: 'var(--soft)', verticalAlign: 'top' }}>{children}</td>
  )
}
