'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'

type UserProfil = {
  fullnamn: string | null
  företag: string | null
  tier: string | null
  initialer: string
}

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
    { namn: 'SSG Heta Arbeten', key: 'ssg_heta' },
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

const TOTAL_CERT = CERTIFIKAT_LISTA.reduce((sum, k) => sum + k.items.length, 0)

export default function CertifikatPage() {
  const [loading, setLoading] = useState(true)
  const [sparar, setSparar] = useState(false)
  const [sparat, setSparat] = useState(false)
  const [user, setUser] = useState<UserProfil | null>(null)
  const [certifikat, setCertifikat] = useState<Record<string, boolean>>({})
  const [erfarenhet, setErfarenhet] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function hämta() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: profil } = await supabase
        .from('profiler')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profil) {
        const p = profil as Record<string, unknown>
        const namn = p.fullnamn as string | null
        setUser({
          fullnamn: namn,
          företag: p.företag as string | null,
          tier: p.tier as string | null,
          initialer: namn
            ? namn.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            : '?',
        })

        const certs = (p.certifikat as Array<{ key: string; uppfyllt: boolean }>) ?? []
        const certMap: Record<string, boolean> = {}
        certs.forEach(c => { certMap[c.key] = c.uppfyllt })
        setCertifikat(certMap)

        setErfarenhet((p.erfarenhet as string[]) ?? [])
      }
      setLoading(false)
    }
    hämta()
  }, [])

  const uppfylldaCount = Object.values(certifikat).filter(Boolean).length
  const procent = Math.round((uppfylldaCount / TOTAL_CERT) * 100)

  async function spara() {
    setSparar(true)
    setSparat(false)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const certifikatArray = Object.entries(certifikat)
      .filter(([, v]) => v)
      .map(([key]) => {
        const item = CERTIFIKAT_LISTA.flatMap(k => k.items).find(i => i.key === key)
        return { key, namn: item?.namn ?? key, uppfyllt: true }
      })

    await supabase
      .from('profiler')
      .update({ certifikat: certifikatArray, erfarenhet })
      .eq('id', authUser.id)

    setSparar(false)
    setSparat(true)
    setTimeout(() => setSparat(false), 3000)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--navy)' }}>
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col" style={{ marginLeft: 220 }}>
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
              {/* Progress overview */}
              <div
                style={{
                  background: 'var(--navy-mid)',
                  border: '1px solid var(--navy-border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 16,
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700 }}>Uppfyllda certifikat</h2>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--yellow)' }}>
                    {uppfylldaCount} / {TOTAL_CERT}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: 'var(--navy)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${procent}%`,
                      background: 'var(--yellow)',
                      borderRadius: 4,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 8 }}>
                  Dessa certifikat matchas automatiskt mot krav i förfrågningsunderlag. Ju fler ni har, desto starkare anbud kan SveBud generera.
                </p>
              </div>

              {/* Certifikat per kategori */}
              {CERTIFIKAT_LISTA.map(kat => {
                const katUppfyllda = kat.items.filter(i => certifikat[i.key]).length
                return (
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
                    <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-custom)' }}>
                        {kat.kategori}
                      </h3>
                      <span style={{ fontSize: 11, fontWeight: 600, color: katUppfyllda === kat.items.length ? 'var(--green)' : 'var(--slate)' }}>
                        {katUppfyllda}/{kat.items.length}
                      </span>
                    </div>
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
                        {certifikat[item.key] && (
                          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Uppfyllt</span>
                        )}
                      </label>
                    ))}
                  </div>
                )
              })}

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
    </div>
  )
}
