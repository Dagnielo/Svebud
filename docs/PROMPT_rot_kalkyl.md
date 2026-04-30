# Claude Code-prompt: ROT-kalkyl i offerten för Svebud

Klistra in hela detta block i Claude Code och kör.

---

## KONTEXT

Vi lägger till ROT-kalkyl direkt i Svebud:s befintliga kalkylsteg (Steg 3).
Ingen ny sida behövs — det är ett tillägg till den befintliga kalkylkomponenten.

Stack: Next.js 15 / Supabase / TypeScript / shadcn/ui
Design: navy #0E1B2E + gul #F5C400 (matchar befintlig app)

---

## STEG 1 — Supabase-kolumner

Kör i Supabase Dashboard → SQL Editor:

```sql
-- Lägg till ROT-fält på projekt-tabellen
ALTER TABLE projekt
  ADD COLUMN IF NOT EXISTS rot_aktiverat        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rot_typ              TEXT DEFAULT 'rot',
  ADD COLUMN IF NOT EXISTS rot_antal_agare      INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rot_tidigare_utnyttjat INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rot_fastighetstyp    TEXT DEFAULT 'villa',
  ADD COLUMN IF NOT EXISTS rot_belopp           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rot_kund_betalar     INTEGER DEFAULT 0;

-- Lägg till ROT-markering på kalkylrader
ALTER TABLE kalkyl_rader
  ADD COLUMN IF NOT EXISTS ar_arbete   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS rot_rad     BOOLEAN DEFAULT TRUE;
-- OBS: om tabellen kalkyl_rader inte finns ännu, ignorera — 
-- kalkyldata lagras i projekt.jämförelse_resultat JSONB.
-- Vi hanterar det i applikationslagret istället.
```

---

## STEG 2 — ROT-logik och regler

Skapa filen `lib/rot-regler.ts`:

