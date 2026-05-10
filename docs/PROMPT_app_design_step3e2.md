# Steg 3E.2 — ForanmalanTracker till light-tokens

**Scope:** `components/ForanmalanTracker.tsx` (744 rader, 9 blocks, 2 Dialogs, 19 useState)
**Estimerat:** ~120 mörka tokens, ~13 emojis i komponent (~15 i lib bevaras)
**Stop-punkter:** 3 (efter Block 0-1, efter Block 2-4 stepper, efter Block 5-9)
**Push-strategi:** Lokal commit. Push diskuteras efter STOP 3-verifiering.

---

## Designprinciper (från 3D + 3E.1-lärdomar)

1. **Live ÄR sanningen.** Ren färg-migration utan UX-ändringar.
2. **Spec är förslag.** Plan mode-avvikelser uppmuntras vid live-konflikt.
3. **Phosphor-skuld accepteras.** ~13 emojis i komponent + ~15 i lib behålls för Steg 3F-rensning.
4. **Lib förblir oförändrad.** `lib/foranmalan-regler.ts` rörs INTE i 3E.2 — emoji-property + hex-färger behålls. 3F hanterar dem.
5. **Mappnings-tabell i komponenten** för stegId → light-token (Q1 val C).

---

## Token-mappning (från 3D + 3E.1 — oförändrad)

| Mörk token | Light token |
|------------|-------------|
| `var(--navy-mid)` | `var(--light-bg)` |
| `var(--navy)` | `var(--light-bg)` eller `var(--light-cream)` |
| `var(--navy-light)` | `var(--light-off)` |
| `var(--navy-border)` | `var(--light-border)` |
| `var(--white)` | `var(--light-t1)` |
| `var(--soft)` | `var(--light-t2)` |
| `var(--muted-custom)` | `var(--light-t3)` |
| `var(--slate)` | `var(--light-t4)` |
| `var(--steel)` | `var(--light-t4)` |
| `var(--green)` | `var(--light-green)` |
| `var(--green-bg)` | `var(--light-green-bg)` |
| `var(--orange)` | `var(--light-orange)` |
| `var(--orange-bg)` | `var(--light-orange-bg)` |
| `var(--red)` | `var(--light-red)` |
| `var(--yellow)` | `var(--light-amber)` |
| `var(--yellow-glow)` eller motsv. | `var(--light-amber-glow)` |
| Hex `#F5C400` (lib) | `var(--light-amber)` (via mappnings-tabell) |
| Hex `#4A9EFF` (lib) | `var(--light-blue)` (via mappnings-tabell) |
| Hex `#00C67A` (lib) | `var(--light-green)` (via mappnings-tabell) |

**boxShadow på alla kort:** `0 1px 2px rgba(14,27,46,.04)`

---

## Phosphor-imports (NYA i Steg 3E.2)

Lägg till i `ForanmalanTracker.tsx`:

```tsx
import { ArrowSquareOut } from "@phosphor-icons/react";
```

**Bara EN ny import.** Övriga emojis (📋✕💬✉⏱🏢🔔👤📅⚠⏰⚡↗) bevaras för 3F. ⚡ är SveBud-identitet och bevaras permanent enligt CLAUDE.md.

---

## Mappnings-tabell (NY i komponenten)

Lägg till efter import-block (cirka rad 8):

```tsx
// Mappnings-tabell: stegId → light-token för dynamisk styling
// (lib använder hex-färger som business-logik, komponenten översätter till tokens)
const STEG_LIGHT_TOKEN: Record<StegId, string> = {
  vunnet: 'var(--light-amber)',
  fore: 'var(--light-blue)',
  medgivande: 'var(--light-blue)',
  installation: 'var(--light-blue)',
  fardig: 'var(--light-blue)',
  klar: 'var(--light-green)',
};
```

**Användning:** Där live har `style={{ color: stegInfo.färg }}` → byts till `style={{ color: STEG_LIGHT_TOKEN[stegInfo.id] }}`.

