'use client'

import { useState, useEffect } from 'react'
import { FORANMALAN_STEG, STEG_ORDNING, FORANMALAN_JOBBTYPER, nästaSteg, stegIndex } from '@/lib/foranmalan-regler'
import type { StegId } from '@/lib/foranmalan-regler'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ForanmalanProjekt {
  id: string
  projekt_id: string
  jobbtyp: string
  nätbolag: string | null
  kund_namn: string | null
  kund_epost: string | null
  nuvarande_steg: string
  notifiera_kund: boolean
  skapad: string
  foranmalan_steg_logg: Array<{
    id: string
    steg: string
    kommentar: string | null
    notis_skickad: boolean
    skapad: string
  }>
}

interface Props {
  projektId: string
  projektNamn: string
}

export default function ForanmalanTracker({ projektId, projektNamn }: Props) {
  const [fp, setFp] = useState<ForanmalanProjekt | null>(null)
  const [laddar, setLaddar] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [skapaDialogOpen, setSkapaDialogOpen] = useState(false)
  const [kommentar, setKommentar] = useState('')
  const [uppdaterar, setUppdaterar] = useState(false)
  const [skickaNotis, setSkickaNotis] = useState(true)
  const [valtSteg, setValtSteg] = useState<string | null>(null)
  const [redigeraInfo, setRedigeraInfo] = useState(false)
  const [editNätbolag, setEditNätbolag] = useState('')
  const [editKundNamn, setEditKundNamn] = useState('')
  const [editKundEpost, setEditKundEpost] = useState('')
  const [editKundTelefon, setEditKundTelefon] = useState('')
  const [editNotifiera, setEditNotifiera] = useState(true)

  // Skapa-formulär state
  const [nyJobbtyp, setNyJobbtyp] = useState('')
  const [nyNätbolag, setNyNätbolag] = useState('')
  const [nyKundNamn, setNyKundNamn] = useState('')
  const [nyKundEpost, setNyKundEpost] = useState('')
  const [nyKundTelefon, setNyKundTelefon] = useState('')

  const jobbInfo = fp ? FORANMALAN_JOBBTYPER.find(j => j.id === fp.jobbtyp) : null
  const nuvarandeStegIdx = fp ? stegIndex(fp.nuvarande_steg as StegId) : 0
  const nästaStegId = fp ? nästaSteg(fp.nuvarande_steg as StegId) : null
  const nästaStegInfo = nästaStegId ? FORANMALAN_STEG.find(s => s.id === nästaStegId) : null

  const dagarPåSteg = () => {
    if (!fp) return 0
    const logg = fp.foranmalan_steg_logg
      .filter(l => l.steg === fp.nuvarande_steg)
      .sort((a, b) => new Date(b.skapad).getTime() - new Date(a.skapad).getTime())
    if (!logg.length) return 0
    return Math.floor((Date.now() - new Date(logg[0].skapad).getTime()) / (1000 * 60 * 60 * 24))
  }

  useEffect(() => {
    hämtaTracker()
  }, [projektId])

  async function hämtaTracker() {
    setLaddar(true)
    const res = await fetch(`/api/foranmalan?projekt_id=${projektId}`)
    const { data } = await res.json()
    setFp(data?.[0] || null)
    setLaddar(false)
  }

  async function skapaTracker() {
    if (!nyJobbtyp) return
    setUppdaterar(true)
    await fetch('/api/foranmalan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projekt_id: projektId,
        jobbtyp: nyJobbtyp,
        nätbolag: nyNätbolag || null,
        kund_namn: nyKundNamn || null,
        kund_epost: nyKundEpost || null,
        kund_telefon: nyKundTelefon || null,
      })
    })
    setSkapaDialogOpen(false)
    setUppdaterar(false)
    hämtaTracker()
  }

  function öppnaRedigering() {
    if (!fp) return
    setEditNätbolag(fp.nätbolag ?? '')
    setEditKundNamn(fp.kund_namn ?? '')
    setEditKundEpost(fp.kund_epost ?? '')
    setEditKundTelefon((fp as unknown as Record<string, unknown>).kund_telefon as string ?? '')
    setEditNotifiera(fp.notifiera_kund)
    setRedigeraInfo(true)
  }

  async function sparaInfo() {
    if (!fp) return
    setUppdaterar(true)
    await fetch(`/api/foranmalan/${fp.id}/uppdatera`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nätbolag: editNätbolag || null,
        kund_namn: editKundNamn || null,
        kund_epost: editKundEpost || null,
        kund_telefon: editKundTelefon || null,
        notifiera_kund: editNotifiera,
      })
    })
    setRedigeraInfo(false)
    setUppdaterar(false)
    hämtaTracker()
  }

  async function uppdateraSteg() {
    if (!fp || !nästaStegId) return
    setUppdaterar(true)
    try {
      const res = await fetch(`/api/foranmalan/${fp.id}/steg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kommentar: kommentar || null, skickaNotis })
      })
      const data = await res.json()
      if (data.nyttSteg) {
        setKommentar('')
        setDialogOpen(false)
        hämtaTracker()
      }
    } finally {
      setUppdaterar(false)
    }
  }

  if (laddar) {
    return <div className="animate-pulse h-20 rounded-xl" style={{ background: 'var(--navy-mid)' }} />
  }

  // Ingen tracker — visa "Starta"
  if (!fp) {
    return (
      <div
        style={{
          background: 'var(--navy-mid)',
          border: '2px dashed var(--navy-border)',
          borderRadius: 12,
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Föranmälan & nätbolag</div>
        <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 16 }}>
          Aktivera föranmälan-tracker för att hålla koll på status hos nätbolaget och notifiera kunden.
        </p>
        <Button
          onClick={() => setSkapaDialogOpen(true)}
          style={{ background: 'var(--yellow)', color: 'var(--navy)', fontWeight: 700 }}
        >
          + Starta tracker
        </Button>

        {/* Skapa-dialog */}
        <Dialog open={skapaDialogOpen} onOpenChange={setSkapaDialogOpen}>
          <DialogContent style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', maxWidth: 500 }}>
            <DialogHeader>
              <DialogTitle>Starta föranmälan-tracker</DialogTitle>
            </DialogHeader>
            <div className="space-y-4" style={{ marginTop: 16 }}>
              {/* Jobbtyp */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 6, display: 'block' }}>
                  Jobbtyp *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FORANMALAN_JOBBTYPER.map(j => (
                    <button
                      key={j.id}
                      onClick={() => setNyJobbtyp(j.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: nyJobbtyp === j.id ? 'rgba(245,196,0,0.5)' : 'var(--navy-border)',
                        background: nyJobbtyp === j.id ? 'var(--yellow-glow)' : 'var(--navy)',
                        color: nyJobbtyp === j.id ? 'var(--white)' : 'var(--muted-custom)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 12,
                      }}
                    >
                      <span style={{ marginRight: 6 }}>{j.emoji}</span>
                      {j.label}
                      {!j.kravs && <span style={{ fontSize: 10, color: 'var(--green)', marginLeft: 4 }}>Ej krav</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nätbolag */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 4, display: 'block' }}>
                  Nätbolag
                </label>
                <input
                  value={nyNätbolag}
                  onChange={e => setNyNätbolag(e.target.value)}
                  placeholder="T.ex. Vattenfall, Ellevio, E.ON..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--navy)', border: '1px solid var(--navy-border)', color: 'var(--white)', fontSize: 13 }}
                />
              </div>

              {/* Kunduppgifter */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 4, display: 'block' }}>
                  Kunduppgifter (för notiser)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input value={nyKundNamn} onChange={e => setNyKundNamn(e.target.value)} placeholder="Kundens namn" style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--navy)', border: '1px solid var(--navy-border)', color: 'var(--white)', fontSize: 13 }} />
                  <input value={nyKundTelefon} onChange={e => setNyKundTelefon(e.target.value)} placeholder="Telefon" style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--navy)', border: '1px solid var(--navy-border)', color: 'var(--white)', fontSize: 13 }} />
                </div>
                <input value={nyKundEpost} onChange={e => setNyKundEpost(e.target.value)} placeholder="Kundens e-post (för automatiska notiser)" style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--navy)', border: '1px solid var(--navy-border)', color: 'var(--white)', fontSize: 13 }} />
              </div>

              <Button
                onClick={skapaTracker}
                disabled={!nyJobbtyp || uppdaterar}
                className="w-full"
                style={{ background: 'var(--yellow)', color: 'var(--navy)', fontWeight: 700 }}
              >
                {uppdaterar ? 'Skapar...' : 'Starta tracker'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Aktiv tracker
  const dagar = dagarPåSteg()
  const stegFastnat = dagar > 14 && fp.nuvarande_steg !== 'klar'

  return (
    <div
      style={{
        background: 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--navy-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--yellow-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            {jobbInfo?.emoji}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Föranmälan — {jobbInfo?.label}</div>
            <div style={{ fontSize: 13, color: 'var(--muted-custom)', marginTop: 1 }}>
              {fp.nätbolag ? `Nätbolag: ${fp.nätbolag}` : 'Inget nätbolag angivet'}
              {fp.kund_namn && ` · Kund: ${fp.kund_namn}`}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: 8,
            background: fp.nuvarande_steg === 'klar' ? 'var(--green-bg)' : 'var(--yellow-glow)',
            color: fp.nuvarande_steg === 'klar' ? 'var(--green)' : 'var(--yellow)',
            border: `1px solid ${fp.nuvarande_steg === 'klar' ? 'rgba(0,198,122,0.3)' : 'rgba(245,196,0,0.3)'}`,
          }}
        >
          {FORANMALAN_STEG.find(s => s.id === fp.nuvarande_steg)?.label}
        </span>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Progress stepper — full bredd */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          {/* Bakgrundslinje */}
          <div style={{ position: 'absolute', top: 20, left: 40, right: 40, height: 3, background: 'var(--navy-border)', borderRadius: 2 }} />
          {/* Progresslinje */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 40,
              height: 3,
              background: fp.nuvarande_steg === 'klar' ? 'var(--green)' : 'var(--yellow)',
              borderRadius: 2,
              width: `${(nuvarandeStegIdx / (STEG_ORDNING.length - 1)) * (100 - 10)}%`,
              transition: 'width 0.5s',
            }}
          />

          <div className="flex justify-between" style={{ position: 'relative' }}>
            {FORANMALAN_STEG.map((steg, i) => {
              const klar = i < nuvarandeStegIdx
              const aktiv = i === nuvarandeStegIdx
              const klickbar = klar || aktiv
              const vald = valtSteg === steg.id
              // Hitta datum för detta steg från loggen
              const stegLogg = fp.foranmalan_steg_logg
                .filter(l => l.steg === steg.id)
                .sort((a, b) => new Date(a.skapad).getTime() - new Date(b.skapad).getTime())
              const stegDatum = stegLogg.length > 0 ? new Date(stegLogg[0].skapad) : null
              return (
                <div
                  key={steg.id}
                  className="flex flex-col items-center"
                  style={{ flex: 1, cursor: klickbar ? 'pointer' : 'default' }}
                  onClick={() => klickbar && setValtSteg(vald ? null : steg.id)}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '3px solid',
                      borderColor: vald ? 'var(--white)' : klar ? 'var(--green)' : aktiv ? 'var(--yellow)' : 'var(--navy-border)',
                      background: klar ? 'var(--green)' : aktiv ? 'var(--yellow-glow)' : 'var(--navy-mid)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 800,
                      color: klar ? 'var(--navy)' : aktiv ? 'var(--yellow)' : 'var(--muted-custom)',
                      boxShadow: vald ? '0 0 0 5px rgba(255,255,255,0.15)' : aktiv ? '0 0 0 5px var(--yellow-glow)' : 'none',
                      transition: 'all 0.3s',
                      position: 'relative',
                      zIndex: 2,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      textAlign: 'center',
                      marginTop: 8,
                      lineHeight: 1.3,
                      fontWeight: aktiv || vald ? 700 : 500,
                      color: vald ? 'var(--white)' : aktiv ? 'var(--white)' : klar ? 'var(--green)' : 'var(--slate)',
                      maxWidth: 100,
                    }}
                  >
                    {steg.label}
                  </span>
                  {stegDatum && (klar || aktiv) ? (
                    <span style={{ fontSize: 9, color: klar ? 'var(--green)' : 'var(--yellow)', marginTop: 2, fontWeight: 600, fontFamily: 'var(--font-mono), monospace' }}>
                      {stegDatum.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  ) : aktiv && !stegDatum ? (
                    <span style={{ fontSize: 9, color: 'var(--yellow)', marginTop: 2, fontWeight: 600 }}>
                      ← Du är här
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* Detaljvy för valt steg */}
        {valtSteg && (() => {
          const stegLogg = fp.foranmalan_steg_logg
            .filter(l => l.steg === valtSteg)
            .sort((a, b) => new Date(b.skapad).getTime() - new Date(a.skapad).getTime())
          const stegInfo = FORANMALAN_STEG.find(s => s.id === valtSteg)
          const stegHjälp = jobbInfo?.stegOchHjälp?.[valtSteg as keyof typeof jobbInfo.stegOchHjälp]
          return (
            <div
              style={{
                background: 'var(--navy)',
                borderRadius: 10,
                padding: '16px 20px',
                marginBottom: 16,
                border: '1px solid var(--navy-border)',
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 16 }}>{stegInfo?.emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{stegInfo?.label}</span>
                </div>
                <button
                  onClick={() => setValtSteg(null)}
                  style={{ fontSize: 12, color: 'var(--muted-custom)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ✕ Stäng
                </button>
              </div>

              {stegHjälp && (
                <p style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.6, marginBottom: 12 }}>
                  {stegHjälp}
                </p>
              )}

              {stegLogg.length > 0 ? (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Noteringar
                  </div>
                  {stegLogg.map(logg => (
                    <div
                      key={logg.id}
                      style={{
                        padding: '8px 12px',
                        marginBottom: 6,
                        borderRadius: 6,
                        background: 'var(--navy-mid)',
                        border: '1px solid var(--navy-border)',
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: logg.kommentar ? 4 : 0 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted-custom)' }}>
                          {new Date(logg.skapad).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {' kl '}
                          {new Date(logg.skapad).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {logg.notis_skickad && (
                          <span style={{ fontSize: 11, color: 'var(--green)' }}>✉ Notis skickad</span>
                        )}
                      </div>
                      {logg.kommentar && (
                        <p style={{ fontSize: 13, color: 'var(--white)', margin: 0, lineHeight: 1.5 }}>
                          💬 {logg.kommentar}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--slate)', fontStyle: 'italic' }}>
                  Inga noteringar för detta steg.
                </div>
              )}
            </div>
          )
        })()}

        {/* Tips + varning i grid */}
        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
          {/* Tips för nuvarande steg */}
          {jobbInfo?.stegOchHjälp && fp.nuvarande_steg !== 'klar' && (
            <div
              style={{
                background: 'var(--navy)',
                borderRadius: 10,
                padding: '14px 18px',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Tips för detta steg
              </div>
              <p style={{ color: 'var(--soft)', lineHeight: 1.7, margin: 0, fontSize: 13 }}>
                {jobbInfo.stegOchHjälp[fp.nuvarande_steg as keyof typeof jobbInfo.stegOchHjälp] || ''}
              </p>
              {/* Ha redo-lista */}
              {(jobbInfo as unknown as { haRedo?: Record<string, string[]> }).haRedo?.[fp.nuvarande_steg as string] && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--navy-border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--yellow)', fontSize: 11, marginBottom: 6 }}>
                    Ha redo:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--soft)', lineHeight: 1.8 }}>
                    {((jobbInfo as unknown as { haRedo: Record<string, string[]> }).haRedo[fp.nuvarande_steg as string]).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {jobbInfo.regelLank && (
                <a
                  href={jobbInfo.regelLank}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--blue-accent)', fontSize: 12, textDecoration: 'none', marginTop: 8, display: 'inline-block' }}
                >
                  Läs mer om ELNÄT 2025 K §5.9 ↗
                </a>
              )}
            </div>
          )}

          {/* Info-kort: handläggningstid + kundnotis — redigerbart */}
          <div
            style={{
              background: 'var(--navy)',
              borderRadius: 10,
              padding: '14px 18px',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Projektinfo
              </div>
              <button
                onClick={() => redigeraInfo ? sparaInfo() : öppnaRedigering()}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: redigeraInfo ? 'var(--green)' : 'var(--muted-custom)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {uppdaterar ? 'Sparar...' : redigeraInfo ? 'Spara' : 'Redigera'}
              </button>
            </div>

            {redigeraInfo ? (
              <div className="space-y-2">
                <div>
                  <label style={{ fontSize: 11, color: 'var(--slate)', display: 'block', marginBottom: 2 }}>Nätbolag</label>
                  <input value={editNätbolag} onChange={e => setEditNätbolag(e.target.value)} placeholder="T.ex. Vattenfall, Ellevio..." style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', color: 'var(--white)', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--slate)', display: 'block', marginBottom: 2 }}>Kundens namn</label>
                  <input value={editKundNamn} onChange={e => setEditKundNamn(e.target.value)} placeholder="Kundens namn" style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', color: 'var(--white)', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--slate)', display: 'block', marginBottom: 2 }}>E-post (för notiser)</label>
                  <input value={editKundEpost} onChange={e => setEditKundEpost(e.target.value)} placeholder="kund@example.se" style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', color: 'var(--white)', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--slate)', display: 'block', marginBottom: 2 }}>Telefon</label>
                  <input value={editKundTelefon} onChange={e => setEditKundTelefon(e.target.value)} placeholder="070-xxx xx xx" style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', color: 'var(--white)', fontSize: 12 }} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: 'var(--soft)', marginTop: 4 }}>
                  <input type="checkbox" checked={editNotifiera} onChange={e => setEditNotifiera(e.target.checked)} style={{ accentColor: 'var(--yellow)' }} />
                  Skicka e-postnotiser till kunden
                </label>
                <button
                  onClick={() => setRedigeraInfo(false)}
                  style={{ fontSize: 11, color: 'var(--muted-custom)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
                >
                  Avbryt
                </button>
              </div>
            ) : (
              <>
                {jobbInfo?.typiskHandlaggningstid && (
                  <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 6 }}>
                    <span>⏱</span>
                    <span>Handläggningstid: <strong style={{ color: 'var(--white)' }}>{jobbInfo.typiskHandlaggningstid}</strong></span>
                  </div>
                )}
                {fp.nätbolag && (
                  <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 6 }}>
                    <span>🏢</span>
                    <span>Nätbolag: <strong style={{ color: 'var(--white)' }}>{fp.nätbolag}</strong></span>
                  </div>
                )}
                {fp.kund_epost && (
                  <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 6 }}>
                    <span>🔔</span>
                    <span>Kundnotiser: <strong style={{ color: 'var(--white)' }}>{fp.kund_epost}</strong></span>
                  </div>
                )}
                {fp.kund_namn && (
                  <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 6 }}>
                    <span>👤</span>
                    <span>Kund: <strong style={{ color: 'var(--white)' }}>{fp.kund_namn}</strong></span>
                  </div>
                )}
                {dagar > 0 && fp.nuvarande_steg !== 'klar' && (
                  <div className="flex items-center gap-2" style={{ fontSize: 13, color: stegFastnat ? 'var(--orange)' : 'var(--soft)' }}>
                    <span>{stegFastnat ? '⚠' : '📅'}</span>
                    <span>{dagar} dagar på nuvarande steg{stegFastnat ? ' — kontakta nätbolaget?' : ''}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Varning om fastnat */}
        {stegFastnat && (
          <div
            className="flex items-start gap-3"
            style={{
              background: 'var(--orange-bg)',
              border: '1px solid rgba(255,140,66,0.3)',
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>⏰</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--orange)', marginBottom: 2 }}>Fastnad i {dagar} dagar</div>
              <div style={{ color: 'var(--muted-custom)' }}>
                Har du hört av {fp.nätbolag || 'nätbolaget'} om detta ärende? Normal handläggningstid är {jobbInfo?.typiskHandlaggningstid ?? 'okänd'}.
              </div>
            </div>
          </div>
        )}

        {/* Aktivitetslogg */}
        {fp.foranmalan_steg_logg.length > 0 && (
          <div style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Aktivitetslogg
            </div>
            {[...fp.foranmalan_steg_logg]
              .sort((a, b) => new Date(b.skapad).getTime() - new Date(a.skapad).getTime())
              .slice(0, 5)
              .map(logg => (
                <div key={logg.id} className="flex items-center gap-3" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 6 }}>
                  <span className="font-mono" style={{ fontSize: 11, flexShrink: 0, width: 50 }}>
                    {new Date(logg.skapad).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ color: 'var(--slate)' }}>·</span>
                  <span style={{ fontWeight: 600 }}>{FORANMALAN_STEG.find(s => s.id === logg.steg)?.emoji} {FORANMALAN_STEG.find(s => s.id === logg.steg)?.label}</span>
                  {logg.kommentar && (
                    <span style={{ color: 'var(--soft)' }}>— {logg.kommentar}</span>
                  )}
                  {logg.notis_skickad && (
                    <span style={{ color: 'var(--green)', marginLeft: 'auto', flexShrink: 0, fontSize: 11 }}>✉ notis skickad</span>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* Nästa steg-knapp */}
        {nästaStegInfo && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="w-full"
            style={{ background: 'var(--yellow)', color: 'var(--navy)', fontWeight: 700, fontSize: 14, padding: '12px 24px' }}
          >
            {nästaStegInfo.emoji} Uppdatera till: {nästaStegInfo.label} →
          </Button>
        )}

        {fp.nuvarande_steg === 'klar' && (
          <div className="text-center" style={{ padding: '12px 0' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>⚡ Projekt avslutat — Nätbolag godkänt</span>
          </div>
        )}
      </div>

      {/* Dialog för steguppdatering */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
          <DialogHeader>
            <DialogTitle>{nästaStegInfo?.emoji} {nästaStegInfo?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4" style={{ marginTop: 12 }}>
            {/* Kommentar */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 4, display: 'block' }}>
                Kommentar (valfri)
              </label>
              <textarea
                value={kommentar}
                onChange={e => setKommentar(e.target.value)}
                rows={3}
                placeholder="T.ex. 'Nätbolaget begärde komplettering om effektbehov. Vi skickar in idag.'"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--navy)',
                  border: '1px solid var(--navy-border)',
                  color: 'var(--white)',
                  fontSize: 13,
                  resize: 'none',
                }}
              />
            </div>

            {/* Notis-val */}
            {fp.kund_epost && (
              <div
                style={{
                  background: skickaNotis ? 'rgba(74,158,255,0.08)' : 'var(--navy)',
                  border: `1px solid ${skickaNotis ? 'rgba(74,158,255,0.25)' : 'var(--navy-border)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skickaNotis}
                    onChange={e => setSkickaNotis(e.target.checked)}
                    style={{ accentColor: 'var(--blue-accent)', width: 16, height: 16 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: skickaNotis ? 'var(--white)' : 'var(--muted-custom)' }}>
                      Skicka e-postnotis till kunden
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-custom)', marginTop: 1 }}>
                      {skickaNotis
                        ? `Notis skickas till ${fp.kund_epost}`
                        : 'Steget markeras som klart utan att kunden notifieras'}
                    </div>
                  </div>
                </label>
              </div>
            )}

            {!fp.kund_epost && (
              <div style={{ fontSize: 12, color: 'var(--slate)', fontStyle: 'italic' }}>
                Ingen kund-epost angiven — steget markeras utan notis.
              </div>
            )}

            {/* Knappar */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)' }}
              >
                Avbryt
              </Button>
              <Button
                onClick={uppdateraSteg}
                disabled={uppdaterar}
                className="flex-1"
                style={{ background: 'var(--yellow)', color: 'var(--navy)', fontWeight: 700 }}
              >
                {uppdaterar
                  ? 'Uppdaterar...'
                  : skickaNotis && fp.kund_epost
                    ? 'Bekräfta & skicka notis'
                    : 'Markera som klar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
