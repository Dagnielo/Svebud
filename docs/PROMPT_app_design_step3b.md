# PROMPT_app_design_step3b.md

## Steg 3B — Projekt-detaljvyns ram (visuell redesign)

**Datum:** 2 maj 2026
**Mål:** Migrera detaljvyns "ram" från mörk till ljus design
**Estimerad tid:** 0,5–1 dag Claude Code-arbete (~1-2 timmar)
**Risk:** Medel (5 filer ändras, visuell migration)
**Beroende:** Steg 3A pushad till origin/main (`31f83bb`)
**Följdsteg:** Steg 3C (Tab 1 Dokument + AnbudsUppladdning + KvalitetsPanel)

> **Vad detta gör:** Migrerar detaljvyns "ram" till ljus design enligt
> Pipeline-vyns designspråk. Tab-innehåll (de 7 specialkomponenterna)
> körs i Steg 3C-3E. Phosphor-ikoner ersätter alla 4 emojis i ramen.

---

## Designprincip-kontext

Från `CLAUDE.md ## Designprinciper`:
> SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår
> elinstallation. AI är medlet — inte budskapet, inte identiteten.

**Konsekvenser för Steg 3B:**
- **Designspråk-konsekvens** med Pipeline-vyn — samma cream-bg, samma
  subtila shadows, samma typografiska hierarki
- **Phosphor Bold** ersätter alla 4 emojis i ramen (📅 ⚡ ← →)
- **Lärdom från Steg 3A:** Live ÄR sanningen. Spec-kod nedan är
  förslag — kopiera **EXAKT styling** för delar som ska se identiska
  ut, anpassa **bara färger + ikoner** för delar som ska migreras

---

## Designval (bekräftade av användaren — alla rekommendationer)

| Aspekt | Val | Konsekvens |
|--------|-----|------------|
| Page-bg | A | `var(--light-cream)` (samma som Pipeline) |
| Header-border | B | 1px ljus border (designspråk-konsekvens) |
| Tillbaka-knapp | B | "← Tillbaka" generisk (Phosphor ArrowLeft) |
| Stepper | A | Behåll struktur, byt färger till light-tokens |
| Föranmälan-ikon | A | Phosphor Lightning (matchar SveBud-logon) |
| Höger-panel | A | Vita kort med subtil shadow |
| Deadline-input | A | Behåll struktur, Phosphor Calendar, amber dashed när tom |
| Bedömning-badge | A | Behåll exakt — bedömningsVisning redan migrerad |

---

## Vad som ÄR i scope

- `app/(app)/projekt/[projektId]/page.tsx` — page-bg, layout, padding
- `components/ProjektDetaljHeader.tsx` — full migration till ljus
- `components/SidePanel.tsx` — full migration till ljus
- `components/AktivitetsLogg.tsx` — full migration till ljus
- Stepper-rendering (i page.tsx) — färger till light-tokens
- Tab-styling (TabsTrigger om synliga, men det ÄR de inte — `<TabsList className="hidden">`)
  - Egen stepper triggar tab-byte → ingen Tabs-styling behövs

## Vad som INTE är i scope

- AnbudsUppladdning, GranskningSida, SnabboffertVy, RotKalkyl,
  ForanmalanTracker, KvalitetsPanel, KalkylVy (Steg 3C-3E)
- Markdown-rendering (utkast-förhandsvisning) — ändras inte
- Auto-spara-logik — bevaras
- Polling-logik — bevaras
- Aktivitetslogg-rader-format (HH:MM meddelande) — bevaras
- PostHog-events — inga nya

---

## Operationer

### Op 1 — page.tsx page-bg + layout-padding

**Hitta** root-`<div>` i `app/(app)/projekt/[projektId]/page.tsx`.

**Ändringar:**

```typescript
// Före (mörk)
<div style={{
  background: 'var(--navy)',
  minHeight: '100vh',
  ...
}}>

// Efter (ljus)
<div style={{
  background: 'var(--light-cream)',
  minHeight: '100vh',
  ...
}}>
```

