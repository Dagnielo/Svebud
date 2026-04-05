'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AnbudsUppladdning from '@/components/AnbudsUppladdning'
import GranskningSida from '@/components/GranskningSida'
import SnabboffertVy, { type SnabbMoment } from '@/components/SnabboffertVy'
import RotKalkyl from '@/components/RotKalkyl'
import ForanmalanTracker from '@/components/ForanmalanTracker'
import KvalitetsPanel from '@/components/KvalitetsPanel'
import KalkylVy, { type KalkylMoment } from '@/components/KalkylVy'
import type { KvalitetsResultat } from '@/lib/kvalitetsagent'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { DOKUMENT_CSS, EXPORT_HTML_HEAD, EXPORT_HTML_FOOT } from '@/lib/dokument-style'
import { hämtaAnbudsläge, bedömningsVisning } from '@/lib/verdict'

type Inskickning = {
  datum: string
  version: number
  kommentar?: string
  utkast?: string
}

type ProjektData = {
  id: string
  namn: string
  beskrivning: string | null
  jämförelse_status: string
  rekommendation_status: string
  rekommendation: unknown
  kravmatchning: unknown
  analys_komplett: boolean | null
  pipeline_status: string
  tilldelning_status: string | null
  anbudsutkast: string | null
  anbudsutkast_redigerat: string | null
  deadline: string | null
  skickat_datum: string | null
  inskickningar: Inskickning[] | null
  uppdaterad: string | null
}

type AnbudRad = { id: string; filnamn: string; extraktion_status: string; skapad: string; rå_text: string | null; storage_path: string | null }
type LoggRad = { id: string; steg: string; status: string; meddelande: string | null; skapad: string }

const stegLabels = ['Dokument', 'Analys & Bedömning', 'Anbud & Skicka']

function getAktivtSteg(p: ProjektData): number {
  if (p.pipeline_status === 'inskickat' || p.pipeline_status === 'tilldelning') return 3
  if (p.rekommendation_status === 'klar') return 3
  if (p.jämförelse_status === 'klar') return 2
  return 1
}

