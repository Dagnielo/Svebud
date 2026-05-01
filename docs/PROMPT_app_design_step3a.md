# PROMPT_app_design_step3a.md

## Steg 3A — Förberedelser och arkitektur (Projekt-detaljvyn)

**Datum:** 1 maj 2026
**Mål:** Förberedande arkitektur INNAN visuell redesign av detaljvyn
**Estimerad tid:** 0,5 dag Claude Code-arbete (~1-1,5 timme)
**Risk:** Låg (inga visuella ändringar, bara typ-konsolidering + komponent-extraktion)
**Beroende:** Steg 1A-1D + Steg 2A + Steg 2B klara
**Följdsteg:** Steg 3B (Page wrapper + Header + Stepper redesign)

> **Vad detta gör:** Förbereder Projekt-detaljvyn för redesign genom att (1) skapa `ProjektDetalj`-typ separat från `Projekt`, (2) bryta ut 3 inline-komponenter till egna filer för återanvändning. INGA visuella ändringar görs i detta steg.

---

## Designprincip-kontext

Steg 3A är **arkitektur-fokus** — inga UI-ändringar, bara renare struktur. Det följer principen "städa golvet innan du målar väggarna". Den verkliga redesignen sker i Steg 3B-3E.

Anledningen till att städa först: detaljvyns 1632-radersfil är för stor för att redesigna säkert. Genom att bryta ut komponenter får vi:

- **Mindre filer** är lättare att granska visuellt vid redesign
- **Återanvändbara komponenter** kan användas i andra vyer (t.ex. SidePanel på alla-projekt)
- **Typsäkerhet** med explicit ProjektDetalj-typ undviker `(p as Record<string, unknown>)`-castningar

---

## Operationer

### Op 1 — Utöka `lib/types/projekt.ts` med ProjektDetalj-typ

**Hitta** `lib/types/projekt.ts` (skapad i Steg 2A för Projekt-konsolidering).

**Lägg till** efter befintlig `Projekt`-typ:

```typescript
/**
 * ProjektDetalj — utökad typ för detaljvyn (/projekt/[id])
 * Innehåller alla fält från Projekt PLUS detaljvy-specifika fält som
 * AI-genererat innehåll, inskickning-historik och anbudsutkast.
 *
 * OBS: Använd Projekt för listvyer (Pipeline, Alla projekt).
 * Använd ProjektDetalj endast i detaljvyn.
 */
export type ProjektDetalj = Projekt & {
  rekommendation: unknown                  // Innehåller följebrev, kalkyl-moment, totaler
  kravmatchning: unknown                   // match_procent, anbudsläge, sammanfattning, krav, frågor_till_kund
  anbudsutkast: string | null              // Original AI-utkast (markdown)
  anbudsutkast_redigerat: string | null    // Användar-redigerat — source of truth om finns
  inskickningar: Inskickning[] | null      // Versionshistorik
}

/**
 * Inskickning — versionshistorik-rad för anbudsutkast.
 */
export type Inskickning = {
  datum: string
  version: number
  snapshot: string         // HTML-snapshot av sparad utkast-version
  kommentar?: string
}
```

**Verifiera** att Inskickning-typen inte redan är definierad någon annanstans. Om ja — antingen flytta den hit eller importera från befintlig plats.

---

### Op 2 — Skapa `components/SidePanel.tsx`

**Skapa ny fil** med innehåll baserat på den lokala helpern i page.tsx (rad ~hitta `<SidePanel title=...>`-definition):

```typescript
'use client'

import { ReactNode } from 'react'

type SidePanelProps = {
  title: string
  children: ReactNode
  /**
   * Visa räknare i title (t.ex. "DOKUMENT (3)")
   */
  räknare?: number
  /**
   * Anpassad bg-färg om panelen ska sticka ut (t.ex. ANALYS-rutan)
   * Default: var(--light-bg)
   */
  bgFärg?: string
}

/**
 * SidePanel — ljus card-stil sektion för höger-panel i detaljvyn.
 * Återanvändbar för DOKUMENT, ANALYS, AKTIVITETSLOGG, CERTIFIKAT.
 *
 * OBS: Detta är arkitektur-extraktion (Steg 3A) — visuell redesign
 * av panelen sker i Steg 3B. Stylingen här är preliminär (mörka
 * tokens) tills Steg 3B migrerar till ljus.
 */
export default function SidePanel({
  title,
  children,
  räknare,
  bgFärg,
}: SidePanelProps) {
  return (
    <div
      style={{
        background: bgFärg ?? 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: 'var(--steel)',
          marginBottom: 12,
        }}
      >
        {title}
        {typeof räknare === 'number' && ` (${räknare})`}
      </div>
      {children}
    </div>
  )
}
```

