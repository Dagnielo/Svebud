'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AnbudsUppladdning from '@/components/AnbudsUppladdning'
import GranskningSida from '@/components/GranskningSida'
import JämförelseVy from '@/components/JämförelseVy'
import RekommendationsVy from '@/components/RekommendationsVy'
import UppföljningsDashboard from '@/components/UppföljningsDashboard'
import AgentStatusBar from '@/components/AgentStatusBar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

type ProjektData = {
  id: string
  namn: string
  beskrivning: string | null
  jämförelse_status: string
  jämförelse_resultat: unknown
  rekommendation_status: string
  rekommendation: unknown
  analys_komplett: boolean | null
  saknade_falt: string[]
}

type AnbudRad = {
  id: string
  filnamn: string
  extraktion_status: string
  extraherad_data: Record<string, { värde: unknown; konfidens: number }> | null
  skapad: string
}

type LoggRad = {
  id: string
  steg: string
  status: string
  meddelande: string | null
  skapad: string
}

const stegLabels = ['Underlag', 'Analys', 'Jämförelse', 'Rekommendation']

function getAktivtSteg(p: ProjektData): number {
  if (p.rekommendation_status === 'klar') return 4
  if (p.jämförelse_status === 'klar') return 3
  if (p.analys_komplett !== null) return 2
  return 1
}

