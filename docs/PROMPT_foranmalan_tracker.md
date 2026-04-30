# Claude Code-prompt: Föranmälan-tracker för Svebud

Klistra in hela detta block i Claude Code och kör.

---

## KONTEXT

Vi bygger en föranmälan-tracker i Svebud (Next.js 15 / Supabase / Resend).
Trackern aktiveras automatiskt när ett projekt markeras som vunnet i pipeline-dashboarden.

Designfärger (matcha befintlig app):
- Bakgrund: #0E1B2E (navy)
- Accent: #F5C400 (gul)
- Grön: #00C67A
- Röd: #FF4D4D
- Font: DM Sans + JetBrains Mono

---

## STEG 1 — Supabase-migration

Kör detta SQL-block i Supabase Dashboard → SQL Editor:

```sql
-- Tabell: föranmälan-projekt
CREATE TABLE IF NOT EXISTS foranmalan_projekt (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id            UUID REFERENCES projekt(id) ON DELETE CASCADE,
  användar_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  jobbtyp               TEXT NOT NULL,
  nätbolag              TEXT,
  kund_namn             TEXT,
  kund_epost            TEXT,
  kund_telefon          TEXT,
  nuvarande_steg        TEXT DEFAULT 'vunnet',
  notifiera_kund        BOOLEAN DEFAULT TRUE,
  skapad                TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE foranmalan_projekt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foranmalan_egna" ON foranmalan_projekt
  FOR ALL USING (användar_id = auth.uid());

-- Tabell: statuslogg (append-only)
CREATE TABLE IF NOT EXISTS foranmalan_steg_logg (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fp_id         UUID REFERENCES foranmalan_projekt(id) ON DELETE CASCADE,
  steg          TEXT NOT NULL,
  kommentar     TEXT,
  notis_skickad BOOLEAN DEFAULT FALSE,
  skapad        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE foranmalan_steg_logg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logg_egna" ON foranmalan_steg_logg
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM foranmalan_projekt fp
      WHERE fp.id = fp_id AND fp.användar_id = auth.uid()
    )
  );

-- Trigger: uppdatera timestamp
CREATE TRIGGER foranmalan_ts
  BEFORE UPDATE ON foranmalan_projekt
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();
```

---

## STEG 2 — Jobbtyper och regeldata

Skapa filen `lib/foranmalan-regler.ts`:

