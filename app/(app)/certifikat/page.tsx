'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const CERTIFIKAT_LISTA = [
  { kategori: 'El-auktorisation', items: [
    { namn: 'Auktorisation AL (lågspänning)', key: 'al' },
    { namn: 'Auktorisation A (full, inkl. högspänning)', key: 'a' },
    { namn: 'Auktorisation B (begränsad)', key: 'b' },
    { namn: 'Egenkontrollprogram (EKP)', key: 'ekp' },
    { namn: 'Registrering hos Elsäkerhetsverket', key: 'elsakerhet' },
  ]},
  { kategori: 'SSG-kurser', items: [
    { namn: 'SSG Entre', key: 'ssg_entre' },
    { namn: 'SSG Online', key: 'ssg_online' },
  ]},
  { kategori: 'Arbetsmiljö', items: [
    { namn: 'BAS-U (Byggarbetsmiljösamordnare Utförande)', key: 'bas_u' },
    { namn: 'BAS-P (Byggarbetsmiljösamordnare Planering)', key: 'bas_p' },
    { namn: 'Heta arbeten – certifiering', key: 'heta_arbeten' },
  ]},
  { kategori: 'Övrigt', items: [
    { namn: 'ID06-kort (samtliga montörer)', key: 'id06' },
    { namn: 'Ansvarsförsäkring', key: 'ansvarsforsaking' },
    { namn: 'F-skattsedel', key: 'f_skatt' },
    { namn: 'ISO 9001 Kvalitetsledning', key: 'iso9001' },
    { namn: 'ISO 14001 Miljöledning', key: 'iso14001' },
  ]},
]

const ERFARENHET_LISTA = [
  'Stamrenovering',
  'Nyinstallation bostäder',
  'Industriel-installation',
  'Laddinfrastruktur / laddboxar',
  'Solceller',
  'Servicekontrakt / underhåll',
  'Belysning',
  'Brandlarm / säkerhetssystem',
  'Totalentreprenad',
  'Fastighetsautomation / KNX',
]

