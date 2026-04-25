'use client'

import Link from 'next/link'
import { useState } from 'react'
import { posthog } from '@/lib/posthog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

type Projekt = {
  id: string
  namn: string
  beskrivning: string | null
  jämförelse_status: string
  rekommendation_status: string
  analys_komplett: boolean | null
  pipeline_status?: string
  tilldelning_status?: string
  tilldelning_datum?: string | null
  tilldelning_notering?: string | null
  vinnande_pris?: number | null
  tier: string
  skapad: string
  deadline?: string | null
}

type UtfallExtra = { datum?: string; notering?: string; vinnande_pris?: number }

type Props = {
  projekt: Projekt
  onRadera?: (id: string) => void
  onDeadlineChange?: (id: string, datum: string | null) => void
  onUtfallChange?: (
    id: string,
    utfall: 'vunnet' | 'förlorat' | 'vantar',
    extra?: UtfallExtra
  ) => void
}

function dagarSedanSkapad(skapad: string) {
  const diff = Date.now() - new Date(skapad).getTime()
  const dagar = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (dagar === 0) return 'Idag'
  if (dagar === 1) return 'Igår'
  return `${dagar}d sedan`
}

function getPipelineLabel(p: Projekt): string {
  const ps = p.pipeline_status ?? 'inkorg'
  if (ps === 'tilldelning') {
    if (p.tilldelning_status === 'vunnet') return 'Vunnet'
    if (p.tilldelning_status === 'förlorat') return 'Förlorat'
    return 'Väntar på besked'
  }
  if (ps === 'inskickat') return 'Anbud inskickat'
  if (ps === 'under_arbete') return 'Under arbete'
  if (p.analys_komplett !== null) return 'Analyserad ✓'
  return 'Ladda upp dokument'
}

function getStatusDotColor(p: Projekt): string {
  const ps = p.pipeline_status ?? 'inkorg'
  if (ps === 'tilldelning' && p.tilldelning_status === 'vunnet') return 'var(--green)'
  if (ps === 'tilldelning' && p.tilldelning_status === 'förlorat') return 'var(--red)'
  if (ps === 'inskickat') return 'var(--blue-accent)'
  if (ps === 'under_arbete') return 'var(--yellow)'
  if (p.analys_komplett === false) return 'var(--orange)'
  return 'var(--muted-custom)'
}

function getBorderColor(p: Projekt): string {
  if (p.tilldelning_status === 'vunnet') return 'var(--green)'
  if (p.tilldelning_status === 'förlorat') return 'var(--red)'
  return 'var(--navy-border)'
}

function idagISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ProjektKort({ projekt, onRadera, onDeadlineChange, onUtfallChange }: Props) {
  const [openVunnet, setOpenVunnet] = useState(false)
  const [openForlorat, setOpenForlorat] = useState(false)

  const [vunnetDatum, setVunnetDatum] = useState(idagISO())
  const [vunnetPris, setVunnetPris] = useState('')
  const [vunnetNotering, setVunnetNotering] = useState('')
  const [forloratNotering, setForloratNotering] = useState('')

  const visaUtfallsknappar =
    projekt.pipeline_status === 'inskickat' || projekt.pipeline_status === 'tilldelning'

  function sparaVunnet() {
    const pris = vunnetPris.trim() ? Number(vunnetPris) : undefined
    const notering = vunnetNotering.trim() || undefined
    onUtfallChange?.(projekt.id, 'vunnet', { datum: vunnetDatum, notering, vinnande_pris: pris })
    posthog.capture('anbud_markerat_vunnet', {
      projekt_id: projekt.id,
      tilldelning_datum: vunnetDatum,
      vinnande_pris: pris ?? null,
    })
    setOpenVunnet(false)
  }

  function sparaForlorat() {
    const notering = forloratNotering.trim() || undefined
    onUtfallChange?.(projekt.id, 'förlorat', { notering })
    posthog.capture('anbud_markerat_forlorat', {
      projekt_id: projekt.id,
      har_notering: Boolean(notering),
    })
    setOpenForlorat(false)
  }

  function markeraVantar() {
    onUtfallChange?.(projekt.id, 'vantar')
  }

  return (
    <>
      <Link href={`/projekt/${projekt.id}`} className="block" style={{ textDecoration: 'none' }}>
        <div
          style={{
            background: 'var(--navy-light)',
            border: `1px solid ${getBorderColor(projekt)}`,
            borderRadius: 10,
            padding: 14,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div className="flex items-start justify-between" style={{ marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: 'var(--white)' }}>
                {projekt.namn}
              </div>
              {projekt.beskrivning && (
                <div style={{ fontSize: 11, color: 'var(--muted-custom)', marginTop: 2 }}>
                  {projekt.beskrivning.slice(0, 50)}
                </div>
              )}
            </div>
            <div
              style={{
                width: 8, height: 8, borderRadius: '50%',
                flexShrink: 0, marginTop: 3,
                background: getStatusDotColor(projekt),
              }}
            />
          </div>

          <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                background: 'var(--navy)', color: 'var(--muted-custom)',
              }}
            >
              {getPipelineLabel(projekt)}
            </span>
            <span
              style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                background: 'var(--navy)', color: 'var(--muted-custom)',
              }}
            >
              {dagarSedanSkapad(projekt.skapad)}
            </span>
          </div>

          {visaUtfallsknappar && (
            <div
              className="flex flex-wrap gap-1.5"
              style={{ marginBottom: 8 }}
              onClick={e => { e.preventDefault(); e.stopPropagation() }}
            >
              <button
                onClick={() => setOpenVunnet(true)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  background: projekt.tilldelning_status === 'vunnet' ? 'var(--green)' : 'var(--navy)',
                  color: projekt.tilldelning_status === 'vunnet' ? 'var(--navy)' : 'var(--green)',
                  border: '1px solid var(--green)',
                  cursor: 'pointer',
                }}
              >
                ✓ Vi vann
              </button>
              <button
                onClick={() => setOpenForlorat(true)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  background: projekt.tilldelning_status === 'förlorat' ? 'var(--red)' : 'var(--navy)',
                  color: projekt.tilldelning_status === 'förlorat' ? 'var(--white)' : 'var(--red)',
                  border: '1px solid var(--red)',
                  cursor: 'pointer',
                }}
              >
                ✗ Vi förlorade
              </button>
              <button
                onClick={markeraVantar}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  background: projekt.tilldelning_status === 'vantar' ? 'var(--muted-custom)' : 'var(--navy)',
                  color: projekt.tilldelning_status === 'vantar' ? 'var(--navy)' : 'var(--muted-custom)',
                  border: '1px solid var(--muted-custom)',
                  cursor: 'pointer',
                }}
              >
                ⏳ Väntar
              </button>
            </div>
          )}

          {/* Deadline — alltid synlig */}
          <div
            className="flex items-center gap-1.5"
            style={{ marginBottom: 6 }}
            onClick={e => { e.preventDefault(); e.stopPropagation() }}
          >
            {projekt.deadline ? (() => {
              const d = new Date(projekt.deadline)
              const dagar = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              const passerad = dagar < 0
              const brådskande = dagar >= 0 && dagar <= 3
              return (
                <>
                  <span style={{ fontSize: 11 }}>{passerad ? '⚠' : brådskande ? '🔥' : '📅'}</span>
                  <input
                    type="date"
                    value={projekt.deadline}
                    onChange={e => onDeadlineChange?.(projekt.id, e.target.value || null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: passerad ? 'var(--red)' : brådskande ? 'var(--orange)' : 'var(--muted-custom)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      width: 95,
                    }}
                  />
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: passerad ? 'var(--red)' : brådskande ? 'var(--orange)' : 'var(--slate)',
                  }}>
                    {passerad
                      ? 'Passerad!'
                      : dagar === 0
                        ? 'Idag!'
                        : dagar === 1
                          ? 'Imorgon'
                          : `${dagar}d kvar`}
                  </span>
                </>
              )
            })() : (
              <>
                <span style={{ fontSize: 11 }}>📅</span>
                <input
                  type="date"
                  value=""
                  onChange={e => onDeadlineChange?.(projekt.id, e.target.value || null)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--steel)',
                    borderRadius: 4,
                    color: 'var(--yellow)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '1px 6px',
                  }}
                />
                <span style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 600 }}>
                  Sätt deadline
                </span>
              </>
            )}
          </div>

          {projekt.analys_komplett === false && (
            <span
              style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: 5,
                background: 'var(--orange-bg)', color: 'var(--orange)',
              }}
            >
              ⚠ Komplettera
            </span>
          )}

          <div
            className="flex items-center justify-between"
            style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--navy-border)' }}
          >
            <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>Öppna →</span>
            {onRadera && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (confirm(`Vill du verkligen radera "${projekt.namn}"? Detta går inte att ångra.`)) {
                    onRadera(projekt.id)
                  }
                }}
                style={{
                  fontSize: 11,
                  color: 'var(--slate)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--slate)'; e.currentTarget.style.background = 'none' }}
              >
                🗑
              </button>
            )}
          </div>
        </div>
      </Link>

      <Dialog open={openVunnet} onOpenChange={setOpenVunnet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grattis! Anbudet vanns 🎉</DialogTitle>
            <DialogDescription>Ange datum, vinnande pris och eventuell notering.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Datum
              <input
                type="date"
                value={vunnetDatum}
                onChange={e => setVunnetDatum(e.target.value)}
                style={{
                  display: 'block', width: '100%', marginTop: 4, padding: '6px 8px',
                  border: '1px solid var(--navy-border)', borderRadius: 6, fontSize: 13,
                }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Vinnande pris (kr) — valfritt
              <input
                type="number"
                value={vunnetPris}
                onChange={e => setVunnetPris(e.target.value)}
                placeholder="t.ex. 850000"
                style={{
                  display: 'block', width: '100%', marginTop: 4, padding: '6px 8px',
                  border: '1px solid var(--navy-border)', borderRadius: 6, fontSize: 13,
                }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Notering — valfritt
              <textarea
                value={vunnetNotering}
                onChange={e => setVunnetNotering(e.target.value)}
                rows={3}
                style={{
                  display: 'block', width: '100%', marginTop: 4, padding: '6px 8px',
                  border: '1px solid var(--navy-border)', borderRadius: 6, fontSize: 13,
                  resize: 'vertical',
                }}
              />
            </label>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpenVunnet(false)}
              style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--navy-border)', background: 'transparent', cursor: 'pointer' }}
            >
              Avbryt
            </button>
            <button
              onClick={sparaVunnet}
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--green)', color: 'var(--navy)', cursor: 'pointer' }}
            >
              Spara
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openForlorat} onOpenChange={setOpenForlorat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Förlorat anbud</DialogTitle>
            <DialogDescription>Vet du varför ni förlorade? (valfritt)</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            <textarea
              value={forloratNotering}
              onChange={e => setForloratNotering(e.target.value)}
              rows={4}
              placeholder="t.ex. Pris för högt, fel referens, vald konkurrent..."
              style={{
                width: '100%', padding: '6px 8px',
                border: '1px solid var(--navy-border)', borderRadius: 6, fontSize: 13,
                resize: 'vertical',
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpenForlorat(false)}
              style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--navy-border)', background: 'transparent', cursor: 'pointer' }}
            >
              Avbryt
            </button>
            <button
              onClick={sparaForlorat}
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--red)', color: 'var(--white)', cursor: 'pointer' }}
            >
              Spara
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function getPipelineKolumn(p: Projekt): string {
  return p.pipeline_status ?? 'inkorg'
}

export type { Projekt }
