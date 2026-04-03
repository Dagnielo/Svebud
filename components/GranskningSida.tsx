'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Krav = {
  krav: string
  typ: 'ska' | 'bör'
  kategori: string
  källa: string
  konfidens: number
}

type ExtraktionsData = {
  beställare: string | null
  kontaktperson: string | null
  org_nr: string | null
  sista_anbudsdag: string | null
  avtalsvillkor: string | null
  prismodell: string | null
  uppdragsbeskrivning: string | null
  värde_kr: number | null
  ska_krav: Krav[]
  bör_krav: Krav[]
}

type Dokument = {
  filnamn: string
  extraktion_status: string
}

type Props = {
  projektId: string
}

type Vy = 'dokument' | 'kategori'

const kategoriIkon: Record<string, string> = {
  certifikat: '📜', erfarenhet: '🏗️', kapacitet: '👷', ekonomi: '💰',
  kvalitet: '✅', säkerhet: '🦺', tidsplan: '📅', juridik: '⚖️', övrigt: '📌',
}

export default function GranskningSida({ projektId }: Props) {
  const [data, setData] = useState<ExtraktionsData | null>(null)
  const [dokument, setDokument] = useState<Dokument[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [vy, setVy] = useState<Vy>('dokument')
  const supabase = createClient()

  async function hämta() {
    const { data: projekt } = await supabase
      .from('projekt')
      .select('jämförelse_resultat')
      .eq('id', projektId)
      .single()

    if (projekt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultat = (projekt as any)['jämförelse_resultat'] as ExtraktionsData | null
      if (resultat?.ska_krav) setData(resultat)
    }

    const { data: anbud } = await supabase
      .from('anbud')
      .select('filnamn, extraktion_status')
      .eq('projekt_id', projektId)
      .order('skapad', { ascending: true })

    if (anbud) setDokument(anbud as unknown as Dokument[])
    setLoading(false)
  }

  useEffect(() => {
    hämta()
    const interval = setInterval(hämta, 10000)
    return () => clearInterval(interval)
  }, [projektId])

  async function körScanning() {
    setScanning(true)
    await fetch('/api/anbud/extrahera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projektId }),
    })
    await hämta()
    setScanning(false)
  }

  if (loading) return <div className="animate-pulse h-40 rounded-lg" style={{ background: 'var(--navy-mid)' }} />

  if (!data) {
    return (
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--muted-custom)', marginBottom: 16 }}>
          Dokumenten behöver scannas för att hitta krav.
        </p>
        <Button onClick={körScanning} disabled={scanning} style={{ background: 'var(--yellow)', color: 'var(--navy)' }}>
          {scanning ? 'Scannar dokument...' : '🔍 Scanna efter krav'}
        </Button>
      </div>
    )
  }

  const allaKrav = [...data.ska_krav, ...data.bör_krav]
  const lästa = dokument.filter(d => d.extraktion_status === 'extraherad' || d.extraktion_status === 'läst')

  // Gruppera krav per dokument (baserat på källa-fältet)
  function kravPerDokument(): Record<string, Krav[]> {
    const result: Record<string, Krav[]> = {}
    // Initiera med alla dokument
    for (const d of dokument) {
      result[d.filnamn] = []
    }
    // Matcha krav till dokument
    for (const k of allaKrav) {
      let matchat = false
      for (const d of dokument) {
        // Kolla om källan nämner dokumentets filnamn (del av)
        const dNamnKort = d.filnamn.replace(/\.[^.]+$/, '').toLowerCase()
        const källaLower = k.källa.toLowerCase()
        if (källaLower.includes(dNamnKort) ||
            källaLower.includes(d.filnamn.toLowerCase()) ||
            (dNamnKort.length > 5 && källaLower.includes(dNamnKort.slice(0, 10)))) {
          result[d.filnamn].push(k)
          matchat = true
          break
        }
      }
      if (!matchat) {
        // Försök matcha på dokumentnummer (t.ex. "06.1" i "06.1 Administrativa...")
        for (const d of dokument) {
          const numMatch = d.filnamn.match(/^(\d+\.\d+)/)
          if (numMatch && k.källa.includes(numMatch[1])) {
            result[d.filnamn].push(k)
            matchat = true
            break
          }
        }
      }
      if (!matchat) {
        // Lägg i "Övrigt"
        if (!result['Övriga krav']) result['Övriga krav'] = []
        result['Övriga krav'].push(k)
      }
    }
    return result
  }

  function kravPerKategori(): Record<string, Krav[]> {
    const result: Record<string, Krav[]> = {}
    for (const k of allaKrav) {
      const kat = k.kategori || 'övrigt'
      if (!result[kat]) result[kat] = []
      result[kat].push(k)
    }
    return result
  }

  const grupperadPerDok = kravPerDokument()
  const grupperadPerKat = kravPerKategori()

  return (
    <div className="space-y-4">
      {/* Sammanfattning */}
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--green)', borderRadius: 12, padding: '18px 20px' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>
              Scanning klar — {data.ska_krav.length} ska-krav och {data.bör_krav.length} bör-krav hittade
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 2 }}>
              {lästa.length} av {dokument.length} dokument har lästs och analyserats
            </div>
          </div>
        </div>
        {dokument.map((d, i) => (
          <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: d.extraktion_status === 'extraherad' || d.extraktion_status === 'läst' ? 'var(--green)' : 'var(--orange)' }}>
              {d.extraktion_status === 'extraherad' || d.extraktion_status === 'läst' ? '✓' : '⏳'}
            </span>
            <span style={{ color: 'var(--soft)' }}>{d.filnamn}</span>
            <span style={{ color: 'var(--muted-custom)', marginLeft: 'auto', fontSize: 10 }}>
              {grupperadPerDok[d.filnamn]?.length ?? 0} krav
            </span>
          </div>
        ))}
      </div>

      {/* Projektinfo */}
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)', fontSize: 14, fontWeight: 700 }}>
          📋 Projektinformation
        </div>
        <div style={{ padding: '12px 18px' }}>
          <div className="grid grid-cols-2 gap-3">
            <InfoRad label="Beställare" värde={data.beställare} />
            <InfoRad label="Kontaktperson" värde={data.kontaktperson} />
            <InfoRad label="Org.nr" värde={data.org_nr} />
            <InfoRad label="Sista anbudsdag" värde={data.sista_anbudsdag} />
            <InfoRad label="Avtalsvillkor" värde={data.avtalsvillkor} />
            <InfoRad label="Prismodell" värde={data.prismodell} />
            <InfoRad label="Uppskattat värde" värde={data.värde_kr ? `${data.värde_kr.toLocaleString('sv-SE')} kr` : null} />
            <div className="col-span-2">
              <InfoRad label="Uppdragsbeskrivning" värde={data.uppdragsbeskrivning} />
            </div>
          </div>
        </div>
      </div>

      {/* Vy-toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVy('dokument')}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: vy === 'dokument' ? 'var(--yellow)' : 'var(--navy-light)',
            color: vy === 'dokument' ? 'var(--navy)' : 'var(--muted-custom)',
          }}
        >
          📄 Per dokument
        </button>
        <button
          onClick={() => setVy('kategori')}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: vy === 'kategori' ? 'var(--yellow)' : 'var(--navy-light)',
            color: vy === 'kategori' ? 'var(--navy)' : 'var(--muted-custom)',
          }}
        >
          📂 Per kategori
        </button>
        <Button onClick={körScanning} disabled={scanning} variant="outline" size="sm" className="ml-auto" style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)', fontSize: 11 }}>
          {scanning ? 'Scannar...' : '🔄 Scanna om'}
        </Button>
      </div>

      {/* Kravlista - Per dokument */}
      {vy === 'dokument' && (
        <div className="space-y-3">
          {Object.entries(grupperadPerDok).map(([dokNamn, krav]) => (
            <div key={dokNamn} style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
              <div className="flex items-center gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{dokNamn}</span>
                <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
                  {krav.filter(k => k.typ === 'ska').length} ska · {krav.filter(k => k.typ === 'bör').length} bör
                </span>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {krav.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--slate)', padding: '8px 6px' }}>Inga krav hittade i detta dokument</p>
                ) : (
                  krav.map((k, i) => <KravRad key={i} krav={k} visaKälla={false} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kravlista - Per kategori */}
      {vy === 'kategori' && (
        <div className="space-y-3">
          {/* Ska-krav */}
          <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
            <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>🔴 Ska-krav ({data.ska_krav.length})</span>
              <Badge style={{ background: 'var(--red-bg)', color: 'var(--red)', border: 'none', fontSize: 10 }}>Obligatoriska</Badge>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {Object.entries(grupperadPerKat)
                .map(([kat, krav]) => [kat, krav.filter(k => k.typ === 'ska')] as [string, Krav[]])
                .filter(([, krav]) => krav.length > 0)
                .map(([kat, krav]) => (
                  <div key={kat} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6, padding: '0 6px' }}>
                      {kategoriIkon[kat] ?? '📌'} {kat}
                    </div>
                    {krav.map((k, i) => <KravRad key={i} krav={k} visaKälla={true} />)}
                  </div>
                ))}
            </div>
          </div>

          {/* Bör-krav */}
          {data.bör_krav.length > 0 && (
            <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
              <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>🟡 Bör-krav ({data.bör_krav.length})</span>
                <Badge style={{ background: 'var(--yellow-glow)', color: 'var(--yellow)', border: 'none', fontSize: 10 }}>Meriterande</Badge>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {Object.entries(grupperadPerKat)
                  .map(([kat, krav]) => [kat, krav.filter(k => k.typ === 'bör')] as [string, Krav[]])
                  .filter(([, krav]) => krav.length > 0)
                  .map(([kat, krav]) => (
                    <div key={kat} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6, padding: '0 6px' }}>
                        {kategoriIkon[kat] ?? '📌'} {kat}
                      </div>
                      {krav.map((k, i) => <KravRad key={i} krav={k} visaKälla={true} />)}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRad({ label, värde }: { label: string; värde: string | null }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: värde ? 'var(--white)' : 'var(--slate)' }}>{värde ?? '—'}</div>
    </div>
  )
}

function KravRad({ krav, visaKälla }: { krav: Krav; visaKälla: boolean }) {
  return (
    <div className="flex items-start gap-3" style={{ padding: '8px 6px', marginBottom: 2, borderRadius: 8, background: 'var(--navy-light)' }}>
      <span style={{ fontSize: 12, marginTop: 2 }}>{krav.typ === 'ska' ? '🔴' : '🟡'}</span>
      <div className="flex-1">
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{krav.krav}</div>
        {visaKälla && krav.källa && (
          <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{krav.källa}</div>
        )}
      </div>
      <span style={{ fontSize: 10, color: 'var(--muted-custom)', fontWeight: 600, flexShrink: 0 }}>{krav.konfidens}%</span>
    </div>
  )
}