export default function ProjektSida({ params }: { params: Promise<{ projektId: string }> }) {
  const { projektId } = use(params)
  const [projekt, setProjekt] = useState<ProjektData | null>(null)
  const [anbud, setAnbud] = useState<AnbudRad[]>([])
  const [logg, setLogg] = useState<LoggRad[]>([])
  const [loading, setLoading] = useState(true)
  const [analysLaddar, setAnalysLaddar] = useState(false)
  const [anbudLaddar, setAnbudLaddar] = useState(false)
  const [utkast, setUtkast] = useState('')
  const [kontaktpersoner, setKontaktpersoner] = useState<Array<{ namn: string; roll: string; epost: string; telefon: string }>>([])
  const [valdKontakt, setValdKontakt] = useState<number>(0)
  const [företagsNamn, setFöretagsNamn] = useState('')
  const [utkastLaddat, setUtkastLaddat] = useState(false)
  const [genSteg, setGenSteg] = useState(0)
  const [kundFrågor, setKundFrågor] = useState<string[] | null>(null)
  const [nyFråga, setNyFråga] = useState('')
  const KONTAKT_MARKÖR = '<!-- SVEBUD_KONTAKT -->'
  const kontaktInfogad = utkast.includes(KONTAKT_MARKÖR)
  const [följebrev, setFöljebrev] = useState<string | null>(null)
  const [följebrevLaddat, setFöljebrevLaddat] = useState(false)
  const [sparar, setSparar] = useState(false)
  const [kalkylMoment, setKalkylMoment] = useState<KalkylMoment[] | null>(null)
  const [rotData, setRotData] = useState<{ rotBelopp: number; kundBetalar: number }>({ rotBelopp: 0, kundBetalar: 0 })
  const [analysTyp, setAnalysTyp] = useState<'formell' | 'snabb' | null>(null)
  const [snabbMoment, setSnabbMoment] = useState<SnabbMoment[] | null>(null)
  const [expanderadDok, setExpanderadDok] = useState<string | null>(null)
  const [visaHistorik, setVisaHistorik] = useState(false)
  const [skickaKommentar, setSkickaKommentar] = useState('')
  const [kvalitet, setKvalitet] = useState<KvalitetsResultat | null>(null)
  const [kvalitetLaddar, setKvalitetLaddar] = useState(false)
  const [expanderadVersion, setExpanderadVersion] = useState<number | null>(null)
  const [förhandsgranskning, setFörhandsgranskning] = useState(false)
  const [aktivTab, setAktivTab] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function hämta() {
    const { data: p } = await supabase.from('projekt').select('*').eq('id', projektId).single()
    if (p) {
      const pd = p as unknown as ProjektData
      setProjekt(pd)
      setUtkast(pd.anbudsutkast_redigerat ?? pd.anbudsutkast ?? '')
      setUtkastLaddat(true)
      // Detektera analystyp
      const jr = (p as Record<string, unknown>).jämförelse_resultat as Record<string, unknown> | null
      if (jr?.analystyp === 'snabb') setAnalysTyp('snabb')
      else if (jr && !jr.analystyp) setAnalysTyp('formell')
      // Initiera följebrev från sparad data
      const rek = (p as Record<string, unknown>).rekommendation as Record<string, unknown> | null
      if (rek?.följebrev && följebrev === null) {
        setFöljebrev(rek.följebrev as string)
        setFöljebrevLaddat(true)
      }

      // Initiera kundfrågor från analys
      const km = (p as Record<string, unknown>).kravmatchning as Record<string, unknown> | null
      if (km?.frågor_till_kund && kundFrågor === null) {
        setKundFrågor(km.frågor_till_kund as string[])
      }
    }
    const { data: a } = await supabase.from('anbud').select('*').eq('projekt_id', projektId).order('skapad', { ascending: false })
    if (a) setAnbud(a as unknown as AnbudRad[])
    const anbudIds = (a ?? []).map((x: Record<string, unknown>) => x.id as string)
    if (anbudIds.length > 0) {
      const { data: l } = await supabase.from('extraktion_log').select('*').in('anbud_id', anbudIds).order('skapad', { ascending: false }).limit(10)
      if (l) setLogg(l as unknown as LoggRad[])
    }
    // Hämta kontaktpersoner från profilen
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profilData } = await supabase.from('profiler').select('*').eq('id', authUser.id).single()
      if (profilData) {
        const kp = (profilData as Record<string, unknown>).kontaktpersoner as typeof kontaktpersoner
        if (kp && Array.isArray(kp)) setKontaktpersoner(kp)
        setFöretagsNamn(((profilData as Record<string, unknown>).företag as string) ?? '')
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    hämta()
    const interval = setInterval(hämta, 15000)
    return () => clearInterval(interval)
  }, [projektId])

  // Sätt rätt tab automatiskt baserat på steg (måste vara före early returns)
  useEffect(() => {
    if (aktivTab === null && projekt) {
      const steg = getAktivtSteg(projekt)
      if (steg >= 3) setAktivTab('anbud')
      else if (steg === 2) setAktivTab('analys')
      else setAktivTab('dokument')
    }
  }, [projekt, aktivTab])

  // Auto-save följebrev med debounce
  useEffect(() => {
    if (!följebrevLaddat || följebrev === null) return
    const t = setTimeout(async () => {
      const { data: p } = await supabase.from('projekt').select('rekommendation').eq('id', projektId).single()
      const befintlig = (p as Record<string, unknown>)?.rekommendation as Record<string, unknown> ?? {}
      await supabase.from('projekt').update({
        rekommendation: { ...befintlig, följebrev },
      }).eq('id', projektId)
    }, 1500)
    return () => clearTimeout(t)
  }, [följebrev, följebrevLaddat])

  // Auto-save kalkylmoment med debounce
  useEffect(() => {
    if (!snabbMoment || snabbMoment.length === 0) return
    const t = setTimeout(async () => {
      const totArbete = snabbMoment.reduce((s, m) => s + m.timmar * m.timpris, 0)
      const totMaterial = snabbMoment.reduce((s, m) => s + m.materialkostnad, 0)
      const total = totArbete + totMaterial
      const { data: p } = await supabase.from('projekt').select('rekommendation').eq('id', projektId).single()
      const befintlig = (p as Record<string, unknown>)?.rekommendation as Record<string, unknown> ?? {}
      await supabase.from('projekt').update({
        rekommendation: {
          ...befintlig,
          kalkyl: {
            moment: snabbMoment,
            totalt_arbete: totArbete,
            totalt_material: totMaterial,
            totalbelopp: total,
            moms: Math.round(total * 0.25),
            totalt_inkl_moms: total + Math.round(total * 0.25),
          },
        },
      }).eq('id', projektId)
    }, 2000)
    return () => clearTimeout(t)
  }, [snabbMoment])

  async function körAnalys() {
    setAktivTab('analys')
    setAnalysLaddar(true)
    try {
      const res = await fetch('/api/anbud/extrahera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projektId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Analysfel: ${data.fel ?? `HTTP ${res.status}`}`)
      }
    } catch (err) {
      alert(`Nätverksfel: ${err instanceof Error ? err.message : 'Okänt fel'}`)
    }
    await hämta()
    setAnalysLaddar(false)
  }

  async function körGranskning() {
    setKvalitetLaddar(true)
    try {
      const res = await fetch(`/api/projekt/${projektId}/granska`, { method: 'POST' })
      if (res.ok) {
        const { resultat } = await res.json()
        setKvalitet(resultat)
      }
    } catch { /* tyst */ }
    setKvalitetLaddar(false)
  }

  async function körAnbudsGenerering() {
    setAnbudLaddar(true)
    setGenSteg(1)
    // Om snabboffert: spara justerade moment som kalkyl-data på projektet
    if (analysTyp === 'snabb' && snabbMoment) {
      const totArbete = snabbMoment.reduce((s, m) => s + m.timmar * m.timpris, 0)
      const totMaterial = snabbMoment.reduce((s, m) => s + m.materialkostnad, 0)
      const total = totArbete + totMaterial
      await supabase.from('projekt').update({
        rekommendation: {
          ...(projekt?.rekommendation as Record<string, unknown> ?? {}),
          kalkyl: {
            moment: snabbMoment,
            totalt_arbete: totArbete,
            totalt_material: totMaterial,
            totalbelopp: total,
            moms: Math.round(total * 0.25),
            totalt_inkl_moms: total + Math.round(total * 0.25),
          },
        },
      }).eq('id', projektId)
    }
    // Spara ROT-data synkront innan generering (direkt via Supabase)
    if (rotData.rotBelopp > 0) {
      await supabase.from('projekt').update({
        rot_aktiverat: true,
        rot_belopp: rotData.rotBelopp,
        rot_kund_betalar: rotData.kundBetalar,
      }).eq('id', projektId)
    }

    // Spara vald kontaktperson på projektet
    if (kontaktpersoner.length > 0) {
      const kp = kontaktpersoner[valdKontakt]
      await supabase.from('projekt').update({
        rekommendation: {
          ...(projekt?.rekommendation as Record<string, unknown> ?? {}),
          kontaktperson_anbud: kp,
        },
      }).eq('id', projektId)
    }
    setGenSteg(2)
    // Simulera steg-progression medan API:t arbetar
    const stegTimer = setInterval(() => {
      setGenSteg(prev => prev < 5 ? prev + 1 : prev)
    }, 4000)
    await fetch(`/api/projekt/${projektId}/rekommendation`, { method: 'POST' })
    clearInterval(stegTimer)
    setGenSteg(6)
    await hämta()
    setAnbudLaddar(false)
    setGenSteg(0)
    setAktivTab('anbud')
  }

  // Auto-save utkast med debounce — bara efter initial laddning
  useEffect(() => {
    if (!utkastLaddat || !utkast) return
    const t = setTimeout(async () => {
      setSparar(true)
      await supabase.from('projekt').update({ anbudsutkast_redigerat: utkast }).eq('id', projektId)
      setSparar(false)
    }, 1500)
    return () => clearTimeout(t)
  }, [utkast, utkastLaddat])

  async function markeraSomSkickat(kommentar?: string) {
    const nu = new Date().toISOString()
    const { data: p } = await supabase.from('projekt').select('*').eq('id', projektId).single()
    const befintliga = ((p as Record<string, unknown>)?.inskickningar as Inskickning[]) ?? []
    const nyVersion = befintliga.length + 1
    const nyaInskickningar: Inskickning[] = [...befintliga, {
      datum: nu,
      version: nyVersion,
      utkast: utkast,
      ...(kommentar ? { kommentar } : {}),
    }]

    await supabase.from('projekt').update({
      pipeline_status: 'inskickat',
      skickat_datum: nu,
      inskickningar: nyaInskickningar,
    }).eq('id', projektId)
    await hämta()
  }

  async function uppdateraTilldelning(status: string) {
    await supabase.from('projekt').update({ pipeline_status: 'tilldelning', tilldelning_status: status, tilldelning_datum: new Date().toISOString() }).eq('id', projektId)
    await hämta()
  }

  async function raderaDokument(anbudId: string, storagePath: string | null) {
    if (!confirm('Vill du radera detta dokument?')) return
    // Ta bort loggar
    await supabase.from('extraktion_log').delete().eq('anbud_id', anbudId)
    // Ta bort fil från storage
    if (storagePath) {
      await supabase.storage.from('anbudsdokument').remove([storagePath])
    }
    // Ta bort anbud-raden
    await supabase.from('anbud').delete().eq('id', anbudId)
    // Uppdatera lokalt
    setAnbud(prev => prev.filter(a => a.id !== anbudId))
  }

  function kopieraText() {
    navigator.clipboard.writeText(utkast)
    alert('Kopierat till urklipp!')
  }

  function byggKalkylHtml() {
    // Undvik dubbel kalkyl — om utkastet redan har en kalkylsektion, lägg inte till en till
    if (utkast && /##\s*kalkyl/i.test(utkast)) return ''
    const mom = kalkylMoment ?? (rekData?.kalkyl as Record<string, unknown>)?.moment as KalkylMoment[] ?? []
    if (mom.length === 0) return ''
    const totArbete = mom.reduce((s, m) => s + m.timmar * m.timpris, 0)
    const totMaterial = mom.reduce((s, m) => s + m.materialkostnad, 0)
    const totExkl = totArbete + totMaterial
    const moms = Math.round(totExkl * 0.25)
    const totInkl = totExkl + moms
    const rotSektion = rotData.rotBelopp > 0
      ? `<h2>Prissammanfattning med skattereduktion</h2>
<table><thead><tr><th>Post</th><th style="text-align:right">Belopp</th></tr></thead><tbody>
<tr><td>Totalt inkl. moms</td><td style="text-align:right">${totInkl.toLocaleString('sv-SE')} kr</td></tr>
<tr><td>Skattereduktion</td><td style="text-align:right">-${rotData.rotBelopp.toLocaleString('sv-SE')} kr</td></tr>
<tr><td><strong>Kunden betalar</strong></td><td style="text-align:right"><strong>${rotData.kundBetalar.toLocaleString('sv-SE')} kr</strong></td></tr>
</tbody></table>
<p style="font-size:11px;color:#666"><em>Avdraget begärs av oss hos Skatteverket efter utfört och betalt arbete.
Kunden ansvarar för att de uppfyller Skatteverkets villkor för skattereduktion.</em></p>`
      : ''

    return `<h2>Kalkyl</h2>
<table>
<thead><tr><th>Moment</th><th style="text-align:right">Timmar</th><th style="text-align:right">Timpris</th><th style="text-align:right">Material</th><th style="text-align:right">Belopp</th></tr></thead>
<tbody>
${mom.map(m => `<tr><td>${m.beskrivning}</td><td style="text-align:right">${m.timmar}</td><td style="text-align:right">${m.timpris.toLocaleString('sv-SE')} kr</td><td style="text-align:right">${m.materialkostnad.toLocaleString('sv-SE')} kr</td><td style="text-align:right"><strong>${(m.timmar * m.timpris + m.materialkostnad).toLocaleString('sv-SE')} kr</strong></td></tr>`).join('\n')}
</tbody>
<tfoot>
<tr style="border-top:2px solid #0E1B2E"><td colspan="3"></td><td style="text-align:right;padding:8px 14px;color:#666">Arbete</td><td style="text-align:right;padding:8px 14px;font-weight:600">${totArbete.toLocaleString('sv-SE')} kr</td></tr>
<tr><td colspan="3"></td><td style="text-align:right;padding:4px 14px;color:#666">Material</td><td style="text-align:right;padding:4px 14px;font-weight:600">${totMaterial.toLocaleString('sv-SE')} kr</td></tr>
<tr><td colspan="3"></td><td style="text-align:right;padding:4px 14px;color:#666">Exkl. moms</td><td style="text-align:right;padding:4px 14px;font-weight:600">${totExkl.toLocaleString('sv-SE')} kr</td></tr>
<tr><td colspan="3"></td><td style="text-align:right;padding:4px 14px;color:#666">Moms 25%</td><td style="text-align:right;padding:4px 14px;font-weight:600">${moms.toLocaleString('sv-SE')} kr</td></tr>
<tr style="background:#0E1B2E;color:#fff"><td colspan="3"></td><td style="text-align:right;padding:12px 14px;font-weight:700">Totalt inkl. moms</td><td style="text-align:right;padding:12px 14px;font-size:16px;font-weight:800">${totInkl.toLocaleString('sv-SE')} kr</td></tr>
</tfoot>
</table>
${rotSektion}`
  }

  function mdTillHtml(md: string) {
    const raw = marked.parse(md, { async: false }) as string
    return DOMPurify.sanitize(raw)
  }

  function exporteraSomPdf() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(EXPORT_HTML_HEAD.replace('<title>Anbud</title>', `<title>Anbud - ${projekt?.namn}</title>`))
    win.document.write(mdTillHtml(utkast))
    win.document.write(byggKalkylHtml())
    win.document.write(EXPORT_HTML_FOOT)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  function exporteraSomWord() {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
body{font-family:Calibri,sans-serif;line-height:1.6;color:#1a1a2e;max-width:780px;margin:0 auto;padding:40px}
h1{font-size:18pt;font-weight:800;border-bottom:3pt solid #F5C400;padding-bottom:8pt;color:#0E1B2E}
h2{font-size:14pt;font-weight:700;border-bottom:1pt solid #e0e0e0;padding-bottom:4pt;margin-top:24pt;color:#0E1B2E}
h3{font-size:12pt;font-weight:700;color:#1E2F45}
table{border-collapse:collapse;width:100%;margin:12pt 0}
th{background:#0E1B2E;color:#fff;font-size:9pt;text-transform:uppercase;letter-spacing:0.5pt;padding:8pt 10pt;text-align:left}
td{border-bottom:1pt solid #eef0f2;padding:7pt 10pt}
tr:nth-child(even){background:#f8f9fb}
strong{font-weight:700;color:#0E1B2E}
hr{border:none;border-top:1pt solid #e0e0e0}
</style></head>
<body>${mdTillHtml(utkast)}${byggKalkylHtml()}</body></html>`

    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `anbud_${projekt?.namn?.replace(/[^a-z0-9åäö]/gi, '_') ?? 'utkast'}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <div className="animate-pulse" style={{ color: 'var(--muted-custom)' }}>Laddar projekt...</div>
      </div>
    )
  }

  if (!projekt) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <div style={{ color: 'var(--red)' }}>Projektet hittades inte</div>
      </div>
    )
  }

  const aktivtSteg = getAktivtSteg(projekt)

  const kravmatch = projekt.kravmatchning as Record<string, unknown> | null
  const anbudsläge = hämtaAnbudsläge(kravmatch)
  const bedömning = anbudsläge ? bedömningsVisning(anbudsläge) : null
  const rekData = projekt.rekommendation as Record<string, unknown> | null

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)' }}>
      {/* Header */}
      <div className="flex items-center gap-4" style={{ background: 'var(--navy-mid)', borderBottom: '1px solid var(--navy-border)', padding: '20px 32px' }}>
        <button onClick={() => router.push('/dashboard')} style={{ fontSize: 13, color: 'var(--muted-custom)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Pipeline</button>
        <div className="flex-1">
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{projekt.namn}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginTop: 1 }}>{projekt.beskrivning ?? ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Deadline */}
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 12 }}>📅</span>
            {!projekt.deadline && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--yellow)', marginRight: 4 }}>
                Sätt deadline →
              </span>
            )}
            <input
              type="date"
              value={projekt.deadline ?? ''}
              onChange={async (e) => {
                const val = e.target.value || null
                setProjekt(prev => prev ? { ...prev, deadline: val } : prev)
                await supabase.from('projekt').update({ deadline: val }).eq('id', projektId)
              }}
              style={{
                background: 'var(--navy)',
                border: projekt.deadline ? '1px solid var(--navy-border)' : '1px dashed var(--yellow)',
                borderRadius: 6,
                color: projekt.deadline ? 'var(--white)' : 'var(--yellow)',
                fontSize: 12,
                padding: '4px 8px',
                cursor: 'pointer',
              }}
            />
          </div>

          {bedömning && (
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 6,
              background: bedömning.bgFärg,
              color: bedömning.färg,
            }}>
              {bedömning.kort} {(kravmatch as Record<string, unknown>)?.match_procent ? `${(kravmatch as Record<string, unknown>).match_procent}%` : ''}
            </span>
          )}
        </div>
      </div>

      {/* 3-stegs stepper */}
      <div style={{ padding: '24px 32px 0', marginBottom: 16 }}>
        <div className="flex items-stretch">
          {stegLabels.map((label, i) => {
            const nr = i + 1
            const done = aktivtSteg > nr
            const active = aktivtSteg === nr
            const isLast = i === stegLabels.length - 1
            const tabMap = ['dokument', 'analys', 'anbud']
            return (
              <div key={label} className="flex-1 relative">
                <button onClick={() => setAktivTab(tabMap[i])} className="flex flex-col items-center w-full" style={{ padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div className="flex items-center justify-center relative z-[2]" style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: `2px solid ${done ? 'var(--green)' : active ? 'var(--yellow)' : 'var(--steel)'}`,
                    background: done ? 'var(--green)' : active ? 'var(--yellow-glow)' : 'var(--navy-mid)',
                    color: done ? 'var(--navy)' : active ? 'var(--yellow)' : 'var(--muted-custom)',
                    fontSize: 14, fontWeight: 800, boxShadow: active ? '0 0 0 4px var(--yellow-glow)' : 'none', transition: 'all 0.2s',
                  }}>
                    {nr}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, marginTop: 8, textAlign: 'center', color: done ? 'var(--green)' : active ? 'var(--yellow)' : 'var(--muted-custom)' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 10, marginTop: 2, color: done ? 'var(--green)' : active ? 'var(--soft)' : 'var(--slate)' }}>
                    {done ? 'Klart ✓' : active ? '← Du är här' : ''}
                  </span>
                </button>
                {!isLast && (
                  <div className="absolute z-[1]" style={{ top: 20, left: 'calc(50% + 20px)', right: 'calc(-50% + 20px)', height: 2, background: done ? 'var(--green)' : 'var(--steel)' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Instruktionsruta — baseras på vilken flik man tittar på */}
        <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10, background: 'var(--yellow-glow)', border: '1px solid rgba(245,196,0,0.3)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 18 }}>{aktivTab === 'dokument' ? '📎' : aktivTab === 'analys' ? '📊' : '📋'}</span>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>
                {aktivTab === 'dokument' && 'Steg 1: Ladda upp förfrågningsunderlaget'}
                {aktivTab === 'analys' && 'Steg 2: Analys, kalkyl och bedömning'}
                {aktivTab === 'anbud' && 'Steg 3: Granska anbudsutkast, justera och skicka'}
              </div>
            </div>
            {aktivTab === 'dokument' && anbud.length > 0 && (
              <Button onClick={körAnalys} disabled={analysLaddar} style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 12, fontWeight: 700, padding: '6px 14px', flexShrink: 0 }}>
                {analysLaddar ? '⏳ Analyserar...' : '🔍 Analysera förfrågan →'}
              </Button>
            )}
          </div>

          {/* Checklista — vad kan man göra i detta steg */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(245,196,0,0.15)' }}>
            {aktivTab === 'dokument' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-1" style={{ fontSize: 12 }}>
                <div style={{ color: anbud.length > 0 ? 'var(--green)' : 'var(--muted-custom)' }}>
                  {anbud.length > 0 ? '✅' : '○'} Ladda upp dokument (PDF, Word, Excel)
                </div>
                <div style={{ color: 'var(--muted-custom)' }}>
                  ○ Eller klistra in text/mail
                </div>
                <div style={{ color: projekt.jämförelse_status === 'klar' ? 'var(--green)' : 'var(--muted-custom)' }}>
                  {projekt.jämförelse_status === 'klar' ? '✅' : '○'} Analysera förfrågan
                </div>
                <div style={{ color: 'var(--slate)', fontSize: 11 }}>
                  AI läser dokumenten och matchar mot er profil
                </div>
              </div>
            )}
            {aktivTab === 'analys' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-1" style={{ fontSize: 12 }}>
                <div style={{ color: 'var(--green)' }}>
                  ✅ Granska AI:ns analys och bedömning
                </div>
                <div style={{ color: 'var(--muted-custom)' }}>
                  ○ Justera moment, timmar och materialpriser
                </div>
                <div style={{ color: 'var(--muted-custom)' }}>
                  ○ Aktivera ROT/Grön teknik om tillämpligt
                </div>
                <div style={{ color: 'var(--muted-custom)' }}>
                  ○ Välj kontaktperson och generera anbud
                </div>
              </div>
            )}
            {aktivTab === 'anbud' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-1" style={{ fontSize: 12 }}>
                <div style={{ color: utkast ? 'var(--green)' : 'var(--muted-custom)' }}>
                  {utkast ? '✅' : '○'} Granska och redigera anbudsutkastet
                </div>
                <div style={{ color: 'var(--muted-custom)' }}>
                  ○ Förhandsgranska det färdiga dokumentet
                </div>
                <div style={{ color: 'var(--muted-custom)' }}>
                  ○ Infoga kontaktperson
                </div>
                <div style={{ color: 'var(--muted-custom)' }}>
                  ○ Förbered mail, ladda ner PDF och skicka
                </div>
                <div style={{ color: (projekt.pipeline_status === 'inskickat' || projekt.pipeline_status === 'tilldelning') ? 'var(--green)' : 'var(--muted-custom)' }}>
                  {(projekt.pipeline_status === 'inskickat' || projekt.pipeline_status === 'tilldelning') ? '✅' : '○'} Markera som skickat
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content + sidebar */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 0 }}>
        <div style={{ padding: '0 32px 32px', borderRight: '1px solid var(--navy-border)' }}>
          <Tabs value={aktivTab ?? 'dokument'} onValueChange={setAktivTab}>
            <TabsList className="hidden">
              <TabsTrigger value="dokument">Dokument</TabsTrigger>
              <TabsTrigger value="analys">Analys</TabsTrigger>
              <TabsTrigger value="anbud">Anbud</TabsTrigger>
            </TabsList>

            {/* TAB 1: Dokument */}
            <TabsContent value="dokument">
              <div className="space-y-4">
                <AnbudsUppladdning projektId={projektId} onUppladdat={() => hämta()} />
                {anbud.length > 0 && (
                  <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="flex items-center gap-2.5" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Uppladdade dokument ({anbud.length})</span>
                      <span className="ml-auto font-mono" style={{ fontSize: 10, fontWeight: 800, background: 'var(--green-bg)', color: 'var(--green)', padding: '3px 8px', borderRadius: 5 }}>
                        {anbud.length} uppladdade ✓
                      </span>
                    </div>
                    <div style={{ padding: '12px 18px' }}>
                      {anbud.map(a => (
                        <div key={a.id} style={{ borderBottom: '1px solid rgba(36,54,80,0.3)' }}>
                          <div className="flex items-center gap-2" style={{ padding: '8px 0' }}>
                            <div
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                              onClick={() => a.rå_text && setExpanderadDok(expanderadDok === a.id ? null : a.id)}
                              style={{ fontSize: 13 }}
                            >
                              <span style={{ color: 'var(--blue-accent)' }}>📄</span>
                              <span className="flex-1">{a.filnamn}</span>
                              {a.rå_text ? (
                                <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
                                  {expanderadDok === a.id ? '▲ Dölj text' : '▼ Visa text'}
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, color: 'var(--slate)', fontStyle: 'italic' }}>
                                  PDF — läses direkt av AI
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => raderaDokument(a.id, a.storage_path)}
                              style={{
                                fontSize: 12,
                                color: 'var(--red)',
                                background: 'var(--red-bg)',
                                border: '1px solid rgba(255,77,77,0.3)',
                                borderRadius: 6,
                                cursor: 'pointer',
                                padding: '3px 8px',
                                flexShrink: 0,
                              }}
                            >
                              Radera
                            </button>
                          </div>
                          {expanderadDok === a.id && a.rå_text && (
                            <div
                              style={{
                                padding: '12px 14px',
                                marginBottom: 8,
                                borderRadius: 8,
                                background: 'var(--navy)',
                                border: '1px solid var(--navy-border)',
                                fontSize: 12,
                                lineHeight: 1.7,
                                color: 'var(--soft)',
                                whiteSpace: 'pre-wrap',
                                maxHeight: 400,
                                overflowY: 'auto',
                                fontFamily: 'var(--font-mono), monospace',
                              }}
                            >
                              {a.rå_text}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Analys & GO/NO-GO eller Snabboffert */}
            <TabsContent value="analys">
              {analysTyp === 'snabb' ? (
                <>
                  <SnabboffertVy projektId={projektId} onMomentChange={setSnabbMoment} />
                  {snabbMoment && (
                    <RotKalkyl
                      arbeteExMoms={snabbMoment.reduce((s, m) => s + m.timmar * m.timpris, 0)}
                      materialExMoms={snabbMoment.reduce((s, m) => s + m.materialkostnad, 0)}
                      projektId={projektId}
                      onRotChange={(rotBelopp, kundBetalar) => setRotData({ rotBelopp, kundBetalar })}
                    />
                  )}

                  {/* Frågor till kund — redigerbara */}
                  {(kundFrågor ?? []).length > 0 && (
                    <div
                      style={{
                        background: 'var(--navy-mid)',
                        border: '1px solid rgba(245,196,0,0.3)',
                        borderRadius: 12,
                        padding: '16px 24px',
                        marginTop: 16,
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 16 }}>❓</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>
                            Frågor att ställa till kunden
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const text = (kundFrågor ?? []).map((f, i) => `${i + 1}. ${f}`).join('\n')
                            navigator.clipboard.writeText(text)
                          }}
                          style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'var(--yellow-glow)', border: '1px solid rgba(245,196,0,0.3)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
                        >
                          📋 Kopiera alla
                        </button>
                      </div>

                      {(kundFrågor ?? []).map((fråga, i) => (
                        <div key={i} className="flex items-start gap-2" style={{ marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--slate)', marginTop: 6, flexShrink: 0 }}>{i + 1}.</span>
                          <input
                            value={fråga}
                            onChange={e => setKundFrågor(prev => (prev ?? []).map((f, j) => j === i ? e.target.value : f))}
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              borderRadius: 6,
                              background: 'var(--navy)',
                              border: '1px solid var(--navy-border)',
                              color: 'var(--soft)',
                              fontSize: 12,
                              lineHeight: 1.5,
                            }}
                          />
                          <button
                            onClick={() => setKundFrågor(prev => (prev ?? []).filter((_, j) => j !== i))}
                            style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, flexShrink: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      {/* Lägg till ny fråga */}
                      <div className="flex gap-2" style={{ marginTop: 8 }}>
                        <input
                          value={nyFråga}
                          onChange={e => setNyFråga(e.target.value)}
                          placeholder="Lägg till egen fråga..."
                          onKeyDown={e => {
                            if (e.key === 'Enter' && nyFråga.trim()) {
                              setKundFrågor(prev => [...(prev ?? []), nyFråga.trim()])
                              setNyFråga('')
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'var(--navy)',
                            border: '1px dashed var(--navy-border)',
                            color: 'var(--white)',
                            fontSize: 12,
                          }}
                        />
                        <button
                          onClick={() => {
                            if (nyFråga.trim()) {
                              setKundFrågor(prev => [...(prev ?? []), nyFråga.trim()])
                              setNyFråga('')
                            }
                          }}
                          style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'none', border: '1px solid var(--yellow)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                        >
                          + Lägg till
                        </button>
                      </div>

                      <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 10 }}>
                        Kopiera och skicka till kunden innan du genererar anbudet. Ladda sedan upp kundens svar som dokument i steg 1 och kör om analysen för en bättre kalkyl.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <GranskningSida projektId={projektId} externtScanning={analysLaddar} />
              )}
              {projekt.jämförelse_status === 'klar' && (
                <div style={{ marginTop: 16 }}>
                  {anbudLaddar ? (
                    <GenererarVy steg={genSteg} />
                  ) : (
                    <div
                      style={{
                        background: 'var(--navy-mid)',
                        border: '1px solid var(--navy-border)',
                        borderRadius: 12,
                        padding: '28px 24px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{utkast ? '🔄' : '📋'}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                        {utkast ? 'Generera nytt anbud' : 'Redo att generera anbud'}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginBottom: 16, maxWidth: 440, margin: '0 auto 16px' }}>
                        {utkast
                          ? 'Om du justerat priser eller lagt till moment kan du generera ett nytt anbudsutkast. Det ersätter det nuvarande.'
                          : 'AI:n skapar ett komplett anbudsutkast baserat på analysen och er företagsprofil. Du kan redigera utkastet innan du skickar.'}
                      </p>

                      <Button onClick={körAnbudsGenerering} style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 14, fontWeight: 700, padding: '12px 32px' }}>
                        {utkast ? '🔄 Generera nytt anbud →' : 'Generera anbudsutkast →'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Anbud & Skicka */}
            <TabsContent value="anbud">
              {/* Laddningsvy — visas alltid under generering */}
              {anbudLaddar && utkast && (
                <div style={{ marginBottom: 16 }}>
                  <GenererarVy steg={genSteg} />
                </div>
              )}

              {!utkast ? (
                <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '32px 24px', textAlign: 'center' }}>
                  {anbudLaddar ? (
                    <GenererarVy steg={genSteg} />
                  ) : (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                        {projekt.jämförelse_status === 'klar' ? 'Redo att generera anbud' : 'Analysera förfrågan först'}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginBottom: 16 }}>
                        {projekt.jämförelse_status === 'klar'
                          ? 'AI:n skapar ett komplett anbudsutkast. Du kan redigera innan du skickar.'
                          : 'Gå till steg 1 (Dokument), ladda upp filer och tryck "Analysera förfrågan".'}
                      </p>
                      {projekt.jämförelse_status === 'klar' && (
                        <Button onClick={körAnbudsGenerering} style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 14, fontWeight: 700, padding: '12px 32px' }}>
                          Generera anbudsutkast →
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Kalkyl — visa bara vid formell analys (snabboffert har redigerbar kalkyl i Tab 2) */}
                  {analysTyp !== 'snabb' && (
                    <>
                      <KalkylVy kalkyl={rekData?.kalkyl as Record<string, unknown> | undefined} onChange={setKalkylMoment} />
                      <RotKalkyl
                        arbeteExMoms={
                          (kalkylMoment ?? ((rekData?.kalkyl as Record<string, unknown>)?.moment as KalkylMoment[]) ?? [])
                            .reduce((s, m) => s + m.timmar * m.timpris, 0)
                        }
                        materialExMoms={
                          (kalkylMoment ?? ((rekData?.kalkyl as Record<string, unknown>)?.moment as KalkylMoment[]) ?? [])
                            .reduce((s, m) => s + m.materialkostnad, 0)
                        }
                        projektId={projektId}
                        onRotChange={(rotBelopp, kundBetalar) => setRotData({ rotBelopp, kundBetalar })}
                      />
                    </>
                  )}

                  {/* ROT-kalkyl för snabboffert finns nu i Tab 2 (SnabboffertVy) */}

                  {/* Info-text om kalkyl-justering */}
                  {analysTyp === 'snabb' && (
                    <div
                      className="flex items-center gap-2"
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        background: 'var(--navy-mid)',
                        border: '1px solid var(--navy-border)',
                        fontSize: 12,
                        color: 'var(--muted-custom)',
                      }}
                    >
                      <span>💡</span>
                      <span>
                        Vill du justera priser eller moment? Gå tillbaka till{' '}
                        <button onClick={() => setAktivTab('analys')} style={{ color: 'var(--yellow)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600, fontSize: 12 }}>
                          Analys & Bedömning
                        </button>
                        {' '}och generera ett nytt anbud.
                      </span>
                    </div>
                  )}

                  {/* Redigerbart utkast */}
                  <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>📋 Anbudsutkast (redigerbart)</span>
                      <div className="flex items-center gap-2">
                        {sparar && (
                          <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>Sparar...</span>
                        )}
                        <Button
                          onClick={() => setFörhandsgranskning(!förhandsgranskning)}
                          variant="outline"
                          style={{
                            fontSize: 12,
                            borderColor: förhandsgranskning ? 'var(--yellow)' : 'var(--navy-border)',
                            color: förhandsgranskning ? 'var(--yellow)' : 'var(--soft)',
                            background: förhandsgranskning ? 'var(--yellow-glow)' : 'transparent',
                          }}
                        >
                          {förhandsgranskning ? '✏️ Redigera' : '👁 Förhandsgranska'}
                        </Button>
                        <Button onClick={kopieraText} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--soft)' }}>📋 Kopiera text</Button>
                        <Button onClick={körGranskning} disabled={kvalitetLaddar} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--soft)' }}>
                          {kvalitetLaddar ? '⏳ Granskar...' : '🔍 Granska'}
                        </Button>
                        <Button onClick={körAnbudsGenerering} disabled={anbudLaddar} variant="outline" style={{ fontSize: 12, borderColor: 'var(--yellow)', color: 'var(--yellow)' }}>
                          🔄 Generera nytt anbud
                        </Button>
                        {projekt.uppdaterad && (
                          <span style={{ fontSize: 10, color: 'var(--slate)', alignSelf: 'center' }}>
                            Senast genererat: {new Date(projekt.uppdaterad).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} kl {new Date(projekt.uppdaterad).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {förhandsgranskning ? (
                      <div
                        style={{ background: '#fff', minHeight: 500 }}
                        dangerouslySetInnerHTML={{
                          __html: `<style>${DOKUMENT_CSS}</style>
                          <div class="dokument">
                            ${mdTillHtml(utkast)}
                            ${byggKalkylHtml()}
                          </div>`
                        }}
                      />
                    ) : (
                      <textarea
                        value={utkast}
                        onChange={e => setUtkast(e.target.value)}
                        style={{ width: '100%', minHeight: 500, padding: 18, background: 'var(--navy)', color: 'var(--soft)', border: 'none', fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-mono), monospace', resize: 'vertical' }}
                      />
                    )}
                  </div>

                  {/* Kontaktperson att infoga i anbudet */}
                  {kontaktpersoner.length > 0 && (
                    <div
                      style={{
                        background: 'var(--navy-mid)',
                        border: '1px solid var(--navy-border)',
                        borderRadius: 12,
                        padding: '16px 20px',
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>✍ Kontaktperson i anbudet</span>
                        <button
                          onClick={() => {
                            if (kontaktInfogad) {
                              // Ta bort kontaktperson från utkastet
                              setUtkast(prev => prev.replace(new RegExp(`\\n*${KONTAKT_MARKÖR}[\\s\\S]*$`), ''))
                            } else {
                              const kp = kontaktpersoner[valdKontakt]
                              const kontaktText = `\n\n${KONTAKT_MARKÖR}\n---\n\nMed vänliga hälsningar,\n\n**${kp.namn}**\n${kp.roll ? `${kp.roll}\n` : ''}${kp.epost ? `${kp.epost}\n` : ''}${kp.telefon ? `${kp.telefon}\n` : ''}`
                              setUtkast(prev => prev + kontaktText)
                            }
                          }}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: kontaktInfogad ? 'var(--navy)' : 'var(--yellow)',
                            background: kontaktInfogad ? 'var(--green)' : 'var(--yellow-glow)',
                            border: `1px solid ${kontaktInfogad ? 'var(--green)' : 'rgba(245,196,0,0.3)'}`,
                            borderRadius: 6,
                            padding: '4px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          {kontaktInfogad ? '✅ Infogad — ta bort' : 'Infoga i anbudet'}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={valdKontakt}
                          onChange={e => setValdKontakt(Number(e.target.value))}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'var(--navy)',
                            border: '1px solid var(--navy-border)',
                            color: 'var(--white)',
                            fontSize: 12,
                          }}
                        >
                          {kontaktpersoner.map((kp, i) => (
                            <option key={i} value={i}>{kp.namn} — {kp.roll}</option>
                          ))}
                        </select>
                      </div>
                      {/* Förhandsvisning */}
                      <div
                        style={{
                          marginTop: 8,
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: 'var(--navy)',
                          fontSize: 12,
                          color: 'var(--soft)',
                          lineHeight: 1.5,
                        }}
                      >
                        <strong>{kontaktpersoner[valdKontakt]?.namn}</strong>
                        {kontaktpersoner[valdKontakt]?.roll && <span style={{ color: 'var(--muted-custom)' }}> · {kontaktpersoner[valdKontakt].roll}</span>}
                        <br />
                        {kontaktpersoner[valdKontakt]?.epost && <span>{kontaktpersoner[valdKontakt].epost}</span>}
                        {kontaktpersoner[valdKontakt]?.epost && kontaktpersoner[valdKontakt]?.telefon && <span style={{ color: 'var(--slate)' }}> · </span>}
                        {kontaktpersoner[valdKontakt]?.telefon && <span>{kontaktpersoner[valdKontakt].telefon}</span>}
                      </div>
                    </div>
                  )}

                  {/* Kvalitetsgranskning */}
                  <KvalitetsPanel
                    projektId={projektId}
                    resultat={kvalitet}
                    onGranska={körGranskning}
                    laddar={kvalitetLaddar}
                  />


                  {/* Ladda ner anbudsutkast */}
                  <div
                    style={{
                      background: 'var(--navy-mid)',
                      border: '1px solid var(--navy-border)',
                      borderRadius: 12,
                      padding: '16px 20px',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📄 Ladda ner anbudsutkast</div>
                    <div className="flex gap-3">
                      <button
                        onClick={exporteraSomPdf}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', background: 'var(--navy)', border: '1px solid var(--navy-border)', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}
                      >
                        📄 PDF
                      </button>
                      <button
                        onClick={exporteraSomWord}
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', background: 'var(--navy)', border: '1px solid var(--navy-border)', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}
                      >
                        📝 Word
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 8 }}>
                      Ladda ner för att bifoga i mail eller skriva ut.
                    </p>
                  </div>

                  {/* Förbered mail till kund */}
                  <div
                    style={{
                      background: 'var(--navy-mid)',
                      border: '1px solid var(--navy-border)',
                      borderRadius: 12,
                      padding: '20px 24px',
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>📧 Förbered mail till kund</div>
                        <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 2 }}>
                          Kopiera ämnesrad och följebrev — klistra in i ditt eget mailprogram och bifoga PDF:en.
                        </p>
                      </div>
                    </div>

                    {/* Ämnesrad */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 4, display: 'block' }}>
                        Ämnesrad
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="mail-amne"
                          readOnly
                          value={`Anbud: ${projekt.namn} — ${företagsNamn ?? 'Elfirma'}`}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'var(--navy)',
                            border: '1px solid var(--navy-border)',
                            color: 'var(--white)',
                            fontSize: 13,
                          }}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById('mail-amne') as HTMLInputElement
                            navigator.clipboard.writeText(el.value)
                          }}
                          style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'var(--yellow-glow)', border: '1px solid rgba(245,196,0,0.3)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}
                        >
                          Kopiera
                        </button>
                      </div>
                    </div>

                    {/* Följebrev */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 4, display: 'block' }}>
                        Följebrev
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          id="följebrev-textarea"
                          rows={8}
                          value={följebrev ?? (() => {
                            const kp = kontaktpersoner[valdKontakt]
                            const kravmatch = projekt.kravmatchning as Record<string, unknown> | null
                            const beställare = kravmatch?.beställare as string ?? kravmatch?.kontaktperson as string ?? ''
                            const defaultText = `Hej${beställare ? ` ${beställare}` : ''},

Tack för förfrågan! Bifogat finner ni vårt anbud avseende ${projekt.namn}.

Anbudet är giltigt i 30 dagar. Tveka inte att höra av er om ni har frågor eller önskar förtydliganden.

Med vänliga hälsningar,
${kp?.namn ?? ''}${kp?.roll ? `\n${kp.roll}` : ''}
${företagsNamn ?? ''}${kp?.telefon ? `\nTel: ${kp.telefon}` : ''}${kp?.epost ? `\n${kp.epost}` : ''}`
                            return defaultText
                          })()}
                          onChange={e => {
                            setFöljebrev(e.target.value)
                            if (!följebrevLaddat) setFöljebrevLaddat(true)
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'var(--navy)',
                            border: '1px solid var(--navy-border)',
                            color: 'var(--white)',
                            fontSize: 12,
                            lineHeight: 1.6,
                            resize: 'vertical',
                          }}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById('följebrev-textarea') as HTMLTextAreaElement
                            navigator.clipboard.writeText(el?.value ?? '')
                          }}
                          style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'var(--yellow-glow)', border: '1px solid rgba(245,196,0,0.3)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start' }}
                        >
                          Kopiera
                        </button>
                      </div>
                      <p style={{ fontSize: 10, color: 'var(--slate)', marginTop: 4 }}>
                        Redigera följebrevet fritt — det sparas automatiskt.
                      </p>
                    </div>


                  </div>

                  {/* Markera som skickat */}
                  <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-custom)', marginBottom: 4, display: 'block' }}>
                        Kommentar (valfritt)
                      </label>
                      <input
                        value={skickaKommentar}
                        onChange={e => setSkickaKommentar(e.target.value)}
                        placeholder="T.ex. Skickat via e-post till Maria Lindqvist..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'var(--navy)',
                          border: '1px solid var(--navy-border)',
                          color: 'var(--white)',
                          fontSize: 13,
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <Button
                        onClick={() => {
                          markeraSomSkickat(skickaKommentar.trim() || undefined)
                          setSkickaKommentar('')
                        }}
                        style={{ background: 'var(--green)', color: 'var(--navy)', fontSize: 14, padding: '12px 24px' }}
                      >
                        📤 Markera som skickat
                      </Button>
                    </div>
                  </div>

                  {/* Inskickningshistorik */}
                  {(projekt.inskickningar?.length ?? 0) > 0 && (
                    <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '16px 24px' }}>
                      <button
                        onClick={() => setVisaHistorik(!visaHistorik)}
                        className="flex items-center justify-between w-full"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 14 }}>📋</span>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>
                            Inskickningshistorik
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--navy-light)', color: 'var(--muted-custom)', padding: '2px 8px', borderRadius: 20 }}>
                            {projekt.inskickningar?.length ?? 0}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
                          {visaHistorik ? '▲ Dölj' : '▼ Visa'}
                        </span>
                      </button>

                      {visaHistorik && (
                        <div style={{ marginTop: 12 }}>
                          {[...(projekt.inskickningar ?? [])].reverse().map((insk, i) => (
                            <div
                              key={i}
                              style={{
                                marginBottom: 6,
                                borderRadius: 8,
                                background: i === 0 ? 'var(--green-bg)' : 'var(--navy)',
                                border: i === 0 ? '1px solid rgba(0,198,122,0.3)' : '1px solid var(--navy-border)',
                                overflow: 'hidden',
                              }}
                            >
                              <button
                                onClick={() => setExpanderadVersion(expanderadVersion === insk.version ? null : insk.version)}
                                className="flex items-center justify-between w-full"
                                style={{
                                  padding: '10px 14px',
                                  background: 'none',
                                  border: 'none',
                                  cursor: insk.utkast ? 'pointer' : 'default',
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: i === 0 ? 'var(--green)' : 'var(--navy-light)',
                                    color: i === 0 ? 'var(--navy)' : 'var(--muted-custom)',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                  }}>
                                    v{insk.version}
                                  </span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? 'var(--white)' : 'var(--muted-custom)' }}>
                                    {new Date(insk.datum).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    {' kl '}
                                    {new Date(insk.datum).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {i === 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)' }}>Senaste</span>
                                  )}
                                </div>
                                {insk.utkast && (
                                  <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
                                    {expanderadVersion === insk.version ? '▲ Dölj anbud' : '▼ Visa anbud'}
                                  </span>
                                )}
                              </button>
                              {insk.kommentar && (
                                <div style={{ fontSize: 12, color: 'var(--soft)', padding: '0 14px 8px', marginLeft: 36 }}>
                                  💬 {insk.kommentar}
                                </div>
                              )}
                              {expanderadVersion === insk.version && insk.utkast && (
                                <div
                                  style={{
                                    borderTop: '1px solid var(--navy-border)',
                                    background: '#fff',
                                    maxHeight: 500,
                                    overflowY: 'auto',
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: `<style>${DOKUMENT_CSS}</style><div class="dokument">${mdTillHtml(insk.utkast)}</div>`
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tilldelning */}
                  {(projekt.pipeline_status === 'inskickat' || projekt.pipeline_status === 'tilldelning') && (
                    <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: '16px 24px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Hur gick det?</div>
                      <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 10 }}>
                        Markera utfallet. Vid vunnet anbud aktiveras föranmälan-trackern automatiskt.
                      </p>
                      <div className="flex gap-3">
                        <Button onClick={() => uppdateraTilldelning('vunnet')} style={{ background: projekt.tilldelning_status === 'vunnet' ? 'var(--green)' : 'transparent', color: projekt.tilldelning_status === 'vunnet' ? 'var(--navy)' : 'var(--green)', border: '1px solid var(--green)' }}>✅ Vunnet</Button>
                        <Button onClick={() => uppdateraTilldelning('forlorat')} style={{ background: projekt.tilldelning_status === 'forlorat' ? 'var(--red)' : 'transparent', color: projekt.tilldelning_status === 'forlorat' ? 'white' : 'var(--red)', border: '1px solid var(--red)' }}>❌ Förlorat</Button>
                        <Button onClick={() => uppdateraTilldelning('vantar')} style={{ background: projekt.tilldelning_status === 'vantar' ? 'var(--orange)' : 'transparent', color: projekt.tilldelning_status === 'vantar' ? 'var(--navy)' : 'var(--orange)', border: '1px solid var(--orange)' }}>⏳ Väntar</Button>
                      </div>
                    </div>
                  )}

                  {/* Föranmälan-tracker — visas efter tilldelning (vunnet) */}
                  {projekt.tilldelning_status === 'vunnet' && (
                    <ForanmalanTracker projektId={projektId} projektNamn={projekt.namn} />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div style={{ padding: 24 }}>
          <SidePanel title={`Dokument (${anbud.length})`}>
            {anbud.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Inga filer uppladdade</div>
            ) : anbud.map(a => (
              <div key={a.id} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: 'var(--blue-accent)' }}>📄</span>
                <span className="truncate" style={{ color: 'var(--soft)' }}>{a.filnamn}</span>
                <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: a.extraktion_status === 'extraherad' ? 'var(--green)' : 'var(--yellow)' }} />
              </div>
            ))}
          </SidePanel>

          {kravmatch && (
            <SidePanel title="Analys">
              <div style={{ fontSize: 12, color: bedömning?.färg ?? 'var(--muted-custom)', fontWeight: 700, marginBottom: 8 }}>
                {bedömning?.label ?? 'Analyserad'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>{(kravmatch as Record<string, unknown>).sammanfattning as string}</div>
            </SidePanel>
          )}

          <SidePanel title="Aktivitet">
            {logg.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Ingen aktivitet ännu</div>
            ) : logg.slice(0, 5).map(l => (
              <div key={l.id} className="flex gap-2.5" style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 10 }}>
                <span className="font-mono flex-shrink-0" style={{ fontSize: 10, marginTop: 1 }}>{new Date(l.skapad).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ color: 'var(--soft)' }}>{l.meddelande ?? `${l.steg}: ${l.status}`}</span>
              </div>
            ))}
          </SidePanel>

        </div>
      </div>
    </div>
  )
}

