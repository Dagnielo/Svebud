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
import SidePanel from '@/components/SidePanel'
import AktivitetsLogg, { type LoggRad } from '@/components/AktivitetsLogg'
import ProjektDetaljHeader from '@/components/ProjektDetaljHeader'
import type { KvalitetsResultat } from '@/lib/kvalitetsagent'
import type { ProjektDetalj, Inskickning } from '@/lib/types/projekt'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { DOKUMENT_CSS, EXPORT_HTML_HEAD, EXPORT_HTML_FOOT } from '@/lib/dokument-style'
import { hämtaAnbudsläge, bedömningsVisning } from '@/lib/verdict'
import { posthog } from '@/lib/posthog'
import UtfallsKnappar from '@/components/UtfallsKnappar'

type AnbudRad = { id: string; filnamn: string; extraktion_status: string; skapad: string; rå_text: string | null; storage_path: string | null }

const stegLabels = ['Dokument', 'Analys & Bedömning', 'Anbud & Skicka']

function getAktivtSteg(p: ProjektDetalj): number {
  if (p.pipeline_status === 'inskickat' || p.pipeline_status === 'tilldelning') return 3
  if (p.rekommendation_status === 'klar') return 3
  if (p.jämförelse_status === 'klar') return 2
  return 1
}