**Verifiera vid migration:** Finns det fler ställen i koden som refererar `stegInfo.färg` eller `jobbInfo.färg`? Använd grep om osäkert.

---

# FAS 1 — Top-level + Block 0-1 (Op 1-3)

## Op 1 — Imports + Mappnings-tabell

**Plats:** `ForanmalanTracker.tsx` rad 1-8

**Ändring:**
- Lägg till `import { ArrowSquareOut } from "@phosphor-icons/react";`
- Lägg till `STEG_LIGHT_TOKEN`-mappnings-tabellen efter alla imports

**Verifiera:** Inga andra Phosphor-imports finns redan (de behövs inte här — alla andra emojis bevaras).

## Op 2 — Block 0 (Loading-skeleton, rad 150-152)

**Q3 val A — light-bg neutral:**

**Före:**
```tsx
<div
  className="animate-pulse h-20 rounded-xl"
  style={{ background: 'var(--navy-mid)' }}
/>
```

**Efter:**
```tsx
<div
  className="animate-pulse h-20 rounded-xl"
  style={{
    background: 'var(--light-bg)',
    border: '1px solid var(--light-border)'
  }}
/>
```

## Op 3 — Block 1 (Ingen tracker + Skapa-dialog, rad 155-253)

**Q4 val C — ren färg-migration:**

**Tom-state-kort (rad ~157-178):**
- Wrapper: `var(--navy-mid)` → `var(--light-bg)` + `boxShadow: '0 1px 2px rgba(14,27,46,.04)'`
- Border: `var(--navy-border)` → `var(--light-border)`
- 📋-emoji-cirkel: yellow-glow → light-amber-glow
- Rubrik: `var(--white)` → `var(--light-t1)`
- Förklarings-text: `var(--muted-custom)` → `var(--light-t3)`
- "+ Starta tracker"-knapp: yellow → light-amber bg + light-navy text
- **📋-emoji BEVARAS för 3F**

**Skapa-dialog (Dialog 1, rad ~179-250) — Q5 val A:**

**DialogContent:**
- `var(--navy-mid)` → `var(--light-bg)` (light-bg är mer neutral än vit mot ljus bakgrund)
- Border: `var(--navy-border)` → `var(--light-border)`
- boxShadow + max-width oförändrade

**DialogTitle:**
- `var(--white)` → `var(--light-t1)`

**Jobbtyp-grid (2-grid, 9 jobbtyper med emoji):**
- Per knapp inaktiv: `var(--navy-light)` bg + `var(--navy-border)` border + `var(--soft)` text → `var(--light-off)` bg + `var(--light-border)` border + `var(--light-t2)` text
- Per knapp aktiv: yellow-glow bg + yellow border + yellow text → light-amber-glow bg + light-amber border + light-amber text
- **9 jobbtyp-emojis (⚡☀️🔋🌡️🛁🏗️🔌🏢🔧) BEVARAS** — de kommer från lib

**Nätbolag-input + Kund-inputs:**
- Bakgrund: `var(--navy)` → `var(--light-bg)` (vit inputs känns starkare än light-bg mot light-bg-dialog — testa, verifiera vid migration om input behöver vara vit istället)
- Border: `var(--navy-border)` → `var(--light-border)`
- Text: `var(--white)` → `var(--light-t1)`
- Placeholder: `var(--slate)` → `var(--light-t4)`
- Labels: `var(--muted-custom)` → `var(--light-t3)`

**"Starta tracker"-knapp:**
- Disabled-state: keep disabled-styling med light-amber-glow + light-t4 text
- Enabled: light-amber bg + light-navy text

**Avbryt-knapp:**
- Light-border + light-t2 text

## ⏸ STOP 1 — Verifiering Block 0-1 (tom-state-flöde)

**Test-villkor:** Vunnet projekt UTAN befintlig tracker (eller skapa nytt vunnet projekt).

