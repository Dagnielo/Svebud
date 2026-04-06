'use client'

import { useState } from 'react'
import type { KvalitetsResultat, GranskningsPunkt } from '@/lib/kvalitetsagent'
import { Button } from '@/components/ui/button'

const allvarlighetConfig: Record<string, { färg: string; bg: string; ikon: string; label: string }> = {
  bra: { färg: 'var(--green)', bg: 'var(--green-bg)', ikon: '✅', label: 'Bra' },
  tips: { färg: 'var(--blue-accent)', bg: 'rgba(74,158,255,0.08)', ikon: '💡', label: 'Tips' },
  varning: { färg: 'var(--orange)', bg: 'var(--orange-bg)', ikon: '⚠️', label: 'Varning' },
  fel: { färg: 'var(--red)', bg: 'var(--red-bg)', ikon: '❌', label: 'Fel' },
}

const kategoriLabel: Record<string, string> = {
  pris: 'Pris',
  fullständighet: 'Fullständighet',
  språk: 'Språk & ton',
  juridik: 'Juridik',
  rot: 'ROT/Grön teknik',
  risk: 'Risker',
}

function getBetygFärg(betyg: number): string {
  if (betyg >= 9) return 'var(--green)'
  if (betyg >= 7) return 'var(--yellow)'
  if (betyg >= 5) return 'var(--orange)'
  return 'var(--red)'
}

function getBetygLabel(betyg: number): string {
  if (betyg >= 9) return 'Utmärkt'
  if (betyg >= 7) return 'Bra'
  if (betyg >= 5) return 'Godkänt'
  if (betyg >= 3) return 'Bristfälligt'
  return 'Allvarliga brister'
}

interface Props {
  projektId: string
  resultat: KvalitetsResultat | null
  onGranska: () => void
  laddar: boolean
}

export default function KvalitetsPanel({ projektId, resultat, onGranska, laddar }: Props) {
  const [filter, setFilter] = useState<string>('alla')
  const [expanderad, setExpanderad] = useState(true)

  if (!resultat && !laddar) {
    return null
  }

  if (laddar) {
    return (
      <div
        style={{
          background: 'var(--navy-mid)',
          border: '1px solid var(--navy-border)',
          borderRadius: 12,
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div className="animate-pulse" style={{ marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--navy-light)', margin: '0 auto 12px' }} />
          <div style={{ height: 14, width: 200, background: 'var(--navy-light)', borderRadius: 6, margin: '0 auto 8px' }} />
          <div style={{ height: 10, width: 300, background: 'var(--navy-light)', borderRadius: 4, margin: '0 auto' }} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted-custom)' }}>AI granskar anbudet...</p>
      </div>
    )
  }

  if (!resultat) return null

  const betygFärg = getBetygFärg(resultat.betyg)
  const betygLabel = getBetygLabel(resultat.betyg)

  const filtrerade = filter === 'alla'
    ? resultat.punkter
    : resultat.punkter.filter(p => p.allvarlighet === filter)

  return (
    <div
      style={{
        background: 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header med betyg */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--navy-border)',
          cursor: 'pointer',
        }}
        onClick={() => setExpanderad(!expanderad)}
      >
        <div className="flex items-center gap-4">
          {/* Betyg-cirkel */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: `3px solid ${betygFärg}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, color: betygFärg, lineHeight: 1 }}>
              {resultat.betyg}
            </span>
            <span style={{ fontSize: 8, fontWeight: 600, color: betygFärg }}>/10</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 16, fontWeight: 800 }}>Kvalitetsgranskning</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: `${betygFärg}20`,
                  color: betygFärg,
                }}
              >
                {betygLabel}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 2 }}>
              {resultat.sammanfattning}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Statistik-badges */}
          <div className="flex gap-1.5">
            {resultat.antal_fel > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--red-bg)', color: 'var(--red)' }}>
                ❌ {resultat.antal_fel}
              </span>
            )}
            {resultat.antal_varningar > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--orange-bg)', color: 'var(--orange)' }}>
                ⚠️ {resultat.antal_varningar}
              </span>
            )}
            {resultat.antal_tips > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,158,255,0.08)', color: 'var(--blue-accent)' }}>
                💡 {resultat.antal_tips}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--green-bg)', color: 'var(--green)' }}>
              ✅ {resultat.antal_bra}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
            {expanderad ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {expanderad && (
        <div style={{ padding: '16px 24px' }}>
          {/* Filter */}
          <div className="flex gap-1.5" style={{ marginBottom: 12 }}>
            {['alla', 'fel', 'varning', 'tips', 'bra'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: filter === f ? 'var(--yellow)' : 'var(--navy-border)',
                  background: filter === f ? 'var(--yellow-glow)' : 'transparent',
                  color: filter === f ? 'var(--yellow)' : 'var(--muted-custom)',
                  cursor: 'pointer',
                }}
              >
                {f === 'alla' ? `Alla (${resultat.punkter.length})` : `${allvarlighetConfig[f]?.ikon} ${f === 'fel' ? resultat.antal_fel : f === 'varning' ? resultat.antal_varningar : f === 'tips' ? resultat.antal_tips : resultat.antal_bra}`}
              </button>
            ))}
          </div>

          {/* Punkter */}
          <div className="space-y-2">
            {filtrerade.map((punkt, i) => {
              const config = allvarlighetConfig[punkt.allvarlighet] ?? allvarlighetConfig.tips
              return (
                <div
                  key={i}
                  className="flex items-start gap-3"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: config.bg,
                    border: `1px solid ${config.färg}30`,
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{config.ikon}</span>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: config.färg }}>{punkt.titel}</span>
                      <span style={{ fontSize: 10, color: 'var(--slate)', background: 'var(--navy)', padding: '1px 6px', borderRadius: 4 }}>
                        {kategoriLabel[punkt.kategori] ?? punkt.kategori}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--soft)', lineHeight: 1.6, margin: 0 }}>
                      {punkt.beskrivning}
                    </p>
                    {punkt.åtgärd && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'var(--navy)',
                          border: '1px solid var(--navy-border)',
                          fontSize: 11,
                          color: 'var(--yellow)',
                          lineHeight: 1.5,
                        }}
                      >
                        💡 <strong>Förslag:</strong> {punkt.åtgärd}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Granska om-knapp */}
          <div className="flex justify-center" style={{ marginTop: 16 }}>
            <Button
              onClick={onGranska}
              disabled={laddar}
              variant="outline"
              style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--muted-custom)' }}
            >
              🔄 Granska igen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