export default function ProjektSida({ params }: { params: Promise<{ projektId: string }> }) {
  const { projektId } = use(params)
  const [projekt, setProjekt] = useState<ProjektDetalj | null>(null)
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
  const KALKYL_MARKÖR = '[📊 KALKYL — infogas automatiskt från steg 2]'
  const KONTAKT_MARKÖR = '<!-- SVEBUD_KONTAKT -->'
  const kontaktInfogad = utkast.includes(KONTAKT_MARKÖR)
  const [följebrev, setFöljebrev] = useState<string | null>(null)
  const [följebrevLaddat, setFöljebrevLaddat] = useState(false)
  const [sparar, setSparar] = useState(false)
  const [kalkylMoment, setKalkylMoment] = useState<KalkylMoment[] | null>(null)
  const [rotData, setRotData] = useState<{ rotBelopp: number; kundBetalar: number; aktiverat: boolean; typ?: string }>({ rotBelopp: 0, kundBetalar: 0, aktiverat: false })
  const [analysTyp, setAnalysTyp] = useState<'formell' | 'snabb' | null>(null)
  const [snabbMoment, setSnabbMoment] = useState<SnabbMoment[] | null>(null)
  const [föreslagenRotTyp, setFöreslagenRotTyp] = useState<string | null>(null)
  const [expanderadDok, setExpanderadDok] = useState<string | null>(null)
  const [visaHistorik, setVisaHistorik] = useState(false)
  const [skickaKommentar, setSkickaKommentar] = useState('')
  const [kvalitet, setKvalitet] = useState<KvalitetsResultat | null>(null)
  const [kvalitetLaddar, setKvalitetLaddar] = useState(false)
  const [expanderadVersion, setExpanderadVersion] = useState<number | null>(null)
  const [förhandsgranskning, setFörhandsgranskning] = useState(true)
  const [utkastÖppet, setUtkastÖppet] = useState(false)
  const [aktivTab, setAktivTab] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Strippar kalkyl- och prissammanfattningssektioner från markdown-text
  function strippaMdKalkyl(md: string) {
    return md
      .replace(/\n---\n\n##\s*kalkyl[\s\S]*?(?=\n---\n|$)/i, '')
      .replace(/\n##\s*kalkyl[\s\S]*?(?=\n##\s|$)/i, '')
      .replace(/\n---\n\n##\s*prissammanfattning[\s\S]*?(?=\n---\n|$)/i, '')
      .replace(/\n##\s*prissammanfattning[\s\S]*?(?=\n##\s|$)/i, '')
  }

  async function hämta() {
    const { data: p } = await supabase.from('projekt').select('*').eq('id', projektId).single()
    if (p) {
      const pd = p as unknown as ProjektDetalj
      setProjekt(pd)
      // Strippa AI:ns kalkyl/prissammanfattning + infoga kalkylmarkör
      let rensat = strippaMdKalkyl(pd.anbudsutkast_redigerat ?? pd.anbudsutkast ?? '')
      if (rensat && !rensat.includes(KALKYL_MARKÖR)) {
        const match = rensat.match(/\n##\s*(Betalningsvillkor|Garanti|Standardförbehåll|BETALNINGSVILLKOR|GARANTI)/i)
        if (match?.index !== undefined) {
          rensat = rensat.slice(0, match.index) + '\n\n' + KALKYL_MARKÖR + '\n' + rensat.slice(match.index)
        } else {
          rensat = rensat + '\n\n' + KALKYL_MARKÖR
        }
      }
      setUtkast(rensat)
      setUtkastLaddat(true)
      // Detektera analystyp
      const jr = (p as Record<string, unknown>).jämförelse_resultat as Record<string, unknown> | null
      if (jr?.analystyp === 'snabb') setAnalysTyp('snabb')
      else if (jr && !jr.analystyp) setAnalysTyp('formell')
      // Extrahera ROT-förslag från analysresultat
      if (jr?.rot_tillämpligt !== undefined) {
        setFöreslagenRotTyp(jr.rot_tillämpligt ? (jr.rot_typ as string ?? 'rot') : 'ej_rot')
      }
      // Ladda ROT-data från databasen
      const proj = p as Record<string, unknown>
      if (proj.rot_aktiverat && proj.rot_belopp) {
        setRotData({
          rotBelopp: proj.rot_belopp as number,
          kundBetalar: proj.rot_kund_betalar as number ?? 0,
          aktiverat: true,
          typ: proj.rot_typ as string ?? 'rot',
        })
      }

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

  function byggRotBlock() {
    if (!rotData.aktiverat || rotData.rotBelopp <= 0) return ''
    // Beräkna från AKTUELL kalkyl — inte sparade värden
    const mom = kalkylMoment ?? snabbMoment ?? (rekData?.kalkyl as Record<string, unknown>)?.moment as KalkylMoment[] ?? []
    const totArbete = mom.reduce((s, m) => s + m.timmar * m.timpris, 0)
    const totMaterial = mom.reduce((s, m) => s + m.materialkostnad, 0)
    const totExkl = totArbete + totMaterial
    const totInkl = totExkl + Math.round(totExkl * 0.25)
    const rotBelopp = rotData.rotBelopp
    const kundBetalar = totInkl - rotBelopp
    const typLabels: Record<string, string> = {
      rot: 'ROT-avdrag (30%)',
      gronteknik_laddbox: 'Grön teknik — Laddbox (15%)',
      gronteknik_solceller: 'Grön teknik — Solceller (20%)',
      gronteknik_batteri: 'Grön teknik — Batteri (20%)',
    }
    const typLabel = typLabels[rotData.typ ?? 'rot'] ?? 'Skattereduktion'
    return `<div style="background:#f0fdf4;border:2px solid #00C67A;border-radius:8px;padding:16px 20px;margin:16px 0">
<h3 style="margin:0 0 8px;color:#166534">${typLabel}</h3>
<table style="width:100%;border-collapse:collapse">
<tr><td style="padding:4px 0">Totalt inkl. moms</td><td style="text-align:right;padding:4px 0">${totInkl.toLocaleString('sv-SE')} kr</td></tr>
<tr><td style="padding:4px 0;color:#166534">${typLabel}</td><td style="text-align:right;padding:4px 0;color:#166534">-${rotBelopp.toLocaleString('sv-SE')} kr</td></tr>
<tr style="border-top:2px solid #166534"><td style="padding:8px 0;font-weight:800;font-size:16px">Ni betalar</td><td style="text-align:right;padding:8px 0;font-weight:800;font-size:16px">${kundBetalar.toLocaleString('sv-SE')} kr</td></tr>
</table>
<p style="margin:8px 0 0;font-size:11px;color:#666"><em>Avdraget begärs av oss hos Skatteverket efter utfört och betalt arbete. Kunden ansvarar för att de uppfyller Skatteverkets villkor.</em></p>
</div>`
  }

  // Säkerhetsnät — strippar kalkyl/prissammanfattning om det finns kvar i utkastet
  function utkastUtanKalkyl() {
    return strippaMdKalkyl(utkast)
  }

  function byggKalkylHtml() {
    const mom = kalkylMoment ?? snabbMoment ?? (rekData?.kalkyl as Record<string, unknown>)?.moment as KalkylMoment[] ?? []
    if (mom.length === 0) return ''
    const totArbete = mom.reduce((s, m) => s + m.timmar * m.timpris, 0)
    const totMaterial = mom.reduce((s, m) => s + m.materialkostnad, 0)
    const totExkl = totArbete + totMaterial
    const moms = Math.round(totExkl * 0.25)
    const totInkl = totExkl + moms
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
`
  }

  function mdTillHtml(md: string) {
    const raw = marked.parse(md, { async: false }) as string
    return DOMPurify.sanitize(raw)
  }

  // Bygger komplett anbud-HTML med kalkyl+ROT infogat mitt i dokumentet (före betalningsvillkor/garanti)
  function byggKompletAnbudHtml() {
    const textHtml = mdTillHtml(utkastUtanKalkyl())
    const kalkylRotHtml = byggKalkylHtml() + byggRotBlock()
    if (!kalkylRotHtml) return textHtml
    // Ersätt kalkylmarkören med faktisk kalkyl+ROT
    const markörRegex = /\[📊[^[\]]*steg 2\]/g
    if (markörRegex.test(textHtml)) {
      return textHtml.replace(markörRegex, kalkylRotHtml)
    }
    // Fallback: infoga före betalningsvillkor/garanti
    const infogad = textHtml.replace(
      /(<h[23][^>]*>(?:Betalningsvillkor|Garanti|Standardförbehåll|Förbehåll|BETALNINGSVILLKOR|GARANTI))/i,
      kalkylRotHtml + '$1'
    )
    return infogad !== textHtml ? infogad : textHtml + kalkylRotHtml
  }

  function exporteraSomPdf() {
    const win = window.open('', '_blank')
    if (!win) return
    posthog.capture('anbud_exporterat', { projekt_id: projektId, format: 'pdf' })
    win.document.write(EXPORT_HTML_HEAD.replace('<title>Anbud</title>', `<title>Anbud - ${projekt?.namn}</title>`))
    win.document.write(byggKompletAnbudHtml())
    win.document.write(EXPORT_HTML_FOOT)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  function exporteraSomWord() {
    posthog.capture('anbud_exporterat', { projekt_id: projektId, format: 'word' })
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
body{font-family:Calibri,sans-serif;font-size:11pt;line-height:1.4;color:#1a1a2e;max-width:780px;margin:0 auto;padding:24px}
h1{font-size:14pt;font-weight:800;border-bottom:2pt solid #F5C400;padding-bottom:6pt;color:#0E1B2E}
h2{font-size:12pt;font-weight:700;border-bottom:1pt solid #e0e0e0;padding-bottom:3pt;margin-top:14pt;color:#0E1B2E}
h3{font-size:11pt;font-weight:700;color:#1E2F45}
table{border-collapse:collapse;width:100%;margin:6pt 0}
th{background:#0E1B2E;color:#fff;font-size:8pt;text-transform:uppercase;letter-spacing:0.5pt;padding:5pt 8pt;text-align:left}
td{border-bottom:1pt solid #eef0f2;padding:4pt 8pt}
tr:nth-child(even){background:#f8f9fb}
strong{font-weight:700;color:#0E1B2E}
hr{border:none;border-top:1pt solid #e0e0e0}
</style></head>
<body>${byggKompletAnbudHtml()}</body></html>`

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
  const kundtyp = ((kravmatch?.kundtyp as string | undefined) ?? (kravmatch?.kund_typ as string | undefined)) ?? null
  const matchProcent = (kravmatch?.match_procent as number | undefined) ?? null

  const hanteraDeadlineÄndring = async (val: string | null) => {
    setProjekt(prev => prev ? { ...prev, deadline: val } : prev)
    await supabase.from('projekt').update({ deadline: val }).eq('id', projektId)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)' }}>
      <ProjektDetaljHeader
        projekt={projekt}
        bedömning={bedömning}
        matchProcent={matchProcent}
        aktivTab={aktivTab ?? 'dokument'}
        visaSnabboffert={analysTyp === 'snabb'}
        kundtyp={kundtyp}
        onDeadlineChange={hanteraDeadlineÄndring}
      />

      {/* 3-stegs stepper */}
      <div style={{ padding: '24px 32px 0', marginBottom: 16 }}>
        <div className="flex items-stretch">
          {stegLabels.map((label, i) => {
            const nr = i + 1
            const done = aktivtSteg > nr || (nr === 3 && aktivtSteg === 3 && !!utkast)
            const active = aktivtSteg === nr && !done
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
          {/* Föranmälan-flik — visas bara vid vunnet anbud */}
          {projekt.tilldelning_status === 'vunnet' && (
            <div className="flex items-center" style={{ paddingLeft: 16, marginLeft: 16, borderLeft: '2px solid var(--steel)' }}>
              <button onClick={() => setAktivTab('foranmalan')} className="flex flex-col items-center" style={{ padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                <div className="flex items-center justify-center" style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: `2px solid ${aktivTab === 'foranmalan' ? 'var(--blue-accent, #4A9EFF)' : 'var(--steel)'}`,
                  background: aktivTab === 'foranmalan' ? 'rgba(74,158,255,0.15)' : 'var(--navy-mid)',
                  color: aktivTab === 'foranmalan' ? '#4A9EFF' : 'var(--muted-custom)',
                  fontSize: 16, transition: 'all 0.2s',
                }}>
                  ⚡
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, marginTop: 8, textAlign: 'center', color: aktivTab === 'foranmalan' ? '#4A9EFF' : 'var(--muted-custom)' }}>
                  Föranmälan
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Instruktionsruta — baseras på vilken flik man tittar på */}
        <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10, background: 'var(--yellow-glow)', border: '1px solid rgba(245,196,0,0.3)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 18 }}>{aktivTab === 'dokument' ? '📎' : aktivTab === 'analys' ? '📊' : aktivTab === 'foranmalan' ? '⚡' : '📋'}</span>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)' }}>
                {aktivTab === 'dokument' && 'Steg 1: Ladda upp förfrågningsunderlaget'}
                {aktivTab === 'analys' && 'Steg 2: Analys, kalkyl och bedömning'}
                {aktivTab === 'anbud' && 'Steg 3: Granska anbudsutkast, justera och skicka'}
                {aktivTab === 'foranmalan' && 'Föranmälan — spåra nätbolagets handläggning'}
              </div>
            </div>
            {aktivTab === 'dokument' && anbud.length > 0 && (
              <Button onClick={körAnalys} disabled={analysLaddar} style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 12, fontWeight: 700, padding: '6px 14px', flexShrink: 0 }}>
                {analysLaddar ? '⏳ Analyserar...' : '🔍 Analysera förfrågan →'}
              </Button>
            )}
            {aktivTab === 'analys' && projekt.jämförelse_status === 'klar' && (
              <Button onClick={körAnbudsGenerering} disabled={anbudLaddar} style={{ background: 'var(--yellow)', color: 'var(--navy)', fontSize: 12, fontWeight: 700, padding: '6px 14px', flexShrink: 0 }}>
                {anbudLaddar ? '⏳ Genererar...' : 'Generera anbud →'}
              </Button>
            )}
          </div>

          <p style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(245,196,0,0.15)', fontSize: 12, color: 'var(--soft)' }}>
            {aktivTab === 'dokument' && 'Ladda upp PDF, Word eller Excel — eller klistra in text. AI:n analyserar och matchar mot er profil.'}
            {aktivTab === 'analys' && 'Granska AI:ns analys, justera priser och moment, aktivera avdrag och generera anbudsutkast.'}
            {aktivTab === 'anbud' && 'Förhandsgranska, redigera, ladda ner PDF och markera som skickat.'}
            {aktivTab === 'foranmalan' && 'Följ upp föranmälan, installationsmedgivande och färdiganmälan mot nätbolaget.'}
          </p>
        </div>
      </div>

      {/* Content + sidebar */}
      <div className="grid" style={{ gridTemplateColumns: aktivTab === 'foranmalan' ? '1fr' : '1fr 320px', gap: 0 }}>
        <div style={{ padding: '0 32px 32px', borderRight: '1px solid var(--navy-border)' }}>
          <Tabs value={aktivTab ?? 'dokument'} onValueChange={setAktivTab}>
            <TabsList className="hidden">
              <TabsTrigger value="dokument">Dokument</TabsTrigger>
              <TabsTrigger value="analys">Analys</TabsTrigger>
              <TabsTrigger value="anbud">Anbud</TabsTrigger>
              <TabsTrigger value="foranmalan">Föranmälan</TabsTrigger>
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
                      onRotChange={(rotBelopp, kundBetalar, typ) => setRotData({ rotBelopp, kundBetalar, aktiverat: rotBelopp > 0, typ })}
                      föreslagenTyp={föreslagenRotTyp ?? undefined}
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
              {projekt.jämförelse_status === 'klar' && anbudLaddar && (
                <div style={{ marginTop: 16 }}>
                  <GenererarVy steg={genSteg} />
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
                        onRotChange={(rotBelopp, kundBetalar, typ) => setRotData({ rotBelopp, kundBetalar, aktiverat: rotBelopp > 0, typ })}
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

                  {/* Anbudsutkast — fällbar rullgardin */}
                  <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', borderRadius: 12, overflow: 'hidden' }}>
                    <button
                      onClick={() => setUtkastÖppet(!utkastÖppet)}
                      className="flex items-center justify-between w-full"
                      style={{ padding: '14px 18px', background: 'none', border: 'none', borderBottom: utkastÖppet ? '1px solid var(--navy-border)' : 'none', cursor: 'pointer' }}
                    >
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>📋 Anbudsutkast</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-custom)', marginLeft: 8 }}>Genererat från din analys i steg 2 — öppna för att granska eller redigera</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {sparar && (
                          <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>Sparar...</span>
                        )}
                        {projekt.uppdaterad && (
                          <span style={{ fontSize: 10, color: 'var(--slate)' }}>
                            Genererat {new Date(projekt.uppdaterad).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} kl {new Date(projekt.uppdaterad).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--muted-custom)' }}>
                          {utkastÖppet ? '▲ Dölj' : '▼ Visa'}
                        </span>
                      </div>
                    </button>
                    {/* Förhandsvisning (ihopfällt) — visar toppen av anbudet med fade */}
                    {!utkastÖppet && (
                      <div
                        onClick={() => setUtkastÖppet(true)}
                        style={{ position: 'relative', maxHeight: 150, overflow: 'hidden', cursor: 'pointer' }}
                      >
                        <div
                          style={{ background: '#fff', padding: '12px 18px' }}
                          ref={(el) => {
                            if (!el) return
                            el.innerHTML = `<style>${DOKUMENT_CSS}</style><div class="dokument">${byggKompletAnbudHtml()}</div>`
                          }}
                        />
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                          background: 'linear-gradient(transparent, var(--navy-mid))',
                          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 12,
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)' }}>Klicka för att visa hela anbudet</span>
                        </div>
                      </div>
                    )}
                    {/* Expanderat läge */}
                    {utkastÖppet && (
                      <>
                        <div className="flex items-center gap-2" style={{ padding: '10px 18px', borderBottom: '1px solid var(--navy-border)' }}>
                          <Button
                            onClick={() => setFörhandsgranskning(!förhandsgranskning)}
                            variant="outline"
                            style={{
                              fontSize: 12,
                              borderColor: !förhandsgranskning ? 'var(--yellow)' : 'var(--navy-border)',
                              color: !förhandsgranskning ? 'var(--yellow)' : 'var(--soft)',
                              background: !förhandsgranskning ? 'var(--yellow-glow)' : 'transparent',
                            }}
                          >
                            {förhandsgranskning ? '✏️ Redigera' : '👁 Förhandsgranska'}
                          </Button>
                          <Button onClick={kopieraText} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--soft)' }}>📋 Kopiera text</Button>
                          <Button onClick={körAnbudsGenerering} disabled={anbudLaddar} variant="outline" style={{ fontSize: 12, borderColor: 'var(--yellow)', color: 'var(--yellow)' }}>
                            🔄 Generera nytt
                          </Button>
                        </div>
                        {förhandsgranskning ? (
                          <div
                            style={{ background: '#fff', minHeight: 500 }}
                            ref={(el) => {
                              if (!el) return
                              el.innerHTML = `<style>${DOKUMENT_CSS}</style><div class="dokument">${byggKompletAnbudHtml()}</div>`
                            }}
                          />
                        ) : (
                          <textarea
                            value={utkast}
                            onChange={e => setUtkast(e.target.value)}
                            style={{ width: '100%', minHeight: 500, padding: 18, background: 'var(--navy)', color: 'var(--soft)', border: 'none', fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-mono), monospace', resize: 'vertical' }}
                          />
                        )}
                        <div className="flex justify-center" style={{ padding: '10px 0', borderTop: '1px solid var(--navy-border)' }}>
                          <Button onClick={() => setUtkastÖppet(false)} variant="outline" style={{ fontSize: 12, borderColor: 'var(--navy-border)', color: 'var(--muted-custom)' }}>
                            ▲ Minimera
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Prisöversikt */}
                  {(() => {
                    const mom = kalkylMoment ?? snabbMoment ?? ((rekData?.kalkyl as Record<string, unknown>)?.moment as KalkylMoment[]) ?? []
                    if (mom.length === 0) return null
                    const totArbete = mom.reduce((s, m) => s + m.timmar * m.timpris, 0)
                    const totMaterial = mom.reduce((s, m) => s + m.materialkostnad, 0)
                    const totExkl = totArbete + totMaterial
                    const moms = Math.round(totExkl * 0.25)
                    const totInkl = totExkl + moms
                    const harAvdrag = rotData.aktiverat && rotData.rotBelopp > 0
                    const avdragNamn = harAvdrag
                      ? ({ rot: 'ROT-avdrag (30%)', gronteknik_laddbox: 'Grön teknik — Laddbox (15%)', gronteknik_solceller: 'Grön teknik — Solceller (20%)', gronteknik_batteri: 'Grön teknik — Batteri (20%)' }[rotData.typ ?? 'rot'] ?? 'Skattereduktion')
                      : null
                    return (
                      <div
                        style={{
                          background: 'var(--navy-mid)',
                          border: '1px solid var(--navy-border)',
                          borderRadius: 12,
                          padding: '16px 20px',
                        }}
                      >
                        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>💰 Prisöversikt</span>
                            <span style={{ fontSize: 11, color: 'var(--muted-custom)', marginLeft: 8 }}>Ingår i anbudsutkastet ovan</span>
                          </div>
                          <button
                            onClick={() => setAktivTab('analys')}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--yellow)',
                              background: 'var(--yellow-glow)',
                              border: '1px solid rgba(245,196,0,0.3)',
                              borderRadius: 6,
                              padding: '4px 12px',
                              cursor: 'pointer',
                            }}
                          >
                            Ändra priser i steg 2 →
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 13, color: 'var(--soft)' }}>
                          <span>Arbete ({mom.length} moment)</span>
                          <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono), monospace' }}>{totArbete.toLocaleString('sv-SE')} kr</span>
                          <span>Material</span>
                          <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono), monospace' }}>{totMaterial.toLocaleString('sv-SE')} kr</span>
                          <span>Moms (25%)</span>
                          <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono), monospace' }}>{moms.toLocaleString('sv-SE')} kr</span>
                          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--navy-border)', margin: '4px 0' }} />
                          <span style={{ fontWeight: 700 }}>Totalt inkl. moms</span>
                          <span style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono), monospace' }}>{totInkl.toLocaleString('sv-SE')} kr</span>
                          {harAvdrag && (
                            <>
                              <span style={{ color: 'var(--green)' }}>{avdragNamn}</span>
                              <span style={{ textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--font-mono), monospace' }}>−{rotData.rotBelopp.toLocaleString('sv-SE')} kr</span>
                              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--navy-border)', margin: '4px 0' }} />
                              <span style={{ fontWeight: 700, color: 'var(--yellow)' }}>Kunden betalar</span>
                              <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--yellow)', fontSize: 15, fontFamily: 'var(--font-mono), monospace' }}>{(totInkl - rotData.rotBelopp).toLocaleString('sv-SE')} kr</span>
                            </>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 10, marginBottom: 0 }}>
                          Priserna läggs till automatiskt i anbudet vid export och förhandsgranskning.
                        </p>
                      </div>
                    )
                  })()}

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
                    onGåTillSteg2={() => setAktivTab('analys')}
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
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📄 Ladda ner anbudsutkast</div>
                    <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 0, marginBottom: 12 }}>
                      Färdigt anbud med aktuella priser, kalkyl och eventuella avdrag. Redo att skickas till kund.
                    </p>
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
                      <UtfallsKnappar
                        projekt={{
                          id: projekt.id,
                          tilldelning_status: (projekt.tilldelning_status as 'vunnet' | 'förlorat' | 'vantar' | null) ?? null,
                        }}
                        onChange={hämta}
                      />
                    </div>
                  )}

                </div>
              )}
            </TabsContent>

            {/* TAB 4: Föranmälan — visas bara vid vunnet anbud */}
            <TabsContent value="foranmalan">
              <ForanmalanTracker projektId={projektId} projektNamn={projekt.namn} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar — dölj på föranmälan-fliken */}
        <div style={{ padding: 24, display: aktivTab === 'foranmalan' ? 'none' : 'block' }}>
          <SidePanel title="Dokument" räknare={anbud.length}>
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
            <AktivitetsLogg logg={logg} max={5} />
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