**Test 1:** Tab 4 (Föranmälan) — Block 1 tom-state ljus
**Test 2:** Klicka "+ Starta tracker" → Dialog 1 öppnas med light-bg + light-border
**Test 3:** Jobbtyp-grid: klicka olika jobbtyper, aktiv-state light-amber-glow
**Test 4:** Inputs fungerar, text light-t1
**Test 5:** "Starta tracker"-knapp aktiveras när formulär giltigt
**Test 6:** Skapa tracker → Block 1 ersätts av Block 2-9 (men de är fortfarande mörka — förväntat tills FAS 2)
**Test 7:** Inga JS-fel

---

# FAS 2 — Aktiv tracker headers + stepper (Op 4-6)

## Op 4 — Block 2 Header (rad 269-312)

**Q6 val A — light-amber-glow cirkel:**

**Wrapper:**
- Vit kort + `var(--light-border)` + boxShadow

**Jobbtyp-emoji-cirkel:**
- Bakgrund: yellow-glow → `var(--light-amber-glow)`
- Border: yellow → `var(--light-amber)`
- Emoji (jobbInfo.emoji) BEVARAS

**Rubrik "Föranmälan — {label}":**
- `var(--white)` → `var(--light-t1)`

**Nätbolag + kund-info:**
- Labels `var(--muted-custom)` → `var(--light-t3)`
- Värden `var(--soft)` → `var(--light-t2)`

**Status-pill:**
- Klar (`fp.nuvarande_steg === 'klar'`): green-bg + green text → `var(--light-green-bg)` + `var(--light-green)`
- Annars: yellow-glow + yellow text → `var(--light-amber-glow)` + `var(--light-amber)`

## Op 5 — Block 3 Progress-stepper (rad 315-399) ⚠️ KRITISK

**Q7-mappning — komplex multi-state styling:**

**Wrapper:**
- Behåll layout (horizontal stepper) — bara token-byte

**Bakgrundslinje:**
- `var(--navy-border)` → `var(--light-border)`

**Progresslinje (dynamisk bredd):**
- Klar-färg (`var(--green)`) → `var(--light-green)`
- Aktiv-färg (`var(--yellow)`) → `var(--light-amber)`

**Per cirkel (40×40, 6 cirklar):**

| State | Före | Efter |
|-------|------|-------|
| Klar (`i < idx`) | green fylld bg + white text | `var(--light-green)` fylld bg + `var(--light-t1)` text |
| Aktiv (`i === idx`) | yellow-glow bg + yellow border + yellow text | `var(--light-amber-glow)` bg + `var(--light-amber)` border + `var(--light-amber)` text |
| Inaktiv (`i > idx`) | navy-mid bg + navy-border + slate text | `var(--light-bg)` bg + `var(--light-border)` border + `var(--light-t4)` text |
| Valt (`valtSteg === stegId`) | yellow border (highlight) — verifiera live | `var(--light-amber)` border |

**Stegnamn under cirkel:**
- Aktiv: `var(--white)` → `var(--light-t1)` + bold
- Klar: `var(--green)` → `var(--light-green)` + bold
- Inaktiv: `var(--muted-custom)` → `var(--light-t3)`

**Datum under stegnamn (klar/aktiv):**
- `var(--soft)` → `var(--light-t2)`

**"← Du är här"-text:**
- `var(--yellow)` → `var(--light-amber)`

**Klickbarhet:** Behåll cursor-pointer + hover-effekt (om finns).

**OBS:** Verifiera att alla cirklar har korrekt state-rendering efter migration. Klicka igenom från klar → aktiv → inaktiv för att verifiera färg-cykel.

## Op 6 — Block 4 Detaljvy för valt steg (rad 402-478)

**Q8 val A — vit kort + light-border + boxShadow:**

**Wrapper:**
- Vit kort + `var(--light-border)` + boxShadow

