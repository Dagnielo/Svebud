'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

type Utfall = 'vunnet' | 'förlorat' | 'vantar'

interface ProjektMin {
  id: string
  tilldelning_status: Utfall | null
}

interface Props {
  projekt: ProjektMin
  onChange?: () => void
  kompakt?: boolean
}

function idagISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function UtfallsKnappar({ projekt, onChange, kompakt = false }: Props) {
  const supabase = createClient()
  const [openVunnet, setOpenVunnet] = useState(false)
  const [openForlorat, setOpenForlorat] = useState(false)
  const [vunnetDatum, setVunnetDatum] = useState(idagISO())
  const [vunnetPris, setVunnetPris] = useState('')
  const [vunnetNotering, setVunnetNotering] = useState('')
  const [forloratNotering, setForloratNotering] = useState('')

  async function spara(
    utfall: Utfall,
    extra: { datum?: string; notering?: string; pris?: number } = {}
  ) {
    const idag = idagISO()
    const uppdatering: Record<string, unknown> = {
      tilldelning_status: utfall,
      pipeline_status: 'tilldelning',
    }
    if (utfall === 'vunnet' || utfall === 'förlorat') {
      uppdatering.tilldelning_datum = extra.datum ?? idag
      if (extra.notering) uppdatering.tilldelning_notering = extra.notering
      if (utfall === 'vunnet' && extra.pris) uppdatering.vinnande_pris = extra.pris
    }
    await supabase.from('projekt').update(uppdatering).eq('id', projekt.id)
    onChange?.()
  }

  async function sparaVunnet() {
    const pris = vunnetPris.trim() ? Number(vunnetPris) : undefined
    const notering = vunnetNotering.trim() || undefined
    await spara('vunnet', { datum: vunnetDatum, notering, pris })
    posthog.capture('anbud_markerat_vunnet', {
      projekt_id: projekt.id,
      tilldelning_datum: vunnetDatum,
      vinnande_pris: pris ?? null,
    })
    setOpenVunnet(false)
  }

  async function sparaForlorat() {
    const notering = forloratNotering.trim() || undefined
    // TODO: nolla vinnande_pris vid förlorat-flöde — annars kan rader bli inkonsekventa
    // (förlorat status + vinnande_pris kvar från ev. tidigare 'vunnet'-markering).
    // Statistik-KPI filtrerar idag bort detta, men datan bör städas vid källan.
    await spara('förlorat', { notering })
    posthog.capture('anbud_markerat_forlorat', {
      projekt_id: projekt.id,
      har_notering: Boolean(notering),
    })
    setOpenForlorat(false)
  }

  const knappStorlek = kompakt
    ? { fontSize: 11, padding: '4px 10px' }
    : { fontSize: 13, padding: '8px 16px' }

  return (
    <>
      {!kompakt && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Hur gick det?</div>
          <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 10 }}>
            Markera utfallet. Vid vunnet anbud aktiveras föranmälan-trackern automatiskt.
          </p>
        </>
      )}
      <div
        className="flex flex-wrap gap-1.5"
        onClick={e => { e.preventDefault(); e.stopPropagation() }}
      >
        <button
          onClick={() => setOpenVunnet(true)}
          style={{
            ...knappStorlek,
            fontWeight: 700, borderRadius: 6,
            background: projekt.tilldelning_status === 'vunnet' ? 'var(--green)' : 'transparent',
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
            ...knappStorlek,
            fontWeight: 700, borderRadius: 6,
            background: projekt.tilldelning_status === 'förlorat' ? 'var(--red)' : 'transparent',
            color: projekt.tilldelning_status === 'förlorat' ? 'var(--white)' : 'var(--red)',
            border: '1px solid var(--red)',
            cursor: 'pointer',
          }}
        >
          ✗ Vi förlorade
        </button>
        <button
          onClick={() => spara('vantar')}
          style={{
            ...knappStorlek,
            fontWeight: 700, borderRadius: 6,
            background: projekt.tilldelning_status === 'vantar' ? 'var(--muted-custom)' : 'transparent',
            color: projekt.tilldelning_status === 'vantar' ? 'var(--navy)' : 'var(--muted-custom)',
            border: '1px solid var(--muted-custom)',
            cursor: 'pointer',
          }}
        >
          ⏳ Väntar
        </button>
      </div>

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
                inputMode="numeric"
                min={0}
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