**OBS:** Stylingen kopieras EXAKT från befintlig inline-implementation i page.tsx. INGA ändringar — bara extraktion. Färger förblir mörka tokens (Steg 3B byter dem senare).

---

### Op 3 — Skapa `components/AktivitetsLogg.tsx`

**Skapa ny fil** baserad på inline-rendering i page.tsx (rad ~1530-1539):

```typescript
'use client'

export type LoggRad = {
  id: string
  steg: string
  status: string
  meddelande: string | null
  skapad: string
}

type AktivitetsLoggProps = {
  logg: LoggRad[]
  /**
   * Max antal rader att visa. Default: 5
   */
  max?: number
}

/**
 * AktivitetsLogg — visar senaste händelser från extraktion_log.
 * Format: HH:MM meddelande
 *
 * OBS: Detta är arkitektur-extraktion (Steg 3A) — visuell redesign
 * sker i Steg 3B. Stylingen är preliminär (mörka tokens).
 */
export default function AktivitetsLogg({ logg, max = 5 }: AktivitetsLoggProps) {
  const synliga = logg.slice(0, max)

  if (synliga.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--steel)', fontStyle: 'italic' }}>
        Ingen aktivitet ännu
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {synliga.map((rad) => {
        const tid = new Date(rad.skapad).toLocaleTimeString('sv-SE', {
          hour: '2-digit',
          minute: '2-digit',
        })
        return (
          <div
            key={rad.id}
            style={{
              fontSize: 12,
              color: 'var(--muted-custom)',
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: 'var(--steel)', marginRight: 8 }}>{tid}</span>
            {rad.meddelande ?? `${rad.steg} – ${rad.status}`}
          </div>
        )
      })}
    </div>
  )
}
```

---

### Op 4 — Skapa `components/ProjektDetaljHeader.tsx`

**Skapa ny fil** baserad på inline-rendering i page.tsx (rad ~515-585):

```typescript
'use client'

import { useRouter } from 'next/navigation'
import type { ProjektDetalj } from '@/lib/types/projekt'

type ProjektDetaljHeaderProps = {
  projekt: ProjektDetalj
  /**
   * Bedömningsdata om kravmatchning finns
   */
  bedömning: { kort: string; färg: string; bgFärg: string } | null
  /**
   * Match-procent för bedömning-badge
   */
  matchProcent: number | null
  /**
   * Aktiv tab — påverkar om bedömning visas (doljs på föranmälan)
   */
  aktivTab: string
  /**
   * Snabboffert-flagga — visar Snabboffert-badge i headern
   */
  visaSnabboffert: boolean
  /**
   * Kundtyp för kundtyp-badge (om finns i kravmatchning)
   */
  kundtyp: string | null
  /**
   * Callback för deadline-ändring (auto-spara)
   */
  onDeadlineChange: (deadline: string | null) => void
}

/**
 * ProjektDetaljHeader — header för /projekt/[id]-sidan.
 * Innehåller: tillbaka-knapp + projektnamn + 3 badges + deadline-input.
 *
 * OBS: Detta är arkitektur-extraktion (Steg 3A) — visuell redesign
 * sker i Steg 3B. Stylingen är preliminär (mörka tokens).
 */
export default function ProjektDetaljHeader({
  projekt,
  bedömning,
  matchProcent,
  aktivTab,
  visaSnabboffert,
  kundtyp,
  onDeadlineChange,
}: ProjektDetaljHeaderProps) {
  const router = useRouter()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      padding: '20px 32px',
      borderBottom: '1px solid var(--navy-border)',
      background: 'var(--navy-mid)',
    }}>
      {/* Vänster: tillbaka + namn + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'transparent',
            border: '1px solid var(--navy-border)',
            color: 'var(--steel)',
            padding: '8px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← Pipeline
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--white-custom)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {projekt.namn}
          </div>
          {projekt.beskrivning && (
            <div style={{
              fontSize: 13,
              color: 'var(--muted-custom)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {projekt.beskrivning}
            </div>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {kundtyp && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 4,
              background: 'var(--steel-glow)',
              color: 'var(--steel)',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
            }}>
              {kundtyp}
            </span>
          )}
          {visaSnabboffert && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 4,
              background: 'var(--blue-glow)',
              color: 'var(--blue-accent)',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
            }}>
              Snabboffert
            </span>
          )}
          {bedömning && aktivTab !== 'foranmalan' && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 4,
              background: bedömning.bgFärg,
              color: bedömning.färg,
              textTransform: 'uppercase',
              letterSpacing: '.04em',
            }}>
              {bedömning.kort} {matchProcent !== null && `· ${matchProcent}%`}
            </span>
          )}
        </div>
      </div>

      {/* Höger: deadline-input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 12, color: 'var(--steel)' }}>Deadline:</span>
        <input
          type="date"
          value={projekt.deadline ?? ''}
          onChange={(e) => onDeadlineChange(e.target.value || null)}
          style={{
            background: 'var(--navy-mid)',
            border: projekt.deadline ? '1px solid var(--navy-border)' : '1px dashed var(--yellow)',
            color: 'var(--white-custom)',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 13,
            colorScheme: 'dark',
          }}
        />
      </div>
    </div>
  )
}
```

