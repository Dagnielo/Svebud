'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'
import ProjektKort, { getPipelineKolumn, type Projekt } from '@/components/ProjektKort'
import UppföljningsBanner from '@/components/UppföljningsBanner'

type Uppföljning = {
  projekt_id: string
  utfall: string | null
  state: string
}

type Anbud = {
  projekt_id: string
  extraherad_data: Record<string, { värde: unknown }> | null
}


export default function DashboardPage() {
  const [projekt, setProjekt] = useState<Projekt[]>([])
  const [uppföljningar, setUppföljningar] = useState<Uppföljning[]>([])
  const [anbudData, setAnbudData] = useState<Anbud[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [dragProjektId, setDragProjektId] = useState<string | null>(null)
  const [dragOverKolumn, setDragOverKolumn] = useState<string | null>(null)
  const supabase = createClient()

  async function flyttaProjekt(projektId: string, tillKolumn: string) {
    const uppdatering: Record<string, unknown> = { pipeline_status: tillKolumn }
    if (tillKolumn === 'inskickat') uppdatering.skickat_datum = new Date().toISOString()
    if (tillKolumn === 'tilldelning') uppdatering.tilldelning_datum = new Date().toISOString()

    await supabase.from('projekt').update(uppdatering).eq('id', projektId)

    // Uppdatera lokalt direkt
    setProjekt(prev => prev.map(p => p.id === projektId ? { ...p, pipeline_status: tillKolumn } as typeof p : p))
  }

  async function raderaProjekt(projektId: string) {
    const tidigare = projekt
    setProjekt(prev => prev.filter(p => p.id !== projektId))
    const res = await fetch(`/api/projekt/${projektId}/radera`, { method: 'DELETE' })
    if (!res.ok) {
      setProjekt(tidigare) // Rollback
      alert('Kunde inte radera projektet. Försök igen.')
    }
  }

  async function uppdateraDeadline(projektId: string, datum: string | null) {
    setProjekt(prev => prev.map(p => p.id === projektId ? { ...p, deadline: datum } as typeof p : p))
    await supabase.from('projekt').update({ deadline: datum }).eq('id', projektId)
  }

  function uppdateraUtfall() {
    hämtaData()
  }

  const hämtaData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    // PostHog identify (idempotent — säker att kalla flera ggr)
    const { data: profil } = await supabase
      .from('profiler')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profil) {
      const p = profil as Record<string, unknown>
      posthog.identify(authUser.id, {
        email: authUser.email,
        företag: p.företag as string | null,
        tier: p.tier as string | null,
      })
    }

    // Projects
    const { data: projektData } = await supabase
      .from('projekt')
      .select('*')
      .eq('användar_id', authUser.id)
      .order('skapad', { ascending: false })

    if (projektData) {
      setProjekt(projektData as unknown as Projekt[])
    }

    // Uppföljningar for win rate — filtrera på användarens projekt
    const projektIds = (projektData ?? []).map((p: Record<string, unknown>) => p.id as string)
    const { data: uppData } = projektIds.length > 0
      ? await supabase.from('uppföljning').select('projekt_id, utfall, state').in('projekt_id', projektIds)
      : { data: [] }

    if (uppData) setUppföljningar(uppData as unknown as Uppföljning[])

    // Anbud for pipeline value — filtrera på användarens projekt
    const { data: aData } = projektIds.length > 0
      ? await supabase.from('anbud').select('projekt_id, extraherad_data').in('projekt_id', projektIds)
      : { data: [] }

    if (aData) setAnbudData(aData as unknown as Anbud[])

    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load + polling every 30s
  useEffect(() => {
    hämtaData()
    const interval = setInterval(hämtaData, 30000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps



  // Pipeline columns
  const inkorg = projekt.filter(p => getPipelineKolumn(p) === 'inkorg')
  const underArbete = projekt.filter(p => getPipelineKolumn(p) === 'under_arbete')
  const inskickat = projekt.filter(p => getPipelineKolumn(p) === 'inskickat')
  const tilldelning = projekt.filter(p => getPipelineKolumn(p) === 'tilldelning')

  // KPI calculations — läs från projekt.tilldelning_status (single source of truth)
  const avslutade = projekt.filter(p => p.tilldelning_status === 'vunnet' || p.tilldelning_status === 'förlorat')
  const vunna = projekt.filter(p => p.tilldelning_status === 'vunnet')
  const winRate = avslutade.length > 0 ? Math.round((vunna.length / avslutade.length) * 100) : 0

  const pipelineVärde = anbudData.reduce((sum, a) => {
    const värde = a.extraherad_data?.['värde_kr']?.värde
    return sum + (typeof värde === 'number' ? värde : 0)
  }, 0)

  // Nearest deadline from anbud extraherad_data
  const deadlines = anbudData
    .map(a => {
      const d = a.extraherad_data?.['sista_anbudsdag']?.värde
      return typeof d === 'string' ? new Date(d) : null
    })
    .filter((d): d is Date => d !== null && d.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime())

  const närmasteDeadline = deadlines[0]
  const dagarTillDeadline = närmasteDeadline
    ? Math.ceil((närmasteDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const kpiData = [
    {
      label: 'Aktiva projekt',
      value: projekt.length.toString(),
      sub: `${inkorg.length} inkorg · ${underArbete.length} under arbete`,
      color: 'var(--yellow)',
    },
    {
      label: 'Vunna anbud',
      value: vunna.length > 0 ? vunna.length.toString() : '—',
      sub: avslutade.length > 0 ? `${vunna.length} av ${avslutade.length} avslutade` : 'Inga avslutade ännu',
      color: 'var(--green)',
    },
    {
      label: 'Pipeline-värde',
      value: pipelineVärde > 0 ? `${(pipelineVärde / 1000).toFixed(0)}k` : '—',
      sub: pipelineVärde > 0 ? `${pipelineVärde.toLocaleString('sv-SE')} kr` : 'Inget uppskattat värde',
      color: 'var(--blue-accent)',
    },
    {
      label: 'Närmaste deadline',
      value: dagarTillDeadline !== null ? `${dagarTillDeadline}d` : '—',
      sub: närmasteDeadline ? närmasteDeadline.toLocaleDateString('sv-SE') : 'Inga deadlines',
      color: 'var(--orange)',
    },
  ]

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
          <span style={{ fontSize: 16, fontWeight: 700 }}>Pipeline</span>
          <div className="ml-auto flex items-center gap-3">
            <a
              href="/nytt-projekt"
              style={{
                background: 'var(--yellow)',
                color: 'var(--navy)',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
              }}
            >
              ➕ Nytt projekt
            </a>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1 }}>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--navy-mid)' }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <UppföljningsBanner />
              {/* Välkomstruta för nya användare */}
              {projekt.length === 0 && (
                <div
                  style={{
                    background: 'var(--yellow-glow)',
                    border: '1px solid rgba(245,196,0,0.3)',
                    borderRadius: 12,
                    padding: '28px 32px',
                    marginBottom: 24,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Välkommen till SveBud!</h2>
                  <p style={{ fontSize: 14, color: 'var(--muted-custom)', marginBottom: 16, maxWidth: 440, margin: '0 auto 16px' }}>
                    Skapa ditt första projekt för att komma igång. Ladda upp ett förfrågningsunderlag eller skriv en kort beskrivning — AI:n gör resten.
                  </p>
                  <a
                    href="/nytt-projekt"
                    style={{
                      display: 'inline-block',
                      background: 'var(--yellow)',
                      color: 'var(--navy)',
                      padding: '10px 24px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    + Skapa ditt första projekt
                  </a>
                </div>
              )}

              {/* KPI Strip */}
              <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
                {kpiData.map((kpi, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden"
                    style={{
                      background: 'var(--navy-mid)',
                      border: '1px solid var(--navy-border)',
                      borderRadius: 12,
                      padding: '18px 20px',
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0"
                      style={{ height: 2, background: kpi.color }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--muted-custom)',
                        marginBottom: 8,
                      }}
                    >
                      {kpi.label}
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        color: kpi.color,
                      }}
                    >
                      {kpi.value}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 6 }}>
                      {kpi.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pipeline header */}
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 700 }}>
                  Pipeline
                  <span
                    style={{
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
              </div>

              {/* Pipeline grid */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Inkorg', key: 'inkorg', color: 'var(--yellow)', items: inkorg, emptyText: '📋 Skapa ditt första projekt →' },
                  { label: 'Under arbete', key: 'under_arbete', color: 'var(--blue-accent)', items: underArbete, emptyText: 'Projekt som analyseras hamnar här' },
                  { label: 'Inskickat', key: 'inskickat', color: 'var(--green)', items: inskickat, emptyText: 'Skickade anbud visas här' },
                  { label: 'Tilldelning', key: 'tilldelning', color: 'var(--orange)', items: tilldelning, emptyText: 'Vunna och förlorade anbud' },
                ].map(col => (
                  <div
                    key={col.label}
                    onDragOver={(e) => { e.preventDefault(); setDragOverKolumn(col.key) }}
                    onDragLeave={() => setDragOverKolumn(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOverKolumn(null)
                      if (dragProjektId) {
                        flyttaProjekt(dragProjektId, col.key)
                        setDragProjektId(null)
                      }
                    }}
                    style={{
                      background: 'var(--navy-mid)',
                      border: dragOverKolumn === col.key ? `2px solid ${col.color}` : '1px solid var(--navy-border)',
                      borderRadius: 14,
                      overflow: 'hidden',
                      transition: 'border 0.15s',
                    }}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--navy-border)',
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{col.label}</span>
                      <span className="ml-auto" style={{ fontSize: 11, fontWeight: 700, background: 'var(--navy-light)', color: 'var(--muted-custom)', padding: '2px 7px', borderRadius: 10 }}>
                        {col.items.length}
                      </span>
                    </div>

                    <div
                      className="flex flex-col gap-2.5"
                      style={{ padding: 12, minHeight: 200 }}
                    >
                      {col.items.length === 0 ? (
                        <div className="flex items-center justify-center flex-1" style={{ fontSize: 12, color: dragOverKolumn === col.key ? col.color : 'var(--slate)' }}>
                          {dragOverKolumn === col.key ? 'Släpp här' : col.emptyText}
                        </div>
                      ) : (
                        col.items.map(p => (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={() => setDragProjektId(p.id)}
                            onDragEnd={() => { setDragProjektId(null); setDragOverKolumn(null) }}
                            style={{ cursor: 'grab', opacity: dragProjektId === p.id ? 0.5 : 1 }}
                          >
                            <ProjektKort projekt={p} onRadera={raderaProjekt} onDeadlineChange={uppdateraDeadline} onUtfallChange={uppdateraUtfall} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
    </div>
  )
}
