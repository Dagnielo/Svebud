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

export default function ProfilPage() {
  const [loading, setLoading] = useState(true)
  const [sparar, setSparar] = useState(false)
  const [sparat, setSparat] = useState(false)
  const [user, setUser] = useState<UserProfil | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Formulärfält
  const [fullnamn, setFullnamn] = useState('')
  const [företag, setFöretag] = useState('')
  const [orgNr, setOrgNr] = useState('')
  const [adress, setAdress] = useState('')
  const [postnr, setPostnr] = useState('')
  const [ort, setOrt] = useState('')
  const [region, setRegion] = useState('')
  const [telefon, setTelefon] = useState('')
  const [antalMontorer, setAntalMontorer] = useState('')
  const [omsattning, setOmsattning] = useState('')
  const [timprisStandard, setTimprisStandard] = useState('')
  const [timprisJour, setTimprisJour] = useState('')
  const [timprisOb, setTimprisOb] = useState('')

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

        setFullnamn((p.fullnamn as string) ?? '')
        setFöretag((p.företag as string) ?? '')
        setOrgNr((p.org_nr as string) ?? '')
        setAdress((p.adress as string) ?? '')
        setPostnr((p.postnr as string) ?? '')
        setOrt((p.ort as string) ?? '')
        setRegion((p.region as string) ?? '')
        setTelefon((p.telefon as string) ?? '')
        setAntalMontorer((p.antal_montorer as number)?.toString() ?? '')
        setOmsattning((p.omsattning_msek as number)?.toString() ?? '')
        setTimprisStandard((p.timpris_standard as number)?.toString() ?? '')
        setTimprisJour((p.timpris_jour as number)?.toString() ?? '')
        setTimprisOb((p.timpris_ob as number)?.toString() ?? '')
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

    await supabase
      .from('profiler')
      .update({
        fullnamn: fullnamn || null,
        företag: företag || null,
        org_nr: orgNr || null,
        adress: adress || null,
        postnr: postnr || null,
        ort: ort || null,
        region: region || null,
        telefon: telefon || null,
        antal_montorer: antalMontorer ? parseInt(antalMontorer) : null,
        omsattning_msek: omsattning ? parseFloat(omsattning) : null,
        timpris_standard: timprisStandard ? parseInt(timprisStandard) : null,
        timpris_jour: timprisJour ? parseInt(timprisJour) : null,
        timpris_ob: timprisOb ? parseInt(timprisOb) : null,
      })
      .eq('id', authUser.id)

    // Uppdatera sidebar-visning
    setUser({
      fullnamn: fullnamn || null,
      företag: företag || null,
      tier: user?.tier ?? null,
      initialer: fullnamn
        ? fullnamn.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?',
    })

    setSparar(false)
    setSparat(true)
    setTimeout(() => setSparat(false), 3000)
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    background: 'var(--navy)',
    border: '1px solid var(--navy-border)',
    color: 'var(--white)',
    fontSize: 13,
  }

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600 as const,
    color: 'var(--muted-custom)',
    marginBottom: 4,
    display: 'block' as const,
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
          <span style={{ fontSize: 16, fontWeight: 700 }}>Företagsprofil</span>
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
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-xl" style={{ background: 'var(--navy-mid)' }} />
              ))}
            </div>
          ) : (
            <div style={{ maxWidth: 700 }}>
              {/* Personuppgifter */}
              <SectionCard title="Personuppgifter">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label style={labelStyle}>Fullständigt namn</label>
                    <input style={inputStyle} value={fullnamn} onChange={e => setFullnamn(e.target.value)} placeholder="Ditt namn" />
                  </div>
                </div>
              </SectionCard>

              {/* Företagsuppgifter */}
              <SectionCard title="Företagsuppgifter">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label style={labelStyle}>Företagsnamn</label>
                    <input style={inputStyle} value={företag} onChange={e => setFöretag(e.target.value)} placeholder="Elfirma AB" />
                  </div>
                  <div>
                    <label style={labelStyle}>Org.nummer</label>
                    <input style={inputStyle} value={orgNr} onChange={e => setOrgNr(e.target.value)} placeholder="556xxx-xxxx" />
                  </div>
                  <div>
                    <label style={labelStyle}>Telefon</label>
                    <input style={inputStyle} value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="08-xxx xx xx" />
                  </div>
                  <div className="col-span-2">
                    <label style={labelStyle}>Adress</label>
                    <input style={inputStyle} value={adress} onChange={e => setAdress(e.target.value)} placeholder="Elgatan 1" />
                  </div>
                  <div>
                    <label style={labelStyle}>Postnummer</label>
                    <input style={inputStyle} value={postnr} onChange={e => setPostnr(e.target.value)} placeholder="123 45" />
                  </div>
                  <div>
                    <label style={labelStyle}>Ort</label>
                    <input style={inputStyle} value={ort} onChange={e => setOrt(e.target.value)} placeholder="Stockholm" />
                  </div>
                  <div>
                    <label style={labelStyle}>Region / verksamhetsområde</label>
                    <input style={inputStyle} value={region} onChange={e => setRegion(e.target.value)} placeholder="Stor-Stockholm" />
                  </div>
                  <div>
                    <label style={labelStyle}>Antal montörer</label>
                    <input style={inputStyle} type="number" value={antalMontorer} onChange={e => setAntalMontorer(e.target.value)} placeholder="10" />
                  </div>
                  <div>
                    <label style={labelStyle}>Omsättning (MSEK)</label>
                    <input style={inputStyle} type="number" value={omsattning} onChange={e => setOmsattning(e.target.value)} placeholder="15" />
                  </div>
                </div>
              </SectionCard>

              {/* Timpriser */}
              <SectionCard title="Timpriser (SEK exkl. moms)">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label style={labelStyle}>Standard</label>
                    <input style={inputStyle} type="number" value={timprisStandard} onChange={e => setTimprisStandard(e.target.value)} placeholder="650" />
                  </div>
                  <div>
                    <label style={labelStyle}>Jour / akut</label>
                    <input style={inputStyle} type="number" value={timprisJour} onChange={e => setTimprisJour(e.target.value)} placeholder="950" />
                  </div>
                  <div>
                    <label style={labelStyle}>OB-tillägg</label>
                    <input style={inputStyle} type="number" value={timprisOb} onChange={e => setTimprisOb(e.target.value)} placeholder="200" />
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 8 }}>
                  Dessa priser används som förslag i kalkylen. Du kan alltid justera per projekt.
                </p>
              </SectionCard>

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 16,
      }}
    >
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  )
}
