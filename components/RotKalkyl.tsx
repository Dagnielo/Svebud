'use client'

import { useState, useEffect } from 'react'
import { beräknaROT, ROT_TYPER, ROT_REGLER } from '@/lib/rot-regler'
import type { RotTyp, FastighetsTyp, RotKalkylInput } from '@/lib/rot-regler'
import { createClient } from '@/lib/supabase/client'

interface Props {
  arbeteExMoms: number
  materialExMoms: number
  projektId: string
  onRotChange?: (rotBelopp: number, kundBetalar: number) => void
}

export default function RotKalkyl({
  arbeteExMoms,
  materialExMoms,
  projektId,
  onRotChange
}: Props) {
  const [aktiverat, setAktiverat] = useState(false)
  const [typ, setTyp] = useState<RotTyp>('rot')
  const [antalAgare, setAntalAgare] = useState(1)
  const [tidligareUtnyttjat, setTidligareUtnyttjat] = useState(0)
  const [fastighetstyp, setFastighetstyp] = useState<FastighetsTyp>('villa')
  const [sparar, setSparar] = useState(false)
  const [laddat, setLaddat] = useState(false)
  const supabase = createClient()

  // Ladda sparade ROT-inställningar vid mount
  useEffect(() => {
    async function laddaRot() {
      const { data: p } = await supabase.from('projekt').select('*').eq('id', projektId).single()
      if (p) {
        const proj = p as Record<string, unknown>
        if (proj.rot_aktiverat) setAktiverat(true)
        if (proj.rot_typ) setTyp(proj.rot_typ as RotTyp)
        if (proj.rot_antal_agare) setAntalAgare(proj.rot_antal_agare as number)
        if (proj.rot_tidigare_utnyttjat) setTidligareUtnyttjat(proj.rot_tidigare_utnyttjat as number)
        if (proj.rot_fastighetstyp) setFastighetstyp(proj.rot_fastighetstyp as FastighetsTyp)
      }
      setLaddat(true)
    }
    laddaRot()
  }, [projektId])

  const input: RotKalkylInput = {
    aktiverat,
    typ,
    antalAgare,
    tidligareUtnyttjat,
    fastighetstyp,
    arbeteExMoms,
    materialExMoms
  }

  const res = beräknaROT(input)
  const valdTypInfo = ROT_TYPER.find(t => t.id === typ)

  useEffect(() => {
    onRotChange?.(res.rotBelopp, res.kundBetalar)
  }, [res.rotBelopp, res.kundBetalar])

  // Spara till Supabase
  // Spara ROT-data med debounce — bara efter initial laddning
  useEffect(() => {
    if (!laddat) return
    const t = setTimeout(async () => {
      setSparar(true)
      try {
        await fetch(`/api/projekt/${projektId}/rot`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rot_aktiverat: aktiverat,
            rot_typ: typ,
            rot_antal_agare: antalAgare,
            rot_tidigare_utnyttjat: tidligareUtnyttjat,
            rot_fastighetstyp: fastighetstyp,
            rot_belopp: res.rotBelopp,
            rot_kund_betalar: res.kundBetalar
          })
        })
      } finally {
        setSparar(false)
      }
    }, 800)
    return () => clearTimeout(t)
  }, [aktiverat, typ, antalAgare, tidligareUtnyttjat, fastighetstyp, res.rotBelopp, res.kundBetalar, projektId])

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600 as const,
    color: 'var(--muted-custom)',
    marginBottom: 4,
    display: 'block' as const,
  }

  return (
    <div
      style={{
        background: 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 12,
        padding: '20px 24px',
        marginTop: 16,
      }}
    >
      {/* Header med toggle */}
      <div className="flex items-center justify-between" style={{ marginBottom: aktiverat ? 16 : 8 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Husavdrag & skattereduktion</h3>
          {!aktiverat && (
            <p style={{ fontSize: 12, color: 'var(--yellow)', marginTop: 4 }}>
              Aktivera för att beräkna ROT- eller Grön teknik-avdrag i offerten
            </p>
          )}
        </div>
        <button
          onClick={() => setAktiverat(!aktiverat)}
          className="flex items-center gap-2"
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            border: '2px solid',
            borderColor: aktiverat ? 'var(--green)' : 'var(--yellow)',
            background: aktiverat ? 'var(--green-bg)' : 'var(--yellow-glow)',
            color: aktiverat ? 'var(--green)' : 'var(--yellow)',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: aktiverat ? 'var(--green)' : 'var(--slate)',
            }}
          />
          {aktiverat ? '● Aktiverat' : 'Aktivera'}
        </button>
      </div>

      {/* Typ-väljare */}
      <div className="grid grid-cols-5 gap-2" style={{ marginBottom: 16 }}>
        {ROT_TYPER.map(t => (
          <button
            key={t.id}
            onClick={() => { setTyp(t.id); setAktiverat(t.id !== 'ej_rot') }}
            style={{
              position: 'relative',
              padding: '10px 8px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: typ === t.id ? 'rgba(245,196,0,0.5)' : 'var(--navy-border)',
              background: typ === t.id ? 'var(--yellow-glow)' : 'var(--navy)',
              color: typ === t.id ? 'var(--white)' : 'var(--muted-custom)',
              cursor: !aktiverat && t.id !== 'ej_rot' ? 'not-allowed' : 'pointer',
              opacity: !aktiverat && t.id !== 'ej_rot' ? 0.4 : 1,
              textAlign: 'left',
              fontSize: 11,
            }}
            disabled={!aktiverat && t.id !== 'ej_rot'}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>{t.emoji}</div>
            <div style={{ fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{t.label}</div>
            <div style={{ fontSize: 10, color: 'var(--slate)' }}>{t.procent}</div>
            {typ === t.id && (
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--yellow)',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {aktiverat && typ !== 'ej_rot' && (
        <>
          {/* Vald typ — info */}
          {valdTypInfo && (
            <div
              className="flex items-start gap-2"
              style={{
                background: 'var(--navy)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--muted-custom)',
              }}
            >
              <span style={{ color: 'var(--blue-accent)', flexShrink: 0, marginTop: 1 }}>ℹ</span>
              <div>
                <span>{valdTypInfo.beskrivning}</span>
                {' '}
                <span style={{ fontWeight: 600 }}>
                  Underlag: {valdTypInfo.underlag}.
                </span>
                {valdTypInfo.källa && (
                  <a
                    href={valdTypInfo.källa}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--blue-accent)', marginLeft: 4, textDecoration: 'none' }}
                  >
                    Skatteverket ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Inställningar */}
          <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 16 }}>
            {/* Fastighetstyp */}
            <div>
              <label style={labelStyle}>Fastighetstyp</label>
              <select
                value={fastighetstyp}
                onChange={e => setFastighetstyp(e.target.value as FastighetsTyp)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'var(--navy)',
                  border: '1px solid var(--navy-border)',
                  color: 'var(--white)',
                  fontSize: 13,
                }}
              >
                <option value="villa">Villa / Fritidshus</option>
                <option value="brf">Bostadsrätt (BRF)</option>
                <option value="agarlagh">Ägarlägenhet</option>
              </select>
            </div>

            {/* Antal ägare */}
            <div>
              <label style={labelStyle}>Antal ägare</label>
              <div className="flex gap-2">
                {[1, 2].map(n => (
                  <button
                    key={n}
                    onClick={() => setAntalAgare(n)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: antalAgare === n ? 'rgba(245,196,0,0.5)' : 'var(--navy-border)',
                      background: antalAgare === n ? 'var(--yellow-glow)' : 'var(--navy)',
                      color: antalAgare === n ? 'var(--yellow)' : 'var(--muted-custom)',
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Tidigare utnyttjat */}
            <div>
              <label style={labelStyle}>Tidigare utnyttjat i år (kr)</label>
              <input
                type="number"
                value={tidligareUtnyttjat || ''}
                onChange={e => setTidligareUtnyttjat(Number(e.target.value) || 0)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'var(--navy)',
                  border: '1px solid var(--navy-border)',
                  color: 'var(--white)',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Varningar */}
          {res.takNåttVarning && (
            <div
              className="flex items-start gap-2"
              style={{
                background: 'var(--orange-bg)',
                border: '1px solid rgba(255,140,66,0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }}>⚠</span>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--orange)', marginBottom: 2 }}>Avdragstak nått</p>
                <p style={{ color: 'var(--muted-custom)' }}>
                  Beräknat avdrag ({Math.round(res.rotUnderlag * (valdTypInfo ? parseFloat(valdTypInfo.procent) / 100 : 0.3)).toLocaleString('sv')} kr)
                  överstiger kundens kvarvarande utrymme ({res.kvarvarandeUtrymme.toLocaleString('sv')} kr).
                  Avdraget begränsas till {res.rotBelopp.toLocaleString('sv')} kr.
                </p>
              </div>
            </div>
          )}

          {res.fastighetsVarning && (
            <div
              className="flex items-start gap-2"
              style={{
                background: 'rgba(74,158,255,0.08)',
                border: '1px solid rgba(74,158,255,0.25)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--blue-accent)', flexShrink: 0, marginTop: 1 }}>ℹ</span>
              <p style={{ color: 'var(--muted-custom)' }}>{res.fastighetsVarning}</p>
            </div>
          )}
        </>
      )}

      {/* Prissammanfattning */}
      <div
        style={{
          background: 'var(--navy)',
          borderRadius: 10,
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--slate)',
            marginBottom: 12,
          }}
        >
          Prissammanfattning
        </div>

        {[
          { label: 'Arbetskostnad inkl moms', värde: Math.round(arbeteExMoms * 1.25) },
          { label: 'Material inkl moms', värde: Math.round(materialExMoms * 1.25) },
          { label: 'Totalt inkl moms', värde: res.totalInkMoms, bold: true },
        ].map(rad => (
          <div
            key={rad.label}
            className="flex justify-between"
            style={{
              fontSize: 13,
              padding: '4px 0',
              color: rad.bold ? 'var(--white)' : 'var(--muted-custom)',
              fontWeight: rad.bold ? 700 : 400,
            }}
          >
            <span>{rad.label}</span>
            <span>{Math.round(rad.värde).toLocaleString('sv')} kr</span>
          </div>
        ))}

        {aktiverat && res.rotBelopp > 0 && (
          <div
            className="flex justify-between"
            style={{
              fontSize: 13,
              padding: '4px 0',
              color: 'var(--green)',
              fontWeight: 600,
            }}
          >
            <span>{valdTypInfo?.emoji} {valdTypInfo?.label} ({valdTypInfo?.procent})</span>
            <span>–{res.rotBelopp.toLocaleString('sv')} kr</span>
          </div>
        )}

        <div
          className="flex justify-between items-end"
          style={{
            borderTop: '1px solid var(--navy-border)',
            paddingTop: 10,
            marginTop: 8,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>Kunden betalar</span>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: aktiverat && res.rotBelopp > 0 ? 'var(--yellow)' : 'var(--white)',
              }}
            >
              {Math.round(res.kundBetalar).toLocaleString('sv')} kr
            </div>
            {aktiverat && res.rotBelopp > 0 && (
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>
                ↓ Kunden sparar {res.rotBelopp.toLocaleString('sv')} kr
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: 10, color: 'var(--slate)', marginTop: 10, lineHeight: 1.5 }}>
        Beräkningen är vägledande. Det är alltid kunden som ansvarar för att de uppfyller
        Skatteverkets villkor. Om avdrag nekas ansvarar kunden för mellanskillnaden.{' '}
        <a
          href={ROT_REGLER.källa}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--blue-accent)', textDecoration: 'none' }}
        >
          Skatteverket ↗
        </a>
      </p>
    </div>
  )
}
