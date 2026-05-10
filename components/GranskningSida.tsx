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
    // Polla bara om vi väntar på analys — sluta när data finns
    if (!data) {
      const interval = setInterval(hämta, 8000)
      return () => clearInterval(interval)
    }
  }, [projektId, !data]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="animate-pulse h-40 rounded-lg" style={{ background: 'var(--light-cream)' }} />

  // Scanning pågår
  if (externtScanning) {
    return <ScanningIndikator dokument={dokument} />
  }

  // Inget resultat ännu
  if (!data) {
    return (
      <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-border)', borderRadius: 12, padding: '32px', textAlign: 'center', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
        <p style={{ fontSize: 14, color: 'var(--light-t3)', marginBottom: 8 }}>
          Dokumenten behöver analyseras.
        </p>
        <p style={{ fontSize: 12, color: 'var(--light-t4)' }}>
          Gå till Dokument-fliken, ladda upp filer och klicka "Analysera förfrågan".
        </p>
      </div>
    )
  }

  const totalKrav = data.matchade_krav.length + data.kräver_bekräftelse.length + data.ej_uppfyllda.length
  const anbudsläge = hämtaAnbudsläge(data as unknown as Record<string, unknown>)
  const visning = anbudsläge ? bedömningsVisning(anbudsläge) : { label: 'Analyserad', kort: '—', färg: 'var(--light-t3)', bgFärg: 'var(--light-cream)', beskrivning: '' }

  return (
    <div className="space-y-4">
      {/* Anbudsläge — Stort sammanfattningskort */}
      <div
        style={{
          background: 'var(--light-bg)',
          border: `2px solid ${visning.färg}`,
          borderRadius: 14,
          padding: '24px',
          boxShadow: '0 1px 2px rgba(14,27,46,.04)',
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
            <div style={{ fontSize: 13, color: 'var(--light-t2)', lineHeight: 1.5 }}>
              {data.sammanfattning}
            </div>
          </div>
        </div>

        {/* Krav-statistik */}
        <div className="flex gap-4" style={{ marginTop: 12 }}>
          <StatBox label="Matchade" count={data.matchade_krav.length} color="var(--light-green)" icon="✅" />
          <StatBox label="Att bekräfta" count={data.kräver_bekräftelse.length} color="var(--light-orange)" icon="⚠️" />
          <StatBox label="Ej uppfyllda" count={data.ej_uppfyllda.length} color="var(--light-red)" icon="❌" />
          <StatBox label="Totalt" count={totalKrav} color="var(--light-t3)" icon="📋" />
        </div>
      </div>

      {/* Projektinfo */}
      <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--light-border)', fontSize: 14, fontWeight: 700, color: 'var(--light-t1)' }}>
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
        <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-orange)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
          <div className="flex items-center gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--light-border)' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--light-orange)' }}>
              {data.kräver_bekräftelse.length} krav behöver din bekräftelse
            </span>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {data.kräver_bekräftelse.map((k, i) => (
              <div key={i} style={{ padding: '12px 8px', marginBottom: 4, borderRadius: 8, background: 'var(--light-off)' }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 14, marginTop: 1 }}>⚠️</span>
                  <div className="flex-1">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--light-t1)' }}>{k.krav}</div>
                    <div style={{ fontSize: 12, color: 'var(--light-orange)', marginTop: 4 }}>{k.matchning}</div>
                    <div style={{ fontSize: 11, color: 'var(--light-t4)', marginTop: 2 }}>{k.källa}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ❌ Ej uppfyllda */}
      {data.ej_uppfyllda.length > 0 && (
        <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-red)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
          <div className="flex items-center gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--light-border)' }}>
            <span style={{ fontSize: 16 }}>❌</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--light-red)' }}>
              {data.ej_uppfyllda.length} krav uppfylls inte
            </span>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {data.ej_uppfyllda.map((k, i) => (
              <div key={i} style={{ padding: '12px 8px', marginBottom: 4, borderRadius: 8, background: 'var(--light-off)' }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 14, marginTop: 1 }}>❌</span>
                  <div className="flex-1">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--light-t1)' }}>{k.krav}</div>
                    <div style={{ fontSize: 12, color: 'var(--light-red)', marginTop: 4 }}>{k.matchning}</div>
                    <div style={{ fontSize: 11, color: 'var(--light-t4)', marginTop: 2 }}>{k.källa}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Matchade krav — Collapsed */}
      <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
        <button
          onClick={() => setVisaMatchade(!visaMatchade)}
          className="flex items-center gap-2 w-full"
          style={{ padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--light-green)', flex: 1 }}>
            {data.matchade_krav.length} krav automatiskt matchade
          </span>
          <span style={{ fontSize: 12, color: 'var(--light-t3)' }}>
            {visaMatchade ? '▲ Dölj' : '▼ Visa alla'}
          </span>
        </button>
        {visaMatchade && (
          <div style={{ padding: '0 12px 12px' }}>
            {data.matchade_krav.map((k, i) => (
              <div key={i} className="flex items-start gap-2" style={{ padding: '6px 8px', fontSize: 12 }}>
                <span style={{ color: 'var(--light-green)', flexShrink: 0 }}>✓</span>
                <span style={{ color: 'var(--light-t2)', flex: 1 }}>{k.krav}</span>
                <span style={{ color: 'var(--light-t4)', fontSize: 10 }}>{k.matchning}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risker & möjligheter */}
      {(data.risker.length > 0 || data.möjligheter.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {data.risker.length > 0 && (
            <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-border)', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--light-orange)', marginBottom: 8 }}>⚠ Risker</div>
              {data.risker.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--light-t2)', marginBottom: 4 }}>• {r}</div>
              ))}
            </div>
          )}
          {data.möjligheter.length > 0 && (
            <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-border)', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--light-green)', marginBottom: 8 }}>✦ Möjligheter</div>
              {data.möjligheter.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--light-t2)', marginBottom: 4 }}>• {m}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rekommendation */}
      <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-border)', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--light-t1)' }}>💡 Rekommendation</div>
        <div style={{ fontSize: 13, color: 'var(--light-t2)', lineHeight: 1.6 }}>{data.rekommendation}</div>
      </div>
    </div>
  )
}

