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

type Kontaktperson = {
  namn: string
  roll: string
  epost: string
  telefon: string
}

type Referensprojekt = {
  projektnamn: string
  beställare: string
  kontaktperson: string
  kontakt_epost: string
  kontakt_telefon: string
  beskrivning: string
  typ: string
  datum: string
  värde: string
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
  const [webbadress, setWebbadress] = useState('')
  const [företagsbeskrivning, setFöretagsbeskrivning] = useState('')
  const [timprisStandard, setTimprisStandard] = useState('')
  const [timprisJour, setTimprisJour] = useState('')
  const [timprisOb, setTimprisOb] = useState('')
  const [referensprojekt, setReferensprojekt] = useState<Referensprojekt[]>([])
  const [visaRefForm, setVisaRefForm] = useState(false)
  const [nyttRef, setNyttRef] = useState<Referensprojekt>({ projektnamn: '', beställare: '', kontaktperson: '', kontakt_epost: '', kontakt_telefon: '', beskrivning: '', typ: '', datum: '', värde: '' })
  const [kontaktpersoner, setKontaktpersoner] = useState<Kontaktperson[]>([])
  const [visaKontaktForm, setVisaKontaktForm] = useState(false)
  const [nyKontakt, setNyKontakt] = useState<Kontaktperson>({ namn: '', roll: '', epost: '', telefon: '' })

  // Anbudsinställningar
  const [anbudsInst, setAnbudsInst] = useState({
    betalningsvillkor: '',
    garanti: '',
    avtalsvillkor: '',
    forbehall: [] as string[],
    ingar_ej: [] as string[],
    forutsattningar: [] as string[],
    giltighetstid: '30 dagar',
    fragor_till_kund: [] as string[],
    ovriga_instruktioner: '',
  })

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
        setWebbadress((p.webbadress as string) ?? '')
        setFöretagsbeskrivning((p.företagsbeskrivning as string) ?? '')
        setAntalMontorer((p.antal_montorer as number)?.toString() ?? '')
        setOmsattning((p.omsattning_msek as number)?.toString() ?? '')
        setTimprisStandard((p.timpris_standard as number)?.toString() ?? '')
        setTimprisJour((p.timpris_jour as number)?.toString() ?? '')
        setTimprisOb((p.timpris_ob as number)?.toString() ?? '')
        setReferensprojekt((p.referensprojekt as Referensprojekt[]) ?? [])
        setKontaktpersoner((p.kontaktpersoner as Kontaktperson[]) ?? [])
        // Anbudsinställningar
        const ai = p.anbudsinstallningar as Record<string, unknown> | null
        if (ai) {
          setAnbudsInst({
            betalningsvillkor: (ai.betalningsvillkor as string) ?? '',
            garanti: (ai.garanti as string) ?? '',
            avtalsvillkor: (ai.avtalsvillkor as string) ?? '',
            forbehall: (ai.forbehall as string[]) ?? [],
            ingar_ej: (ai.ingar_ej as string[]) ?? [],
            forutsattningar: (ai.forutsattningar as string[]) ?? [],
            giltighetstid: (ai.giltighetstid as string) ?? '30 dagar',
            fragor_till_kund: (ai.fragor_till_kund as string[]) ?? [],
            ovriga_instruktioner: (ai.ovriga_instruktioner as string) ?? '',
          })
        }
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
        webbadress: webbadress || null,
        företagsbeskrivning: företagsbeskrivning || null,
        referensprojekt,
        kontaktpersoner,
        anbudsinstallningar: anbudsInst,
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

              {/* Kontaktpersoner / Anbudsansvariga */}
              <SectionCard title="Kontaktpersoner">
                <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 16 }}>
                  Lägg till personer som kan signera anbud. Vid generering av anbud väljer du vem som ska stå som kontaktperson.
                </p>

                {kontaktpersoner.map((kp, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between"
                    style={{
                      padding: '10px 14px',
                      marginBottom: 6,
                      borderRadius: 8,
                      background: 'var(--navy)',
                      border: '1px solid var(--navy-border)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{kp.namn}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
                        {kp.roll}{kp.epost ? ` · ${kp.epost}` : ''}{kp.telefon ? ` · ${kp.telefon}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => setKontaktpersoner(prev => prev.filter((_, j) => j !== i))}
                      style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                    >
                      Ta bort
                    </button>
                  </div>
                ))}

                {visaKontaktForm ? (
                  <div
                    style={{
                      background: 'var(--navy)',
                      border: '1px dashed var(--yellow)',
                      borderRadius: 8,
                      padding: '14px 16px',
                      marginTop: 8,
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={labelStyle}>Namn *</label>
                        <input style={inputStyle} value={nyKontakt.namn} onChange={e => setNyKontakt(prev => ({ ...prev, namn: e.target.value }))} placeholder="Anna Andersson" />
                      </div>
                      <div>
                        <label style={labelStyle}>Roll / titel</label>
                        <input style={inputStyle} value={nyKontakt.roll} onChange={e => setNyKontakt(prev => ({ ...prev, roll: e.target.value }))} placeholder="VD, Projektledare, Montör..." />
                      </div>
                      <div>
                        <label style={labelStyle}>E-post</label>
                        <input style={inputStyle} value={nyKontakt.epost} onChange={e => setNyKontakt(prev => ({ ...prev, epost: e.target.value }))} placeholder="anna@elfirma.se" />
                      </div>
                      <div>
                        <label style={labelStyle}>Telefon</label>
                        <input style={inputStyle} value={nyKontakt.telefon} onChange={e => setNyKontakt(prev => ({ ...prev, telefon: e.target.value }))} placeholder="070-xxx xx xx" />
                      </div>
                    </div>
                    <div className="flex gap-3" style={{ marginTop: 10 }}>
                      <Button
                        onClick={() => {
                          if (!nyKontakt.namn.trim()) return
                          setKontaktpersoner(prev => [...prev, nyKontakt])
                          setNyKontakt({ namn: '', roll: '', epost: '', telefon: '' })
                          setVisaKontaktForm(false)
                        }}
                        disabled={!nyKontakt.namn.trim()}
                        style={{ background: 'var(--yellow)', color: 'var(--navy)', fontWeight: 700, fontSize: 12 }}
                      >
                        Lägg till
                      </Button>
                      <Button onClick={() => setVisaKontaktForm(false)} variant="outline" style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)', fontSize: 12 }}>
                        Avbryt
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setVisaKontaktForm(true)}
                    style={{
                      width: '100%',
                      marginTop: 8,
                      padding: '10px',
                      borderRadius: 8,
                      border: '1px dashed var(--navy-border)',
                      background: 'transparent',
                      color: 'var(--yellow)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Lägg till kontaktperson
                  </button>
                )}
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
                  <div>
                    <label style={labelStyle}>Webbadress</label>
                    <input style={inputStyle} value={webbadress} onChange={e => setWebbadress(e.target.value)} placeholder="www.elfirma.se" />
                  </div>
                  <div className="col-span-2">
                    <label style={labelStyle}>Kort företagsbeskrivning</label>
                    <textarea
                      value={företagsbeskrivning}
                      onChange={e => setFöretagsbeskrivning(e.target.value)}
                      rows={3}
                      placeholder="Beskriv ert företag i 2-3 meningar. T.ex. typ av uppdrag, geografiskt område, specialkompetens. Används i anbud."
                      style={{ ...inputStyle, resize: 'none' }}
                    />
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

              {/* Referensprojekt */}
              <SectionCard title="Referensprojekt">
                <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 16 }}>
                  Referensprojekt matchas automatiskt mot krav som "minst X referensuppdrag av liknande art".
                </p>

                {referensprojekt.length === 0 && !visaRefForm && (
                  <p style={{ fontSize: 13, color: 'var(--slate)', fontStyle: 'italic', marginBottom: 12 }}>
                    Inga referensprojekt tillagda ännu.
                  </p>
                )}

                {/* Lista befintliga */}
                {referensprojekt.map((ref, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--navy)',
                      border: '1px solid var(--navy-border)',
                      borderRadius: 10,
                      padding: '14px 18px',
                      marginBottom: 8,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{ref.projektnamn}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted-custom)' }}>
                          {ref.beställare}{ref.datum ? ` · ${ref.datum}` : ''}{ref.typ ? ` · ${ref.typ}` : ''}{ref.värde ? ` · ${ref.värde} kr` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => setReferensprojekt(prev => prev.filter((_, j) => j !== i))}
                        style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                      >
                        Ta bort
                      </button>
                    </div>
                    {ref.beskrivning && (
                      <p style={{ fontSize: 12, color: 'var(--soft)', marginTop: 6, lineHeight: 1.5 }}>
                        {ref.beskrivning}
                      </p>
                    )}
                    {ref.kontaktperson && (
                      <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 6 }}>
                        Kontakt: {ref.kontaktperson}
                        {ref.kontakt_telefon ? ` · ${ref.kontakt_telefon}` : ''}
                        {ref.kontakt_epost ? ` · ${ref.kontakt_epost}` : ''}
                      </div>
                    )}
                  </div>
                ))}

                {/* Formulär för nytt referensprojekt */}
                {visaRefForm ? (
                  <div
                    style={{
                      background: 'var(--navy)',
                      border: '1px dashed var(--yellow)',
                      borderRadius: 10,
                      padding: '16px 18px',
                      marginTop: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)', marginBottom: 12 }}>Nytt referensprojekt</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label style={labelStyle}>Projektnamn *</label>
                        <input style={inputStyle} value={nyttRef.projektnamn} onChange={e => setNyttRef(prev => ({ ...prev, projektnamn: e.target.value }))} placeholder="T.ex. BRF Solbacken — elrenovering" />
                      </div>
                      <div>
                        <label style={labelStyle}>Beställare / kund</label>
                        <input style={inputStyle} value={nyttRef.beställare} onChange={e => setNyttRef(prev => ({ ...prev, beställare: e.target.value }))} placeholder="BRF Solbacken" />
                      </div>
                      <div>
                        <label style={labelStyle}>Typ av uppdrag</label>
                        <select
                          value={nyttRef.typ}
                          onChange={e => setNyttRef(prev => ({ ...prev, typ: e.target.value }))}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          <option value="">Välj typ...</option>
                          <option value="Elcentralsbyte">Elcentralsbyte</option>
                          <option value="Stamrenovering">Stamrenovering</option>
                          <option value="Laddinfrastruktur">Laddinfrastruktur</option>
                          <option value="Solceller">Solceller</option>
                          <option value="Belysning">Belysning</option>
                          <option value="Nyinstallation">Nyinstallation</option>
                          <option value="Brandlarm">Brandlarm</option>
                          <option value="Service/underhåll">Service/underhåll</option>
                          <option value="Övrigt">Övrigt</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Datum utfört</label>
                        <input style={inputStyle} type="month" value={nyttRef.datum} onChange={e => setNyttRef(prev => ({ ...prev, datum: e.target.value }))} />
                      </div>
                      <div>
                        <label style={labelStyle}>Värde (kr, valfritt)</label>
                        <input style={inputStyle} type="number" value={nyttRef.värde} onChange={e => setNyttRef(prev => ({ ...prev, värde: e.target.value }))} placeholder="500000" />
                      </div>
                      <div className="col-span-2">
                        <label style={labelStyle}>Beskrivning</label>
                        <textarea
                          value={nyttRef.beskrivning}
                          onChange={e => setNyttRef(prev => ({ ...prev, beskrivning: e.target.value }))}
                          rows={2}
                          placeholder="Kort beskrivning av uppdraget..."
                          style={{ ...inputStyle, resize: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Kontaktperson</label>
                        <input style={inputStyle} value={nyttRef.kontaktperson} onChange={e => setNyttRef(prev => ({ ...prev, kontaktperson: e.target.value }))} placeholder="Namn" />
                      </div>
                      <div>
                        <label style={labelStyle}>Telefon</label>
                        <input style={inputStyle} value={nyttRef.kontakt_telefon} onChange={e => setNyttRef(prev => ({ ...prev, kontakt_telefon: e.target.value }))} placeholder="070-xxx xx xx" />
                      </div>
                      <div className="col-span-2">
                        <label style={labelStyle}>E-post</label>
                        <input style={inputStyle} value={nyttRef.kontakt_epost} onChange={e => setNyttRef(prev => ({ ...prev, kontakt_epost: e.target.value }))} placeholder="kontakt@example.se" />
                      </div>
                    </div>
                    <div className="flex gap-3" style={{ marginTop: 12 }}>
                      <Button
                        onClick={() => {
                          if (!nyttRef.projektnamn.trim()) return
                          setReferensprojekt(prev => [...prev, nyttRef])
                          setNyttRef({ projektnamn: '', beställare: '', kontaktperson: '', kontakt_epost: '', kontakt_telefon: '', beskrivning: '', typ: '', datum: '', värde: '' })
                          setVisaRefForm(false)
                        }}
                        disabled={!nyttRef.projektnamn.trim()}
                        style={{ background: 'var(--yellow)', color: 'var(--navy)', fontWeight: 700 }}
                      >
                        Lägg till
                      </Button>
                      <Button
                        onClick={() => setVisaRefForm(false)}
                        variant="outline"
                        style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)' }}
                      >
                        Avbryt
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setVisaRefForm(true)}
                    style={{
                      width: '100%',
                      marginTop: 8,
                      padding: '10px',
                      borderRadius: 8,
                      border: '1px dashed var(--navy-border)',
                      background: 'transparent',
                      color: 'var(--yellow)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Lägg till referensprojekt
                  </button>
                )}
              </SectionCard>

              {/* Anbudsinställningar */}
              <SectionCard title="Anbudsinställningar">
                <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 16, lineHeight: 1.5 }}>
                  Ställ in dina standardvillkor <strong style={{ color: 'var(--yellow)' }}>en gång</strong> — sedan används de automatiskt i alla framtida anbud. Du behöver aldrig fylla i detta igen.
                </p>

                {/* Betalningsvillkor */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Betalningsvillkor</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 48, resize: 'vertical' }}
                    value={anbudsInst.betalningsvillkor}
                    onChange={e => setAnbudsInst(prev => ({ ...prev, betalningsvillkor: e.target.value }))}
                    placeholder="T.ex. 30 dagar netto, eller 30% vid beställning, 70% vid slutbesiktning"
                  />
                </div>

                {/* Garanti */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Garanti</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 48, resize: 'vertical' }}
                    value={anbudsInst.garanti}
                    onChange={e => setAnbudsInst(prev => ({ ...prev, garanti: e.target.value }))}
                    placeholder="T.ex. 2 år på utfört arbete, tillverkarens garanti på material"
                  />
                </div>

                {/* Avtalsvillkor */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Avtalsvillkor / standardkontrakt</label>
                  <input
                    style={inputStyle}
                    value={anbudsInst.avtalsvillkor}
                    onChange={e => setAnbudsInst(prev => ({ ...prev, avtalsvillkor: e.target.value }))}
                    placeholder="T.ex. AB 04, ABT 06, EL 19 eller AFF 09"
                  />
                  <p style={{ fontSize: 10, color: 'var(--slate)', marginTop: 4 }}>
                    AB 04 (B2B entreprenaD) · ABT 06 (totalentreprenad) · EL 19 (konsument) · AFF 09 (service)
                  </p>
                </div>

                {/* Giltighetstid */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Giltighetstid för anbud</label>
                  <input
                    style={inputStyle}
                    value={anbudsInst.giltighetstid}
                    onChange={e => setAnbudsInst(prev => ({ ...prev, giltighetstid: e.target.value }))}
                    placeholder="30 dagar"
                  />
                </div>

                {/* Listor */}
                <ListEditor
                  label="Standardförbehåll"
                  items={anbudsInst.forbehall}
                  onChange={v => setAnbudsInst(prev => ({ ...prev, forbehall: v }))}
                  placeholder="T.ex. Force majeure förlänger leveranstiden"
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                />
                <ListEditor
                  label="Ingår ej (standard)"
                  items={anbudsInst.ingar_ej}
                  onChange={v => setAnbudsInst(prev => ({ ...prev, ingar_ej: v }))}
                  placeholder="T.ex. Målning/tapetsering efter installation"
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                />
                <ListEditor
                  label="Förutsättningar (standard)"
                  items={anbudsInst.forutsattningar}
                  onChange={v => setAnbudsInst(prev => ({ ...prev, forutsattningar: v }))}
                  placeholder="T.ex. Normal arbetstid vardagar 07-16"
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                />
                <ListEditor
                  label="Standardfrågor till kund"
                  items={anbudsInst.fragor_till_kund}
                  onChange={v => setAnbudsInst(prev => ({ ...prev, fragor_till_kund: v }))}
                  placeholder="T.ex. Finns ritningar över befintliga installationer?"
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                />

                {/* Övriga instruktioner */}
                <div style={{ marginBottom: 0 }}>
                  <label style={labelStyle}>Övriga instruktioner / tonalitet</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                    value={anbudsInst.ovriga_instruktioner}
                    onChange={e => setAnbudsInst(prev => ({ ...prev, ovriga_instruktioner: e.target.value }))}
                    placeholder="T.ex. Vi skriver professionellt men vänligt. Nämn alltid att vi är auktoriserade elinstallatörer."
                  />
                </div>
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

function ListEditor({ label, items, onChange, placeholder, inputStyle, labelStyle }: {
  label: string
  items: string[]
  onChange: (v: string[]) => void
  placeholder: string
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
}) {
  const [nytt, setNytt] = useState('')
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--soft)', padding: '4px 0' }}>• {item}</span>
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex gap-2" style={{ marginTop: 4 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={nytt}
          onChange={e => setNytt(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => {
            if (e.key === 'Enter' && nytt.trim()) {
              onChange([...items, nytt.trim()])
              setNytt('')
            }
          }}
        />
        <button
          onClick={() => { if (nytt.trim()) { onChange([...items, nytt.trim()]); setNytt('') } }}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            background: 'var(--yellow-glow)',
            border: '1px solid rgba(245,196,0,0.3)',
            color: 'var(--yellow)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          +
        </button>
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
