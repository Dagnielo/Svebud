'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const kategoriInfo: Record<string, { emoji: string; label: string; färg: string }> = {
  elcentral: { emoji: '⚡', label: 'Elcentralsbyte', färg: 'var(--yellow)' },
  laddbox: { emoji: '🔌', label: 'Laddbox', färg: 'var(--green)' },
  belysning: { emoji: '💡', label: 'Belysning', färg: 'var(--blue-accent)' },
  renovation: { emoji: '🔨', label: 'Renovering', färg: 'var(--orange)' },
  solceller: { emoji: '☀️', label: 'Solceller', färg: 'var(--yellow)' },
  brandlarm: { emoji: '🚨', label: 'Brandlarm', färg: 'var(--red)' },
  stamrenovering: { emoji: '🏢', label: 'Stamrenovering', färg: 'var(--blue-accent)' },
  felsökning: { emoji: '🔍', label: 'Felsökning', färg: 'var(--orange)' },
  övrigt: { emoji: '🔧', label: 'Övrigt', färg: 'var(--muted-custom)' },
}

const kundtypLabel: Record<string, string> = {
  privatperson: 'Privatperson',
  brf: 'BRF',
  företag: 'Företag',
  fastighetsbolag: 'Fastighetsbolag',
}

type SnabboffertData = {
  analystyp: 'snabb'
  beställare: string | null
  kontaktperson: string | null
  epost: string | null
  telefon: string | null
  adress: string | null
  uppdragsbeskrivning: string
  kategori: string
  kundtyp: string
  fastighetstyp: string
  omfattning: string
  föreslagna_moment: Array<{
    beskrivning: string
    timmar: number
    timpris: number
    materialkostnad: number
    belopp: number
  }>
  uppskattat_pris_exkl_moms: number
  uppskattat_pris_inkl_moms: number
  tidsuppskattning: string
  sammanfattning: string
  rot_tillämpligt: boolean
  rot_typ: string | null
  frågor_till_kund: string[]
}

export type SnabbMoment = {
  beskrivning: string; timmar: number; timpris: number; materialkostnad: number; belopp: number
}

interface Props {
  projektId: string
  onMomentChange?: (moment: SnabbMoment[]) => void
}

