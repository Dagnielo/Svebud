'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import ProjektKort, { getPipelineKolumn, type Projekt } from '@/components/ProjektKort'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type UserProfil = {
  fullnamn: string | null
  företag: string | null
  tier: string | null
  initialer: string
}

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
  const [user, setUser] = useState<UserProfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [nyttNamn, setNyttNamn] = useState('')
  const [nyttBeskrivning, setNyttBeskrivning] = useState('')
  const [skapar, setSkapar] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  const [dragProjektId, setDragProjektId] = useState<string | null>(null)
  const [dragOverKolumn, setDragOverKolumn] = useState<string | null>(null)
  const supabase = createClient()

  const hämtaData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    // User profile (only on first load)
    if (!user) {
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
            ? namn.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            : '?',
        })
      }
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

    // Uppföljningar for win rate
    const { data: uppData } = await supabase
      .from('uppföljning')
      .select('projekt_id, utfall, state')

    if (uppData) setUppföljningar(uppData as unknown as Uppföljning[])

    // Anbud for pipeline value
    const { data: aData } = await supabase
      .from('anbud')
      .select('projekt_id, extraherad_data')

    if (aData) setAnbudData(aData as unknown as Anbud[])

    setLoading(false)
  }, [user])

  // Initial load + polling every 30s
  useEffect(() => {
    hämtaData()
    const interval = setInterval(hämtaData, 30000)
    return () => clearInterval(interval)
  }, [hämtaData])

  async function skapaProjekt() {
    if (!nyttNamn.trim()) return
    setSkapar(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data, error } = await supabase
      .from('projekt')
      .insert({
        namn: nyttNamn.trim(),
        beskrivning: nyttBeskrivning.trim() || null,
        användar_id: authUser.id,
      })
      .select('id')
      .single()

    if (data && !error) {
      setDialogOpen(false)
      setNyttNamn('')
      setNyttBeskrivning('')
      router.push(`/projekt/${data.id}`)
    }
    setSkapar(false)
  }

  // Pipeline columns
  const inkorg = projekt.filter(p => getPipelineKolumn(p) === 'inkorg')
  const underArbete = projekt.filter(p => getPipelineKolumn(p) === 'under_arbete')
  const inskickat = projekt.filter(p => getPipelineKolumn(p) === 'inskickat')
  const tilldelning = projekt.filter(p => getPipelineKolumn(p) === 'tilldelning')

  // KPI calculations
  const avslutade = uppföljningar.filter(u => u.utfall === 'vunnet' || u.utfall === 'förlorat')
  const vunna = uppföljningar.filter(u => u.utfall === 'vunnet')
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
      label: 'Win rate',
      value: avslutade.length > 0 ? `${winRate}%` : '—',
      sub: `${vunna.length} vunna av ${avslutade.length}`,
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
            gap: 16,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>Pipeline</span>
          <div className="ml-auto flex items-center gap-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger>
                <span
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
                  }}
                >
                  ➕ Nytt projekt
                </span>
              </DialogTrigger>
              <DialogContent style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
                <DialogHeader>
                  <DialogTitle>Skapa nytt projekt</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm block mb-1" style={{ color: 'var(--muted-custom)' }}>
                      Projektnamn *
                    </label>
                    <input
                      value={nyttNamn}
                      onChange={e => setNyttNamn(e.target.value)}
                      className="w-full px-3 py-2 rounded-md"
                      style={{
                        background: 'var(--navy)',
                        border: '1px solid var(--navy-border)',
                        color: 'var(--white)',
                      }}
                      placeholder="T.ex. BRF Solstrålen – elinstallation"
                    />
                  </div>
                  <div>
                    <label className="text-sm block mb-1" style={{ color: 'var(--muted-custom)' }}>
                      Beskrivning
                    </label>
                    <textarea
                      value={nyttBeskrivning}
                      onChange={e => setNyttBeskrivning(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md resize-none"
                      style={{
                        background: 'var(--navy)',
                        border: '1px solid var(--navy-border)',
                        color: 'var(--white)',
                      }}
                      placeholder="Valfri beskrivning..."
                    />
                  </div>
                  <Button
                    onClick={skapaProjekt}
                    disabled={skapar || !nyttNamn.trim()}
                    className="w-full font-semibold"
                    style={{ background: 'var(--yellow)', color: 'var(--navy)' }}
                  >
                    {skapar ? 'Skapar...' : 'Skapa projekt'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                  { label: 'Inkorg', color: 'var(--yellow)', items: inkorg },
                  { label: 'Under arbete', color: 'var(--blue-accent)', items: underArbete },
                  { label: 'Inskickat', color: 'var(--green)', items: inskickat },
                  { label: 'Tilldelning', color: 'var(--orange)', items: tilldelning },
                ].map(col => (
                  <div
                    key={col.label}
                    style={{
                      background: 'var(--navy-mid)',
                      border: '1px solid var(--navy-border)',
                      borderRadius: 14,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--navy-border)',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: col.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{col.label}</span>
                      <span
                        className="ml-auto"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'var(--navy-light)',
                          color: 'var(--muted-custom)',
                          padding: '2px 7px',
                          borderRadius: 10,
                        }}
                      >
                        {col.items.length}
                      </span>
                    </div>

                    <div
                      className="flex flex-col gap-2.5"
                      style={{ padding: 12, minHeight: 200 }}
                    >
                      {col.items.length === 0 ? (
                        <div
                          className="flex items-center justify-center flex-1"
                          style={{ fontSize: 12, color: 'var(--slate)' }}
                        >
                          Inga projekt
                        </div>
                      ) : (
                        col.items.map(p => <ProjektKort key={p.id} projekt={p} />)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