```typescript
// Källreferenser:
// ELNÄT 2025 K punkt 5.9 (gäller fr.o.m. 1 januari 2026)
// https://www.elinstallatoren.se/2026/01/nu-behover-laddbox-och-varmepump-foranmalas-och-godkannas/
// https://elbilsvaruhuset.se/foranmalan-av-laddbox-nya-regler-2026/
// https://www.molndalenergi.se/kunskap/vad-ar-en-foranmalan-och-fardiganmalan

export const FORANMALAN_JOBBTYPER = [
  {
    id: "laddinfrastruktur",
    label: "Laddinfrastruktur (laddbox/laddstolpar)",
    emoji: "⚡",
    kravs: true,
    typiskHandlaggningstid: "5–15 arbetsdagar",
    notering: "Fast monterad laddbox kräver alltid föranmälan per ELNÄT 2025 K §5.9",
    regelLank: "https://elbilsvaruhuset.se/foranmalan-av-laddbox-nya-regler-2026/",
    stegOchHjälp: {
      fore: "Skicka föranmälan via föranmälan.nu eller nätbolagets egna system. Ange effektbehov (kW) och antal laddplatser.",
      medgivande: "Nätbolaget bedömer nätkapacitet. Kan kräva nätförstärkning om kapacitet saknas.",
      fardig: "Skicka färdiganmälan efter installation. Driftsättning får EJ ske innan godkännande."
    }
  },
  {
    id: "solceller",
    label: "Solcellsanläggning",
    emoji: "☀️",
    kravs: true,
    typiskHandlaggningstid: "10–30 arbetsdagar",
    notering: "Kräver även ALP-blankett hos vissa nätbolag. Mätarbyte krävs av nätbolaget.",
    regelLank: "https://www.energimyndigheten.se/fornybart/solelportalen/vilka-rattigheter-och-skyldigheter-har-jag-vid-installation/",
    stegOchHjälp: {
      fore: "Skicka föranmälan med systemstorlek (kWp), växelriktarmodell och installationsadress.",
      medgivande: "Nätbolaget kontrollerar att växelriktaren finns på Energiföretagens Rikta Rätt-lista.",
      fardig: "Efter färdiganmälan byter nätbolaget elmätare (räkna med 1–3 veckor extra)."
    }
  },
  {
    id: "batterilager",
    label: "Batterilager / Energilager",
    emoji: "🔋",
    kravs: true,
    typiskHandlaggningstid: "5–15 arbetsdagar",
    notering: "Kräver att koppling till befintlig solcellsanläggning dokumenteras för att berättiga Grön Teknik-avdrag.",
    regelLank: "https://elbilsvaruhuset.se/foranmalan-av-laddbox-nya-regler-2026/",
    stegOchHjälp: {
      fore: "Ange batterikapacitet (kWh), märkeffekt (kW) och om det kopplas till befintliga solceller.",
      medgivande: "Nätbolaget bekräftar att inmatningssäkringen täcker batteriets maxeffekt.",
      fardig: "Driftsätt aldrig innan godkännande — risk för skador på grannars utrustning."
    }
  },
  {
    id: "varmepump",
    label: "Värmepump (eldriven)",
    emoji: "🌡️",
    kravs: true,
    typiskHandlaggningstid: "3–10 arbetsdagar",
    notering: "Ny per ELNÄT 2025 K — tidigare krävdes föranmälan bara vid säkringshöjning. Nu alltid.",
    regelLank: "https://www.vvsforum.se/2026/01/vad-innebar-nya-reglerna-om-att-foranmala-varmepumpar/",
    stegOchHjälp: {
      fore: "Ange värmepumpens märkeffekt (kW). Kolla om huvudsäkringen behöver höjas.",
      medgivande: "Många nätbolag godkänner snabbt om säkringen räcker. Kontrollera lokala rutiner.",
      fardig: "Skicka färdiganmälan efter driftsättning."
    }
  },
  {
    id: "spabad_bastu",
    label: "Spabad / Bastu med elaggregat",
    emoji: "🛁",
    kravs: true,
    typiskHandlaggningstid: "3–10 arbetsdagar",
    notering: "Namnges explicit i ELNÄT 2025 K §5.9. Bastuaggregat >3,6 kW räknas som väsentlig förändring.",
    regelLank: "https://kinnekulleenergi.se/huvudsakliga-forandringar-allmanna-avtalsvillkoren-1-jan-2026/",
    stegOchHjälp: {
      fore: "Ange aggregatets effekt (kW). Kontrollera om ny grupp behöver dras.",
      medgivande: "Standardärende om befintlig säkring räcker.",
      fardig: "Skicka färdiganmälan efter installation."
    }
  },
  {
    id: "ny_anslutning",
    label: "Ny elanslutning / Nybyggnation",
    emoji: "🏗️",
    kravs: true,
    typiskHandlaggningstid: "20–90 arbetsdagar",
    notering: "Kontakta nätbolaget MINST 6 månader i förväg om kabelgrävning eller nätförstärkning kan krävas.",
    regelLank: "https://www.molndalenergi.se/kunskap/vad-ar-en-foranmalan-och-fardiganmalan",
    stegOchHjälp: {
      fore: "Skicka in tidigt — nätbolaget kan behöva planera kabelgrävning och nätförstärkning.",
      medgivande: "Installationsmedgivande anger anslutningspunkt och tekniska krav.",
      fardig: "Nätbolaget monterar mätare vid färdiganmälan."
    }
  },
  {
    id: "sakringshojning",
    label: "Höjning av huvudsäkring",
    emoji: "🔌",
    kravs: true,
    typiskHandlaggningstid: "3–10 arbetsdagar",
    notering: "Vanligt vid BRF-renoveringar och laddinfrastrukturprojekt. Påverkar nätavgiften.",
    regelLank: "https://www.molndalenergi.se/kunskap/vad-ar-en-foranmalan-och-fardiganmalan",
    stegOchHjälp: {
      fore: "Ange nuvarande säkring (A) och önskad säkring (A).",
      medgivande: "Nätbolaget kontrollerar om ledning och transformator klarar ökad belastning.",
      fardig: "Nätbolaget uppdaterar nätavgiften baserat på ny säkringsstorlek."
    }
  },
  {
    id: "stamrenovering",
    label: "Stamrenovering / Ny elcentral",
    emoji: "🏢",
    kravs: true,
    typiskHandlaggningstid: "10–20 arbetsdagar",
    notering: "BRF-anbud — omfattas av föranmälan om säkring ändras eller matarledning berörs.",
    regelLank: "https://www.molndalenergi.se/kunskap/vad-ar-en-foranmalan-och-fardiganmalan",
    stegOchHjälp: {
      fore: "Ange antal lägenheter, nuvarande och planerad säkring per lägenhet.",
      medgivande: "Nätbolaget bedömer om matarledningen räcker för ny last.",
      fardig: "Etappvis driftsättning — skicka färdiganmälan per etapp om nätbolaget kräver det."
    }
  },
  {
    id: "service_underhall",
    label: "Service / Underhåll / Byte av uttag",
    emoji: "🔧",
    kravs: false,
    typiskHandlaggningstid: null,
    notering: "Kräver INTE föranmälan. Färdiganmälan kan krävas om arbetet påverkar mätarsystemet.",
    regelLank: null,
    stegOchHjälp: null
  }
] as const

export type JobbTypId = typeof FORANMALAN_JOBBTYPER[number]["id"]

export const FORANMALAN_STEG = [
  { id: "vunnet",    label: "Anbud vunnet",              emoji: "🏆", färg: "#F5C400" },
  { id: "fore",      label: "Föranmälan inskickad",      emoji: "📋", färg: "#4A9EFF" },
  { id: "medgivande",label: "Installationsmedgivande",   emoji: "✅", färg: "#4A9EFF" },
  { id: "installation", label: "Installation pågår",     emoji: "🔧", färg: "#4A9EFF" },
  { id: "fardig",    label: "Färdiganmälan inskickad",   emoji: "📨", färg: "#4A9EFF" },
  { id: "klar",      label: "Nätbolag godkänt — Klar",   emoji: "⚡", färg: "#00C67A" },
] as const

export type StegId = typeof FORANMALAN_STEG[number]["id"]

export const STEG_ORDNING: StegId[] = [
  "vunnet", "fore", "medgivande", "installation", "fardig", "klar"
]

export function nästaSteg(nuvarande: StegId): StegId | null {
  const idx = STEG_ORDNING.indexOf(nuvarande)
  if (idx === -1 || idx === STEG_ORDNING.length - 1) return null
  return STEG_ORDNING[idx + 1]
}

export function stegIndex(steg: StegId): number {
  return STEG_ORDNING.indexOf(steg)
}
```