const GEN_STEG = [
  { label: 'Förbereder data...', ikon: '📋' },
  { label: 'Analyserar förfrågan...', ikon: '🔍' },
  { label: 'Matchar mot er profil...', ikon: '🏢' },
  { label: 'Bygger kalkyl...', ikon: '🧮' },
  { label: 'Skriver anbudstext...', ikon: '✍️' },
  { label: 'Lägger till villkor och förbehåll...', ikon: '📑' },
  { label: 'Klart!', ikon: '✅' },
]

function GenererarVy({ steg }: { steg: number }) {
  return (
    <div
      style={{
        background: 'var(--navy-mid)',
        border: '2px solid var(--yellow)',
        borderRadius: 12,
        padding: '32px 24px',
      }}
    >
      {/* Spinner */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: '3px solid var(--navy-border)',
            borderTopColor: 'var(--yellow)',
            margin: '0 auto',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>

      <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
        AI genererar ditt anbud
      </div>

      {/* Levande steg-lista */}
      <div style={{ maxWidth: 340, margin: '0 auto' }}>
        {GEN_STEG.slice(0, -1).map((s, i) => {
          const klar = i < steg
          const aktiv = i === steg - 1 || (i === steg && steg > 0)
          return (
            <div
              key={i}
              className="flex items-center gap-3"
              style={{
                padding: '6px 0',
                opacity: klar || aktiv ? 1 : 0.3,
                transition: 'opacity 0.5s',
              }}
            >
              <span style={{ fontSize: 14, width: 24, textAlign: 'center' }}>
                {klar ? '✅' : aktiv ? s.ikon : '○'}
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: aktiv ? 700 : 400,
                color: klar ? 'var(--green)' : aktiv ? 'var(--white)' : 'var(--slate)',
              }}>
                {s.label}
              </span>
              {aktiv && !klar && (
                <span className="animate-pulse" style={{ fontSize: 10, color: 'var(--yellow)', marginLeft: 'auto' }}>
                  pågår...
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-custom)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}
