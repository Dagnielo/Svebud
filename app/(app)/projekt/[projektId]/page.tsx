'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AnbudsUppladdning from '@/components/AnbudsUppladdning'
import GranskningSida from '@/components/GranskningSida'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

type ProjektData = {
  id: string
  namn: string
  beskrivning: string | null
  jämförelse_status: string
  rekommendation_status: string
  rekommendation: unknown
  kravmatchning: unknown
  analys_komplett: boolean | null
  pipeline_status: string
  tilldelning_status: string | null
  anbudsutkast: string | null
  anbudsutkast_redigerat: string | null
}

type AnbudRad = { id: string; filnamn: string; extraktion_status: string; skapad: string }
type LoggRad = { id: string; steg: string; status: string; meddelande: string | null; skapad: string }

const stegLabels = ['Dokument', 'Analys & GO/NO-GO', 'Anbud & Skicka']

function getAktivtSteg(p: ProjektData): number {
  if (p.pipeline_status === 'inskickat' || p.pipeline_status === 'tilldelning') return 3
  if (p.rekommendation_status === 'klar') return 3
  if (p.jämförelse_status === 'klar') return 2
  return 1
}

export default function ProjektSida({ params }: { params: Promise<{ projektId: string }> }) {
  const { projektId } = use(params)
  const [projekt, setProjekt] = useState<ProjektData | null>(null)
  const [anbud, setAnbud] = useState<AnbudRad[]>([])
  const [logg, setLogg] = useState<LoggRad[]>([])
  const [loading, setLoading] = useState(true)
  const [analysLaddar, setAnalysLaddar] = useState(false)
  const [anbudLaddar, setAnbudLaddar] = useState(false)
  const [utkast, setUtkast] = useState('')
  const [sparar, setSparar] = useState(false)
  const [aktivTab, setAktivTab] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function hämta() {
    const { data: p } = await supabase.from('projekt').select('*').eq('id', projektId).single()
    if (p) {
      const pd = p as unknown as ProjektData
      setProjekt(pd)
      setUtkast(pd.anbudsutkast_redigerat ?? pd.anbudsutkast ?? '')
    }
    const { data: a } = await supabase.from('anbud').select('*').eq('projekt_id', projektId).order('skapad', { ascending: false })
    if (a) setAnbud(a as unknown as AnbudRad[])
    const anbudIds = (a ?? []).map((x: Record<string, unknown>) => x.id as string)
    if (anbudIds.length > 0) {
      const { data: l } = await supabase.from('extraktion_log').select('*').in('anbud_id', anbudIds).order('skapad', { ascending: false }).limit(10)
      if (l) setLogg(l as unknown as LoggRad[])
    }
    setLoading(false)
  }

  useEffect(() => {
    hämta()
    const interval = setInterval(hämta, 15000)
    return () => clearInterval(interval)
  }, [projektId])

  async function körAnalys() {
    setAktivTab('analys')
    setAnalysLaddar(true)
    await fetch('/api/anbud/extrahera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projektId }),
    })
    await hämta()
    setAnalysLaddar(false)
  }

  async function körAnbudsGenerering() {
    setAnbudLaddar(true)
    await fetch(`/api/projekt/${projektId}/rekommendation`, { method: 'POST' })
    await hämta()
    setAnbudLaddar(false)
  }

  async function sparaUtkast() {
    setSparar(true)
    await supabase.from('projekt').update({ anbudsutkast_redigerat: utkast }).eq('id', projektId)
    setSparar(false)
  }

  async function markeraSomSkickat() {
    await supabase.from('projekt').update({ pipeline_status: 'inskickat', skickat_datum: new Date().toISOString() }).eq('id', projektId)
    await hämta()
  }

  async function uppdateraTilldelning(status: string) {
    await supabase.from('projekt').update({ pipeline_status: 'tilldelning', tilldelning_status: status, tilldelning_datum: new Date().toISOString() }).eq('id', projektId)
    await hämta()
  }

  function kopieraText() {
    navigator.clipboard.writeText(utkast)
    alert('Kopierat till urklipp!')
  }

  function exporteraSomPdf() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Anbud</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;color:#333}
