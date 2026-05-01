'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'
import ProjektKort, { getPipelineKolumn } from '@/components/ProjektKort'
import type { Projekt } from '@/lib/types/projekt'
import UppföljningsBanner from '@/components/UppföljningsBanner'
import KpiKort from '@/components/KpiKort'
import NotifikationsBell from '@/components/NotifikationsBell'
import PipelineFilter, { type FilterState } from '@/components/PipelineFilter'
import PipelineSortera, { type SorteringNyckel } from '@/components/PipelineSortera'
import { hämtaAnbudslägeFrånProjekt } from '@/lib/projekt-status'
import { Plus } from '@phosphor-icons/react'

type Uppföljning = {
  projekt_id: string
  utfall: string | null
  state: string
}

type Anbud = {
  projekt_id: string
  extraherad_data: Record<string, { värde: unknown }> | null
}

const TOMT_FILTER: FilterState = {
  pipelineStatus: null,
  kundtyp: null,
  anbudsläge: null,
}

export default function DashboardPage() {
  const [projekt, setProjekt] = useState<Projekt[]>([])
  const [, setUppföljningar] = useState<Uppföljning[]>([])
  const [anbudData, setAnbudData] = useState<Anbud[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [dragProjektId, setDragProjektId] = useState<string | null>(null)
  const [dragOverKolumn, setDragOverKolumn] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterState>(TOMT_FILTER)
  const [sortering, setSortering] = useState<SorteringNyckel>('deadline')
  const supabase = createClient()

  async function flyttaProjekt(projektId: string, tillKolumn: string) {
    const uppdatering: Record<string, unknown> = { pipeline_status: tillKolumn }
    if (tillKolumn === 'inskickat') uppdatering.skickat_datum = new Date().toISOString()
    if (tillKolumn === 'tilldelning') uppdatering.tilldelning_datum = new Date().toISOString()

    await supabase.from('projekt').update(uppdatering).eq('id', projektId)

    setProjekt(prev => prev.map(p => p.id === projektId ? { ...p, pipeline_status: tillKolumn } as typeof p : p))
  }

  async function raderaProjekt(projektId: string) {
    const tidigare = projekt
    setProjekt(prev => prev.filter(p => p.id !== projektId))
    const res = await fetch(`/api/projekt/${projektId}/radera`, { method: 'DELETE' })
    if (!res.ok) {
      setProjekt(tidigare)
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

    const { data: projektData } = await supabase
      .from('projekt')
      .select('*')
      .eq('användar_id', authUser.id)
      .order('skapad', { ascending: false })

    if (projektData) {
      setProjekt(projektData as unknown as Projekt[])
    }

    const projektIds = (projektData ?? []).map((p: Record<string, unknown>) => p.id as string)
    const { data: uppData } = projektIds.length > 0
      ? await supabase.from('uppföljning').select('projekt_id, utfall, state').in('projekt_id', projektIds)
      : { data: [] }

    if (uppData) setUppföljningar(uppData as unknown as Uppföljning[])

    const { data: aData } = projektIds.length > 0
      ? await supabase.from('anbud').select('projekt_id, extraherad_data').in('projekt_id', projektIds)
      : { data: [] }

    if (aData) setAnbudData(aData as unknown as Anbud[])

    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hämtaData()
    const interval = setInterval(hämtaData, 30000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter + sortera applicerat på alla projekt
  const filtreradeProjekt = useMemo(() => {
    const ordning: Record<string, number> = {
      STARKT_LÄGE: 0,
      BRA_LÄGE: 1,
      OSÄKERT_LÄGE: 2,
      SVÅRT_LÄGE: 3,
    }
    return projekt
      .filter(p => {
        if (filter.pipelineStatus && getPipelineKolumn(p) !== filter.pipelineStatus) return false
        if (filter.kundtyp && !p.namn.toLowerCase().includes(filter.kundtyp.toLowerCase())) return false
        if (filter.anbudsläge && hämtaAnbudslägeFrånProjekt(p) !== filter.anbudsläge) return false
        return true
      })
      .sort((a, b) => {
        switch (sortering) {
          case 'deadline':
            if (!a.deadline && !b.deadline) return 0
            if (!a.deadline) return 1
            if (!b.deadline) return -1
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          case 'skapad':
            return new Date(b.skapad).getTime() - new Date(a.skapad).getTime()
          case 'anbudsläge': {
            const aLäge = hämtaAnbudslägeFrånProjekt(a)
            const bLäge = hämtaAnbudslägeFrånProjekt(b)
            const aOrd = aLäge ? ordning[aLäge] : 99
            const bOrd = bLäge ? ordning[bLäge] : 99
            return aOrd - bOrd
          }
          case 'värde':
            return (b.vinnande_pris ?? 0) - (a.vinnande_pris ?? 0)
          default:
            return 0
        }
      })
  }, [projekt, filter, sortering])

  const inkorg = filtreradeProjekt.filter(p => getPipelineKolumn(p) === 'inkorg')
  const underArbete = filtreradeProjekt.filter(p => getPipelineKolumn(p) === 'under_arbete')
  const inskickat = filtreradeProjekt.filter(p => getPipelineKolumn(p) === 'inskickat')
  const tilldelning = filtreradeProjekt.filter(p => getPipelineKolumn(p) === 'tilldelning')

  // KPI: använder hela projekt-arrayen (inte filtrerad)
  const avslutade = projekt.filter(p => p.tilldelning_status === 'vunnet' || p.tilldelning_status === 'förlorat')
  const vunna = projekt.filter(p => p.tilldelning_status === 'vunnet')

  const pipelineVärde = anbudData.reduce((sum, a) => {
    const värde = a.extraherad_data?.['värde_kr']?.värde
    return sum + (typeof värde === 'number' ? värde : 0)
  }, 0)

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

  const allInkorg = projekt.filter(p => getPipelineKolumn(p) === 'inkorg').length
  const allUnderArbete = projekt.filter(p => getPipelineKolumn(p) === 'under_arbete').length

  const aktuellMånad = new Date().toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })

  const kolumner: { label: string; key: string; items: Projekt[]; emptyText: string }[] = [
    { label: 'Inkorg', key: 'inkorg', items: inkorg, emptyText: 'Skapa ditt första projekt →' },
    { label: 'Under arbete', key: 'under_arbete', items: underArbete, emptyText: 'Projekt som analyseras hamnar här' },
    { label: 'Inskickat', key: 'inskickat', items: inskickat, emptyText: 'Skickade anbud visas här' },
    { label: 'Tilldelning', key: 'tilldelning', items: tilldelning, emptyText: 'Vunna och förlorade anbud' },
  ]

  const kolumnFärger: Record<string, string> = {
    inkorg: 'var(--light-amber)',
    under_arbete: 'var(--light-blue)',
    inskickat: 'var(--light-green)',
    tilldelning: 'var(--light-orange)',
  }

  const kolumnPillBg: Record<string, string> = {
    inkorg: 'var(--light-amber-glow)',
    under_arbete: 'var(--light-blue-bg)',
    inskickat: 'var(--light-green-bg)',
    tilldelning: 'var(--light-orange-bg)',
  }

  return (
    <div style={{ background: 'var(--light-cream)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          background: 'var(--light-bg)',
          borderBottom: '1px solid var(--light-border)',
          boxShadow: '0 1px 3px rgba(14,27,46,.04)',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--light-t1)',
              margin: 0,
              letterSpacing: '-.02em',
            }}
          >
            Anbudspipeline
          </h1>
          <div style={{ fontSize: 13, color: 'var(--light-t4)', marginTop: 2, textTransform: 'capitalize' }}>
            {aktuellMånad}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotifikationsBell />
          <PipelineFilter filter={filter} onChange={setFilter} />
          <PipelineSortera värde={sortering} onChange={setSortering} />
          <button
            type="button"
            onClick={() => router.push('/nytt-projekt')}
            style={{
              padding: '8px 16px',
              background: 'var(--light-amber)',
              color: 'var(--light-navy)',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={14} weight="bold" /> Nytt projekt
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', flex: 1 }}>
        {loading ? (
          <div className="grid grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 96, borderRadius: 12, background: 'var(--light-cream)' }} />
            ))}
          </div>
        ) : (
          <>
            <UppföljningsBanner />

            {projekt.length === 0 && (
              <div
                style={{
                  background: 'var(--light-amber-glow)',
                  border: '1px solid var(--light-amber-border)',
                  borderRadius: 12,
                  padding: '28px 32px',
                  marginBottom: 24,
                  textAlign: 'center',
                }}
              >
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--light-t1)', marginBottom: 6 }}>
                  Välkommen till SveBud
                </h2>
                <p style={{ fontSize: 14, color: 'var(--light-t3)', marginBottom: 16, maxWidth: 440, margin: '0 auto 16px' }}>
                  Skapa ditt första projekt för att komma igång. Ladda upp ett förfrågningsunderlag eller skriv en kort beskrivning — AI:n gör resten.
                </p>
                <a
                  href="/nytt-projekt"
                  style={{
                    display: 'inline-block',
                    background: 'var(--light-amber)',
                    color: 'var(--light-navy)',
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Skapa ditt första projekt
                </a>
              </div>
            )}

            {/* KPI Strip */}
            <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
              <KpiKort
                label="Aktiva projekt"
                value={projekt.length}
                sub={`${allInkorg} inkorg · ${allUnderArbete} under arbete`}
                färg="amber"
              />
              <KpiKort
                label="Vunna anbud"
                value={vunna.length > 0 ? vunna.length : '—'}
                sub={avslutade.length > 0 ? `${vunna.length} av ${avslutade.length} avslutade` : 'Inga avslutade ännu'}
                färg="green"
              />
              <KpiKort
                label="Pipeline-värde"
                value={pipelineVärde > 0 ? `${(pipelineVärde / 1000).toFixed(0)}k` : '—'}
                sub={pipelineVärde > 0 ? `${pipelineVärde.toLocaleString('sv-SE')} kr` : 'Inget uppskattat värde'}
                färg="blue"
              />
              <KpiKort
                label="Närmaste deadline"
                value={dagarTillDeadline !== null ? `${dagarTillDeadline}d` : '—'}
                sub={närmasteDeadline ? närmasteDeadline.toLocaleDateString('sv-SE') : 'Inga deadlines'}
                färg="orange"
              />
            </div>

            {/* Pipeline header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--light-t1)' }}>Pipeline</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'var(--light-cream)',
                  color: 'var(--light-t2)',
                  padding: '2px 8px',
                  borderRadius: 20,
                }}
              >
                {filtreradeProjekt.length}
                {filtreradeProjekt.length !== projekt.length && ` av ${projekt.length}`}
              </span>
            </div>

            {/* Pipeline grid */}
            <div className="grid grid-cols-4 gap-4">
              {kolumner.map(col => {
                const färg = kolumnFärger[col.key]
                const pillBg = kolumnPillBg[col.key]
                return (
                  <div
                    key={col.key}
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
                      background: 'var(--light-bg)',
                      border: dragOverKolumn === col.key ? `2px solid ${färg}` : '1px solid var(--light-border)',
                      borderRadius: 12,
                      padding: 16,
                      boxShadow: '0 1px 2px rgba(14,27,46,.04)',
                      transition: 'border 0.15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '.06em',
                          color: färg,
                          background: pillBg,
                        }}
                      >
                        {col.label}
                      </span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'var(--light-cream)',
                          color: 'var(--light-t2)',
                          padding: '2px 7px',
                          borderRadius: 10,
                        }}
                      >
                        {col.items.length}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        minHeight: 200,
                      }}
                    >
                      {col.items.length === 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            fontSize: 12,
                            color: dragOverKolumn === col.key ? färg : 'var(--light-t4)',
                            textAlign: 'center',
                            padding: '0 8px',
                          }}
                        >
                          {dragOverKolumn === col.key ? 'Släpp här' : col.emptyText}
                        </div>
                      ) : (
                        col.items.map(p => (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={() => setDragProjektId(p.id)}
                            onDragEnd={() => { setDragProjektId(null); setDragOverKolumn(null) }}
                            style={{ opacity: dragProjektId === p.id ? 0.5 : 1 }}
                          >
                            <ProjektKort
                              projekt={p}
                              onRadera={raderaProjekt}
                              onDeadlineChange={uppdateraDeadline}
                              onUtfallChange={uppdateraUtfall}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
