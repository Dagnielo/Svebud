'use client'

import { useState, type ComponentType } from 'react'
import type { KvalitetsResultat, GranskningsPunkt } from '@/lib/kvalitetsagent'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, CheckCircle, Lightbulb, Warning, XCircle, CaretUp, CaretDown, ArrowsClockwise } from '@phosphor-icons/react'

type IconComponent = ComponentType<{ size?: number; weight?: 'bold'; style?: React.CSSProperties }>

const allvarlighetConfig: Record<string, { färg: string; bg: string; IconComponent: IconComponent; label: string }> = {
  bra: { färg: 'var(--light-green)', bg: 'var(--light-green-bg)', IconComponent: CheckCircle, label: 'Bra' },
  tips: { färg: 'var(--light-blue)', bg: 'var(--light-blue-bg)', IconComponent: Lightbulb, label: 'Tips' },
  varning: { färg: 'var(--light-orange)', bg: 'var(--light-orange-bg)', IconComponent: Warning, label: 'Varning' },
  fel: { färg: 'var(--light-red)', bg: 'var(--light-red-bg)', IconComponent: XCircle, label: 'Fel' },
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
  if (betyg >= 9) return 'var(--light-green)'
  if (betyg >= 7) return 'var(--light-amber)'
  if (betyg >= 5) return 'var(--light-orange)'
  return 'var(--light-red)'
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
  onGåTillSteg2?: () => void
}

export default function KvalitetsPanel({ projektId, resultat, onGranska, laddar, onGåTillSteg2 }: Props) {
  const [filter, setFilter] = useState<string>('alla')
  const [expanderad, setExpanderad] = useState(true)

  if (!resultat && !laddar) {
    return (
      <div
        style={{
          background: 'var(--light-bg)',
          border: '1px solid var(--light-border)',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 2px rgba(14,27,46,.04)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--light-t1)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <MagnifyingGlass size={16} weight="bold" />
              Kvalitetsgranskning
            </div>
            <p style={{ fontSize: 12, color: 'var(--light-t3)', marginTop: 2, marginBottom: 0 }}>
              Låt AI:n granska anbudet och ge förbättringsförslag.
            </p>
          </div>
          <Button onClick={onGranska} style={{ background: 'var(--light-amber)', color: 'var(--light-navy)', fontSize: 12, fontWeight: 700, padding: '6px 14px', flexShrink: 0 }}>
            Granska anbudet →
          </Button>
        </div>
      </div>
    )
  }

  if (laddar) {
    return (
      <div
        style={{
          background: 'var(--light-bg)',
          border: '1px solid var(--light-border)',
          borderRadius: 12,
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(14,27,46,.04)',
        }}
      >
        <div className="animate-pulse" style={{ marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--light-cream)', margin: '0 auto 12px' }} />
          <div style={{ height: 14, width: 200, background: 'var(--light-cream)', borderRadius: 6, margin: '0 auto 8px' }} />
          <div style={{ height: 10, width: 300, background: 'var(--light-cream)', borderRadius: 4, margin: '0 auto' }} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--light-t3)' }}>AI granskar anbudet...</p>
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
        background: 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(14,27,46,.04)',
      }}
    >
      {/* Header med betyg */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--light-border)',
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
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--light-t1)' }}>Kvalitetsgranskning</span>
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
            <p style={{ fontSize: 12, color: 'var(--light-t3)', marginTop: 2 }}>
              {resultat.sammanfattning}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Statistik-badges */}
          <div className="flex gap-1.5">
            {resultat.antal_fel > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--light-red-bg)', color: 'var(--light-red)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <XCircle size={10} weight="bold" /> {resultat.antal_fel}
              </span>
            )}
            {resultat.antal_varningar > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--light-orange-bg)', color: 'var(--light-orange)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Warning size={10} weight="bold" /> {resultat.antal_varningar}
              </span>
            )}
            {resultat.antal_tips > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--light-blue-bg)', color: 'var(--light-blue)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Lightbulb size={10} weight="bold" /> {resultat.antal_tips}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--light-green-bg)', color: 'var(--light-green)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <CheckCircle size={10} weight="bold" /> {resultat.antal_bra}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--light-t3)', display: 'inline-flex', alignItems: 'center' }}>
            {expanderad ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
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
                  borderColor: filter === f ? 'var(--light-amber)' : 'var(--light-border)',
                  background: filter === f ? 'var(--light-amber-glow)' : 'var(--light-bg)',
                  color: filter === f ? 'var(--light-amber)' : 'var(--light-t2)',
                  cursor: 'pointer',
                }}
              >
                {f === 'alla' ? (
                  `Alla (${resultat.punkter.length})`
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {(() => {
                      const Icon = allvarlighetConfig[f]?.IconComponent
                      return Icon ? <Icon size={12} weight="bold" /> : null
                    })()}
                    {f === 'fel' ? resultat.antal_fel : f === 'varning' ? resultat.antal_varningar : f === 'tips' ? resultat.antal_tips : resultat.antal_bra}
                  </span>
                )}
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
                  <span style={{ flexShrink: 0, marginTop: 1, display: 'inline-flex', alignItems: 'center' }}>
                    <config.IconComponent size={14} weight="bold" style={{ color: config.färg }} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: config.färg }}>{punkt.titel}</span>
                      <span style={{ fontSize: 10, color: 'var(--light-t3)', background: 'var(--light-cream)', padding: '1px 6px', borderRadius: 4 }}>
                        {kategoriLabel[punkt.kategori] ?? punkt.kategori}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--light-t2)', lineHeight: 1.6, margin: 0 }}>
                      {punkt.beskrivning}
                    </p>
                    {punkt.åtgärd && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'var(--light-amber-glow)',
                          border: '1px solid var(--light-amber-border)',
                          fontSize: 11,
                          color: 'var(--light-amber)',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Lightbulb size={12} weight="bold" /> <strong>Förslag:</strong> {punkt.åtgärd}
                        </span>
                      </div>
                    )}
                    {punkt.allvarlighet !== 'bra' && (
                      <div style={{ marginTop: 4, fontSize: 10, color: 'var(--light-t4)' }}>
                        {['pris', 'rot'].includes(punkt.kategori) ? (
                          onGåTillSteg2 ? (
                            <button onClick={onGåTillSteg2} className="hover:underline" style={{ background: 'none', border: 'none', color: 'var(--light-amber)', cursor: 'pointer', fontSize: 10, fontWeight: 600, padding: 0 }}>
                              Ändra priser i steg 2 →
                            </button>
                          ) : 'Justeras i steg 2 (Analys & Bedömning)'
                        ) : (
                          'Redigera i anbudsutkastet ovan (klicka Redigera)'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Granska om + stäng */}
          <div className="flex justify-center gap-2" style={{ marginTop: 16 }}>
            <Button
              onClick={onGranska}
              disabled={laddar}
              variant="outline"
              style={{ fontSize: 12, borderColor: 'var(--light-border)', color: 'var(--light-t2)', background: 'var(--light-bg)' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ArrowsClockwise size={12} weight="bold" /> Granska igen
              </span>
            </Button>
            <Button
              onClick={() => setExpanderad(false)}
              variant="outline"
              style={{ fontSize: 12, borderColor: 'var(--light-border)', color: 'var(--light-t2)', background: 'var(--light-bg)' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CaretUp size={12} weight="bold" /> Stäng
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