function formatDatum(d: string) {
  return new Date(d).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ProjektSida({ params }: { params: Promise<{ projektId: string }> }) {
  const { projektId } = use(params)
  const [projekt, setProjekt] = useState<ProjektData | null>(null)
  const [anbud, setAnbud] = useState<AnbudRad[]>([])
  const [logg, setLogg] = useState<LoggRad[]>([])
  const [loading, setLoading] = useState(true)
  const [jämförLaddar, setJämförLaddar] = useState(false)
  const [rekLaddar, setRekLaddar] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function hämta() {
    const { data: p } = await supabase
      .from('projekt')
      .select('*')
      .eq('id', projektId)
      .single()

    if (p) setProjekt(p as unknown as ProjektData)

    const { data: a } = await supabase
      .from('anbud')
      .select('*')
      .eq('projekt_id', projektId)
      .order('skapad', { ascending: false })

    if (a) setAnbud(a as unknown as AnbudRad[])

    // Hämta logg från alla anbud
    const anbudIds = (a ?? []).map((x: Record<string, unknown>) => x.id as string)
    if (anbudIds.length > 0) {
      const { data: l } = await supabase
        .from('extraktion_log')
        .select('*')
        .in('anbud_id', anbudIds)
        .order('skapad', { ascending: false })
        .limit(10)

      if (l) setLogg(l as unknown as LoggRad[])
    }

    setLoading(false)
  }

  useEffect(() => {
    hämta()
    const interval = setInterval(hämta, 15000)
    return () => clearInterval(interval)
  }, [projektId])

  async function körJämförelse() {
    setJämförLaddar(true)
    await fetch(`/api/projekt/${projektId}/jämför`, { method: 'POST' })
    await hämta()
    setJämförLaddar(false)
  }

  async function körRekommendation() {
    setRekLaddar(true)
    await fetch(`/api/projekt/${projektId}/rekommendation`, { method: 'POST' })
    await hämta()
    setRekLaddar(false)
  }

  async function exportera() {
    const res = await fetch(`/api/projekt/${projektId}/rekommendation/exportera`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <div className="animate-pulse" style={{ color: 'var(--muted-custom)' }}>Laddar projekt...</div>
      </div>
    )
  }

  if (!projekt) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <div style={{ color: 'var(--red)' }}>Projektet hittades inte</div>
      </div>
    )
  }

  const aktivtSteg = getAktivtSteg(projekt)

  // Deadline from first anbud
  const deadline = anbud
    .map(a => a.extraherad_data?.['sista_anbudsdag']?.värde)
    .find(v => typeof v === 'string') as string | undefined

  const dagarKvar = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const anbudExtraherade = anbud.filter(a => a.extraktion_status === 'extraherad').length

  // Go/No-Go badge
  const rek = projekt.rekommendation as Record<string, unknown> | null
  const goNoGo = rek?.beslut as string | undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-4"
        style={{
          background: 'var(--navy-mid)',
          borderBottom: '1px solid var(--navy-border)',
          padding: '20px 32px',
        }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5"
          style={{
            fontSize: 13,
            color: 'var(--muted-custom)',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ← Tillbaka
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {projekt.namn}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginTop: 1 }}>
            {projekt.beskrivning ?? ''}
            {deadline && ` · Deadline ${new Date(deadline).toLocaleDateString('sv-SE')}`}
          </p>
        </div>
        <div className="flex gap-2.5">
          {goNoGo && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '3px 8px',
                borderRadius: 5,
                background:
                  goNoGo === 'GO' ? 'var(--green-bg)' :
                  goNoGo === 'NO-GO' ? 'var(--red-bg)' : 'var(--orange-bg)',
                color:
                  goNoGo === 'GO' ? 'var(--green)' :
                  goNoGo === 'NO-GO' ? 'var(--red)' : 'var(--orange)',
              }}
            >
              {goNoGo}
            </span>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-stretch" style={{ padding: '24px 32px 0', marginBottom: 32 }}>
        {stegLabels.map((label, i) => {
          const stegNr = i + 1
          const done = aktivtSteg > stegNr
          const active = aktivtSteg === stegNr
          const isLast = i === stegLabels.length - 1

          return (
            <div key={label} className="flex-1 relative">
              <div className="flex flex-col items-center" style={{ padding: '0 8px' }}>
                <div
                  className="flex items-center justify-center relative z-[2]"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: `2px solid ${done ? 'var(--green)' : active ? 'var(--yellow)' : 'var(--steel)'}`,
                    background: done ? 'var(--green)' : active ? 'var(--yellow-glow)' : 'var(--navy-mid)',
                    color: done ? 'var(--navy)' : active ? 'var(--yellow)' : 'var(--muted-custom)',
                    fontSize: 13,
                    fontWeight: 800,
                    boxShadow: active ? '0 0 0 4px var(--yellow-glow)' : 'none',
                  }}
                >
                  {done ? '✓' : stegNr}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: done ? 'var(--green)' : active ? 'var(--yellow)' : 'var(--muted-custom)',
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <div
                  className="absolute z-[1]"
                  style={{
                    top: 18,
                    left: 'calc(50% + 18px)',
                    right: 'calc(-50% + 18px)',
                    height: 2,
                    background: done ? 'var(--green)' : 'var(--steel)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Main content + sidebar */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 0 }}>
        {/* Main */}
        <div style={{ padding: '0 32px 32px', borderRight: '1px solid var(--navy-border)' }}>
          {/* Agent Status Bar */}
          <div style={{ marginBottom: 20 }}>
            <AgentStatusBar
              antalExtraherade={anbudExtraherade}
              jämförelseStatus={projekt.jämförelse_status}
              rekommendationStatus={projekt.rekommendation_status}
              antalAktivaBrev={0}
            />
          </div>

          <Tabs defaultValue="underlag">
            <TabsList
              style={{
                background: 'var(--navy-mid)',
                border: '1px solid var(--navy-border)',
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <TabsTrigger value="underlag">📎 Underlag & anbud</TabsTrigger>
              <TabsTrigger value="analys">🤖 AI-analys</TabsTrigger>
              <TabsTrigger value="kalkyl">🧮 Kalkyl</TabsTrigger>
              <TabsTrigger value="rekommendation">📋 Rekommendation</TabsTrigger>
            </TabsList>

            {/* TAB 1: Underlag & anbud */}
            <TabsContent value="underlag">
              <div className="space-y-4">
                {/* Förfrågningsunderlag */}
                <div
                  style={{
                    background: 'var(--navy-mid)',
                    border: '1px solid var(--navy-border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="flex items-center gap-2.5"
                    style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}
                  >
                    <span style={{ fontSize: 16 }}>📋</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Förfrågningsunderlag</span>
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <AnbudsUppladdning projektId={projektId} onUppladdat={() => hämta()} />
                  </div>
                </div>

                {/* Anbudslista */}
                {anbud.length > 0 && (
                  <div
                    style={{
                      background: 'var(--navy-mid)',
                      border: '1px solid var(--navy-border)',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="flex items-center gap-2.5"
                      style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}
                    >
                      <span style={{ fontSize: 16 }}>📄</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Uppladdade anbud</span>
                      <span
                        className="ml-auto font-mono"
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          background: 'var(--yellow-glow)',
                          color: 'var(--yellow)',
                          padding: '3px 8px',
                          borderRadius: 5,
                          border: '1px solid rgba(245,196,0,0.3)',
                        }}
                      >
                        {anbudExtraherade}/{anbud.length} extraherade
                      </span>
                    </div>
                    <div style={{ padding: '12px 18px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Fil', 'Status', 'Datum'].map(h => (
                              <th
                                key={h}
                                style={{
                                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                  letterSpacing: '0.07em', color: 'var(--muted-custom)',
                                  padding: '8px 10px', borderBottom: '1px solid var(--navy-border)',
                                  textAlign: 'left',
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {anbud.map(a => (
                            <tr key={a.id}>
                              <td style={{ padding: '10px', fontSize: 13, borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                                <span style={{ fontWeight: 600 }}>{a.filnamn}</span>
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                                <span
                                  style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                                    textTransform: 'uppercase',
                                    background:
                                      a.extraktion_status === 'extraherad' ? 'var(--green-bg)' :
                                      a.extraktion_status === 'fel' ? 'var(--red-bg)' : 'var(--yellow-glow)',
                                    color:
                                      a.extraktion_status === 'extraherad' ? 'var(--green)' :
                                      a.extraktion_status === 'fel' ? 'var(--red)' : 'var(--yellow)',
                                  }}
                                >
                                  {a.extraktion_status}
                                </span>
                              </td>
                              <td style={{ padding: '10px', fontSize: 12, color: 'var(--muted-custom)', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                                {formatDatum(a.skapad)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Granskning om det krävs */}
                {projekt.analys_komplett === false && (
                  <GranskningSida projektId={projektId} />
                )}
              </div>
            </TabsContent>

            {/* TAB 2: AI-analys */}
            <TabsContent value="analys">
              <div className="space-y-4">
                <GranskningSida projektId={projektId} />

                {/* Jämförelse */}
                <div
                  style={{
                    background: 'var(--navy-mid)',
                    border: '1px solid var(--navy-border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="flex items-center gap-2.5"
                    style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}
                  >
                    <span style={{ fontSize: 16 }}>⚖️</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Jämförelse</span>
                    {anbudExtraherade >= 2 && projekt.jämförelse_status === 'ej_startad' && (
                      <Button
                        onClick={körJämförelse}
                        disabled={jämförLaddar}
                        className="ml-auto"
                        style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 12, padding: '6px 12px' }}
                      >
                        {jämförLaddar ? 'Jämför...' : 'Kör jämförelse'}
                      </Button>
                    )}
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    {anbudExtraherade < 2 ? (
                      <p style={{ fontSize: 13, color: 'var(--muted-custom)' }}>
                        Ladda upp minst 2 anbud och vänta på extraktion innan jämförelse.
                      </p>
                    ) : (
                      <JämförelseVy
                        projektId={projektId}
                        data={projekt.jämförelse_resultat as Parameters<typeof JämförelseVy>[0]['data']}
                        onKörJämförelse={körJämförelse}
                        laddar={jämförLaddar}
                      />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Kalkyl */}
            <TabsContent value="kalkyl">
              {(() => {
                const rekData = projekt.rekommendation as Record<string, unknown> | null
                const kalkyl = rekData?.kalkyl as {
                  moment?: Array<{ beskrivning: string; timmar: number; timpris: number; materialkostnad: number; belopp: number }>
                  totalbelopp?: number
                  moms?: number
                  totalt_inkl_moms?: number
                } | null

                if (!kalkyl || !kalkyl.moment) {
                  return (
                    <div
                      style={{
                        background: 'var(--navy-mid)',
                        border: '1px solid var(--navy-border)',
                        borderRadius: 12,
                        padding: '32px 18px',
                        textAlign: 'center',
                      }}
                    >
                      <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginBottom: 16 }}>
                        Kör jämförelse och rekommendation först för att generera kalkyl.
                      </p>
                      <Button
                        onClick={körRekommendation}
                        disabled={rekLaddar || projekt.jämförelse_status !== 'klar'}
                        style={{ background: 'var(--yellow)', color: 'var(--navy)' }}
                      >
                        {rekLaddar ? 'Genererar...' : 'Generera rekommendation & kalkyl'}
                      </Button>
                    </div>
                  )
                }

                return (
                  <div
                    style={{
                      background: 'var(--navy-mid)',
                      border: '1px solid var(--navy-border)',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="flex items-center gap-2.5"
                      style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}
                    >
                      <span style={{ fontSize: 16 }}>🧮</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Kalkyl</span>
                    </div>
                    <div style={{ padding: '0 18px 18px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Moment', 'Timmar', 'Material', 'Belopp'].map(h => (
                              <th
                                key={h}
                                style={{
                                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                  letterSpacing: '0.07em', color: 'var(--muted-custom)',
                                  padding: '8px 10px', borderBottom: '1px solid var(--navy-border)',
                                  textAlign: h === 'Moment' ? 'left' : 'right',
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {kalkyl.moment.map((m, i) => (
                            <tr key={i}>
                              <td style={{ padding: '10px', fontSize: 13, borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                                {m.beskrivning}
                              </td>
                              <td className="font-mono" style={{ padding: '10px', fontSize: 13, textAlign: 'right', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                                {m.timmar}
                              </td>
                              <td className="font-mono" style={{ padding: '10px', fontSize: 13, textAlign: 'right', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                                {m.materialkostnad.toLocaleString('sv-SE')} kr
                              </td>
                              <td className="font-mono" style={{ padding: '10px', fontSize: 13, textAlign: 'right', fontWeight: 600, borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                                {m.belopp.toLocaleString('sv-SE')} kr
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Total */}
                      <div
                        className="flex justify-between items-center"
                        style={{
                          background: 'var(--navy)',
                          borderRadius: 10,
                          padding: '14px 16px',
                          marginTop: 12,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Totalt inkl. moms</span>
                        <span
                          className="font-mono"
                          style={{ fontSize: 22, fontWeight: 800, color: 'var(--yellow)' }}
                        >
                          {(kalkyl.totalt_inkl_moms ?? 0).toLocaleString('sv-SE')} kr
                        </span>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <Button
                          onClick={körRekommendation}
                          disabled={rekLaddar}
                          style={{ background: 'var(--yellow)', color: 'var(--navy)' }}
                        >
                          {rekLaddar ? 'Genererar...' : 'Generera anbud'}
                        </Button>
                        <Button
                          onClick={exportera}
                          variant="outline"
                          style={{ borderColor: 'var(--navy-border)', color: 'var(--soft)' }}
                        >
                          Exportera
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </TabsContent>

            {/* TAB 4: Rekommendation */}
            <TabsContent value="rekommendation">
              <div className="space-y-4">
                <RekommendationsVy
                  data={projekt.rekommendation as Parameters<typeof RekommendationsVy>[0]['data']}
                  onGenerera={körRekommendation}
                  onExportera={exportera}
                  laddar={rekLaddar}
                />
                <UppföljningsDashboard />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar panel */}
        <div style={{ padding: 24 }}>
          {/* Deadline */}
          <div
            style={{
              background: 'var(--navy-mid)',
              border: '1px solid var(--navy-border)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--muted-custom)',
                marginBottom: 12,
              }}
            >
              Deadline
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange)', marginBottom: 4 }}>
              {dagarKvar !== null ? `${dagarKvar} dagar` : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-custom)' }}>
              {deadline ? new Date(deadline).toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Ej angiven'}
            </div>
          </div>

          {/* Uppladdade filer */}
          <div
            style={{
              background: 'var(--navy-mid)',
              border: '1px solid var(--navy-border)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--muted-custom)',
                marginBottom: 12,
              }}
            >
              Underlag ({anbud.length})
            </div>
            {anbud.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Inga filer uppladdade</div>
            ) : (
              anbud.map(a => (
                <div key={a.id} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: 'var(--blue-accent)' }}>📄</span>
                  <span className="truncate" style={{ color: 'var(--soft)' }}>{a.filnamn}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background:
                        a.extraktion_status === 'extraherad' ? 'var(--green)' :
                        a.extraktion_status === 'fel' ? 'var(--red)' : 'var(--yellow)',
                    }}
                  />
                </div>
              ))
            )}
          </div>

          {/* Certifikat */}
          {anbud.some(a => a.extraherad_data) && (
            <div
              style={{
                background: 'var(--navy-mid)',
                border: '1px solid var(--navy-border)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--muted-custom)',
                  marginBottom: 12,
                }}
              >
                Certifikat
              </div>
              {(() => {
                const rekData = projekt.rekommendation as Record<string, unknown> | null
                const certs = (rekData?.certifikat_uppfyllda ?? []) as Array<{ krav: string; uppfyllt: boolean }>
                if (certs.length === 0) {
                  return <div style={{ fontSize: 12, color: 'var(--slate)' }}>Generera rekommendation för att se certifikatkrav</div>
                }
                return certs.map((c, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: c.uppfyllt ? 'var(--green)' : 'var(--red)',
                      }}
                    />
                    <span style={{ color: 'var(--soft)' }}>{c.krav}</span>
                  </div>
                ))
              })()}
            </div>
          )}

          {/* Aktivitetslogg */}
          <div
            style={{
              background: 'var(--navy-mid)',
              border: '1px solid var(--navy-border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--muted-custom)',
                marginBottom: 12,
              }}
            >
              Aktivitet
            </div>
            {logg.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Ingen aktivitet ännu</div>
            ) : (
              logg.slice(0, 5).map(l => (
                <div key={l.id} className="flex gap-2.5" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 10 }}>
                  <span className="font-mono flex-shrink-0" style={{ fontSize: 10, marginTop: 1 }}>
                    {new Date(l.skapad).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ color: 'var(--soft)' }}>
                    {l.meddelande ?? `${l.steg}: ${l.status}`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