**Header (steg-emoji + label + ✕):**
- Emoji-cirkel: bakgrund från STEG_LIGHT_TOKEN[stegInfo.id] + alpha (motsv yellow-glow stil med light-amber)
  - Använd `style={{ background: \`color-mix(in srgb, ${STEG_LIGHT_TOKEN[stegInfo.id]} 20%, transparent)\` }}` eller liknande för transparens-effekt
  - **Alternativt: light-amber-glow för aktiv, light-green-bg för klar** (enklare, ingen color-mix)
- Stegens emoji BEVARAS
- Label: `var(--white)` → `var(--light-t1)`
- ✕-stäng-knapp: `var(--slate)` → `var(--light-t4)` + hover `var(--light-t2)`

**Hjälp-text:**
- `var(--soft)` → `var(--light-t2)`

**Noteringar-lista (foranmalan_steg_logg):**
- Wrapper per logg: `var(--navy-light)` bg → `var(--light-off)` bg + light-border
- Datum: `var(--muted-custom)` → `var(--light-t3)`
- Kommentar (💬): `var(--soft)` → `var(--light-t2)` — **💬 BEVARAS**
- ✉ notis-skickad: `var(--green)` → `var(--light-green)` — **✉ BEVARAS**

## ⏸ STOP 2 — Verifiering Block 2-4 (stepper + detaljvy)

**Test-villkor:** Vunnet projekt MED befintlig tracker (steg minst 2-3 av 6).

**Test 1 — Block 2 Header:**
- Vit kort + light-amber-glow jobbtyp-cirkel
- Status-pill korrekt färg per state (klar=green-bg / annars=amber-glow)

**Test 2 — Block 3 Stepper — KRITISK:**
- Alla 6 cirklar rendrar korrekt
- Klar-cirklar: light-green fylld
- Aktiv-cirkel: light-amber-glow + light-amber border
- Inaktiva: light-bg + light-border
- Bakgrundslinje light-border
- Progresslinje light-amber/light-green dynamisk
- Stegnamn under cirklar korrekt färgkodade
- "← Du är här"-text light-amber

**Test 3 — Klick på steg:**
- Klar/aktiv steg klickbart → öppnar Block 4 detaljvy
- Inaktiva (framtida) steg INTE klickbara

**Test 4 — Block 4 Detaljvy:**
- Vit kort + light-border
- Header med steg-emoji-cirkel
- ✕-knapp fungerar (stäng detaljvy)
- Noteringar-lista (om finns) light-off bg

**Test 5:** Inga JS-fel

---

# FAS 3 — Resten (Op 7-11)

## Op 7 — Block 5 Tips + Projektinfo-grid (rad 481-620) — STÖRSTA

**Q9 — komplext block med 2-grid:**

**2-grid wrapper:** Oförändrad layout

### Tips-kort (vänster):

**Conditional:** `fp.nuvarande_steg !== 'klar' && jobbInfo?.stegOchHjälp`

**Wrapper:**
- Vit kort + `var(--light-border)` + boxShadow

**Rubrik:**
- `var(--white)` → `var(--light-t1)`

**Hjälp-text:**
- `var(--soft)` → `var(--light-t2)`

**"Ha redo:"-lista:**
- Lista-items `var(--soft)` → `var(--light-t2)`
- Bullets/dashes `var(--muted-custom)` → `var(--light-t3)`

**Regel-länk (↗):**
- Färg: `var(--yellow)` → `var(--light-amber)`
- **↗-emoji ERSÄTTS med Phosphor `ArrowSquareOut`** (per Q9 — funktionell ikon, inline med text)
- Phosphor-storlek: 14-16px, samma color som länk-text
- `weight="bold"` enligt CLAUDE.md

**Regel-gammal-varning (om `regelÄrGammal()`):**
- `var(--orange-bg)` → `var(--light-orange-bg)`
- Text: `var(--orange)` → `var(--light-orange)`

### Projektinfo-kort (höger):

**Wrapper:**
- Vit kort + `var(--light-border)` + boxShadow

