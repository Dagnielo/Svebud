'use client'

import { useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'

export type KalkylMoment = { beskrivning: string; timmar: number; timpris: number; materialkostnad: number; belopp: number }

export default function KalkylVy({ kalkyl, onChange }: { kalkyl?: Record<string, unknown>; onChange?: (moment: KalkylMoment[]) => void }) {
  if (!kalkyl) return null

  const initialMoment = (kalkyl.moment ?? []) as KalkylMoment[]
  const [moment, setMoment] = useState<KalkylMoment[]>(initialMoment.map(m => ({
    ...m,
    timpris: m.timpris ?? 650,
    belopp: m.belopp ?? (m.timmar * (m.timpris ?? 650) + (m.materialkostnad ?? 0)),
  })))

  function uppdatera(index: number, fält: keyof KalkylMoment, värde: string) {
    setMoment(prev => {
      const ny = [...prev]
      if (fält === 'beskrivning') {
        ny[index] = { ...ny[index], beskrivning: värde }
      } else {
        const num = parseFloat(värde) || 0
        ny[index] = { ...ny[index], [fält]: num }
        ny[index].belopp = ny[index].timmar * ny[index].timpris + ny[index].materialkostnad
      }
      onChange?.(ny)
      return ny
    })
  }

  function läggTillMoment() {
    setMoment(prev => {
      const ny = [...prev, { beskrivning: '', timmar: 0, timpris: 650, materialkostnad: 0, belopp: 0 }]
      onChange?.(ny)
      return ny
    })
  }

  function taBortMoment(index: number) {
    setMoment(prev => {
      const ny = prev.filter((_, i) => i !== index)
      onChange?.(ny)
      return ny
    })
  }

  const totaltArbete = moment.reduce((s, m) => s + m.timmar * m.timpris, 0)
  const totaltMaterial = moment.reduce((s, m) => s + m.materialkostnad, 0)
  const totalExklMoms = totaltArbete + totaltMaterial
  const moms = Math.round(totalExklMoms * 0.25)
  const totalInklMoms = totalExklMoms + moms

  const inputStyle = { background: 'var(--light-bg)', border: '1px solid var(--light-border)', borderRadius: 4, color: 'var(--light-t1)', fontFamily: 'var(--font-mono), monospace', fontSize: 11, padding: '4px 6px', width: 70, textAlign: 'right' as const }

  return (
    <div style={{ background: 'var(--light-bg)', border: '1px solid var(--light-border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(14,27,46,.04)' }}>
      <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--light-border)' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--light-t1)' }}>Kalkyl (redigerbar)</span>
        <button onClick={läggTillMoment} style={{ fontSize: 11, fontWeight: 700, color: 'var(--light-amber)', background: 'var(--light-amber-glow)', border: '1px solid var(--light-amber-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Plus size={12} weight="bold" /> Lägg till moment
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
                <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--light-t4)', padding: '8px 4px', borderBottom: '1px solid var(--light-border)', textAlign: h === 'Moment' || h === '' ? 'left' : 'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {moment.map((m, i) => (
              <tr key={i}>
                <td style={{ padding: '4px', borderBottom: '1px solid var(--light-border)' }}>
                  <input value={m.beskrivning} onChange={e => uppdatera(i, 'beskrivning', e.target.value)} style={{ ...inputStyle, width: '100%', textAlign: 'left', fontSize: 11 }} title={m.beskrivning} />
                </td>
                <td style={{ padding: '4px', borderBottom: '1px solid var(--light-border)' }}>
                  <input type="number" value={m.timmar} onChange={e => uppdatera(i, 'timmar', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                </td>
                <td style={{ padding: '4px', borderBottom: '1px solid var(--light-border)' }}>
                  <input type="number" value={m.timpris} onChange={e => uppdatera(i, 'timpris', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                </td>
                <td style={{ padding: '4px', borderBottom: '1px solid var(--light-border)' }}>
                  <input type="number" value={m.materialkostnad} onChange={e => uppdatera(i, 'materialkostnad', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                </td>
                <td className="font-mono" style={{ padding: '4px', fontSize: 11, textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--light-border)', color: 'var(--light-t1)' }}>
                  {m.belopp.toLocaleString('sv-SE')} kr
                </td>
                <td style={{ padding: '4px', borderBottom: '1px solid var(--light-border)', textAlign: 'center' }}>
                  <button onClick={() => taBortMoment(i)} style={{ color: 'var(--light-red)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} weight="bold" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summering */}
        <div style={{ background: 'var(--light-cream)', borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
          <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--light-t3)', marginBottom: 4 }}>
            <span>Arbete</span><span className="font-mono">{totaltArbete.toLocaleString('sv-SE')} kr</span>
          </div>
          <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--light-t3)', marginBottom: 4 }}>
            <span>Material</span><span className="font-mono">{totaltMaterial.toLocaleString('sv-SE')} kr</span>
          </div>
          <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--light-t3)', marginBottom: 4 }}>
            <span>Totalt exkl. moms</span><span className="font-mono">{totalExklMoms.toLocaleString('sv-SE')} kr</span>
          </div>
          <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--light-t3)', marginBottom: 8 }}>
            <span>Moms 25%</span><span className="font-mono">{moms.toLocaleString('sv-SE')} kr</span>
          </div>
          <div className="flex justify-between items-center" style={{ borderTop: '1px solid var(--light-border)', paddingTop: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--light-t1)' }}>Totalt inkl. moms</span>
            <span className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--light-amber)' }}>{totalInklMoms.toLocaleString('sv-SE')} kr</span>
          </div>
        </div>
      </div>
    </div>
  )
}