**Hitta** layout-grid för main-content + höger-panel (förmodligen
`gridTemplateColumns: '1fr 320px'`).

**Verifiera:** Bevara conditional `aktivTab === 'foranmalan' ? '1fr' : '1fr 320px'`.
**Bevara:** Padding/margin-värden (om de finns) — bara färg byts.

---

### Op 2 — ProjektDetaljHeader full migration till ljus

**Fil:** `components/ProjektDetaljHeader.tsx`

**Strukturella ändringar (ALLT som var mörkt → ljus):**

```typescript
// Wrapper
background: 'var(--navy-mid)' → 'var(--light-bg)'
borderBottom: '3px solid var(--yellow)' → '1px solid var(--light-border)'

// Tillbaka-knapp
background: 'transparent' (oförändrad)
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
color: 'var(--steel)' → 'var(--light-t2)'

// h1 (projektnamn)
color: 'var(--white-custom)' → 'var(--light-t1)'

// Beskrivning + skapad-undertitel
color: 'var(--muted-custom)' → 'var(--light-t3)'

// Kundtyp-badge
background: 'var(--steel-glow)' → 'var(--light-cream)'
color: 'var(--steel)' → 'var(--light-t2)'

// Snabboffert-badge (BEHÅLL grön)
background: 'rgba(0,198,122,0.1)' → 'var(--light-green-bg)'
color: 'var(--green)' → 'var(--light-green)'

// Bedömning-badge (bedömningsVisning redan migrerad)
// Behåll EXAKT som live — färg + bgFärg från bedömningsVisning

// Deadline-input wrapper
"Sätt deadline →"-text om null:
  color: 'var(--yellow)' → 'var(--light-amber)'

// Deadline-input fält
background: 'var(--navy-mid)' → 'var(--light-bg)'
border (med deadline): '1px solid var(--navy-border)' → '1px solid var(--light-border)'
border (utan deadline): '1px dashed var(--yellow)' → '1px dashed var(--light-amber)'
color: 'var(--white-custom)' → 'var(--light-t1)'
colorScheme: 'dark' → 'light'
```

**Phosphor-byten:**

```typescript
// Före: '←' unicode i tillbaka-knapp
// Efter:
import { ArrowLeft, Calendar } from '@phosphor-icons/react'

<button onClick={...}>
  <ArrowLeft size={14} weight="bold" />
  Tillbaka  {/* INTE "Pipeline" — generisk */}
</button>

// Före: 📅-emoji bredvid deadline-text
// Efter:
<Calendar size={14} weight="bold" color="var(--light-t3)" />
```

**Tillbaka-knapp router-mål:**

`router.push('/dashboard')` — BEHÅLL som det är. Användaren kan komma
från `/dashboard` eller `/alla-projekt` men `/dashboard` är säker default.
(Smart-navigation via `router.back()` är **inte** i scope för 3B —
kommer i senare polish om önskat.)

**EXAKT live-styling som ska bevaras:**

- Layout (flex med gap, padding, alignment)
- 3 badges sida vid sida
- h1 fontSize: 22, fontWeight: 800
- Tillbaka-knapp fontSize: 12, padding: 4px 10px
- Beskrivning + skapad-undertitel under h1
- Bedömning-badge format: `${kort} ${procent}%`
- Bedömning-badge **doljs** på föranmälan-tab

---

### Op 3 — Stepper i page.tsx (färger till light-tokens)

**Hitta** stepper-rendering i page.tsx (rad ~590-620 enligt inventering).

**Ändringar (bara färger — struktur oförändrad):**