function StatBox({ label, count, color, icon }: { label: string; count: number; color: string; icon: string }) {
  return (
    <div className="flex-1" style={{ background: 'var(--light-off)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--light-t4)', marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{count}</div>
    </div>
  )
}

function InfoRad({ label, värde }: { label: string; värde: string | null }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--light-t3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: värde ? 'var(--light-t1)' : 'var(--light-t4)' }}>{värde ?? '—'}</div>
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
    <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-amber)', borderRadius: 12, padding: '24px', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid var(--light-border)', borderTop: '3px solid var(--light-amber)', borderRadius: '50%', flexShrink: 0 }} />
        <div className="flex-1">
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--light-amber)' }}>
            Analyserar {dokument.length} dokument och matchar mot er profil...
          </div>
          <div style={{ fontSize: 12, color: 'var(--light-t3)', marginTop: 2 }}>
            AI:n läser dokumenten, identifierar krav och matchar mot era certifikat och erfarenhet
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--light-amber)', fontFamily: 'var(--font-mono), monospace', flexShrink: 0 }}>
          {sekunder}s
        </div>
      </div>
      <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--light-cream)', marginBottom: 16 }}>
        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: 'var(--light-amber)', transition: 'width 1s linear' }} />
      </div>
      <div>
        {dokument.map((d, i) => (
          <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 4, padding: '5px 8px', borderRadius: 6, background: 'var(--light-off)' }}>
            <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--light-amber)', flexShrink: 0 }} />
            <span style={{ color: 'var(--light-t2)', flex: 1 }}>{d.filnamn}</span>
          </div>
        ))}
      </div>
      {sekunder > 90 && (
        <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--light-orange-bg)', fontSize: 12, color: 'var(--light-orange)' }}>
          Analysen tar längre tid än vanligt. Vänta eller ladda om sidan.
        </div>
      )}
    </div>
  )
}