**Toggle-knapp (redigera/visa):**
- `var(--yellow)` → `var(--light-amber)` text + hover

**Visa-läge:**
- Per info-rad: emoji (⏱ 🏢 🔔 👤 📅 ⚠) **BEVARAS**
- Labels: `var(--muted-custom)` → `var(--light-t3)`
- Värden: `var(--soft)` → `var(--light-t2)`
- Highlight-värde (om finns): `var(--white)` → `var(--light-t1)`

**Dagar på steg (📅/⚠):**
- Inte fastnat (<14 dagar): light-t2 + 📅
- Fastnat (>14 dagar): `var(--light-orange)` + ⚠

**Redigera-läge:**
- Inputs: `var(--navy-light)` bg → `var(--light-bg)` bg + `var(--light-border)` + `var(--light-t1)` text
- Labels: `var(--muted-custom)` → `var(--light-t3)`
- Notifiera-checkbox + label: light-t2 text
- Spara-knapp: light-amber bg + light-navy text
- Avbryt-knapp: light-border + light-t2

## Op 8 — Block 6 Fastnat-varning (rad 623-643)

**Q10 val B — light-orange-bg + ⏰ kvar:**

**Wrapper:**
- Bakgrund: `var(--orange-bg)` → `var(--light-orange-bg)`
- Border: `rgba(255,140,66,0.3)` → `var(--light-orange)` (kanske med opacity 0.3, verifiera live)

**⏰-emoji + text:**
- ⏰ **BEVARAS för 3F**
- Rubrik "Fastnad i N dagar": `var(--orange)` → `var(--light-orange)` + bold
- Brödtext: `var(--muted-custom)` → `var(--light-t3)`

## Op 9 — Block 7 Aktivitetslogg (rad 646-671)

**Wrapper:**
- Vit kort + `var(--light-border)` + boxShadow

**Rubrik:**
- `var(--white)` → `var(--light-t1)`
- Räknare: `var(--muted-custom)` → `var(--light-t3)`

**Per logg-rad (max 5):**
- Datum: `var(--slate)` → `var(--light-t4)`
- Steg-emoji (stegInfo.emoji) **BEVARAS**
- Label: `var(--soft)` → `var(--light-t2)`
- Kommentar: `var(--muted-custom)` → `var(--light-t3)`
- ✉ notis: `var(--green)` → `var(--light-green)` — **✉ BEVARAS**

**Divider mellan rader (om finns):**
- `var(--navy-border)` → `var(--light-border)`

## Op 10 — Block 8 Nästa steg-knapp / Klar-meddelande (rad 673-688)

**Q11 + Q12 val A:**

### Nästa steg-knapp (Conditional: `nästaStegInfo`):

**Knapp:**
- Bakgrund: yellow → `var(--light-amber-glow)`
- Border: `var(--light-amber)`
- Text: yellow → `var(--light-amber)` bold
- Hover: subtilare amber

**Innehåll:**
- "Uppdatera till: {label}" — label från lib
- nästaStegInfo.emoji **BEVARAS**
- → (highger-pil): kan migreras till Phosphor `ArrowRight` i framtida 3F, behåll → för nu

### Klar-meddelande (Conditional: `fp.nuvarande_steg === 'klar'`):

**Wrapper:**
- Bakgrund: green-bg → `var(--light-green-bg)`
- Border: green → `var(--light-green)`

**Text:**
- ⚡ **BEVARAS PERMANENT** (SveBud-identitet enligt CLAUDE.md)
- Rubrik "Projekt avslutat": `var(--green)` → `var(--light-green)` bold
- Brödtext: `var(--soft)` → `var(--light-t2)`

## Op 11 — Block 9 Steguppdaterings-dialog (rad 692-741)

**Q13 = Q5 val A — light-bg DialogContent:**

**Dialog 2 — samma som Dialog 1:**

**DialogContent:**
- `var(--navy-mid)` → `var(--light-bg)`
- Border: `var(--navy-border)` → `var(--light-border)`