h1{font-size:20px}h2{font-size:16px;border-bottom:1px solid #ddd;padding-bottom:8px}h3{font-size:14px}
table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f5f5f5}@media print{body{margin:0}}</style></head><body>`)
    // Enkel markdown → HTML
    const html = utkast
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
    win.document.write(`<p>${html}</p></body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  function exporteraSomWord() {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>body{font-family:Calibri,sans-serif;line-height:1.5}h1{font-size:18pt}h2{font-size:14pt}h3{font-size:12pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px}</style></head>
<body>${utkast
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')}</body></html>`

    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `anbud_${projekt?.namn?.replace(/[^a-z0-9åäö]/gi, '_') ?? 'utkast'}.doc`
    a.click()
    URL.revokeObjectURL(url)
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

  // Sätt rätt tab automatiskt baserat på steg
  if (aktivTab === null) {
    if (aktivtSteg >= 3) setAktivTab('anbud')
    else if (aktivtSteg === 2) setAktivTab('analys')
    else setAktivTab('dokument')
  }

  const kravmatch = projekt.kravmatchning as Record<string, unknown> | null
  const goNoGo = kravmatch?.go_no_go as string | undefined
  const rekData = projekt.rekommendation as Record<string, unknown> | null

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)' }}>
      {/* Header */}
      <div className="flex items-center gap-4" style={{ background: 'var(--navy-mid)', borderBottom: '1px solid var(--navy-border)', padding: '20px 32px' }}>
        <button onClick={() => router.push('/dashboard')} style={{ fontSize: 13, color: 'var(--muted-custom)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Tillbaka</button>
        <div className="flex-1">
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{projekt.namn}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginTop: 1 }}>{projekt.beskrivning ?? ''}</p>
        </div>
        {goNoGo && (
          <span style={{
            fontSize: 12, fontWeight: 800, textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6,
            background: goNoGo === 'GO' ? 'var(--green-bg)' : goNoGo === 'NO_GO' ? 'var(--red-bg)' : 'var(--orange-bg)',
            color: goNoGo === 'GO' ? 'var(--green)' : goNoGo === 'NO_GO' ? 'var(--red)' : 'var(--orange)',
          }}>
            {goNoGo === 'GO' ? 'GO' : goNoGo === 'NO_GO' ? 'NO-GO' : 'GO m. reservation'}
          </span>
        )}
      </div>

      {/* 3-stegs stepper */}
      <div style={{ padding: '24px 32px 0', marginBottom: 16 }}>
        <div className="flex items-stretch">
          {stegLabels.map((label, i) => {
            const nr = i + 1
            const done = aktivtSteg > nr
            const active = aktivtSteg === nr
            const isLast = i === stegLabels.length - 1
            const tabMap = ['dokument', 'analys', 'anbud']
            return (
              <div key={label} className="flex-1 relative">
                <button onClick={() => setAktivTab(tabMap[i])} className="flex flex-col items-center w-full" style={{ padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div className="flex items-center justify-center relative z-[2]" style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: `2px solid ${done ? 'var(--green)' : active ? 'var(--yellow)' : 'var(--steel)'}`,
                    background: done ? 'var(--green)' : active ? 'var(--yellow-glow)' : 'var(--navy-mid)',
                    color: done ? 'var(--navy)' : active ? 'var(--yellow)' : 'var(--muted-custom)',
                    fontSize: 14, fontWeight: 800, boxShadow: active ? '0 0 0 4px var(--yellow-glow)' : 'none', transition: 'all 0.2s',
                  }}>
                    {done ? '✓' : nr}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, marginTop: 8, textAlign: 'center', color: done ? 'var(--green)' : active ? 'var(--yellow)' : 'var(--muted-custom)' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 10, marginTop: 2, color: done ? 'var(--green)' : active ? 'var(--soft)' : 'var(--slate)' }}>
                    {done ? 'Klart ✓' : active ? '← Du är här' : ''}
                  </span>
                </button>
                {!isLast && (
                  <div className="absolute z-[1]" style={{ top: 20, left: 'calc(50% + 20px)', right: 'calc(-50% + 20px)', height: 2, background: done ? 'var(--green)' : 'var(--steel)' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Instruktionsruta */}
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'var(--yellow-glow)', border: '1px solid rgba(245,196,0,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>{aktivtSteg === 1 ? '📎' : aktivtSteg === 2 ? '📊' : '📋'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>
              {aktivtSteg === 1 && 'Steg 1: Ladda upp alla dokument i förfrågningsunderlaget'}
              {aktivtSteg === 2 && 'Steg 2: Granska analys och bekräfta osäkra krav'}
              {aktivtSteg >= 3 && 'Steg 3: Granska anbudsutkast, justera och skicka'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-custom)', marginTop: 2 }}>
              {aktivtSteg === 1 && anbud.length === 0 && 'Ladda upp PDF, Word, Excel eller klistra in mailtext.'}
              {aktivtSteg === 1 && anbud.length > 0 && (
                <span className="flex items-center gap-3" style={{ marginTop: 4 }}>
                  <span>{anbud.length} dokument uppladdade.</span>
                  <Button onClick={körAnalys} disabled={analysLaddar} style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 12, fontWeight: 700, padding: '6px 14px' }}>
                    {analysLaddar ? '⏳ Analyserar...' : '🔍 Analysera förfrågan →'}
                  </Button>
                </span>
              )}
              {aktivtSteg === 2 && 'Bekräfta osäkra krav om det behövs, och generera sedan anbud.'}
              {aktivtSteg >= 3 && 'Redigera utkastet, exportera och markera som skickat.'}
            </div>
          </div>
        </div>
      </div>

      {/* Content + sidebar */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 0 }}>
        <div style={{ padding: '0 32px 32px', borderRight: '1px solid var(--navy-border)' }}>
          <Tabs value={aktivTab ?? 'dokument'} onValueChange={setAktivTab}>
            <TabsList className="hidden">
              <TabsTrigger value="dokument">Dokument</TabsTrigger>
              <TabsTrigger value="analys">Analys</TabsTrigger>
              <TabsTrigger value="anbud">Anbud</TabsTrigger>
            </TabsList>

            {/* TAB 1: Dokument */}
            <TabsContent value="dokument">
              <div className="space-y-4">
                <AnbudsUppladdning projektId={projektId} onUppladdat={() => hämta()} />
                {anbud.length > 0 && (
                  <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="flex items-center gap-2.5" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Uppladdade dokument ({anbud.length})</span>
                      <span className="ml-auto font-mono" style={{ fontSize: 10, fontWeight: 800, background: 'var(--green-bg)', color: 'var(--green)', padding: '3px 8px', borderRadius: 5 }}>
                        {anbud.length} uppladdade ✓
                      </span>
                    </div>
                    <div style={{ padding: '12px 18px' }}>
                      {anbud.map(a => (
                        <div key={a.id} className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid rgba(36,54,80,0.3)' }}>
                          <span style={{ fontSize: 13 }}>{a.filnamn}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Analys & GO/NO-GO */}
            <TabsContent value="analys">
              <GranskningSida projektId={projektId} externtScanning={analysLaddar} />
              {projekt.jämförelse_status === 'klar' && !utkast && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button onClick={körAnbudsGenerering} disabled={anbudLaddar} style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 14, padding: '12px 32px' }}>
                    {anbudLaddar ? '⏳ Genererar anbud...' : '📋 Generera anbudsutkast →'}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Anbud & Skicka */}
            <TabsContent value="anbud">
              {!utkast ? (
                <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '32px 18px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--muted-custom)', marginBottom: 16 }}>
                    Analysera förfrågan först, sedan kan AI:n generera ett anbudsutkast.
                  </p>
                  <Button onClick={körAnbudsGenerering} disabled={anbudLaddar || projekt.jämförelse_status !== 'klar'} style={{ background: 'var(--yellow)', color: 'var(--navy)' }}>
                    {anbudLaddar ? 'Genererar...' : '📋 Generera anbudsutkast'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Kalkyl */}
                  <KalkylVy kalkyl={rekData?.kalkyl as Record<string, unknown> | undefined} />

                  {/* Redigerbart utkast */}
                  <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>📋 Anbudsutkast (redigerbart)</span>
                      <div className="flex gap-2">
                        <Button onClick={sparaUtkast} disabled={sparar} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--soft)' }}>
                          {sparar ? 'Sparar...' : '💾 Spara'}
                        </Button>
                        <Button onClick={kopieraText} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--soft)' }}>📋 Kopiera text</Button>
                        <Button onClick={exporteraSomPdf} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--soft)' }}>📄 PDF</Button>
                        <Button onClick={exporteraSomWord} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--soft)' }}>📝 Word</Button>
                        <Button onClick={körAnbudsGenerering} disabled={anbudLaddar} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--yellow)' }}>🔄 Generera om</Button>
                      </div>
                    </div>
                    <textarea
                      value={utkast}
                      onChange={e => setUtkast(e.target.value)}
                      style={{ width: '100%', minHeight: 500, padding: 18, background: 'var(--navy)', color: 'var(--soft)', border: 'none', fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-mono), monospace', resize: 'vertical' }}
                    />
                  </div>

                  {/* Skicka & tilldelning */}
                  <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '20px 24px' }}>
                    {projekt.pipeline_status === 'inskickat' || projekt.pipeline_status === 'tilldelning' ? (
                      <div className="space-y-4">
                        <div style={{ fontSize: 15, fontWeight: 700 }}>✅ Anbud inskickat</div>
                        <p style={{ fontSize: 13, color: 'var(--muted-custom)' }}>Uppdatera tilldelningsstatus:</p>
                        <div className="flex gap-3">
                          <Button onClick={() => uppdateraTilldelning('vunnet')} style={{ background: 'var(--green)', color: 'var(--navy)' }}>✅ Vunnet</Button>
                          <Button onClick={() => uppdateraTilldelning('forlorat')} style={{ background: 'var(--red)', color: 'white' }}>❌ Förlorat</Button>
                          <Button onClick={() => uppdateraTilldelning('vantar')} variant="outline" style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)' }}>⏳ Väntar</Button>
                        </div>
                        {projekt.tilldelning_status && (
                          <div style={{ fontSize: 14, fontWeight: 700, color: projekt.tilldelning_status === 'vunnet' ? 'var(--green)' : projekt.tilldelning_status === 'forlorat' ? 'var(--red)' : 'var(--orange)' }}>
                            Status: {projekt.tilldelning_status === 'vunnet' ? 'Vunnet ✅' : projekt.tilldelning_status === 'forlorat' ? 'Förlorat ❌' : 'Väntar ⏳'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <Button onClick={markeraSomSkickat} style={{ background: 'var(--green)', color: 'var(--navy)', fontSize: 14, padding: '12px 24px' }}>
                          📤 Markera som skickat
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div style={{ padding: 24 }}>
          <SidePanel title={`Dokument (${anbud.length})`}>
            {anbud.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Inga filer uppladdade</div>
            ) : anbud.map(a => (
              <div key={a.id} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: 'var(--blue-accent)' }}>📄</span>
                <span className="truncate" style={{ color: 'var(--soft)' }}>{a.filnamn}</span>
                <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: a.extraktion_status === 'extraherad' ? 'var(--green)' : 'var(--yellow)' }} />
              </div>
            ))}
          </SidePanel>

          {kravmatch && (
            <SidePanel title="Analys">
              <div style={{ fontSize: 12, color: goNoGo === 'GO' ? 'var(--green)' : goNoGo === 'NO_GO' ? 'var(--red)' : 'var(--orange)', fontWeight: 700, marginBottom: 8 }}>
                {goNoGo === 'GO' ? 'GO — Lämna anbud' : goNoGo === 'NO_GO' ? 'NO-GO' : 'GO med reservation'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>{(kravmatch as Record<string, unknown>).sammanfattning as string}</div>
            </SidePanel>
          )}

          <SidePanel title="Aktivitet">
            {logg.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Ingen aktivitet ännu</div>
            ) : logg.slice(0, 5).map(l => (
              <div key={l.id} className="flex gap-2.5" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 10 }}>
                <span className="font-mono flex-shrink-0" style={{ fontSize: 10, marginTop: 1 }}>{new Date(l.skapad).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ color: 'var(--soft)' }}>{l.meddelande ?? `${l.steg}: ${l.status}`}</span>
              </div>
            ))}
          </SidePanel>
        </div>
      </div>
    </div>
  )
}

