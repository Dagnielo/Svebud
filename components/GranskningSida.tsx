'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Krav = {
  krav: string
  typ: 'ska' | 'bör'
  kategori: string
  källa: string
  konfidens: number
}

type KravMedSvar = Krav & {
  svar: 'ja' | 'nej' | 'osäker' | null
  kommentar: string
}

type ExtraktionsData = {
  beställare: string | null
  kontaktperson: string | null
  org_nr: string | null
  sista_anbudsdag: string | null
  avtalsvillkor: string | null
  prismodell: string | null
  uppdragsbeskrivning: string | null
  värde_kr: number | null
  ska_krav: Krav[]
  bör_krav: Krav[]
}

type Dokument = {
  filnamn: string
  extraktion_status: string
}

type Props = {
  projektId: string
  onKravBesvarade?: (krav: KravMedSvar[]) => void
}

type Vy = 'dokument' | 'kategori'

const kategoriIkon: Record<string, string> = {
  certifikat: '📜', erfarenhet: '🏗️', kapacitet: '👷', ekonomi: '💰',
  kvalitet: '✅', säkerhet: '🦺', tidsplan: '📅', juridik: '⚖️', övrigt: '📌',
}

export default function GranskningSida({ projektId, onKravBesvarade }: Props) {
  const [data, setData] = useState<ExtraktionsData | null>(null)
  const [dokument, setDokument] = useState<Dokument[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [vy, setVy] = useState<Vy>('dokument')
  const [kravSvar, setKravSvar] = useState<Record<number, { svar: 'ja' | 'nej' | 'osäker'; kommentar: string }>>({})
  const supabase = createClient()

  async function hämta() {
    const { data: projekt } = await supabase
      .from('projekt')
      .select('jämförelse_resultat')
      .eq('id', projektId)
      .single()

    if (projekt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultat = (projekt as any)['jämförelse_resultat'] as ExtraktionsData | null
      if (resultat?.ska_krav) setData(resultat)
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
    const interval = setInterval(hämta, 10000)
    return () => clearInterval(interval)
  }, [projektId])

  async function körScanning() {
    setScanning(true)
    await fetch('/api/anbud/extrahera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projektId }),
    })
    await hämta()
    setScanning(false)
  }

  function sättSvar(kravIndex: number, svar: 'ja' | 'nej' | 'osäker') {
    setKravSvar(prev => ({
      ...prev,
      [kravIndex]: { ...prev[kravIndex], svar, kommentar: prev[kravIndex]?.kommentar ?? '' },
    }))
  }

  function sättKommentar(kravIndex: number, kommentar: string) {
    setKravSvar(prev => ({
      ...prev,
      [kravIndex]: { ...prev[kravIndex], svar: prev[kravIndex]?.svar ?? 'osäker', kommentar },
    }))
  }

  if (loading) return <div className="animate-pulse h-40 rounded-lg" style={{ background: 'var(--navy-mid)' }} />

  if (!data) {
    return (
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--muted-custom)', marginBottom: 16 }}>
          Dokumenten behöver scannas för att hitta krav.
        </p>
        <Button onClick={körScanning} disabled={scanning} style={{ background: 'var(--yellow)', color: 'var(--navy)' }}>
          {scanning ? 'Scannar dokument...' : '🔍 Scanna efter krav'}
        </Button>
      </div>
    )
  }

  const allaKrav = [...data.ska_krav, ...data.bör_krav]
  const lästa = dokument.filter(d => d.extraktion_status === 'extraherad' || d.extraktion_status === 'läst')

  // Statistik
  const totalKrav = allaKrav.length
  const besvarade = Object.keys(kravSvar).length
  const jaCount = Object.values(kravSvar).filter(s => s.svar === 'ja').length
  const nejCount = Object.values(kravSvar).filter(s => s.svar === 'nej').length
  const osäkerCount = Object.values(kravSvar).filter(s => s.svar === 'osäker').length
  const allaBesvarade = besvarade === totalKrav && totalKrav > 0
  const matchProcent = totalKrav > 0 ? Math.round((jaCount / totalKrav) * 100) : 0

  // Kravmatchning redo?
  const kanKöraMatchning = besvarade >= data.ska_krav.length

  // Spara och trigga matchning
  async function sparaOchKörMatchning() {
    // Spara kravsvaren på projektet
    const kravMedSvar: KravMedSvar[] = allaKrav.map((k, i) => ({
      ...k,
      svar: kravSvar[i]?.svar ?? null,
      kommentar: kravSvar[i]?.kommentar ?? '',
    }))

    await supabase
      .from('projekt')
      .update({
        kravmatchning: { krav_svar: kravMedSvar } as unknown as Record<string, unknown>,
      })
      .eq('id', projektId)

    onKravBesvarade?.(kravMedSvar)
  }

  // Gruppera per dokument
  function kravPerDokument(): Array<{ dokNamn: string; krav: Array<Krav & { globalIndex: number }> }> {
    const result: Record<string, Array<Krav & { globalIndex: number }>> = {}
    for (const d of dokument) result[d.filnamn] = []

    allaKrav.forEach((k, globalIndex) => {
      let matchat = false
      for (const d of dokument) {
        const dNamnKort = d.filnamn.replace(/\.[^.]+$/, '').toLowerCase()
        const källaLower = k.källa.toLowerCase()
        if (källaLower.includes(dNamnKort) || källaLower.includes(d.filnamn.toLowerCase()) ||
            (dNamnKort.length > 5 && källaLower.includes(dNamnKort.slice(0, 10)))) {
          result[d.filnamn].push({ ...k, globalIndex })
          matchat = true
          break
        }
      }
      if (!matchat) {
        for (const d of dokument) {
          const numMatch = d.filnamn.match(/^(\d+\.\d+)/)
          if (numMatch && k.källa.includes(numMatch[1])) {
            result[d.filnamn].push({ ...k, globalIndex })
            matchat = true
            break
          }
        }
      }
      if (!matchat) {
        if (!result['Övriga krav']) result['Övriga krav'] = []
        result['Övriga krav'].push({ ...k, globalIndex })
      }
    })

    return Object.entries(result).map(([dokNamn, krav]) => ({ dokNamn, krav }))
  }

  const perDok = kravPerDokument()

  return (
    <div className="space-y-4">
      {/* Sammanfattning */}
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--green)', borderRadius: 12, padding: '18px 20px' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div className="flex-1">
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>
              {data.ska_krav.length} ska-krav och {data.bör_krav.length} bör-krav hittade
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 2 }}>
              {lästa.length} av {dokument.length} dokument lästa · Besvara kraven nedan för att köra kravmatchning
            </div>
          </div>
        </div>
        {dokument.map((d, i) => (
          <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--green)' }}>✓</span>
            <span style={{ color: 'var(--soft)' }}>{d.filnamn}</span>
            <span style={{ color: 'var(--muted-custom)', marginLeft: 'auto', fontSize: 10 }}>
              {perDok.find(p => p.dokNamn === d.filnamn)?.krav.length ?? 0} krav
            </span>
          </div>
        ))}
      </div>

      {/* Framstegsindikator */}
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '16px 20px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Besvarade krav</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: allaBesvarade ? 'var(--green)' : 'var(--yellow)' }}>
            {besvarade} / {totalKrav}
          </span>
        </div>
        <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--navy-light)', overflow: 'hidden' }}>
          <div style={{ width: `${totalKrav > 0 ? (besvarade / totalKrav) * 100 : 0}%`, height: '100%', borderRadius: 3, background: allaBesvarade ? 'var(--green)' : 'var(--yellow)', transition: 'width 0.3s' }} />
        </div>
        <div className="flex gap-4 mt-2" style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
          <span>✅ Ja: {jaCount}</span>
          <span>❌ Nej: {nejCount}</span>
          <span>❓ Osäker: {osäkerCount}</span>
          <span>⬜ Obesvarade: {totalKrav - besvarade}</span>
        </div>
      </div>

      {/* Projektinfo */}
      <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)', fontSize: 14, fontWeight: 700 }}>📋 Projektinformation</div>
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

      {/* Vy-toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setVy('dokument')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: vy === 'dokument' ? 'var(--yellow)' : 'var(--navy-light)', color: vy === 'dokument' ? 'var(--navy)' : 'var(--muted-custom)' }}>
          📄 Per dokument
        </button>
        <button onClick={() => setVy('kategori')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: vy === 'kategori' ? 'var(--yellow)' : 'var(--navy-light)', color: vy === 'kategori' ? 'var(--navy)' : 'var(--muted-custom)' }}>
          📂 Per kategori
        </button>
        <Button onClick={körScanning} disabled={scanning} variant="outline" size="sm" className="ml-auto" style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)', fontSize: 11 }}>
          {scanning ? 'Scannar...' : '🔄 Scanna om'}
        </Button>
      </div>

      {/* Kravlista per dokument */}
      {vy === 'dokument' && (
        <div className="space-y-3">
          {perDok.map(({ dokNamn, krav }) => (
            <div key={dokNamn} style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
              <div className="flex items-center gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{dokNamn}</span>
                <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
                  {krav.filter(k => k.typ === 'ska').length} ska · {krav.filter(k => k.typ === 'bör').length} bör
                </span>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {krav.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--slate)', padding: '8px 6px' }}>Inga krav hittade i detta dokument</p>
                ) : (
                  krav.map(k => (
                    <KravRadMedSvar
                      key={k.globalIndex}
                      krav={k}
                      svar={kravSvar[k.globalIndex]?.svar ?? null}
                      kommentar={kravSvar[k.globalIndex]?.kommentar ?? ''}
                      onSvar={(s) => sättSvar(k.globalIndex, s)}
                      onKommentar={(c) => sättKommentar(k.globalIndex, c)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kravlista per kategori */}
      {vy === 'kategori' && (
        <div className="space-y-3">
          {['ska', 'bör'].map(typ => {
            const kravAvTyp = allaKrav.map((k, i) => ({ ...k, globalIndex: i })).filter(k => k.typ === typ)
            if (kravAvTyp.length === 0) return null
            const perKat: Record<string, typeof kravAvTyp> = {}
            kravAvTyp.forEach(k => { const kat = k.kategori || 'övrigt'; if (!perKat[kat]) perKat[kat] = []; perKat[kat].push(k) })

            return (
              <div key={typ} style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
                <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{typ === 'ska' ? '🔴' : '🟡'} {typ === 'ska' ? 'Ska' : 'Bör'}-krav ({kravAvTyp.length})</span>
                  <Badge style={{ background: typ === 'ska' ? 'var(--red-bg)' : 'var(--yellow-glow)', color: typ === 'ska' ? 'var(--red)' : 'var(--yellow)', border: 'none', fontSize: 10 }}>
                    {typ === 'ska' ? 'Obligatoriska' : 'Meriterande'}
                  </Badge>
                </div>
                <div style={{ padding: '8px 12px' }}>
                  {Object.entries(perKat).map(([kat, krav]) => (
                    <div key={kat} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6, padding: '0 6px' }}>
                        {kategoriIkon[kat] ?? '📌'} {kat}
                      </div>
                      {krav.map(k => (
                        <KravRadMedSvar
                          key={k.globalIndex}
                          krav={k}
                          svar={kravSvar[k.globalIndex]?.svar ?? null}
                          kommentar={kravSvar[k.globalIndex]?.kommentar ?? ''}
                          onSvar={(s) => sättSvar(k.globalIndex, s)}
                          onKommentar={(c) => sättKommentar(k.globalIndex, c)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CTA: Kör kravmatchning */}
      <div style={{ background: 'var(--navy-mid)', border: `1px solid ${kanKöraMatchning ? 'var(--yellow)' : 'var(--navy-border)'}`, borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
        {kanKöraMatchning ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              Alla ska-krav besvarade — redo för kravmatchning
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted-custom)', marginBottom: 16 }}>
              {jaCount} ja · {nejCount} nej · {osäkerCount} osäker av {totalKrav} krav
              {matchProcent > 0 && <span style={{ color: 'var(--yellow)', fontWeight: 700 }}> · Preliminär matchning: {matchProcent}%</span>}
            </div>
            <Button
              onClick={sparaOchKörMatchning}
              style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 14, padding: '12px 32px' }}
            >
              ⚡ Kör kravmatchning → GO / NO-GO
            </Button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: 'var(--muted-custom)', marginBottom: 8 }}>
              Besvara alla {data.ska_krav.length} ska-krav ovan för att köra kravmatchning
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)' }}>
              {besvarade} av {data.ska_krav.length} ska-krav besvarade
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InfoRad({ label, värde }: { label: string; värde: string | null }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: värde ? 'var(--white)' : 'var(--slate)' }}>{värde ?? '—'}</div>
    </div>
  )
}

function KravRadMedSvar({ krav, svar, kommentar, onSvar, onKommentar }: {
  krav: Krav
  svar: 'ja' | 'nej' | 'osäker' | null
  kommentar: string
  onSvar: (s: 'ja' | 'nej' | 'osäker') => void
  onKommentar: (c: string) => void
}) {
  const [visaKommentar, setVisaKommentar] = useState(false)

  return (
    <div style={{ padding: '10px 8px', marginBottom: 4, borderRadius: 8, background: 'var(--navy-light)', border: svar === 'ja' ? '1px solid rgba(0,198,122,0.3)' : svar === 'nej' ? '1px solid rgba(255,77,77,0.3)' : '1px solid transparent' }}>
      <div className="flex items-start gap-3">
        <span style={{ fontSize: 12, marginTop: 2 }}>{krav.typ === 'ska' ? '🔴' : '🟡'}</span>
        <div className="flex-1">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{krav.krav}</div>
          <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{krav.källa}</div>
        </div>

        {/* Ja/Nej/Osäker knappar */}
        <div className="flex gap-1 flex-shrink-0">
          {(['ja', 'nej', 'osäker'] as const).map(s => (
            <button
              key={s}
              onClick={() => { onSvar(s); if (s === 'nej' || s === 'osäker') setVisaKommentar(true) }}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: svar === s
                  ? s === 'ja' ? 'var(--green)' : s === 'nej' ? 'var(--red)' : 'var(--orange)'
                  : 'var(--navy)',
                color: svar === s ? (s === 'ja' ? 'var(--navy)' : 'white') : 'var(--muted-custom)',
              }}
            >
              {s === 'ja' ? '✅ Ja' : s === 'nej' ? '❌ Nej' : '❓ Osäker'}
            </button>
          ))}
        </div>
      </div>

      {/* Kommentarsfält vid nej/osäker */}
      {(visaKommentar || kommentar) && (svar === 'nej' || svar === 'osäker') && (
        <div style={{ marginTop: 8, marginLeft: 28 }}>
          <input
            value={kommentar}
            onChange={e => onKommentar(e.target.value)}
            placeholder={svar === 'nej' ? 'Förklara varför inte (valfritt)...' : 'Beskriv vad som behövs...'}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--navy)',
              border: '1px solid var(--navy-border)',
              color: 'var(--soft)',
              fontSize: 12,
            }}
          />
        </div>
      )}
    </div>
  )
}