**DialogTitle:**
- Text: `var(--white)` → `var(--light-t1)`
- nästaStegInfo.emoji **BEVARAS** i title

**Beskrivnings-text:**
- `var(--muted-custom)` → `var(--light-t3)`

**Kommentar-textarea:**
- Bakgrund: `var(--navy)` → `var(--light-bg)` (eller vit — verifiera kontrast mot DialogContent)
- Border: `var(--navy-border)` → `var(--light-border)`
- Text: `var(--white)` → `var(--light-t1)`
- Placeholder: `var(--slate)` → `var(--light-t4)`

**Knappar:**
- Avbryt: `var(--navy-border)` → `var(--light-border)` + `var(--light-t2)`
- Bekräfta: yellow → light-amber bg + light-navy text
- Disabled-state: behåll disabled-styling med light-amber-glow + light-t4

## ⏸ STOP 3 — Visuell verifiering hela ForanmalanTracker

**Test-villkor:** Två testfall:
- **A.** Vunnet projekt utan tracker → Block 0 + Block 1 + Dialog 1
- **B.** Vunnet projekt med aktiv tracker (steg minst 2-3) → Block 2-9

### Testfall A — Tom-state:

**Test 1:** Tab 4 visar Block 1 tom-state-kort ljust
**Test 2:** Dialog 1 öppnas, fungerar, skapar tracker

### Testfall B — Aktiv tracker:

**Test 3 — Block 2 Header:** Vit kort + light-amber-glow jobbtyp-cirkel + status-pill korrekt
**Test 4 — Block 3 Stepper KRITISK:** Alla cirklar i korrekt state, linjer ljusa, klickbarhet fungerar
**Test 5 — Block 4 Detaljvy:** Visas när steg klickas, ✕ stänger, noteringar light-off
**Test 6 — Block 5 Tips + Projektinfo:**
- Tips-kort ljust med Phosphor ArrowSquareOut på regel-länk
- Projektinfo visa-läge ljust
- Toggle till redigera-läge → inputs ljusa
- Spara/Avbryt fungerar
**Test 7 — Block 6 Fastnat-varning:** Visas om steg >14 dagar, light-orange-bg
**Test 8 — Block 7 Aktivitetslogg:** Vit kort + 5 senaste rader ljusa
**Test 9 — Block 8 Nästa steg-knapp:** Light-amber-glow + light-amber border
**Test 10 — Block 9 Dialog 2:**
- Öppnas vid klick på nästa steg-knapp
- DialogContent ljus
- Textarea fungerar
- Bekräfta uppdaterar steget i DB
**Test 11 — Klar-state (om testbar):**
- När alla steg avklarade → Klar-meddelande light-green-bg + ⚡
- Status-pill light-green-bg
- Inga "nästa steg"-knappar visas

**Test 12:** Inga JS-fel i konsolen
**Test 13:** Auto-uppdatering fungerar (efter steg-uppdatering → tracker reflektar nya state)

---

# FAS 4 — Build + Commit

## Op 12 — Build

```bash
npm run build
```

**Förväntat:** 0 fel, 0 nya warnings.

**Verifiera:** Inga TypeScript-fel kring `STEG_LIGHT_TOKEN`-typen eller `ArrowSquareOut`-import.

## Op 13 — Lokal commit

**Commit-meddelande:**