function KalkylVy({ kalkyl }: { kalkyl?: Record<string, unknown> }) {
  if (!kalkyl) return null
  const moment = (kalkyl.moment ?? []) as Array<{ beskrivning: string; timmar: number; materialkostnad: number; belopp: number }>
  const totalt = (kalkyl.totalt_inkl_moms ?? 0) as number
  return (
    <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)', fontSize: 14, fontWeight: 700 }}>🧮 Kalkyl</div>
      <div style={{ padding: '0 18px 18px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Moment', 'Timmar', 'Material', 'Belopp'].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-custom)', padding: '8px 10px', borderBottom: '1px solid var(--navy-border)', textAlign: h === 'Moment' ? 'left' : 'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {moment.map((m, i) => (
              <tr key={i}>
                <td style={{ padding: '10px', fontSize: 13, borderBottom: '1px solid rgba(36,54,80,0.5)' }}>{m.beskrivning}</td>
                <td className="font-mono" style={{ padding: '10px', fontSize: 13, textAlign: 'right', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>{m.timmar}</td>
                <td className="font-mono" style={{ padding: '10px', fontSize: 13, textAlign: 'right', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>{m.materialkostnad?.toLocaleString('sv-SE')} kr</td>
                <td className="font-mono" style={{ padding: '10px', fontSize: 13, textAlign: 'right', fontWeight: 600, borderBottom: '1px solid rgba(36,54,80,0.5)' }}>{m.belopp?.toLocaleString('sv-SE')} kr</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center" style={{ background: 'var(--navy)', borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Totalt inkl. moms</span>
          <span className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--yellow)' }}>{totalt.toLocaleString('sv-SE')} kr</span>
        </div>
      </div>
    </div>
  )
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-custom)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}