export default function CertifikatPage() {
  const [loading, setLoading] = useState(true)
  const [sparar, setSparar] = useState(false)
  const [sparat, setSparat] = useState(false)
  const [certifikat, setCertifikat] = useState<Record<string, boolean>>({})
  const [erfarenhet, setErfarenhet] = useState<string[]>([])
  const [egnaCert, setEgnaCert] = useState<Record<string, string[]>>({})
  const [nyttCertInput, setNyttCertInput] = useState<Record<string, string>>({})
  const [egnaErfarenheter, setEgnaErfarenheter] = useState<string[]>([])
  const [nyErfarenhetInput, setNyErfarenhetInput] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function hämta() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: profil } = await supabase
        .from('profiler')
        .select('certifikat, erfarenhet')
        .eq('id', authUser.id)
        .single()

      if (profil) {
        const p = profil as Record<string, unknown>

        const certs = (p.certifikat as Array<{ key: string; namn?: string; uppfyllt: boolean; kategori?: string }>) ?? []
        const certMap: Record<string, boolean> = {}
        const egna: Record<string, string[]> = {}
        certs.forEach(c => {
          // Kolla om det är ett standard-certifikat
          const ärStandard = CERTIFIKAT_LISTA.some(k => k.items.some(i => i.key === c.key))
          if (ärStandard) {
            certMap[c.key] = c.uppfyllt
          } else {
            // Eget certifikat — gruppera under kategori
            const kat = c.kategori ?? 'Övrigt'
            if (!egna[kat]) egna[kat] = []
            egna[kat].push(c.namn ?? c.key)
          }
        })
        setCertifikat(certMap)
        setEgnaCert(egna)

        // Erfarenheter — separera standard och egna
        const allaErf = (p.erfarenhet as string[]) ?? []
        const standardErf = allaErf.filter(e => ERFARENHET_LISTA.includes(e))
        const egnaErf = allaErf.filter(e => !ERFARENHET_LISTA.includes(e))
        setErfarenhet(standardErf)
        setEgnaErfarenheter(egnaErf)
      }
      setLoading(false)
    }
    hämta()
  }, [])


  async function spara() {
    setSparar(true)
    setSparat(false)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    // Standard-certifikat
    const certifikatArray = Object.entries(certifikat)
      .filter(([, v]) => v)
      .map(([key]) => {
        const item = CERTIFIKAT_LISTA.flatMap(k => k.items).find(i => i.key === key)
        const kat = CERTIFIKAT_LISTA.find(k => k.items.some(i => i.key === key))
        return { key, namn: item?.namn ?? key, uppfyllt: true, kategori: kat?.kategori ?? 'Övrigt' }
      })

    // Egna certifikat
    Object.entries(egnaCert).forEach(([kategori, items]) => {
      items.forEach(namn => {
        const key = `egen_${namn.toLowerCase().replace(/[^a-zåäö0-9]/g, '_')}`
        certifikatArray.push({ key, namn, uppfyllt: true, kategori })
      })
    })

    // Alla erfarenheter (standard + egna)
    const allaErfarenheter = [...erfarenhet, ...egnaErfarenheter]

    await supabase
      .from('profiler')
      .update({ certifikat: certifikatArray, erfarenhet: allaErfarenheter })
      .eq('id', authUser.id)

    setSparar(false)
    setSparat(true)
    setTimeout(() => setSparat(false), 3000)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--navy)' }}>
        {/* Topbar */}
        <div
          className="flex items-center sticky top-0 z-40"
          style={{
            height: 60,
            background: 'var(--navy-mid)',
            borderBottom: '1px solid var(--navy-border)',
            padding: '0 32px',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>Certifikat & behörigheter</span>
          {sparat && (
            <span style={{ marginLeft: 16, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
              Sparat!
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1 }}>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-40 rounded-xl" style={{ background: 'var(--navy-mid)' }} />
              ))}
            </div>
          ) : (
            <div style={{ maxWidth: 700 }}>
              <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginBottom: 16, lineHeight: 1.6 }}>
                Markera de certifikat och behörigheter ert företag har. Dessa matchas automatiskt mot krav i förfrågningsunderlag vid analys.
              </p>

              {/* Certifikat per kategori */}
              {CERTIFIKAT_LISTA.map(kat => (
                <div
                  key={kat.kategori}
                  style={{
                    background: 'var(--navy-mid)',
                    border: '1px solid var(--navy-border)',
                    borderRadius: 12,
                    padding: '20px 24px',
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-custom)', marginBottom: 14 }}>
                    {kat.kategori}
                  </h3>
                  {kat.items.map(item => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 cursor-pointer"
                      style={{
                        fontSize: 13,
                        padding: '8px 0',
                        color: certifikat[item.key] ? 'var(--white)' : 'var(--muted-custom)',
                        borderBottom: '1px solid var(--navy-border)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={certifikat[item.key] ?? false}
                        onChange={e => setCertifikat(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        style={{ accentColor: 'var(--yellow)', width: 16, height: 16 }}
                      />
                      <span className="flex-1">{item.namn}</span>
                    </label>
                  ))}

                  {/* Egna tillagda certifikat i denna kategori */}
                  {(egnaCert[kat.kategori] ?? []).map((namn, i) => (
                    <div
                      key={`egen-${i}`}
                      className="flex items-center gap-3"
                      style={{
                        fontSize: 13,
                        padding: '8px 0',
                        color: 'var(--white)',
                        borderBottom: '1px solid var(--navy-border)',
                      }}
                    >
                      <input type="checkbox" checked disabled style={{ accentColor: 'var(--yellow)', width: 16, height: 16 }} />
                      <span className="flex-1">{namn}</span>
                      <button
                        onClick={() => setEgnaCert(prev => ({ ...prev, [kat.kategori]: (prev[kat.kategori] ?? []).filter((_, j) => j !== i) }))}
                        style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Lägg till eget */}
                  <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                    <input
                      value={nyttCertInput[kat.kategori] ?? ''}
                      onChange={e => setNyttCertInput(prev => ({ ...prev, [kat.kategori]: e.target.value }))}
                      placeholder="Lägg till eget certifikat..."
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (nyttCertInput[kat.kategori] ?? '').trim()) {
                          setEgnaCert(prev => ({ ...prev, [kat.kategori]: [...(prev[kat.kategori] ?? []), nyttCertInput[kat.kategori].trim()] }))
                          setNyttCertInput(prev => ({ ...prev, [kat.kategori]: '' }))
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'var(--navy)',
                        border: '1px dashed var(--navy-border)',
                        color: 'var(--white)',
                        fontSize: 12,
                      }}
                    />
                    <button
                      onClick={() => {
                        if ((nyttCertInput[kat.kategori] ?? '').trim()) {
                          setEgnaCert(prev => ({ ...prev, [kat.kategori]: [...(prev[kat.kategori] ?? []), nyttCertInput[kat.kategori].trim()] }))
                          setNyttCertInput(prev => ({ ...prev, [kat.kategori]: '' }))
                        }
                      }}
                      style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'none', border: '1px solid var(--yellow)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                    >
                      + Lägg till
                    </button>
                  </div>
                </div>
              ))}

              {/* Erfarenhet */}
              <div
                style={{
                  background: 'var(--navy-mid)',
                  border: '1px solid var(--navy-border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Erfarenhetsområden</h2>
                <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 16 }}>
                  Välj de områden ert företag har erfarenhet inom.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ERFARENHET_LISTA.map(erf => (
                    <label
                      key={erf}
                      className="flex items-center gap-2 cursor-pointer"
                      style={{
                        fontSize: 13,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${erfarenhet.includes(erf) ? 'var(--yellow)' : 'var(--navy-border)'}`,
                        background: erfarenhet.includes(erf) ? 'var(--yellow-glow)' : 'transparent',
                        color: erfarenhet.includes(erf) ? 'var(--yellow)' : 'var(--muted-custom)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={erfarenhet.includes(erf)}
                        onChange={e => {
                          if (e.target.checked) setErfarenhet(prev => [...prev, erf])
                          else setErfarenhet(prev => prev.filter(x => x !== erf))
                        }}
                        className="hidden"
                      />
                      {erf}
                    </label>
                  ))}
                  {/* Egna erfarenheter */}
                  {egnaErfarenheter.map((erf, i) => (
                    <div
                      key={`egen-${i}`}
                      className="flex items-center gap-2"
                      style={{
                        fontSize: 13,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--yellow)',
                        background: 'var(--yellow-glow)',
                        color: 'var(--yellow)',
                      }}
                    >
                      <span className="flex-1">{erf}</span>
                      <button
                        onClick={() => setEgnaErfarenheter(prev => prev.filter((_, j) => j !== i))}
                        style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {/* Lägg till egen erfarenhet */}
                <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
                  <input
                    value={nyErfarenhetInput}
                    onChange={e => setNyErfarenhetInput(e.target.value)}
                    placeholder="Lägg till egen erfarenhet..."
                    onKeyDown={e => {
                      if (e.key === 'Enter' && nyErfarenhetInput.trim()) {
                        setEgnaErfarenheter(prev => [...prev, nyErfarenhetInput.trim()])
                        setNyErfarenhetInput('')
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'var(--navy)',
                      border: '1px dashed var(--navy-border)',
                      color: 'var(--white)',
                      fontSize: 12,
                    }}
                  />
                  <button
                    onClick={() => {
                      if (nyErfarenhetInput.trim()) {
                        setEgnaErfarenheter(prev => [...prev, nyErfarenhetInput.trim()])
                        setNyErfarenhetInput('')
                      }
                    }}
                    style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'none', border: '1px solid var(--yellow)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    + Lägg till
                  </button>
                </div>
              </div>

              {/* Spara */}
              <Button
                onClick={spara}
                disabled={sparar}
                className="font-semibold"
                style={{ background: 'var(--yellow)', color: 'var(--navy)', padding: '10px 32px' }}
              >
                {sparar ? 'Sparar...' : 'Spara ändringar'}
              </Button>
            </div>
          )}
        </div>
      </div>
  )
}