```typescript
// Cirkel-bg (numreringen 1, 2, 3)
'var(--green)' → 'var(--light-green)'         // done
'var(--yellow)' → 'var(--light-amber)'        // active
'var(--steel)' → 'var(--light-t4)'            // ej-aktiv

// Cirkel-text (numret)
color: oförändrat (white) — kontrast mot färgad bg

// Stegnamn-text (Dokument, Analys & Bedömning, Anbud & Skicka)
color: 'var(--white-custom)' → 'var(--light-t1)'
color (ej-aktiv): 'var(--muted-custom)' → 'var(--light-t4)'

// Status-text under stegnamn ("Klart ✓" / "← Du är här")
'var(--green)' → 'var(--light-green)'
'var(--yellow)' → 'var(--light-amber)'

// Linjer mellan steg
'var(--steel)' → 'var(--light-border)'
'var(--green)' (klar-linje) → 'var(--light-green)'
```

**Phosphor på "Klart ✓":**

```typescript
// Före:
<span>Klart ✓</span>

// Efter:
import { Check } from '@phosphor-icons/react'

<span style={{...}}>
  Klart <Check size={11} weight="bold" />
</span>
```

(Unicode-bocken `✓` byts mot Phosphor `Check`. Designprincipen säger
Phosphor som enda ikon-system.)

**På "← Du är här":**

```typescript
// Före:
<span>← Du är här</span>

// Efter:
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
  <ArrowLeft size={11} weight="bold" />
  Du är här
</span>
```

---

### Op 4 — Föranmälan-flik (Phosphor Lightning + ljus design)

**Hitta** Föranmälan-flik-rendering (rad ~622-639).

**Ändringar:**

```typescript
// Före (live):
<button style={{
  background: '#4A9EFF',
  color: 'white',
  ...
}}>
  ⚡ Föranmälan
</button>

// Efter (ljus + Phosphor):
import { Lightning } from '@phosphor-icons/react'

<button style={{
  background: 'var(--light-blue-bg)',
  color: 'var(--light-blue)',
  border: '1px solid var(--light-blue)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  ...
}}>
  <Lightning size={14} weight="bold" />
  Föranmälan
</button>
```

**Bevara:** Conditional rendering (visas bara om `tilldelning_status === 'vunnet'`).
**Bevara:** Klick-handler (sätter aktivTab till 'foranmalan').

---

### Op 5 — SidePanel full migration till ljus + shadow

**Fil:** `components/SidePanel.tsx`

**Ändringar:**

```typescript
// Wrapper
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: 12 → 12 (oförändrat)
padding: 16 → 16 (oförändrat)
marginBottom: 14 → 14 (oförändrat)

// Lägg till shadow (matchar KpiKort på Pipeline-vyn)
boxShadow: '0 1px 2px rgba(14,27,46,.04)'

// Title
color: 'var(--muted-custom)' → 'var(--light-t3)'
// fontSize, fontWeight, letterSpacing — oförändrat
```

**Bevara:** Räknare-format `(N)` efter title-strängen.
**Bevara:** `bgFärg`-prop för specialfall (om används någonstans).

---

### Op 6 — AktivitetsLogg full migration till ljus

**Fil:** `components/AktivitetsLogg.tsx`

**Ändringar:**

```typescript
// Tid-prefix (HH:MM)
color: 'var(--steel)' → 'var(--light-t4)'
// fontFamily monospace — oförändrat

// Meddelande-text
color: 'var(--soft)' → 'var(--light-t2)'

// Empty-state ("Ingen aktivitet ännu")
color: 'var(--slate)' → 'var(--light-t4)'
fontStyle: italic — oförändrat
```

---

### Op 7 — DOKUMENT-panel statuspunkt-färger

**Hitta** DOKUMENT-panel-rendering i page.tsx (i höger-panel-blocket).

Filnamn-rader har en statuspunkt:
- Grön punkt = extraherad
- Gul punkt = väntar

**Ändringar:**

```typescript
// Statuspunkt-färger
'var(--green)' (extraherad) → 'var(--light-green)'
'var(--yellow)' (väntar) → 'var(--light-amber)'

// Filnamn-text
color: 'var(--white-custom)' → 'var(--light-t1)'

// Storlek/datum-undertitel
color: 'var(--muted-custom)' → 'var(--light-t3)'
```