**OBS:** EXAKT samma styling som befintlig inline-implementation. Inga visuella ändringar. Steg 3B byter ut tokens till light-tokens.

---

### Op 5 — Refaktorera page.tsx att använda nya filer

**Hitta** `app/(app)/projekt/[projektId]/page.tsx`.

**Ändringar:**

1. **Byt typ-import:**
   ```typescript
   // Före
   type ProjektData = { /* ... 17 fält ... */ }

   // Efter
   import type { ProjektDetalj, Inskickning } from '@/lib/types/projekt'
   ```

   Ta bort lokal `ProjektData`-typ-definition. Byt alla `ProjektData` till `ProjektDetalj` i filen.

2. **Importera nya komponenter:**
   ```typescript
   import SidePanel from '@/components/SidePanel'
   import AktivitetsLogg, { type LoggRad } from '@/components/AktivitetsLogg'
   import ProjektDetaljHeader from '@/components/ProjektDetaljHeader'
   ```

3. **Ta bort lokal SidePanel-helper** — den finns nu i `components/SidePanel.tsx`.

4. **Ersätt aktivitetslogg-rendering** (rad ~1530-1539) med `<AktivitetsLogg logg={logg} max={5} />`.

5. **Ersätt header-rendering** (rad ~515-585) med:
   ```jsx
   <ProjektDetaljHeader
     projekt={projekt}
     bedömning={bedömning}
     matchProcent={kravmatch?.match_procent ?? null}
     aktivTab={aktivTab}
     visaSnabboffert={analysTyp === 'snabb'}
     kundtyp={/* extrahera från kravmatchning */}
     onDeadlineChange={async (d) => { /* befintlig auto-spara-logik */ }}
   />
   ```

6. **Verifiera** att inga onödiga type-castningar finns kvar:
   ```typescript
   // Före (om finns)
   const r = (projekt as any).rekommendation
   const k = (projekt as any).kravmatchning

   // Efter
   const r = projekt.rekommendation
   const k = projekt.kravmatchning
   ```

   (Typen ProjektDetalj har dem nu — castningar onödiga.)

---

### Op 6 — Build + smoke-test

```bash
npm run build
```

**Förväntat:** 0 fel.

```bash
npm run dev
```

**Visuell smoke-test (lokalt):**

1. Öppna `localhost:3000/dashboard`
2. Klicka på ett projekt — öppnar `/projekt/[id]`
3. Verifiera **att sidan ser EXAKT likadan ut som innan** (mörk design, alla element på rätt plats)
4. Tabbar fungerar (Dokument / Analys / Anbud / Föranmälan om vunnet)
5. Höger-panel visar DOKUMENT, ANALYS, AKTIVITETSLOGG som innan
6. Header har tillbaka-knapp + namn + badges + deadline
7. Inga konsole-fel

**Om något ser annorlunda ut → vi har inte gjort en ren extraktion.** Felsök innan commit.

---

### Op 7 — Commit (lokal, no push)