```typescript
// Källreferenser:
// Skatteverket: https://skatteverket.se/privat/fastigheterochbostad/rotavdrag.html
// ELNÄT 2025 K / Energiföretagen
// Elinstallatören.se branschguide

export const ROT_REGLER = {
  // 2026: återgång till ordinarie nivå efter tillfällig höjning 2025
  avdragsprocent: {
    rot: 0.30,        // ROT: 30% av arbetskostnad
    gronteknik: {
      solceller: 0.20,     // 20% av arbete+material
      laddbox: 0.15,       // 15% från 1 juli 2025 (tidigare 20%)
      batteri: 0.20,       // 20% av arbete+material
    }
  },
  maxPerPerson: 50000,     // kr/år
  maxRotRutTotalt: 75000,  // kr/år inkl RUT
  gällerFrån: '2026-01-01',
  källa: 'https://skatteverket.se/privat/fastigheterochbostad/rotavdrag.html'
} as const

export type RotTyp = 'rot' | 'gronteknik_solceller' | 'gronteknik_laddbox' | 'gronteknik_batteri' | 'ej_rot'
export type FastighetsTyp = 'villa' | 'brf' | 'agarlagh' | 'fritidshus'

export interface RotKalkylInput {
  aktiverat: boolean
  typ: RotTyp
  antalAgare: number       // 1 eller 2
  tidligareUtnyttjat: number  // kr som redan använts detta år
  fastighetstyp: FastighetsTyp
  // Kalkylrader
  arbeteExMoms: number     // Total arbetskostnad exkl moms
  materialExMoms: number   // Total materialkostnad exkl moms
}

export interface RotKalkylResultat {
  totalExMoms: number
  totalInkMoms: number
  rotUnderlag: number      // Det belopp avdraget beräknas på
  rotBelopp: number        // Avdragets storlek
  kundBetalar: number
  kvarvarandeUtrymme: number
  takNåttVarning: boolean
  fastighetsVarning: string | null
  kälLänk: string | null
}

export function beräknaROT(input: RotKalkylInput): RotKalkylResultat {
  const totalExMoms = input.arbeteExMoms + input.materialExMoms
  const totalInkMoms = totalExMoms * 1.25

  if (!input.aktiverat || input.typ === 'ej_rot') {
    return {
      totalExMoms,
      totalInkMoms,
      rotUnderlag: 0,
      rotBelopp: 0,
      kundBetalar: totalInkMoms,
      kvarvarandeUtrymme: ROT_REGLER.maxPerPerson * input.antalAgare - input.tidligareUtnyttjat,
      takNåttVarning: false,
      fastighetsVarning: null,
      kälLänk: null
    }
  }

  // Beräkna underlag och procent
  let underlag = 0
  let procent = 0

  if (input.typ === 'rot') {
    // ROT: 30% på arbetskostnad inkl moms
    underlag = input.arbeteExMoms * 1.25
    procent = ROT_REGLER.avdragsprocent.rot
  } else if (input.typ === 'gronteknik_solceller') {
    // Grön teknik solceller: 20% på arbete + material inkl moms
    underlag = totalInkMoms
    procent = ROT_REGLER.avdragsprocent.gronteknik.solceller
  } else if (input.typ === 'gronteknik_laddbox') {
    underlag = totalInkMoms
    procent = ROT_REGLER.avdragsprocent.gronteknik.laddbox
  } else if (input.typ === 'gronteknik_batteri') {
    underlag = totalInkMoms
    procent = ROT_REGLER.avdragsprocent.gronteknik.batteri
  }

  const maxUtrymme = ROT_REGLER.maxPerPerson * input.antalAgare - input.tidligareUtnyttjat
  const beräknatBelopp = Math.round(underlag * procent)
  const rotBelopp = Math.min(beräknatBelopp, Math.max(0, maxUtrymme))
  const takNåttVarning = beräknatBelopp > maxUtrymme

  // Fastighetsvarningar
  let fastighetsVarning: string | null = null
  if (input.fastighetstyp === 'brf' && input.typ === 'rot') {
    fastighetsVarning = 'BRF: Avdraget gäller bara arbete inuti lägenheten som BRF-stadgarna lägger på ägaren (t.ex. el inuti lägenhet, ej gemensamma utrymmen).'
  }
  if (input.fastighetstyp === 'brf' && input.typ.startsWith('gronteknik')) {
    fastighetsVarning = 'BRF: Grön teknik-avdrag kan kräva separat elabonnemang för bostadsdelen. Kontrollera med Skatteverket.'
  }

  return {
    totalExMoms,
    totalInkMoms,
    rotUnderlag: Math.round(underlag),
    rotBelopp,
    kundBetalar: Math.round(totalInkMoms - rotBelopp),
    kvarvarandeUtrymme: maxUtrymme,
    takNåttVarning,
    fastighetsVarning,
    kälLänk: ROT_REGLER.källa
  }
}

export const ROT_TYPER = [
  {
    id: 'rot' as RotTyp,
    label: 'ROT-avdrag',
    emoji: '🔧',
    procent: '30%',
    underlag: 'Arbetskostnad inkl moms',
    beskrivning: 'Gäller reparation, ombyggnad och tillbyggnad av bostad.',
    lämpligFör: ['stamrenovering', 'elcentral', 'service'],
    källa: 'https://skatteverket.se/privat/fastigheterochbostad/rotavdrag.html'
  },
  {
    id: 'gronteknik_laddbox' as RotTyp,
    label: 'Grön teknik — Laddbox',
    emoji: '⚡',
    procent: '15%',
    underlag: 'Arbete + material inkl moms',
    beskrivning: 'Fast ansluten laddbox i eller i anslutning till bostad.',
    lämpligFör: ['laddbox', 'laddinfrastruktur'],
    källa: 'https://skatteverket.se/privat/fastigheterochbostad/gronteknikanlaggningar.html'
  },
  {
    id: 'gronteknik_solceller' as RotTyp,
    label: 'Grön teknik — Solceller',
    emoji: '☀️',
    procent: '20%',
    underlag: 'Arbete + material inkl moms',
    beskrivning: 'Nätanslutet solcellssystem på bostad.',
    lämpligFör: ['solceller'],
    källa: 'https://skatteverket.se/privat/fastigheterochbostad/gronteknikanlaggningar.html'
  },
  {
    id: 'gronteknik_batteri' as RotTyp,
    label: 'Grön teknik — Batteri',
    emoji: '🔋',
    procent: '20%',
    underlag: 'Arbete + material inkl moms',
    beskrivning: 'Lagringsbatteri kopplat till befintliga solceller.',
    lämpligFör: ['batteri', 'energilager'],
    källa: 'https://skatteverket.se/privat/fastigheterochbostad/gronteknikanlaggningar.html'
  },
  {
    id: 'ej_rot' as RotTyp,
    label: 'Inget avdrag',
    emoji: '🏢',
    procent: '–',
    underlag: '–',
    beskrivning: 'B2B-kund, hyresrätt eller arbete som ej berättigar till avdrag.',
    lämpligFör: ['alla_b2b'],
    källa: null
  }
] as const
```