---

### Op 8 — ANALYS-panel migration

**Hitta** ANALYS-panel-rendering i page.tsx.

**Ändringar:**

```typescript
// Bedömning-label (färgad)
// bedömningsVisning redan migrerad till light-tokens — inga ändringar

// Sammanfattning-text under bedömning
color: 'var(--soft)' → 'var(--light-t2)'

// Eventuella borders/separators
'var(--navy-border)' → 'var(--light-border)'
```

---

### Op 9 — Build + smoke-test

```bash
npm run build
```

**Förväntat:** 0 fel.

```bash
npm run dev
```

**Visuell smoke-test (lokalt):**

Öppna `localhost:3000/projekt/[någon-id]`. Verifiera:

1. **Page-bg är ljus cream** — samma som Pipeline-vyn
2. **Header är ljus** — vit bg, 1px ljus border-bottom
3. **Tillbaka-knapp:** Phosphor `ArrowLeft` + "Tillbaka" (inte "Pipeline")
4. **Projektnamn är mörk text** — läsbar mot ljus header
5. **3 badges** (kundtyp grå, snabboffert grön, bedömning färgad)
6. **Deadline-input:** Phosphor `Calendar` + "Sätt deadline →"-text om tom
   (amber dashed border)
7. **Bedömning-badge doljs på föranmälan-tab** (testa: klicka tabben)
8. **Stepper:** ljusa färger, Phosphor `Check` istället för ✓, Phosphor
   `ArrowLeft` istället för ←
9. **Föranmälan-flik (om visas):** Phosphor `Lightning` + ljus blå design
10. **Höger-panel:** vita kort med subtil shadow
11. **DOKUMENT-statuspunkter:** ljus grön/amber
12. **ANALYS-bedömning:** färg från bedömningsVisning (redan migrerad)
13. **AKTIVITETSLOGG:** mörk text på vit bg, läsbar
14. **Tab-bytning fungerar** (alla 4 tabs: Dokument / Analys / Anbud / Föranmälan)

**OBS:** Tab-INNEHÅLLET (AnbudsUppladdning, GranskningSida, etc.) är
**fortfarande mörkt** — det är förväntat. Bara ramen är ljus i 3B.

---

### Op 10 — Commit (lokal, no push)

```
feat(detaljvyn): ramen ljus design (Steg 3B)

Projekt-detaljvyns ram (page-bg, header, stepper, höger-panel)
migrerad från mörk navy till ljus designspråk matchande Pipeline-vyn.

Migrerade filer:
- app/(app)/projekt/[projektId]/page.tsx (page-bg, stepper, höger-panel)
- components/ProjektDetaljHeader.tsx (full ljus migration)
- components/SidePanel.tsx (full ljus + shadow)
- components/AktivitetsLogg.tsx (full ljus)

Designändringar:
- Page-bg cream (--light-cream)
- Header med 1px ljus border (Pipeline-vyn-konsekvens)
- Tillbaka-knapp generisk "← Tillbaka" (var "← Pipeline")
- Stepper i light-tokens (grön klart / amber aktiv / grå kommande)
- Höger-panel: vita kort med subtil shadow

Phosphor ersätter 4 emojis/unicode i ramen:
- 📅 → Calendar (deadline-input)
- ⚡ → Lightning (Föranmälan-flik)
- ← → ArrowLeft (Tillbaka-knapp + "Du är här")
- ✓ → Check ("Klart"-status)

OBS: Tab-INNEHÅLL fortfarande mörkt — migreras i Steg 3C-3E.

Spec: docs/PROMPT_app_design_step3b.md
```

---

## Acceptanskriterier

