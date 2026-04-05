'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { hämtaAnbudsläge, bedömningsVisning } from '@/lib/verdict'

type MatchatKrav = {
  krav: string
  typ: 'ska' | 'bör'
  kategori: string
  källa: string
  status: 'uppfyllt' | 'ej_uppfyllt' | 'kräver_bekräftelse'
  matchning: string
}

type AnalysData = {
  beställare: string | null
  kontaktperson: string | null
  org_nr: string | null
  sista_anbudsdag: string | null
  avtalsvillkor: string | null
  prismodell: string | null
  uppdragsbeskrivning: string | null
  värde_kr: number | null
  anbudsläge?: string
  go_no_go?: string
  match_procent: number
  sammanfattning: string
  rekommendation: string
  matchade_krav: MatchatKrav[]
  kräver_bekräftelse: MatchatKrav[]
  ej_uppfyllda: MatchatKrav[]
  risker: string[]
  möjligheter: string[]
}

type Dokument = {
  filnamn: string
  extraktion_status: string
}

type Props = {
  projektId: string
  externtScanning?: boolean
  onAnalysKlar?: () => void
}

export default function GranskningSida({ projektId, externtScanning, onAnalysKlar }: Props) {
  const [data, setData] = useState<AnalysData | null>(null)
  const [dokument, setDokument] = useState<Dokument[]>([])
  const [loading, setLoading] = useState(true)
  const [visaMatchade, setVisaMatchade] = useState(false)
  const supabase = createClient()

  async function hämta() {
    const { data: projekt } = await supabase
      .from('projekt')
      .select('jämförelse_resultat')
      .eq('id', projektId)
      .single()

    if (projekt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultat = (projekt as any)['jämförelse_resultat'] as AnalysData | null
      if (resultat?.anbudsläge || resultat?.go_no_go) {
        setData(resultat)
        onAnalysKlar?.()
      }
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
    const interval = setInterval(hämta, 8000)
    return () => clearInterval(interval)
  }, [projektId])

  if (loading) return <div className="animate-pulse h-40 rounded-lg" style={{ background: 'var(--navy-mid)' }} />

  // Scanning pågår
  if (externtScanning) {
    return <ScanningIndikator dokument={dokument} />
  }

  // Inget resultat ännu
  if (!data) {
    return (
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--muted-custom)', marginBottom: 8 }}>
          Dokumenten behöver analyseras.
        </p>
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>
          Gå till Dokument-fliken, ladda upp filer och klicka "Analysera förfrågan".
        </p>
      </div>
    )
  }

  const totalKrav = data.matchade_krav.length + data.kräver_bekräftelse.length + data.ej_uppfyllda.length
  const anbudsläge = hämtaAnbudsläge(data as unknown as Record<string, unknown>)
  const visning = anbudsläge ? bedömningsVisning(anbudsläge) : { label: 'Analyserad', kort: '—', färg: 'var(--muted-custom)', bgFärg: 'var(--navy)', beskrivning: '' }

  return (
    <div className="space-y-4">
      {/* Anbudsläge — Stort sammanfattningskort */}
      <div
        style={{
          background: 'var(--navy-mid)',
          border: `2px solid ${visning.färg}`,
          borderRadius: 14,
          padding: '24px',
        }}
      >
        <div className="flex items-center gap-4" style={{ marginBottom: 16 }}>
          {/* Procent-cirkel */}
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%',
              border: `4px solid ${visning.färg}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, color: visning.färg }}>
              {data.match_procent}%
            </span>
          </div>

          <div className="flex-1">
            <div style={{ fontSize: 22, fontWeight: 800, color: visning.färg, marginBottom: 4 }}>
              {visning.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.5 }}>
              {data.sammanfattning}
            </div>
          </div>
        </div>

        {/* Krav-statistik */}
        <div className="flex gap-4" style={{ marginTop: 12 }}>
          <StatBox label="Matchade" count={data.matchade_krav.length} color="var(--green)" icon="✅" />
          <StatBox label="Att bekräfta" count={data.kräver_bekräftelse.length} color="var(--orange)" icon="⚠️" />
          <StatBox label="Ej uppfyllda" count={data.ej_uppfyllda.length} color="var(--red)" icon="❌" />
          <StatBox label="Totalt" count={totalKrav} color="var(--muted-custom)" icon="📋" />
        </div>
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
            <div className="col-span-2"><InfoRad label="Uppdragsbeskrivning" värde={data.uppdragsbeskrivning} /></div>
          </div>
        </div>
      </div>

      {/* ⚠️ Kräver bekräftelse — BARA dessa visas direkt */}
      {data.kräver_bekräftelse.length > 0 && (
        <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--orange)', borderRadius: 12, overflow: 'hidden' }}>
          <div className="flex items-center gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>
              {data.kräver_bekräftelse.length} krav behöver din bekräftelse
            </span>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {data.kräver_bekräftelse.map((k, i) => (
              <div key={i} style={{ padding: '12px 8px', marginBottom: 4, borderRadius: 8, background: 'var(--navy-light)' }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 14, marginTop: 1 }}>⚠️</span>
                  <div className="flex-1">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{k.krav}</div>
                    <div style={{ fontSize: 12, color: 'var(--orange)', marginTop: 4 }}>{k.matchning}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{k.källa}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ❌ Ej uppfyllda */}
      {data.ej_uppfyllda.length > 0 && (
        <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--red)', borderRadius: 12, overflow: 'hidden' }}>
          <div className="flex items-center gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
            <span style={{ fontSize: 16 }}>❌</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>
              {data.ej_uppfyllda.length} krav uppfylls inte
            </span>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {data.ej_uppfyllda.map((k, i) => (
              <div key={i} style={{ padding: '12px 8px', marginBottom: 4, borderRadius: 8, background: 'var(--navy-light)' }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 14, marginTop: 1 }}>❌</span>
                  <div className="flex-1">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{k.krav}</div>
                    <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{k.matchning}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{k.källa}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Matchade krav — Collapsed */}
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
        <button
          onClick={() => setVisaMatchade(!visaMatchade)}
          className="flex items-center gap-2 w-full"
          style={{ padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', flex: 1 }}>
            {data.matchade_krav.length} krav automatiskt matchade
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted-custom)' }}>
            {visaMatchade ? '▲ Dölj' : '▼ Visa alla'}
          </span>
        </button>
        {visaMatchade && (
          <div style={{ padding: '0 12px 12px' }}>
            {data.matchade_krav.map((k, i) => (
              <div key={i} className="flex items-start gap-2" style={{ padding: '6px 8px', fontSize: 12 }}>
                <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                <span style={{ color: 'var(--soft)', flex: 1 }}>{k.krav}</span>
                <span style={{ color: 'var(--slate)', fontSize: 10 }}>{k.matchning}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risker & möjligheter */}
      {(data.risker.length > 0 || data.möjligheter.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {data.risker.length > 0 && (
            <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)', marginBottom: 8 }}>⚠ Risker</div>
              {data.risker.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 4 }}>• {r}</div>
              ))}
            </div>
          )}
          {data.möjligheter.length > 0 && (
            <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>✦ Möjligheter</div>
              {data.möjligheter.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 4 }}>• {m}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rekommendation */}
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💡 Rekommendation</div>
        <div style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.6 }}>{data.rekommendation}</div>
      </div>
    </div>
  )
}

function StatBox({ label, count, color, icon }: { label: string; count: number; color: string; icon: string }) {
  return (
    <div className="flex-1" style={{ background: 'var(--navy-light)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--slate)', marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{count}</div>
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

function ScanningIndikator({ dokument }: { dokument: Dokument[] }) {
  const [sekunder, setSekunder] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setSekunder(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const progress = Math.min(sekunder / 90 * 100, 95)

  return (
    <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--yellow)', borderRadius: 12, padding: '24px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid var(--navy-border)', borderTop: '3px solid var(--yellow)', borderRadius: '50%', flexShrink: 0 }} />
        <div className="flex-1">
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--yellow)' }}>
            Analyserar {dokument.length} dokument och matchar mot er profil...
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 2 }}>
            AI:n läser dokumenten, identifierar krav och matchar mot era certifikat och erfarenhet
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--yellow)', fontFamily: 'var(--font-mono), monospace', flexShrink: 0 }}>
          {sekunder}s
        </div>
      </div>
      <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--navy-light)', marginBottom: 16 }}>
        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: 'var(--yellow)', transition: 'width 1s linear' }} />
      </div>
      <div>
        {dokument.map((d, i) => (
          <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 4, padding: '5px 8px', borderRadius: 6, background: 'var(--navy-light)' }}>
            <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
            <span style={{ color: 'var(--soft)', flex: 1 }}>{d.filnamn}</span>
          </div>
        ))}
      </div>
      {sekunder > 90 && (
        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--orange-bg)', fontSize: 12, color: 'var(--orange)' }}>
          Analysen tar längre tid än vanligt. Vänta eller ladda om sidan.
        </div>
      )}
    </div>
  )
}