export default function SnabboffertVy({ projektId, onMomentChange }: Props) {
  const [data, setData] = useState<SnabboffertData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sparadKalkyl, setSparadKalkyl] = useState<SnabbMoment[] | null>(null)
  const supabase = createClient()

  const [moment, setMoment] = useState<Array<{
    beskrivning: string; timmar: number; timpris: number; materialkostnad: number; belopp: number
  }>>([])

  // Ladda BÅDA datakällorna i en enda query — undviker race condition
  useEffect(() => {
    async function hämta() {
      const { data: projekt } = await supabase
        .from('projekt')
        .select('*')
        .eq('id', projektId)
        .single()

      if (projekt) {
        const p = projekt as Record<string, unknown>
        const jr = p['jämförelse_resultat'] as SnabboffertData | null
        if (jr?.analystyp === 'snabb') setData(jr)

        // Sparad kalkyl (redigerade moment)
        const rek = p.rekommendation as Record<string, unknown> | null
        const kalkyl = rek?.kalkyl as Record<string, unknown> | null
        if (kalkyl?.moment) {
          setSparadKalkyl(kalkyl.moment as SnabbMoment[])
        }
      }
      setLoading(false)
    }
    hämta()
  }, [projektId])

  // Initiera moment EFTER all data laddats — sparad kalkyl prioriteras
  const momentInitierat = moment.length > 0
  useEffect(() => {
    if (!momentInitierat && data && !loading) {
      const källa = sparadKalkyl ?? data.föreslagna_moment
      const init = källa.map(m => ({
        ...m,
        belopp: m.timmar * m.timpris + m.materialkostnad,
      }))
      setMoment(init)
      onMomentChange?.(init)
    }
  }, [data, sparadKalkyl, momentInitierat, loading, onMomentChange])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--navy-mid)' }} />
        ))}
      </div>
    )
  }

  if (!data) return null

  const kat = kategoriInfo[data.kategori] ?? kategoriInfo.övrigt

  function uppdateraMoment(index: number, fält: string, värde: string) {
    setMoment(prev => {
      const ny = [...prev]
      if (fält === 'beskrivning') {
        ny[index] = { ...ny[index], beskrivning: värde }
      } else {
        const num = parseFloat(värde) || 0
        ny[index] = { ...ny[index], [fält]: num }
        ny[index].belopp = ny[index].timmar * ny[index].timpris + ny[index].materialkostnad
      }
      onMomentChange?.(ny)
      return ny
    })
  }

  function läggTillMoment() {
    setMoment(prev => {
      const ny = [...prev, { beskrivning: '', timmar: 0, timpris: data?.föreslagna_moment[0]?.timpris ?? 650, materialkostnad: 0, belopp: 0 }]
      onMomentChange?.(ny)
      return ny
    })
  }

  function taBortMoment(index: number) {
    setMoment(prev => {
      const ny = prev.filter((_, i) => i !== index)
      onMomentChange?.(ny)
      return ny
    })
  }

  const totArbete = moment.reduce((s, m) => s + m.timmar * m.timpris, 0)
  const totMaterial = moment.reduce((s, m) => s + m.materialkostnad, 0)
  const totExkl = totArbete + totMaterial
  const moms = Math.round(totExkl * 0.25)
  const totInkl = totExkl + moms
  const inputStyle = { background: 'var(--navy)', border: '1px solid var(--navy-border)', borderRadius: 4, color: 'var(--white)', fontFamily: 'var(--font-mono), monospace', fontSize: 11, padding: '4px 6px', width: 70, textAlign: 'right' as const }

  return (
    <div className="space-y-4">
      {/* Header: Kategori + Kundtyp */}
      <div
        style={{
          background: 'var(--navy-mid)',
          border: '1px solid var(--navy-border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: `${kat.färg}20`,
              fontSize: 22,
            }}
          >
            {kat.emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 17, fontWeight: 800 }}>{kat.label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--navy)',
                  color: 'var(--muted-custom)',
                  textTransform: 'uppercase',
                }}
              >
                {kundtypLabel[data.kundtyp] ?? data.kundtyp}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--navy)',
                  color: 'var(--muted-custom)',
                }}
              >
                {data.omfattning}
              </span>
              {data.rot_tillämpligt && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--green-bg)',
                    color: 'var(--green)',
                  }}
                >
                  ROT
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted-custom)', marginTop: 2 }}>
              {data.tidsuppskattning} · {data.uppskattat_pris_inkl_moms.toLocaleString('sv-SE')} kr inkl moms
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              className="font-mono"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'var(--green-bg)', padding: '4px 10px', borderRadius: 6 }}
            >
              SNABBOFFERT
            </div>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--soft)', lineHeight: 1.6 }}>
          {data.sammanfattning}
        </p>
      </div>

      {/* Kundinfo */}
      {(data.beställare || data.kontaktperson || data.adress) && (
        <div
          style={{
            background: 'var(--navy-mid)',
            border: '1px solid var(--navy-border)',
            borderRadius: 12,
            padding: '16px 24px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--slate)',
              marginBottom: 10,
            }}
          >
            Kunduppgifter (extraherat)
          </div>
          <div className="grid grid-cols-2 gap-3" style={{ fontSize: 13 }}>
            {data.beställare && (
              <div>
                <span style={{ color: 'var(--muted-custom)' }}>Beställare: </span>
                <span style={{ fontWeight: 600 }}>{data.beställare}</span>
              </div>
            )}
            {data.kontaktperson && (
              <div>
                <span style={{ color: 'var(--muted-custom)' }}>Kontakt: </span>
                <span style={{ fontWeight: 600 }}>{data.kontaktperson}</span>
              </div>
            )}
            {data.epost && (
              <div>
                <span style={{ color: 'var(--muted-custom)' }}>E-post: </span>
                <span style={{ fontWeight: 600 }}>{data.epost}</span>
              </div>
            )}
            {data.telefon && (
              <div>
                <span style={{ color: 'var(--muted-custom)' }}>Telefon: </span>
                <span style={{ fontWeight: 600 }}>{data.telefon}</span>
              </div>
            )}
            {data.adress && (
              <div className="col-span-2">
                <span style={{ color: 'var(--muted-custom)' }}>Adress: </span>
                <span style={{ fontWeight: 600 }}>{data.adress}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uppdragsbeskrivning */}
      <div
        style={{
          background: 'var(--navy-mid)',
          border: '1px solid var(--navy-border)',
          borderRadius: 12,
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--slate)',
            marginBottom: 10,
          }}
        >
          Uppdragsbeskrivning
        </div>
        <p style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.6 }}>
          {data.uppdragsbeskrivning}
        </p>
      </div>

      {/* Föreslagna moment */}
      <div
        style={{
          background: 'var(--navy-mid)',
          border: '1px solid var(--navy-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--navy-border)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700 }}>Föreslagna moment (redigerbar)</span>
          <button
            onClick={läggTillMoment}
            style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'none', border: '1px solid var(--yellow)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
          >
            + Lägg till moment
          </button>
        </div>
        <div style={{ padding: '0 16px 16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr>
                {['Moment', 'Timmar', 'Timpris', 'Material', 'Belopp', ''].map(h => (
                  <th
                    key={h}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--muted-custom)',
                      padding: '8px 4px',
                      borderBottom: '1px solid var(--navy-border)',
                      textAlign: h === 'Moment' || h === '' ? 'left' : 'right',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moment.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: '4px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                    <input value={m.beskrivning} onChange={e => uppdateraMoment(i, 'beskrivning', e.target.value)} style={{ ...inputStyle, width: '100%', textAlign: 'left', fontSize: 11 }} title={m.beskrivning} />
                  </td>
                  <td style={{ padding: '4px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                    <input type="number" value={m.timmar} onChange={e => uppdateraMoment(i, 'timmar', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                  </td>
                  <td style={{ padding: '4px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                    <input type="number" value={m.timpris} onChange={e => uppdateraMoment(i, 'timpris', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                  </td>
                  <td style={{ padding: '4px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                    <input type="number" value={m.materialkostnad} onChange={e => uppdateraMoment(i, 'materialkostnad', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                  </td>
                  <td className="font-mono" style={{ padding: '4px', fontSize: 11, textAlign: 'right', fontWeight: 600, borderBottom: '1px solid rgba(36,54,80,0.5)', color: 'var(--white)' }}>
                    {m.belopp.toLocaleString('sv-SE')} kr
                  </td>
                  <td style={{ padding: '4px', borderBottom: '1px solid rgba(36,54,80,0.5)', textAlign: 'center' }}>
                    <button onClick={() => taBortMoment(i)} style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summering */}
          <div style={{ background: 'var(--navy)', borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
            <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 4 }}>
              <span>Arbete</span><span className="font-mono">{totArbete.toLocaleString('sv-SE')} kr</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 4 }}>
              <span>Material</span><span className="font-mono">{totMaterial.toLocaleString('sv-SE')} kr</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 4 }}>
              <span>Exkl. moms</span><span className="font-mono">{totExkl.toLocaleString('sv-SE')} kr</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 8 }}>
              <span>Moms 25%</span><span className="font-mono">{moms.toLocaleString('sv-SE')} kr</span>
            </div>
            <div className="flex justify-between items-center" style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Totalt inkl. moms</span>
              <span className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--yellow)' }}>
                {totInkl.toLocaleString('sv-SE')} kr
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