---

## STEG 3 — API-routes

### 3a. Skapa `app/api/foranmalan/route.ts`

POST — skapa nytt föranmälan-projekt (anropas när anbud markeras vunnet):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const body = await req.json()
  const { projekt_id, jobbtyp, nätbolag, kund_namn, kund_epost, kund_telefon } = body

  // Verifiera ägarskap av projektet
  const { data: projekt } = await supabase
    .from('projekt')
    .select('id')
    .eq('id', projekt_id)
    .eq('användar_id', user.id)
    .single()

  if (!projekt) return NextResponse.json({ fel: 'Projekt ej hittat' }, { status: 404 })

  // Skapa föranmälan-projekt
  const { data: fp, error } = await supabase
    .from('foranmalan_projekt')
    .insert({
      projekt_id,
      användar_id: user.id,
      jobbtyp,
      nätbolag,
      kund_namn,
      kund_epost,
      kund_telefon,
      nuvarande_steg: 'vunnet'
    })
    .select()
    .single()

  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  // Logga första steget
  await supabase.from('foranmalan_steg_logg').insert({
    fp_id: fp.id,
    steg: 'vunnet',
    kommentar: 'Anbud markerat som vunnet'
  })

  return NextResponse.json({ fp })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projekt_id = searchParams.get('projekt_id')

  let query = supabase
    .from('foranmalan_projekt')
    .select(`
      *,
      foranmalan_steg_logg(id, steg, kommentar, notis_skickad, skapad)
    `)
    .eq('användar_id', user.id)
    .order('skapad', { ascending: false })

  if (projekt_id) query = query.eq('projekt_id', projekt_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
```

### 3b. Skapa `app/api/foranmalan/[fpId]/steg/route.ts`

POST — uppdatera steg och skicka kundnotis:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { FORANMALAN_STEG, nästaSteg, stegIndex, FORANMALAN_JOBBTYPER } from '@/lib/foranmalan-regler'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  req: NextRequest,
  { params }: { params: { fpId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const { kommentar } = await req.json()
  const { fpId } = params

  // Hämta projektet
  const { data: fp } = await supabase
    .from('foranmalan_projekt')
    .select('*')
    .eq('id', fpId)
    .eq('användar_id', user.id)
    .single()

  if (!fp) return NextResponse.json({ fel: 'Projekt ej hittat' }, { status: 404 })

  const nyttSteg = nästaSteg(fp.nuvarande_steg)
  if (!nyttSteg) return NextResponse.json({ fel: 'Redan på sista steget' }, { status: 400 })

  const stegInfo = FORANMALAN_STEG.find(s => s.id === nyttSteg)
  const jobbInfo = FORANMALAN_JOBBTYPER.find(j => j.id === fp.jobbtyp)

  // Uppdatera steg
  await supabase
    .from('foranmalan_projekt')
    .update({ nuvarande_steg: nyttSteg })
    .eq('id', fpId)

  // Logga
  await supabase.from('foranmalan_steg_logg').insert({
    fp_id: fpId,
    steg: nyttSteg,
    kommentar: kommentar || null,
    notis_skickad: false
  })

  // Skicka kundnotis om aktiverat och kund har epost
  let notisskickad = false
  if (fp.notifiera_kund && fp.kund_epost && stegInfo) {
    const projektInfo = await supabase
      .from('projekt')
      .select('namn')
      .eq('id', fp.projekt_id)
      .single()

    const projektNamn = projektInfo.data?.namn || 'Ditt elprojekt'
    const handlaggningstid = jobbInfo?.typiskHandlaggningstid

    const meddelanden: Record<string, string> = {
      fore: `Vi har nu skickat in föranmälan till ${fp.nätbolag || 'nätbolaget'}. ${handlaggningstid ? `Normal handläggningstid är ${handlaggningstid}.` : ''} Vi meddelar dig så snart installationsmedgivande kommit.`,
      medgivande: `Goda nyheter! ${fp.nätbolag || 'Nätbolaget'} har godkänt föranmälan och utfärdat installationsmedgivande. Vi bokar in installationsdatum inom kort.`,
      installation: `Installationsarbetet har startat. Vi arbetar på att slutföra projektet enligt plan.`,
      fardig: `Installationen är klar! Vi har skickat in färdiganmälan till ${fp.nätbolag || 'nätbolaget'}. De behöver normalt byta elmätare — räkna med 1–5 arbetsdagar.`,
      klar: `Projektet är nu helt klart! ${fp.nätbolag || 'Nätbolaget'} har godkänt allt. Anläggningen är driftsatt.`
    }

    try {
      await resend.emails.send({
        from: process.env.AVSANDARE_EPOST!,
        to: fp.kund_epost,
        subject: `Uppdatering: ${projektNamn} — ${stegInfo.label}`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
            <div style="background: #0E1B2E; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
              <span style="color: #F5C400; font-weight: 800; font-size: 18px;">⚡ SveBud</span>
            </div>
            <h2 style="color: #111; margin-bottom: 8px;">Statusuppdatering</h2>
            <p style="color: #555; margin-bottom: 20px;">${projektNamn}</p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #00C67A; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px;">
              <div style="font-weight: 700; color: #111; margin-bottom: 6px;">
                ${stegInfo.emoji} ${stegInfo.label}
              </div>
              <p style="color: #444; margin: 0; line-height: 1.6;">
                ${meddelanden[nyttSteg] || 'Projektet har uppdaterats.'}
              </p>
            </div>
            
            ${kommentar ? `
            <div style="background: #f9f9f9; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <div style="font-size: 12px; color: #888; margin-bottom: 4px;">NOTERING FRÅN ELFIRMAN</div>
              <p style="color: #444; margin: 0;">${kommentar}</p>
            </div>
            ` : ''}

            <p style="color: #888; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
              Har du frågor? Svara på detta mail så återkommer vi.
            </p>
          </div>
        `
      })
      notisskickad = true

      // Uppdatera logg med notis-status
      await supabase
        .from('foranmalan_steg_logg')
        .update({ notis_skickad: true })
        .eq('fp_id', fpId)
        .eq('steg', nyttSteg)
        .order('skapad', { ascending: false })
        .limit(1)

    } catch (e) {
      console.error('Resend-fel:', e)
    }
  }

  return NextResponse.json({ 
    nyttSteg, 
    notisskickad,
    stegLabel: stegInfo?.label
  })
}
```

---

## STEG 4 — UI-komponent

Skapa `components/ForanmalanTracker.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { FORANMALAN_STEG, STEG_ORDNING, FORANMALAN_JOBBTYPER, nästaSteg, stegIndex } from '@/lib/foranmalan-regler'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { ExternalLink, ChevronRight, Clock, Bell, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

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
  const [kommentar, setKommentar] = useState('')
  const [uppdaterar, setUppdaterar] = useState(false)

  const jobbInfo = FORANMALAN_JOBBTYPER.find(j => j.id === fp?.jobbtyp)
  const nuvarandeStegIndex = fp ? stegIndex(fp.nuvarande_steg as any) : 0
  const nästaStegId = fp ? nästaSteg(fp.nuvarande_steg as any) : null
  const nästaStegInfo = nästaStegId ? FORANMALAN_STEG.find(s => s.id === nästaStegId) : null

  // Beräkna dagar på nuvarande steg
  const dagarPåSteg = () => {
    if (!fp) return 0
    const logg = fp.foranmalan_steg_logg
      .filter(l => l.steg === fp.nuvarande_steg)
      .sort((a, b) => new Date(b.skapad).getTime() - new Date(a.skapad).getTime())
    if (!logg.length) return 0
    const diff = Date.now() - new Date(logg[0].skapad).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
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

  async function uppdateraSteg() {
    if (!fp || !nästaStegId) return
    setUppdaterar(true)
    try {
      const res = await fetch(`/api/foranmalan/${fp.id}/steg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kommentar: kommentar || null })
      })
      const data = await res.json()
      if (data.nyttSteg) {
        toast.success(
          `✅ Uppdaterat till "${data.stegLabel}"${data.notisskickad ? ' · Kundnotis skickad' : ''}`
        )
        setKommentar('')
        setDialogOpen(false)
        hämtaTracker()
      }
    } catch (e) {
      toast.error('Något gick fel')
    } finally {
      setUppdaterar(false)
    }
  }

  if (laddar) return (
    <div className="text-muted-foreground text-sm p-4">Laddar tracker...</div>
  )

  if (!fp) return (
    <Card className="border-dashed">
      <CardContent className="pt-6 text-center">
        <p className="text-muted-foreground text-sm mb-3">
          Aktivera föranmälan-tracker för detta projekt
        </p>
        <Button size="sm" onClick={() => {/* Öppna skapa-dialog */}}>
          + Starta tracker
        </Button>
      </CardContent>
    </Card>
  )

  const dagar = dagarPåSteg()
  const stegFastnat = dagar > 14 && fp.nuvarande_steg !== 'klar'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {jobbInfo?.emoji} Föranmälan — {jobbInfo?.label}
          </CardTitle>
          <Badge variant={fp.nuvarande_steg === 'klar' ? 'default' : 'secondary'}>
            {FORANMALAN_STEG.find(s => s.id === fp.nuvarande_steg)?.label}
          </Badge>
        </div>
        {fp.nätbolag && (
          <p className="text-xs text-muted-foreground mt-1">
            Nätbolag: {fp.nätbolag}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Progress stepper */}
        <div className="relative">
          {/* Linje */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
          <div
            className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500"
            style={{ width: `${(nuvarandeStegIndex / (STEG_ORDNING.length - 1)) * (100 - 4)}%` }}
          />

          <div className="relative flex justify-between">
            {FORANMALAN_STEG.map((steg, i) => {
              const klar = i < nuvarandeStegIndex
              const aktiv = i === nuvarandeStegIndex
              return (
                <div key={steg.id} className="flex flex-col items-center" style={{ width: 60 }}>
                  <div className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs
                    transition-all duration-300 relative z-10 bg-background
                    ${klar ? 'border-primary bg-primary text-primary-foreground' : ''}
                    ${aktiv ? 'border-primary shadow-[0_0_12px_rgba(245,196,0,0.4)]' : ''}
                    ${!klar && !aktiv ? 'border-muted text-muted-foreground' : ''}
                  `}>
                    {klar ? <CheckCircle className="w-4 h-4" /> : steg.emoji}
                  </div>
                  <span className={`
                    text-[9px] text-center mt-1 leading-tight
                    ${aktiv ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                  `}>
                    {steg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Varning om fastnat */}
        {stegFastnat && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
            <Clock className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-700">
                Fastnad i {dagar} dagar
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                Har du hört av {fp.nätbolag || 'nätbolaget'} om detta ärende?
              </p>
            </div>
          </div>
        )}

        {/* Regelinfo för nuvarande steg */}
        {jobbInfo?.stegOchHjälp && fp.nuvarande_steg !== 'klar' && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tips för detta steg
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              {jobbInfo.stegOchHjälp[fp.nuvarande_steg as keyof typeof jobbInfo.stegOchHjälp] || ''}
            </p>
            {jobbInfo.regelLank && (
              <a
                href={jobbInfo.regelLank}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                Läs mer om ELNÄT 2025 K §5.9
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Kund-info */}
        {fp.kund_namn && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bell className="w-3 h-3" />
              <span>Kundnotiser: {fp.notifiera_kund ? fp.kund_epost : 'Avstängda'}</span>
            </div>
          </div>
        )}

        {/* Logg */}
        {fp.foranmalan_steg_logg.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Aktivitetslogg
            </p>
            {[...fp.foranmalan_steg_logg]
              .sort((a, b) => new Date(b.skapad).getTime() - new Date(a.skapad).getTime())
              .slice(0, 4)
              .map(logg => (
                <div key={logg.id} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="font-mono shrink-0">
                    {new Date(logg.skapad).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{FORANMALAN_STEG.find(s => s.id === logg.steg)?.label}</span>
                  {logg.notis_skickad && (
                    <span className="text-green-600 ml-auto">✉ skickad</span>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* Action-knapp */}
        {nästaStegInfo && (
          <Button
            className="w-full"
            onClick={() => setDialogOpen(true)}
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            Uppdatera till: {nästaStegInfo.label}
          </Button>
        )}

        {fp.nuvarande_steg === 'klar' && (
          <div className="text-center py-2">
            <span className="text-green-600 font-semibold text-sm">
              ⚡ Projekt avslutat
            </span>
          </div>
        )}
      </CardContent>

      {/* Dialog för steguppdatering */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nästaStegInfo?.emoji} {nästaStegInfo?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {fp.notifiera_kund && fp.kund_epost && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <Bell className="w-4 h-4 inline mr-1.5" />
                Kundnotis skickas automatiskt till <strong>{fp.kund_epost}</strong>
              </div>
            )}
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Kommentar (valfri — inkluderas i kundnotisen)
              </label>
              <Textarea
                value={kommentar}
                onChange={e => setKommentar(e.target.value)}
                placeholder="T.ex. 'Nätbolaget begärde komplettering om effektbehov. Vi skickar in idag.'"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={uppdateraSteg} disabled={uppdaterar}>
              {uppdaterar ? 'Uppdaterar...' : 'Bekräfta & skicka notis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
```

---

## STEG 5 — Koppla till projektsidan

Öppna `app/(app)/projekt/[projektId]/page.tsx` och lägg till
`ForanmalanTracker` i fliken "Rekommendation & uppföljning":

```typescript
// Importera högst upp
import ForanmalanTracker from '@/components/ForanmalanTracker'

// I fliken "Rekommendation & uppföljning", lägg till under befintligt innehåll:
<section>
  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
    📋 Föranmälan & nätbolag
  </h3>
  <ForanmalanTracker
    projektId={params.projektId}
    projektNamn={projekt.namn}
  />
</section>
```

---

## STEG 6 — Regelreferens-sida (statisk, SEO-värde)

Skapa `app/(app)/regler/foranmalan/page.tsx` — en lättläst referenssida
som elfirmorna kan länka till och som ökar Svebud:s SEO:

```typescript
import { FORANMALAN_JOBBTYPER } from '@/lib/foranmalan-regler'
import { ExternalLink } from 'lucide-react'

export const metadata = {
  title: 'Vilka elarbeten kräver föranmälan? | SveBud',
  description: 'Komplett lista över elinstallationer som kräver föranmälan till nätbolaget per ELNÄT 2025 K. Uppdaterad januari 2026.'
}

export default function ForanmalanRegler() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">
          Vilka elarbeten kräver föranmälan?
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Enligt <strong>ELNÄT 2025 K punkt 5.9</strong> (gäller fr.o.m. 1 januari 2026)
          ska alla elinstallationer som innebär en väsentlig förändring av kundens anläggning
          föranmälas till nätbolaget — och <em>godkännas</em> innan arbetet får påbörjas.
          Anmälan görs av elfirman, inte kunden.
        </p>
        <a
          href="https://www.elinstallatoren.se/2026/01/nu-behover-laddbox-och-varmepump-foranmalas-och-godkannas/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
        >
          Källa: Elinstallatören.se — ELNÄT 2025 K
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="divide-y rounded-xl border overflow-hidden">
        {FORANMALAN_JOBBTYPER.map(jobb => (
          <div key={jobb.id} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
            <span className="text-2xl shrink-0 mt-0.5">{jobb.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{jobb.label}</span>
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded-full
                  ${jobb.kravs
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                  }
                `}>
                  {jobb.kravs ? '⚠ Föranmälan krävs' : '✓ Ej föranmälan'}
                </span>
                {jobb.typiskHandlaggningstid && (
                  <span className="text-xs text-muted-foreground">
                    {jobb.typiskHandlaggningstid}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {jobb.notering}
              </p>
              {jobb.regelLank && (
                <a
                  href={jobb.regelLank}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1"
                >
                  Läs regeln <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground border-t pt-4">
        Senast uppdaterad: januari 2026 · Regler kan ändras — kontrollera alltid med
        ditt nätbolag. Källa: ELNÄT 2025 K av Energiföretagen Sverige och Konsumentverket.
      </p>
    </div>
  )
}
```

---

## STEG 7 — Bygg och testa

```bash
npm run build
# Kontrollera 0 TypeScript-fel

# Testa manuellt:
# 1. Gå till ett projekt i dashboarden
# 2. Fliken "Rekommendation & uppföljning"
# 3. Klicka "+ Starta tracker", välj jobbtyp och kund-epost
# 4. Klicka "Uppdatera till: Föranmälan inskickad"
# 5. Verifiera att e-post kom fram i Resend Dashboard → Logs
# 6. Verifiera att logg skapats i Supabase → foranmalan_steg_logg
```

---

## Sammanfattning av vad som byggs

| Del | Fil | Tid |
|-----|-----|-----|
| DB-migration | SQL i Supabase | 30 min |
| Regeldata + typer | `lib/foranmalan-regler.ts` | Ingår ovan |
| API – skapa | `app/api/foranmalan/route.ts` | Ingår ovan |
| API – uppdatera steg + notis | `app/api/foranmalan/[fpId]/steg/route.ts` | Ingår ovan |
| UI-komponent | `components/ForanmalanTracker.tsx` | Ingår ovan |
| Regelreferens-sida | `app/(app)/regler/foranmalan/page.tsx` | Ingår ovan |

**Total estimerad tid med Claude Code: 2–4 timmar.**