---

## STEG 3 — ROT-komponent

Skapa `components/RotKalkyl.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { beräknaROT, ROT_TYPER, ROT_REGLER } from '@/lib/rot-regler'
import type { RotTyp, FastighetsTyp, RotKalkylInput } from '@/lib/rot-regler'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, AlertTriangle, Info, TrendingDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface Props {
  arbeteExMoms: number      // Från kalkylrader — summa arbete exkl moms
  materialExMoms: number    // Från kalkylrader — summa material exkl moms
  projektId: string
  onRotChange?: (rotBelopp: number, kundBetalar: number) => void
}

export default function RotKalkyl({
  arbeteExMoms,
  materialExMoms,
  projektId,
  onRotChange
}: Props) {
  const [aktiverat, setAktiverat] = useState(false)
  const [typ, setTyp] = useState<RotTyp>('rot')
  const [antalAgare, setAntalAgare] = useState(1)
  const [tidligareUtnyttjat, setTidligareUtnyttjat] = useState(0)
  const [fastighetstyp, setFastighetstyp] = useState<FastighetsTyp>('villa')
  const [sparar, setSparar] = useState(false)

  const input: RotKalkylInput = {
    aktiverat,
    typ,
    antalAgare,
    tidligareUtnyttjat,
    fastighetstyp,
    arbeteExMoms,
    materialExMoms
  }

  const res = beräknaROT(input)
  const valdTypInfo = ROT_TYPER.find(t => t.id === typ)

  // Notifiera förälder när ROT-data ändras
  useEffect(() => {
    onRotChange?.(res.rotBelopp, res.kundBetalar)
  }, [res.rotBelopp, res.kundBetalar])

  // Spara till Supabase
  async function sparaROT() {
    setSparar(true)
    try {
      await fetch(`/api/projekt/${projektId}/rot`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rot_aktiverat: aktiverat,
          rot_typ: typ,
          rot_antal_agare: antalAgare,
          rot_tidigare_utnyttjat: tidligareUtnyttjat,
          rot_fastighetstyp: fastighetstyp,
          rot_belopp: res.rotBelopp,
          rot_kund_betalar: res.kundBetalar
        })
      })
    } finally {
      setSparar(false)
    }
  }

  // Spara när indata ändras (debounce)
  useEffect(() => {
    const t = setTimeout(sparaROT, 800)
    return () => clearTimeout(t)
  }, [aktiverat, typ, antalAgare, tidligareUtnyttjat, fastighetstyp])

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Husavdrag & skattereduktion
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="rot-toggle" className="text-sm text-muted-foreground">
              {aktiverat ? 'Aktivt' : 'Inaktivt'}
            </Label>
            <Switch
              id="rot-toggle"
              checked={aktiverat}
              onCheckedChange={setAktiverat}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Typ-väljare */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ROT_TYPER.map(t => (
            <button
              key={t.id}
              onClick={() => { setTyp(t.id); setAktiverat(t.id !== 'ej_rot') }}
              disabled={!aktiverat && t.id !== 'ej_rot'}
              className={`
                relative p-2.5 rounded-lg border text-left transition-all text-xs
                ${typ === t.id
                  ? 'border-yellow-400/60 bg-yellow-400/10 text-foreground'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              <div className="text-base mb-1">{t.emoji}</div>
              <div className="font-semibold leading-tight">{t.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{t.procent}</div>
              {typ === t.id && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
              )}
            </button>
          ))}
        </div>

        {aktiverat && typ !== 'ej_rot' && (
          <>
            {/* Vald typ — info */}
            {valdTypInfo && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
                <div>
                  <span>{valdTypInfo.beskrivning}</span>
                  {' '}
                  <span className="font-medium">
                    Underlag: {valdTypInfo.underlag}.
                  </span>
                  {valdTypInfo.källa && (
                    <a
                      href={valdTypInfo.källa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 ml-1 text-blue-400 hover:underline"
                    >
                      Skatteverket
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Inställningar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {/* Fastighetstyp */}
              <div className="space-y-1.5">
                <Label className="text-xs">Fastighetstyp</Label>
                <Select value={fastighetstyp} onValueChange={v => setFastighetstyp(v as FastighetsTyp)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="villa">Villa / Fritidshus</SelectItem>
                    <SelectItem value="brf">Bostadsrätt (BRF)</SelectItem>
                    <SelectItem value="agarlagh">Ägarlägenhet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Antal ägare */}
              <div className="space-y-1.5">
                <Label className="text-xs">Antal ägare</Label>
                <div className="flex gap-2">
                  {[1, 2].map(n => (
                    <button
                      key={n}
                      onClick={() => setAntalAgare(n)}
                      className={`
                        flex-1 h-8 rounded-md border text-xs font-semibold transition-all
                        ${antalAgare === n
                          ? 'border-yellow-400/60 bg-yellow-400/10 text-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground'
                        }
                      `}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tidigare utnyttjat */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Tidigare utnyttjat i år (kr)
                </Label>
                <Input
                  type="number"
                  value={tidligareUtnyttjat || ''}
                  onChange={e => setTidligareUtnyttjat(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Varningar */}
            {res.takNåttVarning && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-orange-400">Avdragstak nått</p>
                  <p className="text-muted-foreground mt-0.5">
                    Beräknat avdrag ({(res.rotUnderlag * (valdTypInfo ? parseFloat(valdTypInfo.procent) / 100 : 0.3)).toLocaleString('sv')} kr)
                    överstiger kundens kvarvarande utrymme ({res.kvarvarandeUtrymme.toLocaleString('sv')} kr).
                    Avdraget begränsas till {res.rotBelopp.toLocaleString('sv')} kr.
                  </p>
                </div>
              </div>
            )}

            {res.fastighetsVarning && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{res.fastighetsVarning}</p>
              </div>
            )}
          </>
        )}

        {/* Prissammanfattning */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Prissammanfattning
          </p>

          {[
            { label: 'Arbetskostnad inkl moms', värde: Math.round(arbeteExMoms * 1.25) },
            { label: 'Material inkl moms',      värde: Math.round(materialExMoms * 1.25) },
            { label: 'Totalt inkl moms',        värde: res.totalInkMoms, bold: true },
          ].map(rad => (
            <div key={rad.label} className="flex justify-between text-sm">
              <span className={rad.bold ? 'font-semibold' : 'text-muted-foreground'}>{rad.label}</span>
              <span className={rad.bold ? 'font-semibold' : 'text-muted-foreground'}>
                {Math.round(rad.värde).toLocaleString('sv')} kr
              </span>
            </div>
          ))}

          {aktiverat && res.rotBelopp > 0 && (
            <div className="flex justify-between text-sm text-green-500">
              <span className="font-medium">
                {valdTypInfo?.emoji} {valdTypInfo?.label} ({valdTypInfo?.procent})
              </span>
              <span className="font-semibold">–{res.rotBelopp.toLocaleString('sv')} kr</span>
            </div>
          )}

          <div className="border-t pt-2 mt-1 flex justify-between items-end">
            <span className="font-bold text-base">Kunden betalar</span>
            <div className="text-right">
              <div className={`text-xl font-bold ${aktiverat && res.rotBelopp > 0 ? 'text-yellow-400' : ''}`}>
                {Math.round(res.kundBetalar).toLocaleString('sv')} kr
              </div>
              {aktiverat && res.rotBelopp > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-500 justify-end">
                  <TrendingDown className="w-3 h-3" />
                  Kunden sparar {res.rotBelopp.toLocaleString('sv')} kr
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Beräkningen är vägledande. Det är alltid kunden som ansvarar för att de uppfyller
          Skatteverkets villkor. Om avdrag nekas ansvarar kunden för mellanskillnaden.{' '}
          <a
            href={ROT_REGLER.källa}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
          >
            Skatteverket <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
```

---

## STEG 4 — API-route: spara ROT-data

Skapa `app/api/projekt/[projektId]/rot/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projektId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const body = await req.json()

  const { error } = await supabase
    .from('projekt')
    .update({
      rot_aktiverat:         body.rot_aktiverat,
      rot_typ:               body.rot_typ,
      rot_antal_agare:       body.rot_antal_agare,
      rot_tidigare_utnyttjat: body.rot_tidigare_utnyttjat,
      rot_fastighetstyp:     body.rot_fastighetstyp,
      rot_belopp:            body.rot_belopp,
      rot_kund_betalar:      body.rot_kund_betalar,
    })
    .eq('id', params.projektId)
    .eq('användar_id', user.id)

  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

---

## STEG 5 — Koppla till projektsidan

Öppna `app/(app)/projekt/[projektId]/page.tsx`.

Hitta kalkylfliken (fliken "Kalkyl") och lägg till `RotKalkyl` direkt
**under** kalkyltabellen, **ovanför** "Generera anbud"-knappen:

```typescript
// Importera högst upp i filen
import RotKalkyl from '@/components/RotKalkyl'

// I kalkylfliken — ersätt platshållaren eller lägg till efter kalkyltabellen:

// Beräkna totaler från kalkylrader
const arbeteExMoms = kalkylRader
  .filter(r => r.ar_arbete)
  .reduce((s, r) => s + r.timmar * r.timpris, 0)

const materialExMoms = kalkylRader
  .reduce((s, r) => s + r.material, 0)

// Lägg till komponenten
<RotKalkyl
  arbeteExMoms={arbeteExMoms}
  materialExMoms={materialExMoms}
  projektId={params.projektId}
  onRotChange={(rotBelopp, kundBetalar) => {
    // Uppdatera lokal state om du vill visa kundpris i offerten
    setRotData({ rotBelopp, kundBetalar })
  }}
/>
```

---

## STEG 6 — ROT visas i PDF-exporten

Öppna `app/api/projekt/[projektId]/rekommendation/exportera/route.ts`
(eller där PDF-genereringen sker) och lägg till ROT-sektionen i markdown:

```typescript
// Hämta ROT-data från projektet
const { data: projekt } = await supabase
  .from('projekt')
  .select('rot_aktiverat, rot_typ, rot_belopp, rot_kund_betalar, rot_fastighetstyp')
  .eq('id', projektId)
  .single()

// Lägg till i markdown-exporten
const rotSektion = projekt?.rot_aktiverat && projekt.rot_belopp > 0
  ? `
## Prissammanfattning med skattereduktion

| Post                    | Belopp          |
|-------------------------|-----------------|
| Totalt inkl. moms       | ${totalInkMoms.toLocaleString('sv')} kr |
| ${rotTypLabel} avdrag  | -${projekt.rot_belopp.toLocaleString('sv')} kr |
| **Kunden betalar**      | **${projekt.rot_kund_betalar.toLocaleString('sv')} kr** |

*Avdraget begärs av oss hos Skatteverket efter utfört och betalt arbete.
Kunden ansvarar för att de uppfyller Skatteverkets villkor för skattereduktion.*
`
  : ''
```

---

## STEG 7 — Bygg och testa

```bash
npm run build
# Kontrollera 0 TypeScript-fel

# Testa manuellt:
# 1. Gå till ett projekt → flik "Kalkyl"
# 2. Lägg till några kalkylrader (timmar + material)
# 3. Scrolla ner till "Husavdrag & skattereduktion"
# 4. Slå på toggle → välj "ROT-avdrag"
# 5. Testa typ "Grön teknik — Laddbox" → notera att avdraget ändras
# 6. Sätt "Tidigare utnyttjat" till 45000 → tak-varning ska visas
# 7. Välj fastighetstyp "Bostadsrätt" → BRF-varning ska visas
# 8. Klicka "Exportera PDF" → ROT-sektionen ska synas i filen
# 9. Verifiera att rot_belopp sparats i Supabase → Table Editor → projekt
```

---

## Sammanfattning av vad som byggs

| Del | Fil | Tid |
|-----|-----|-----|
| DB-kolumner | SQL i Supabase | 15 min |
| Regler + beräkningslogik | `lib/rot-regler.ts` | Ingår ovan |
| UI-komponent | `components/RotKalkyl.tsx` | Ingår ovan |
| API – spara ROT | `app/api/projekt/[projektId]/rot/route.ts` | Ingår ovan |
| Koppla till projektsida | `app/(app)/projekt/[projektId]/page.tsx` | Ingår ovan |
| ROT i PDF-export | Befintlig exportroute | Ingår ovan |

**Total estimerad tid med Claude Code: 3–5 timmar.**

---

## Regelreferenser inbyggda i koden

Alla typer i `ROT_TYPER`-arrayen har en `källa`-länk som visas i UI:t:

| Typ | Källa |
|-----|-------|
| ROT 30% | skatteverket.se/rotavdrag |
| Grön teknik (laddbox, solceller, batteri) | skatteverket.se/gronteknikanlaggningar |
| Disclaimer i komponenten | Skatteverket länk med ExternalLink-ikon |

Kunden och elfirman ser alltid källan direkt i offert-vyn — 
ingen gissning om vad som gäller.
