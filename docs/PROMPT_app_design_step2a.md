# PROMPT_app_design_step2a.md

## Steg 2A — Pipeline-vy redesign

**Datum:** 1 maj 2026
**Mål:** `app/(app)/(authenticated)/dashboard/page.tsx`, `components/ProjektKort.tsx`, ny `lib/types/projekt.ts`, ny `lib/projekt-status.ts`, ny komponenter
**Estimerad tid:** 1,5–2 dagar Claude Code-arbete
**Risk:** Medel (många filer ändras, ny funktionalitet adderas)
**Beroende:** Steg 1A-1D klara och deployade
**Följdsteg:** Steg 2B (Alla projekt-vyn)

> **Vad detta gör:** Pipeline-vyn (svebud.se/dashboard) går från mörk till ljus design, KpiKort återanvänds från 1D, projektkort får CTA-logik baserat på status-flaggor, anbudsläge-kategori visas, datum-badges visas, filtrering + sortering + notifikations-bell läggs till.

---

## Designprincip-kontext

Från `CLAUDE.md ## Designprinciper`:
> SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår elinstallation. AI är medlet — inte budskapet, inte identiteten.

**Konsekvenser för Pipeline-vyn:**
- Anbudsläge-kategori visas **utan procent** (ingen "94%"-poäng — gimmick-risk)
- Notifikations-bell visar **riktigt** data (förfallna uppföljningar) — inte teater
- Filter/Sortera är **funktionella**, inte placeholder-UI

---

## Kontext från inventeringen

**Status-flaggor som finns i live (verifierat):**

```
pipeline_status: 'inkorg' | 'under_arbete' | 'inskickat' | 'tilldelning'
tilldelning_status: 'vantar' | 'vunnet' | 'förlorat' | null
jämförelse_status: 'ej_startad' | 'pågår' | 'klar' | 'fel'
rekommendation_status: 'ej_startad' | 'pågår' | 'klar' | 'fel'
analys_komplett: boolean | null
skickat_datum: string | null
tilldelning_datum: string | null
kravmatchning: JSONB med anbudsläge + match_procent + ...
```

**Anbudsläge-kategorier (från `lib/verdict.ts`):**
- STARKT_LÄGE → grön
- BRA_LÄGE → amber
- OSÄKERT_LÄGE → orange
- SVÅRT_LÄGE → röd

**Drift-risk:** 3 olika `Projekt`-typdefinitioner i kodbasen — fixas i denna spec.

---

## Operationer

### Operation 1 — Konsolidera Projekt-typ till `lib/types/projekt.ts`

**Skapa fil** `lib/types/projekt.ts`:

```typescript
export type PipelineStatus = 'inkorg' | 'under_arbete' | 'inskickat' | 'tilldelning'
export type TilldelningStatus = 'vantar' | 'vunnet' | 'förlorat'
export type ProcessStatus = 'ej_startad' | 'pågår' | 'klar' | 'fel'

export type Anbudsläge = 'STARKT_LÄGE' | 'BRA_LÄGE' | 'OSÄKERT_LÄGE' | 'SVÅRT_LÄGE'

export type Kravmatchning = {
  anbudsläge?: Anbudsläge
  match_procent?: number
  sammanfattning?: string
  matchade_krav?: unknown[]
  kräver_bekräftelse?: unknown[]
  ej_uppfyllda?: unknown[]
  [key: string]: unknown
}

export type Projekt = {
  // Bas-fält
  id: string
  namn: string
  beskrivning: string | null
  tier: string
  skapad: string
  deadline?: string | null

  // Process-state
  jämförelse_status: ProcessStatus
  rekommendation_status: ProcessStatus
  analys_komplett: boolean | null

  // Pipeline-state
  pipeline_status?: PipelineStatus
  tilldelning_status?: TilldelningStatus | null

  // Tilldelnings-data
  tilldelning_datum?: string | null
  tilldelning_notering?: string | null
  vinnande_pris?: number | null
  skickat_datum?: string | null

  // JSONB
  kravmatchning?: Kravmatchning | null
}
```

**Uppdatera** följande filer att importera från `@/lib/types/projekt`:

1. `components/ProjektKort.tsx` — ta bort lokal `type Projekt`, importera istället. Lägg till `kravmatchning` om den saknades.
2. `app/(app)/(authenticated)/statistik/page.tsx` — ta bort lokal type, importera. (Den är bantad — kan vara en sub-typ `Pick<Projekt, 'id' | 'namn' | ...>` om bantning är medveten.)
3. `app/(app)/projekt/[projektId]/page.tsx` — ta bort lokal type, importera.
4. `app/api/statistik/insikter/route.ts` — ta bort lokal type, importera.

**Acceptanskriterium:** `grep -rn "type Projekt = {" --include="*.ts" --include="*.tsx"` returnerar **endast 1 träff** (i `lib/types/projekt.ts`).

---

### Operation 2 — Skapa CTA-helper `lib/projekt-status.ts`

**Skapa fil** `lib/projekt-status.ts`:

```typescript
import type { Projekt } from '@/lib/types/projekt'

export type CtaTyp =
  | 'starta_analys'
  | 'analyserar'
  | 'slutfor_kalkyl'
  | 'granska_anbud'
  | 'ingen'  // Inskickat eller tilldelning — UtfallsKnappar tar över

export type CtaInfo = {
  typ: CtaTyp
  label: string
  href?: string  // Klick-destination
  disabled?: boolean
}

/**
 * Bestämmer vilken CTA som visas på ett projektkort baserat på
 * status-flaggor. Logiken följer pipeline-flödet:
 *   inkorg → analys pågår → analys klar → rekommendation klar → inskickat
 */
export function bestämCta(projekt: Projekt): CtaInfo {
  // Inskickat eller tilldelning → ingen CTA, UtfallsKnappar tar över
  if (
    projekt.pipeline_status === 'inskickat' ||
    projekt.pipeline_status === 'tilldelning'
  ) {
    return { typ: 'ingen', label: '' }
  }

  // Analys pågår
  if (projekt.jämförelse_status === 'pågår') {
    return { typ: 'analyserar', label: 'Analyserar...', disabled: true }
  }

  // Ingen analys än
  if (
    projekt.analys_komplett === null &&
    projekt.jämförelse_status === 'ej_startad'
  ) {
    return {
      typ: 'starta_analys',
      label: 'Starta analys →',
      href: `/projekt/${projekt.id}`,
    }
  }

  // Analys klar, men rekommendation inte klar än
  if (
    projekt.jämförelse_status === 'klar' &&
    projekt.rekommendation_status !== 'klar'
  ) {
    return {
      typ: 'slutfor_kalkyl',
      label: 'Slutför kalkyl →',
      href: `/projekt/${projekt.id}`,
    }
  }

  // Rekommendation klar — redo att granska + skicka
  if (projekt.rekommendation_status === 'klar') {
    return {
      typ: 'granska_anbud',
      label: 'Granska anbud →',
      href: `/projekt/${projekt.id}`,
    }
  }

  // Fallback — något oväntat tillstånd
  return {
    typ: 'starta_analys',
    label: 'Öppna projekt →',
    href: `/projekt/${projekt.id}`,
  }
}

/**
 * Hämtar anbudsläge från kravmatchning-JSONB.
 * Returnerar null om inget anbudsläge är satt.
 */
export function hämtaAnbudslägeFrånProjekt(projekt: Projekt) {
  return projekt.kravmatchning?.anbudsläge ?? null
}
```

**Acceptanskriterium:** Filen finns, exporterar `bestämCta` och `hämtaAnbudslägeFrånProjekt`. Inga TypeScript-fel.

---

### Operation 3 — Uppdatera `bedömningsVisning` att använda ljusa tokens

**Hitta** `lib/verdict.ts`. I funktionen `bedömningsVisning`, byt ut mörka tokens mot ljusa:

```typescript
// Före (exempel — verifiera mot faktisk fil)
case 'STARKT_LÄGE':
  return { label: 'Starkt läge', kort: 'Starkt', färg: 'var(--green)', bgFärg: 'var(--green-bg)', ... }

// Efter
case 'STARKT_LÄGE':
  return { label: 'Starkt läge', kort: 'Starkt', färg: 'var(--light-green)', bgFärg: 'var(--light-green-bg)', ... }
```

Mappa alla 4 fall:

| Anbudsläge | Färg-token (ny) | Bg-token (ny) |
|-----------|-----------------|---------------|
| STARKT_LÄGE | `var(--light-green)` | `var(--light-green-bg)` |
| BRA_LÄGE | `var(--light-amber)` | `var(--light-amber-glow)` |
| OSÄKERT_LÄGE | `var(--light-orange)` | `var(--light-orange-bg)` |
| SVÅRT_LÄGE | `var(--light-red)` | `var(--light-red-bg)` |

**OBS:** Verifiera att `--light-amber-glow`, `--light-green-bg`, `--light-orange-bg`, `--light-red-bg` finns från Steg 1A. Om inte — lägg till i `globals.css` först.

**Acceptanskriterium:** `bedömningsVisning` returnerar ljusa tokens för alla 4 fall.

---

### Operation 4 — Redesigna `components/ProjektKort.tsx` (ljus design + nya features)

Detta är **största ändringen i specen**. Hela filen ersätts.

**Backup först:**
```bash
cp components/ProjektKort.tsx components/ProjektKort.tsx.bak
```

**Ny ProjektKort.tsx** (komplett fil):

```typescript
'use client'

import Link from 'next/link'
import type { Projekt } from '@/lib/types/projekt'
import { bestämCta, hämtaAnbudslägeFrånProjekt } from '@/lib/projekt-status'
import { bedömningsVisning } from '@/lib/verdict'
import UtfallsKnappar from '@/components/UtfallsKnappar'
import { Trash, ArrowRight, Calendar, Warning } from '@phosphor-icons/react'

type Props = {
  projekt: Projekt
  onRadera?: (id: string) => void
  onDeadlineChange?: (id: string, datum: string | null) => void
  onUtfallChange?: (id: string) => void
}

export function getPipelineKolumn(p: Projekt): string {
  return p.pipeline_status ?? 'inkorg'
}

function dagarSedanSkapad(skapad: string): string {
  const dagar = Math.floor((Date.now() - new Date(skapad).getTime()) / (1000 * 60 * 60 * 24))
  if (dagar === 0) return 'Idag'
  if (dagar === 1) return 'Igår'
  if (dagar < 7) return `${dagar}d sedan`
  if (dagar < 30) return `${Math.floor(dagar / 7)}v sedan`
  return `${Math.floor(dagar / 30)}mån sedan`
}

function deadlineFärg(deadline: string | null | undefined): string {
  if (!deadline) return 'var(--light-t4)'
  const dagar = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (dagar < 0) return 'var(--light-red)'      // passerad
  if (dagar <= 3) return 'var(--light-orange)'  // bråttom
  if (dagar <= 7) return 'var(--light-amber)'   // snart
  return 'var(--light-t3)'                       // gott om tid
}

function dagarTillDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null
  const dagar = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (dagar < 0) return `${Math.abs(dagar)}d försenad`
  if (dagar === 0) return 'Idag'
  if (dagar === 1) return 'Imorgon'
  return `${dagar}d kvar`
}

function formatteraDatum(datum: string): string {
  const d = new Date(datum)
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export default function ProjektKort({ projekt, onRadera, onDeadlineChange, onUtfallChange }: Props) {
  const cta = bestämCta(projekt)
  const anbudsläge = hämtaAnbudslägeFrånProjekt(projekt)
  const visning = anbudsläge ? bedömningsVisning(anbudsläge) : null

  const visUtfallsKnappar =
    projekt.pipeline_status === 'inskickat' || projekt.pipeline_status === 'tilldelning'

  return (
    <div
      style={{
        background: 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'grab',
        transition: 'box-shadow .12s ease, border-color .12s ease',
      }}
    >
      {/* Header: namn + radera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/projekt/${projekt.id}`}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--light-t1)',
              textDecoration: 'none',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {projekt.namn}
          </Link>
          {projekt.beskrivning && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--light-t4)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {projekt.beskrivning}
            </div>
          )}
        </div>
        {onRadera && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              if (confirm('Radera projektet?')) onRadera(projekt.id)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--light-t4)',
            }}
            aria-label="Radera projekt"
          >
            <Trash size={14} weight="bold" />
          </button>
        )}
      </div>

      {/* Anbudsläge-badge + dagar-sedan-skapad */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {visning && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              padding: '3px 8px',
              borderRadius: 4,
              color: visning.färg,
              background: visning.bgFärg,
            }}
          >
            {visning.kort}
          </span>
        )}
        {projekt.analys_komplett === false && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              color: 'var(--light-orange)',
              background: 'var(--light-orange-bg)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Warning size={10} weight="bold" /> Komplettera
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--light-t4)', marginLeft: 'auto' }}>
          {dagarSedanSkapad(projekt.skapad)}
        </span>
      </div>

      {/* Datum-info: Skickat-datum eller deadline */}
      {projekt.pipeline_status === 'inskickat' && projekt.skickat_datum ? (
        <div style={{ fontSize: 12, color: 'var(--light-t3)' }}>
          Skickat {formatteraDatum(projekt.skickat_datum)}
        </div>
      ) : projekt.tilldelning_datum ? (
        <div style={{ fontSize: 12, color: 'var(--light-t3)' }}>
          Beslut {formatteraDatum(projekt.tilldelning_datum)}
        </div>
      ) : projekt.deadline ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <Calendar size={12} weight="bold" color={deadlineFärg(projekt.deadline)} />
          <span style={{ color: deadlineFärg(projekt.deadline), fontWeight: 500 }}>
            {dagarTillDeadline(projekt.deadline)}
          </span>
        </div>
      ) : onDeadlineChange ? (
        <input
          type="date"
          value={projekt.deadline ?? ''}
          onChange={(e) => onDeadlineChange(projekt.id, e.target.value || null)}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 12,
            padding: '4px 8px',
            border: '1px solid var(--light-border)',
            borderRadius: 6,
            background: 'var(--light-bg)',
            color: 'var(--light-t3)',
          }}
        />
      ) : null}

      {/* CTA eller UtfallsKnappar */}
      {visUtfallsKnappar ? (
        <UtfallsKnappar
          projekt={{
            id: projekt.id,
            tilldelning_status: projekt.tilldelning_status as 'vunnet' | 'förlorat' | 'vantar' | null,
          }}
          onChange={onUtfallChange}
          kompakt
        />
      ) : cta.typ !== 'ingen' ? (
        cta.disabled ? (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--light-t4)',
              padding: '8px 12px',
              textAlign: 'center',
              background: 'var(--light-cream)',
              borderRadius: 6,
            }}
          >
            {cta.label}
          </div>
        ) : (
          <Link
            href={cta.href ?? `/projekt/${projekt.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--light-amber)',
              padding: '8px 12px',
              textAlign: 'center',
              background: 'var(--light-amber-glow)',
              borderRadius: 6,
              border: '1px solid var(--light-amber-border)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {cta.label}
          </Link>
        )
      ) : null}
    </div>
  )
}
```

**Notera:**
- Hela kortet är inte längre wrappat i `<Link>` — det skulle förstöra drag-drop. Klicka på namnet eller CTA navigerar.
- `e.stopPropagation()` på interaktiva element så drag-drop inte triggas.
- `cursor: 'grab'` ger visuell ledtråd för drag-funktionen.

**Acceptanskriterium:** ProjektKort renderas med ljus design, anbudsläge-badge syns när data finns, korrekt CTA visas baserat på status, drag-drop fungerar fortfarande.

---

### Operation 5 — Skapa `components/Notifikations­bell.tsx`

**Skapa fil** `components/NotifikationsBell.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Bell } from '@phosphor-icons/react'
import { useUppföljningar } from '@/lib/hooks/useUppföljningar'

export default function NotifikationsBell() {
  const { förfallna, isLoading } = useUppföljningar()

  if (isLoading) return null

  const count = förfallna?.length ?? 0

  return (
    <Link
      href="/uppfoljning"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        background: count > 0 ? 'var(--light-amber-glow)' : 'transparent',
        border: '1px solid var(--light-border)',
        textDecoration: 'none',
        color: count > 0 ? 'var(--light-amber)' : 'var(--light-t3)',
      }}
      aria-label={count > 0 ? `${count} förfallna uppföljningar` : 'Inga notifikationer'}
    >
      <Bell size={18} weight="bold" />
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'var(--light-red)',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            padding: '0 4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
```

**OBS:** Verifiera att `useUppföljningar`-hooken finns och returnerar `{ förfallna, isLoading }`. Om signaturen skiljer sig — anpassa.

---

### Operation 6 — Skapa filter-komponent

**Skapa fil** `components/PipelineFilter.tsx`:

```typescript
'use client'

import { Funnel, X } from '@phosphor-icons/react'
import { useState } from 'react'
import type { Anbudsläge, PipelineStatus } from '@/lib/types/projekt'

export type FilterState = {
  pipelineStatus: PipelineStatus | null
  kundtyp: string | null  // 'BRF' | 'Industri' | 'Service' etc.
  anbudsläge: Anbudsläge | null
}

type Props = {
  filter: FilterState
  onChange: (filter: FilterState) => void
}

const tomtFilter: FilterState = {
  pipelineStatus: null,
  kundtyp: null,
  anbudsläge: null,
}

export default function PipelineFilter({ filter, onChange }: Props) {
  const [öppen, setÖppen] = useState(false)
  const aktiva = [filter.pipelineStatus, filter.kundtyp, filter.anbudsläge].filter(Boolean).length

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setÖppen(!öppen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: aktiva > 0 ? 'var(--light-amber-glow)' : 'var(--light-bg)',
          border: `1px solid ${aktiva > 0 ? 'var(--light-amber-border)' : 'var(--light-border)'}`,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          color: aktiva > 0 ? 'var(--light-amber)' : 'var(--light-t2)',
          cursor: 'pointer',
        }}
      >
        <Funnel size={14} weight="bold" />
        Filtrera{aktiva > 0 ? ` (${aktiva})` : ''}
      </button>

      {öppen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--light-bg)',
            border: '1px solid var(--light-border)',
            borderRadius: 12,
            padding: 16,
            minWidth: 240,
            boxShadow: '0 8px 24px rgba(14,27,46,.08)',
            zIndex: 10,
          }}
        >
          <FilterGrupp
            label="Pipeline"
            options={[
              { value: 'inkorg', label: 'Inkorg' },
              { value: 'under_arbete', label: 'Under arbete' },
              { value: 'inskickat', label: 'Inskickat' },
              { value: 'tilldelning', label: 'Tilldelning' },
            ]}
            value={filter.pipelineStatus}
            onChange={(v) => onChange({ ...filter, pipelineStatus: v as PipelineStatus | null })}
          />
          <FilterGrupp
            label="Kundtyp"
            options={[
              { value: 'BRF', label: 'BRF' },
              { value: 'Fastighet', label: 'Fastighet' },
              { value: 'Industri', label: 'Industri' },
              { value: 'Service', label: 'Service' },
            ]}
            value={filter.kundtyp}
            onChange={(v) => onChange({ ...filter, kundtyp: v })}
          />
          <FilterGrupp
            label="Anbudsläge"
            options={[
              { value: 'STARKT_LÄGE', label: 'Starkt' },
              { value: 'BRA_LÄGE', label: 'Bra' },
              { value: 'OSÄKERT_LÄGE', label: 'Osäkert' },
              { value: 'SVÅRT_LÄGE', label: 'Svårt' },
            ]}
            value={filter.anbudsläge}
            onChange={(v) => onChange({ ...filter, anbudsläge: v as Anbudsläge | null })}
          />
          {aktiva > 0 && (
            <button
              type="button"
              onClick={() => onChange(tomtFilter)}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid var(--light-border)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--light-t3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <X size={12} weight="bold" /> Rensa filter
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FilterGrupp({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--light-t4)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {options.map((opt) => {
          const aktiv = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(aktiv ? null : opt.value)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${aktiv ? 'var(--light-amber-border)' : 'var(--light-border)'}`,
                background: aktiv ? 'var(--light-amber-glow)' : 'var(--light-bg)',
                color: aktiv ? 'var(--light-amber)' : 'var(--light-t3)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

---

### Operation 7 — Skapa sortera-komponent

**Skapa fil** `components/PipelineSortera.tsx`:

```typescript
'use client'

import { ArrowsDownUp } from '@phosphor-icons/react'
import { useState } from 'react'

export type SorteringNyckel = 'deadline' | 'värde' | 'anbudsläge' | 'skapad'

type Props = {
  värde: SorteringNyckel
  onChange: (v: SorteringNyckel) => void
}

const alternativ: { värde: SorteringNyckel; label: string }[] = [
  { värde: 'deadline', label: 'Deadline' },
  { värde: 'skapad', label: 'Senast skapad' },
  { värde: 'anbudsläge', label: 'Anbudsläge' },
  { värde: 'värde', label: 'Värde' },
]

export default function PipelineSortera({ värde, onChange }: Props) {
  const [öppen, setÖppen] = useState(false)
  const aktivLabel = alternativ.find((a) => a.värde === värde)?.label ?? 'Deadline'

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setÖppen(!öppen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: 'var(--light-bg)',
          border: '1px solid var(--light-border)',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--light-t2)',
          cursor: 'pointer',
        }}
      >
        <ArrowsDownUp size={14} weight="bold" />
        Sortera: {aktivLabel}
      </button>
      {öppen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--light-bg)',
            border: '1px solid var(--light-border)',
            borderRadius: 8,
            padding: 4,
            minWidth: 160,
            boxShadow: '0 8px 24px rgba(14,27,46,.08)',
            zIndex: 10,
          }}
        >
          {alternativ.map((opt) => (
            <button
              key={opt.värde}
              type="button"
              onClick={() => {
                onChange(opt.värde)
                setÖppen(false)
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: opt.värde === värde ? 'var(--light-amber-glow)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                color: opt.värde === värde ? 'var(--light-amber)' : 'var(--light-t2)',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### Operation 8 — Redesigna `dashboard/page.tsx`

Detta är den största filen. Den ändras på flera ställen:

**A. Imports — lägg till:**
```typescript
import KpiKort from '@/components/KpiKort'
import NotifikationsBell from '@/components/NotifikationsBell'
import PipelineFilter, { type FilterState } from '@/components/PipelineFilter'
import PipelineSortera, { type SorteringNyckel } from '@/components/PipelineSortera'
import { hämtaAnbudslägeFrånProjekt } from '@/lib/projekt-status'
import type { Projekt } from '@/lib/types/projekt'
```

**B. Ta bort:**
- Lokal `type Projekt` (importeras nu)
- Inline KPI-strip-rendering (rad 261-306)

**C. Lägg till state för filter och sortering:**
```typescript
const [filter, setFilter] = useState<FilterState>({
  pipelineStatus: null,
  kundtyp: null,
  anbudsläge: null,
})
const [sortering, setSortering] = useState<SorteringNyckel>('deadline')
```

**D. Filter- och sorterings-logik (lägg till efter befintlig pipeline-filtrering):**
```typescript
const filtreradePipeline = projekt
  .filter((p) => {
    if (filter.pipelineStatus && getPipelineKolumn(p) !== filter.pipelineStatus) return false
    if (filter.kundtyp && !p.namn.toLowerCase().includes(filter.kundtyp.toLowerCase())) {
      // Enkel matchning på namn-prefix tills kundtyp finns som eget fält
      return false
    }
    if (filter.anbudsläge && hämtaAnbudslägeFrånProjekt(p) !== filter.anbudsläge) return false
    return true
  })
  .sort((a, b) => {
    switch (sortering) {
      case 'deadline':
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      case 'skapad':
        return new Date(b.skapad).getTime() - new Date(a.skapad).getTime()
      case 'anbudsläge': {
        const ordning = { STARKT_LÄGE: 0, BRA_LÄGE: 1, OSÄKERT_LÄGE: 2, SVÅRT_LÄGE: 3 }
        const aLäge = hämtaAnbudslägeFrånProjekt(a)
        const bLäge = hämtaAnbudslägeFrånProjekt(b)
        const aOrd = aLäge ? ordning[aLäge] : 99
        const bOrd = bLäge ? ordning[bLäge] : 99
        return aOrd - bOrd
      }
      case 'värde':
        return (b.vinnande_pris ?? 0) - (a.vinnande_pris ?? 0)
      default:
        return 0
    }
  })

// Använd filtreradePipeline istället för befintlig projekt-array i kanban-rendering
```

**E. Page-bakgrund — lägg ljust:**
Hela page-wrappern får `style={{ background: 'var(--light-off)', minHeight: '100vh' }}` (eller liknande — ärver från layout men kan behöva override).

**F. Header-rad — lägg till:**
```jsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '24px 32px',
  background: 'var(--light-bg)',
  borderBottom: '1px solid var(--light-border)',
}}>
  <div>
    <h1 style={{
      fontSize: 24,
      fontWeight: 800,
      color: 'var(--light-t1)',
      margin: 0,
      letterSpacing: '-.02em',
    }}>
      Anbudspipeline
    </h1>
    <div style={{ fontSize: 13, color: 'var(--light-t4)', marginTop: 2 }}>
      {/* Aktuell månad eller relevant info */}
      {new Date().toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}
    </div>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <NotifikationsBell />
    <PipelineFilter filter={filter} onChange={setFilter} />
    <PipelineSortera värde={sortering} onChange={setSortering} />
    <button
      onClick={() => /* navigera till nytt-projekt eller öppna dialog */}
      style={{
        padding: '8px 16px',
        background: 'var(--light-amber)',
        color: 'var(--light-navy)',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      + Nytt projekt
    </button>
  </div>
</div>
```

**G. KPI-strip — ersätt inline-rendering med KpiKort-komponenten:**
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '24px 32px' }}>
  <KpiKort label="Aktiva anbud" value={projekt.length} sub={`${kräverÅtgärd} kräver åtgärd`} färg="amber" />
  <KpiKort label="Win rate" value={`${winRate}%`} sub={winRateTrend} färg="green" />
  <KpiKort label="Pipeline-värde" value={`${pipelineVärdeM}M`} sub="kr i aktiva anbud" färg="blue" />
  <KpiKort label="Närmaste deadline" value={närmasteDeadlineDagar ? `${närmasteDeadlineDagar} dgr` : '—'} sub={närmasteDeadlineNamn ?? 'Inga deadlines'} färg="orange" />
</div>
```

**OBS:** Värdena `kräverÅtgärd`, `winRate`, `winRateTrend`, `pipelineVärdeM`, `närmasteDeadlineDagar`, `närmasteDeadlineNamn` måste beräknas i samma logik som befintlig kpiData. Anpassa.

**H. Pipeline-grid — uppdatera färger till ljusa tokens:**
Kolumn-bakgrund från `var(--navy-mid)` till `var(--light-bg)` eller `var(--light-cream)`. Borders till `var(--light-border)`. Headertext till mörka light-tokens.

**Acceptanskriterium:** dashboard/page.tsx renderas i ljust läge med alla nya features funktionella.

---

### Operation 9 — Build + smoke-test

```bash
npm run build
```

**Förväntat:** 0 fel.

```bash
npm run dev
```

**Visuell smoke-test (8 punkter):**

1. **Bakgrund** — sidan är ljus
2. **Sidebar** — fortfarande ljus från 1C
3. **Header** — visar "Anbudspipeline" + månad + bell + filter + sortera + Nytt projekt-knapp
4. **KPI-strip** — 4 ljusa kort med rätt värden
5. **Pipeline-grid** — 4 kolumner ljusa, drag-drop fungerar
6. **ProjektKort** — ljusa, anbudsläge-badge syns, korrekt CTA per status
7. **Filter** — klick öppnar dropdown, filter applicerar
8. **Sortera** — ändrar ordning inom kolumner

**Acceptanstest för CTA-logik:**

För varje av dina 6 testprojekt, verifiera att rätt CTA visas:
- BRF Test 1 (under_arbete) → "Slutför kalkyl →" eller "Granska anbud →"
- BRF Vasastan (tilldelning) → UtfallsKnappar
- BRF Sundbyberg (tilldelning) → UtfallsKnappar
- BRF Hammarby Sjöstad (tilldelning) → UtfallsKnappar
- Volvo CE Eskilstuna (tilldelning) → UtfallsKnappar
- Test Win/Loss BRF (tilldelning) → UtfallsKnappar

---

### Operation 10 — Bonus-städning

```bash
rm components/ProjektKort.tsx.bak
```

Endast efter visuell verifiering är OK.

---

### Operation 11 — Commit (lokal, no push)

**Commit-meddelande:**

```
feat(app-design): Pipeline-vy redesign + nya CTA + filter/sortering (Steg 2A)

Pipeline-vyn (svebud.se/dashboard) går från mörk till ljus design
matchande landningssidan v7. Plus 7 nya funktioner.

Designändringar:
- Bakgrund + KPI-strip + pipeline-grid + ProjektKort till ljust
- KPI-strip ersätter inline-rendering med <KpiKort> (1D-komponent)
- Anbudsläge-badge på kort (STARKT/BRA/OSÄKERT/SVÅRT — utan procent)
- Datum-badges (Skickat 28 feb / Beslut 5 mar) baserat på status
- Header med titel + månad

Nya komponenter:
- components/NotifikationsBell.tsx — visar förfallna uppföljningar
- components/PipelineFilter.tsx — filter på pipeline/kundtyp/anbudsläge
- components/PipelineSortera.tsx — sortera deadline/värde/anbudsläge/skapad
- lib/types/projekt.ts — KONSOLIDERAR 3 driftade Projekt-typer
- lib/projekt-status.ts — bestämCta-helper (status-flagg-baserad CTA)

Funktionsändringar:
- ProjektKort visar nu olika CTA beroende på pipeline-state:
  Inkorg → "Starta analys", under_arbete (analys pågår) → disabled,
  under_arbete (analys klar) → "Slutför kalkyl",
  rekommendation klar → "Granska anbud",
  inskickat/tilldelning → UtfallsKnappar
- bedömningsVisning uppdaterad till ljusa tokens (var(--light-*))

Borttaget medvetet:
- Inline-stylade KPI-kort i dashboard/page.tsx
- Lokal type Projekt i 4 filer (importeras nu)

Spec: docs/PROMPT_app_design_step2a.md
```

---

## Acceptanskriterier (sammanfattat)

- [ ] `npm run build` 0 fel
- [ ] `lib/types/projekt.ts` finns, 1 enda `type Projekt`-definition i kodbasen
- [ ] `lib/projekt-status.ts` finns med `bestämCta` och `hämtaAnbudslägeFrånProjekt`
- [ ] `bedömningsVisning` använder ljusa tokens
- [ ] `components/ProjektKort.tsx` ljus design + CTA-logik + anbudsläge-badge
- [ ] `components/NotifikationsBell.tsx` finns
- [ ] `components/PipelineFilter.tsx` finns och fungerar
- [ ] `components/PipelineSortera.tsx` finns och fungerar
- [ ] `dashboard/page.tsx` ljus, KpiKort används, header med bell+filter+sortera
- [ ] Drag-drop fungerar fortfarande
- [ ] Visuell verifiering på alla 6 testprojekt OK
- [ ] Commit lokal, ej pushad

---

## Risker och fallbacks

**Risk 1: `useUppföljningar`-hook-signatur skiljer sig**
NotifikationsBell antar `{ förfallna, isLoading }`. Om hooken har annat API — anpassa.

**Risk 2: Drag-drop påverkas av ny ProjektKort-struktur**
Vi tog bort wrappande `<Link>`. Drag-drop ska fortfarande fungera via `onDragStart` på cardet. Verifiera live.

**Risk 3: Filter på "kundtyp"**
Inventeringen visade inget kundtyp-fält. Vi gör fuzzy match på `namn.toLowerCase().includes(...)`. Det är primitivt men funktionellt. Bättre lösning kräver ny kolumn — skip till Steg 2B eller separat sprint.

**Risk 4: TypeScript-fel pga drift mellan Projekt-typer**
När vi byter alla 4 filer till samma typ kan fel dyka upp där bantade typer var medvetna. Hantera per fall — använd `Pick<Projekt, ...>` om bantning är värdefull.

**Generell fallback:** Om en komponent (Filter/Sortera/Bell) blir för komplex att implementera — leverera utan den i denna commit, lägg `// TODO Steg 2A: lägg till X`-markering. Hellre 70% av specen levererad än 0% pga blocker.

---

## Efter denna spec

Pipeline-vyn är ljus, funktionellt rikare, med ny CTA-logik och alla nya features fungerande.

**Nästa: Steg 2B — Alla projekt-vyn (tabellvy med samma data, ljus design + sortering).**