```
refactor(detaljvyn): konsolidera ProjektData + extrahera 3 komponenter (Steg 3A)

Förberedelser för Projekt-detaljvyns redesign. INGA visuella ändringar
i detta steg — bara arkitektur-städning innan Steg 3B startar.

Typ-konsolidering:
- Lägg till ProjektDetalj i lib/types/projekt.ts (extends Projekt)
- ProjektDetalj har 5 detaljvy-fält som inte finns i Projekt:
  rekommendation, kravmatchning, anbudsutkast, anbudsutkast_redigerat,
  inskickningar
- Lägg till Inskickning-typ för versionshistorik
- Ta bort lokal ProjektData-typ från page.tsx
- Ta bort onödiga (p as any)/(p as Record<string, unknown>)-castningar

Komponenter utbrutna till egna filer (för återanvändning):
- components/SidePanel.tsx — höger-panel-sektion (DOKUMENT/ANALYS/etc)
- components/AktivitetsLogg.tsx — senaste extraktion_log-rader
- components/ProjektDetaljHeader.tsx — header med rubrik + badges + deadline

Stylingen i utbrutna komponenter är EXAKT samma som inline-versionen
(mörka tokens). Steg 3B migrerar till ljus design.

Spec: docs/PROMPT_app_design_step3a.md
```

---

## Acceptanskriterier

- [ ] `npm run build` 0 fel
- [ ] `lib/types/projekt.ts` har både `Projekt` och `ProjektDetalj` exporterade
- [ ] `components/SidePanel.tsx` finns och fungerar
- [ ] `components/AktivitetsLogg.tsx` finns och fungerar
- [ ] `components/ProjektDetaljHeader.tsx` finns och fungerar
- [ ] `page.tsx` använder nya komponenter (inga inline-versioner kvar)
- [ ] `page.tsx` använder `ProjektDetalj`-typen (inga lokal typ kvar)
- [ ] Detaljvyn ser **EXAKT** likadan ut visuellt som innan refaktoreringen
- [ ] Inga onödiga type-castningar
- [ ] Inga konsole-fel
- [ ] Tabbar växlar fortfarande korrekt
- [ ] Höger-panel visar samma 3 sektioner
- [ ] Auto-spara fungerar fortfarande (deadline)
- [ ] Polling fungerar fortfarande
- [ ] Commit lokal, ej pushad

---

## Risker

**Risk 1: SidePanel-extraktion bryter inline-styling**
SidePanel används 3 gånger med olika props (DOKUMENT med räknare, ANALYS med bedömning-färg, AKTIVITETSLOGG enkel). Verifiera att alla 3 användningar fungerar efter extraktion. Om någon såg annorlunda ut innan — säg till.

**Risk 2: Header-extraktion missar conditional logic**
Headern har flera conditional-renderingar (kundtyp-badge bara om finns, snabboffert-badge bara vid analysTyp='snabb', bedömning bara om kravmatch finns OCH inte föranmälan-tab). Verifiera ALLA conditions överförda korrekt.

**Risk 3: ProjektDetalj-typ-bryter befintliga funktioner**
Om någon funktion i page.tsx använder `(projekt as Record<string, unknown>).någotFält` där `någotFält` INTE finns i ProjektDetalj — TypeScript-fel. Vi måste anpassa typen om vi missat ett fält. Lös genom att lägga till saknade fält i ProjektDetalj.

**Risk 4: useRouter() i ProjektDetaljHeader**
Headern använder `useRouter()` direkt istället för att ta callback från parent. Är OK eftersom navigationen alltid går till `/dashboard`. Men om det visar sig att vi vill testa headern isolerat → ändra till callback senare.

**Risk 5: Inskickning-typ kan finnas på annan plats**
Om `Inskickning` redan är definierad i en annan fil (t.ex. i page.tsx eller en API-route) — flytta hit eller importera från befintlig plats. Verifiera med `grep -r "type Inskickning" .`

---

## Ej i scope (Steg 3B-3E)

- Visuell redesign av page.tsx (page-bg, padding, layout)
- Header-styling till ljus
- Stepper-styling till ljus
- SidePanel-styling till ljus
- AktivitetsLogg-styling till ljus
- Tab-styling
- Tab-innehåll (AnbudsUppladdning, GranskningSida, SnabboffertVy, RotKalkyl, KvalitetsPanel, KalkylVy, ForanmalanTracker)
- Emoji → Phosphor (📄 🔍 ⚡ → ←)
- PostHog-events utöver befintliga