- [ ] `npm run build` 0 fel
- [ ] Page-bg ljus cream
- [ ] Header ljus med 1px border
- [ ] Tillbaka-knapp visar Phosphor ArrowLeft + "Tillbaka"
- [ ] Tillbaka-knapp navigerar till `/dashboard`
- [ ] Projektnamn + beskrivning + skapad-datum läsbart
- [ ] 3 badges på rätt plats (kundtyp / snabboffert grön / bedömning)
- [ ] Bedömning-badge doljs på föranmälan-tab
- [ ] Deadline-input: Phosphor Calendar + amber dashed när tom
- [ ] "Sätt deadline →"-text visas när deadline saknas
- [ ] Stepper: ljusa färger, Phosphor Check + ArrowLeft
- [ ] Föranmälan-flik (om visas): Phosphor Lightning + ljus blå
- [ ] Höger-panel: vita kort med subtil shadow
- [ ] DOKUMENT-statuspunkter: ljus grön/amber
- [ ] ANALYS-bedömning: färg fungerar
- [ ] AKTIVITETSLOGG: läsbar mörk text på vit bg
- [ ] Tab-bytning fungerar (alla 4 tabs)
- [ ] Auto-spara på deadline fungerar
- [ ] Polling fungerar
- [ ] Inga konsole-fel
- [ ] Tab-INNEHÅLL är fortfarande mörkt (förväntat — Steg 3C-3E migrerar)
- [ ] Commit lokal, ej pushad

---

## Risker

**Risk 1: Tab-innehåll och ram ser olika ut (förväntat men störande)**
När ramen är ljus och tab-innehållet (AnbudsUppladdning etc.) är mörk
blir det visuellt dissonant. Det är **medvetet och tillfälligt** —
Steg 3C-3E migrerar tab-innehållet. Men det är värt att veta innan
visuell verifiering så det inte registreras som bug.

**Risk 2: Stepper-färger för subtila mot cream-bg**
`--light-amber` (#C8960A) är mer dämpad än `--yellow` (#FFD600). Det
kan göra "aktiv steg" mindre tydlig än tidigare. Verifiera visuellt.
Om för subtilt → överväg amber-glow som bg + amber text.

**Risk 3: Bedömning-badge på föranmälan-tab**
Live har conditional `bedömning && aktivTab !== 'foranmalan'`. Verifiera
att den döljs korrekt på föranmälan-tab efter migration.

**Risk 4: Snabboffert-badge grön bevarad**
Steg 3A noterade att specens snabboffert-färg var blå men live är grön.
För 3B: BEHÅLL grön. `var(--light-green)` + `var(--light-green-bg)`.

**Risk 5: tab-innehåll bryter pga light-tokens på ramen**
Sannolikt inte — tab-innehåll har egna styling som inte ärver från ramen.
Men verifiera att inga komponenter förlitar sig på `var(--navy)` page-bg
som "background-färg" för transparens-effekter.

**Risk 6: colorScheme: 'light' på deadline-input**
Datepickern på date-input följer browserns mörka/ljusa läge via colorScheme.
Bytt till 'light' för att kalendern matchar ljus app-design. Om användaren
har dark mode i OS — kalender-dropdownen är fortfarande ljus (önskat
beteende inom appen).

---

## Notering om colorScheme

`colorScheme: 'light'` på deadline-input gör att HTML5 datepicker-
kalendern (som öppnas vid klick) renderas i ljust tema oavsett OS-
preferens. Det är **rätt** beslut för en ljus app — vi vill inte ha
mörk datepicker som öppnar sig från ljus app.

---

## Ej i scope (Steg 3C-3E)

- Tab-innehåll (Dokument-tab, Analys-tab, Anbud-tab)
- AnbudsUppladdning-komponent
- GranskningSida + SnabboffertVy + RotKalkyl
- KvalitetsPanel
- KalkylVy
- ForanmalanTracker
- Markdown-rendering (utkast-förhandsvisning)
- PostHog-events (Steg 3 senare polish om önskat)
- Smart router.back() istället för router.push('/dashboard')
