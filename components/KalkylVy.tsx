'use client'

import { useState } from 'react'

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

  const inputStyle = { background: 'var(--navy)', border: '1px solid var(--navy-border)', borderRadius: 6, color: 'var(--white)', fontFamily: 'var(--font-mono), monospace', fontSize: 13, padding: '4px 8px', width: 70, textAlign: 'right' as const }

  return (
    <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
      <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Kalkyl (redigerbar)</span>
        <button onClick={läggTillMoment} style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'none', border: '1px solid var(--yellow)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
          + Lägg till moment
        </button>
      </div>
      <div style={{ padding: '0 18px 18px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Moment', 'Timmar', 'Timpris', 'Material', 'Belopp', ''].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-custom)', padding: '8px 6px', borderBottom: '1px solid var(--navy-border)', textAlign: h === 'Moment' || h === '' ? 'left' : 'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {moment.map((m, i) => (
              <tr key={i}>
                <td style={{ padding: '6px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                  <input value={m.beskrivning} onChange={e => uppdatera(i, 'beskrivning', e.target.value)} style={{ ...inputStyle, width: '100%', textAlign: 'left' }} />
                </td>
                <td style={{ padding: '6px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                  <input type="number" value={m.timmar} onChange={e => uppdatera(i, 'timmar', e.target.value)} style={inputStyle} />
                </td>
                <td style={{ padding: '6px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                  <input type="number" value={m.timpris} onChange={e => uppdatera(i, 'timpris', e.target.value)} style={inputStyle} />
                </td>
                <td style={{ padding: '6px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                  <input type="number" value={m.materialkostnad} onChange={e => uppdatera(i, 'materialkostnad', e.target.value)} style={inputStyle} />
                </td>
                <td className="font-mono" style={{ padding: '6px', fontSize: 13, textAlign: 'right', fontWeight: 600, borderBottom: '1px solid rgba(36,54,80,0.5)', color: 'var(--white)' }}>
                  {m.belopp.toLocaleString('sv-SE')} kr
                </td>
                <td style={{ padding: '6px', borderBottom: '1px solid rgba(36,54,80,0.5)' }}>
                  <button onClick={() => taBortMoment(i)} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summering */}
        <div style={{ background: 'var(--navy)', borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
          <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 4 }}>
            <span>Arbete</span><span className="font-mono">{totaltArbete.toLocaleString('sv-SE')} kr</span>
          </div>
          <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 4 }}>
            <span>Material</span><span className="font-mono">{totaltMaterial.toLocaleString('sv-SE')} kr</span>
          </div>
          <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 4 }}>
            <span>Totalt exkl. moms</span><span className="font-mono">{totalExklMoms.toLocaleString('sv-SE')} kr</span>
          </div>
          <div className="flex justify-between" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 8 }}>
            <span>Moms 25%</span><span className="font-mono">{moms.toLocaleString('sv-SE')} kr</span>
          </div>
          <div className="flex justify-between items-center" style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Totalt inkl. moms</span>
            <span className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--yellow)' }}>{totalInklMoms.toLocaleString('sv-SE')} kr</span>
          </div>
        </div>
      </div>
    </div>
  )
}