```
feat(ui): Steg 3E.2 — ForanmalanTracker till light-tokens

- components/ForanmalanTracker.tsx full migration (744 rader)
- 9 inline-blocks migrerade (Block 0-9)
- Block 0 (Loading-skeleton): light-bg + light-border
- Block 1 (Ingen tracker tom-state): vit kort + light-amber-glow knapp
- Block 1 Dialog 1 (Skapa tracker): light-bg DialogContent
- Block 2 (Header): vit kort + light-amber-glow jobbtyp-cirkel
- Block 3 (Stepper): 6 cirklar med multi-state styling
- Block 4 (Detaljvy): vit kort + light-off noteringar
- Block 5 (Tips + Projektinfo): 2-grid + Phosphor ArrowSquareOut på regel-länk
- Block 6 (Fastnat-varning): light-orange-bg
- Block 7 (Aktivitetslogg): vit kort + 5 senaste rader
- Block 8 (Nästa steg / Klar): light-amber-glow knapp / light-green-bg klar
- Block 9 Dialog 2 (Steguppdatering): light-bg DialogContent
- Mappnings-tabell STEG_LIGHT_TOKEN (lib hex-färger → light-tokens)
- Phosphor import nya: ArrowSquareOut
- lib/foranmalan-regler.ts oförändrad (emoji-property + hex bevarade för 3F)
- Phosphor-skuld: ~13 emojis i komponent + ~15 emojis i lib för Steg 3F
- ⚡ bevaras permanent (SveBud-identitet enligt CLAUDE.md)

Spec: docs/PROMPT_app_design_step3e2.md
```

**Lokal commit. INTE push förrän visuell verifiering live har bekräftats efter eventuell push-diskussion.**

---

## Plan mode-avvikelser uppmuntras

Om Claude Code under inventering eller migration upptäcker:

1. **Live har annan struktur än specen beskriver** → Behåll live's struktur, rapportera avvikelse
2. **Komponent har redan light-tokens** → Skip det blocket, rapportera "redan migrerat"
3. **Subkomponenter eller helpers som specen missar** → Inkludera dem, rapportera tillägg
4. **Inline-blocks som specen missar** → Lägg till som Op X.5, rapportera (likt 3D Op 5.5)
5. **Designval visar sig inkompatibelt med live's logik** → Behåll live's logik, rapportera

Lärdom från 3D + 3E.1: **Live ÄR sanningen, spec är förslag.**

---

## Tre kritiska zoner

### 1. Block 3 Progress-stepper (Op 5)

3 states per cirkel + bakgrundslinje + progresslinje. **Den mest komplexa migrationen i hela 3E.2.** Verifiera **varje state** vid STOP 2.

### 2. Två Dialogs (Op 3 Dialog 1, Op 11 Dialog 2)

shadcn DialogContent har defaults som **kan strula** med inline-styling. Om DialogContent ser konstig ut vid STOP 1/STOP 3, kontrollera:
- Inline-style override på `var(--background)` eller motsv shadcn-CSS-vars
- z-index/overlay-konflikter
- Border-radius (light vs dark dialogs)

### 3. Mappnings-tabell STEG_LIGHT_TOKEN (Op 1)

Lib-färger används på flera ställen via `stegInfo.färg` eller `jobbInfo.färg`. Grep för "färg" i komponenten — fånga alla användningar och översätt till mappnings-tabell.

---

## Sammanfattning för operatören

**Filer som ändras:**
- `components/ForanmalanTracker.tsx` (full migration, ~744 rader)

**Filer som INTE ändras (medvetet):**
- `lib/foranmalan-regler.ts` — hex-färger + emoji-property bevarade för 3F

**Operationer:** 13 (3 + 3 + 5 + 1 build + 1 commit)

**Stop-punkter:** 3 (efter Op 3, efter Op 6, efter Op 11)

**Phosphor-imports:** 1 ny (ArrowSquareOut)

**Estimerat:** ~120 token-byten, ~744 rader migration

**Phosphor-skuld kvar för 3F:** ~13 emojis i komponent (📋✕💬✉⏱🏢🔔👤📅⚠⏰↗) + ~15 emojis i lib (9 jobbtyper + 6 steg) = ~28 emojis från Tab 4

**Total Phosphor-skuld efter 3E.2 (för 3F):** ~57 + ~28 = **~85 emojis**

**⚡ bevaras permanent** (SveBud-identitet, undantag från 3F-rensning enligt CLAUDE.md)

**Lokal commit. Push diskuteras efter STOP 3-verifiering.**

**Använd svenska.**
