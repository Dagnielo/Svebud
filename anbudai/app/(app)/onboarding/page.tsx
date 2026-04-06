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

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [sparar, setSparar] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Företagsuppgifter
  const [företag, setFöretag] = useState('')
  const [orgNr, setOrgNr] = useState('')
  const [adress, setAdress] = useState('')
  const [postnr, setPostnr] = useState('')
  const [ort, setOrt] = useState('')
  const [region, setRegion] = useState('')
  const [telefon, setTelefon] = useState('')
  const [antalMontorer, setAntalMontorer] = useState('')
  const [omsattning, setOmsattning] = useState('')

  // Priser
  const [timprisStandard, setTimprisStandard] = useState('')
  const [timprisJour, setTimprisJour] = useState('')
  const [timprisOb, setTimprisOb] = useState('')

  // Certifikat
  const [certifikat, setCertifikat] = useState<Record<string, boolean>>({})

  // Erfarenhet
  const [erfarenhet, setErfarenhet] = useState<string[]>([])

  useEffect(() => {
    async function hämta() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profil } = await supabase
        .from('profiler')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profil) {
        const p = profil as Record<string, unknown>
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

  async function spara() {
    setSparar(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const certifikatArray = Object.entries(certifikat)
      .filter(([, v]) => v)
      .map(([key]) => {
        const item = CERTIFIKAT_LISTA.flatMap(k => k.items).find(i => i.key === key)
        return { key, namn: item?.namn ?? key, uppfyllt: true }
      })

    await supabase
      .from('profiler')
      .update({
        företag,
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
        certifikat: certifikatArray,
        erfarenhet,
        onboarding_klar: true,
      })
      .eq('id', user.id)

    setSparar(false)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <div className="animate-pulse" style={{ color: 'var(--muted-custom)' }}>Laddar...</div>
      </div>
    )
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
    <div className="min-h-screen" style={{ background: 'var(--navy)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Header */}
        <div className="text-center" style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 800 }}>
              <span className="text-white">Sve</span>
              <span style={{ color: 'var(--yellow)' }}>Bud</span>
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Välkommen! Konfigurera din företagsprofil</h1>
          <p style={{ fontSize: 14, color: 'var(--muted-custom)' }}>
            Fyll i uppgifter om ditt företag så att AI:n kan matcha era certifikat och resurser mot förfrågningsunderlag.
          </p>
        </div>

        {/* Företagsuppgifter */}
        <SectionCard title="Företagsuppgifter">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label style={labelStyle}>Företagsnamn *</label>
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

        {/* Priser */}
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

        {/* Certifikat */}
        <SectionCard title="Certifikat & behörigheter">
          <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 16 }}>
            Kryssa i de certifikat och behörigheter som ert företag har. Dessa matchas mot krav i förfrågningsunderlag.
          </p>
          {CERTIFIKAT_LISTA.map(kat => (
            <div key={kat.kategori} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 8 }}>
                {kat.kategori}
              </div>
              {kat.items.map(item => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 cursor-pointer"
                  style={{ fontSize: 13, padding: '6px 0', color: 'var(--soft)' }}
                >
                  <input
                    type="checkbox"
                    checked={certifikat[item.key] ?? false}
                    onChange={e => setCertifikat(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    style={{ accentColor: 'var(--yellow)', width: 16, height: 16 }}
                  />
                  {item.namn}
                </label>
              ))}
            </div>
          ))}
        </SectionCard>

        {/* Erfarenhet */}
        <SectionCard title="Erfarenhet (välj alla som gäller)">
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
        </SectionCard>

        {/* Spara */}
        <div className="flex gap-3" style={{ marginTop: 24 }}>
          <Button
            onClick={spara}
            disabled={sparar || !företag.trim()}
            className="flex-1 font-semibold"
            style={{ background: 'var(--yellow)', color: 'var(--navy)', padding: '12px 24px' }}
          >
            {sparar ? 'Sparar...' : 'Spara och gå till Dashboard'}
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)' }}
          >
            Hoppa över
          </Button>
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
