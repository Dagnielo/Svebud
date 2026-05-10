# Steg 3F.1 — Komponent-emojis till Phosphor + stepper-klar-state-fix

**Scope:** 4 komponenter (emoji-rensning) + 1 bug-fix (ForanmalanTracker stepper)
**Filer:** AnbudsUppladdning, KvalitetsPanel, GranskningSida, UtfallsKnappar, ForanmalanTracker
**Estimerat:** ~25 emojis migrerade, ~21 nya Phosphor-imports, 1 logik-fix
**Stop-punkter:** 1 (efter alla migrationer, före build)
**Push-strategi:** Lokal commit. Push diskuteras efter STOP 1-verifiering.

---

## Designprinciper (från 3B-3E-lärdomar)

1. **Live ÄR sanningen.** Förutom medvetna datastruktur-ändringar (allvarlighetConfig, StatBox) är resten ren emoji-byte.
2. **Spec är förslag.** Plan mode-avvikelser uppmuntras.
3. **⚡ bevaras permanent** enligt CLAUDE.md (SveBud-identitet) — INGA ⚡-användningar migreras i 3F.1.
4. **Bug-fix tematiskt passande.** Stepper-klar-state-fix passar i UI-städ-commit.

---

## Phosphor-import-konsolidering

**21 unika Phosphor-ikoner i 3F.1:**

| Fil | Nya imports |
|-----|-------------|
| AnbudsUppladdning.tsx | `CheckCircle, Spinner, Warning, Pause, XCircle` (5) |
| KvalitetsPanel.tsx | `CheckCircle, Lightbulb, Warning, XCircle, CaretUp, CaretDown` (6) |
| GranskningSida.tsx | `CheckCircle, Warning, XCircle, ListBullets, ClipboardText, CaretUp, CaretDown, Check, Sparkle, Lightbulb` (10 — verifiera duplicates med live) |
| UtfallsKnappar.tsx | `Spinner, Check, X` (3) |
| ForanmalanTracker.tsx | Inga nya — bara logik-fix |

**OBS:** Vissa ikoner överlappar mellan filer (CheckCircle, Warning, etc). Räkna per-fil-import, inte globalt.

**Weight + storlek-standard:**
- `weight="bold"` (CLAUDE.md-standard)
- Storlek per kontext (14-28px) — specificeras per op nedan

**Animation:**
- `Spinner` får `className="animate-spin"` för laddar/sparar-states

---

## Operationer

### Op 1 — AnbudsUppladdning.tsx (5 emojis)

**Plats:** components/AnbudsUppladdning.tsx, rad 271-292 (fil-status-rendering)

**Befintlig struktur (förmodlig — verifiera live):**
```tsx
{f.status === 'klar' && <span>✅</span>}
{f.status === 'laddar' && <span>⏳</span>}
{f.status === 'varning' && <span>⚠️</span>}
{f.status === 'väntar' && <span>⏸️</span>}
{f.status === 'fel' && <span>❌</span>}
```

**Migration:**

Lägg till imports (rad 1):
```tsx
import { CheckCircle, Spinner, Warning, Pause, XCircle } from "@phosphor-icons/react";
```

Ersätt emoji-rendering med:
```tsx
{f.status === 'klar' && (
  <CheckCircle
    size={16}
    weight="bold"
    style={{ color: 'var(--light-green)' }}
  />
)}
{f.status === 'laddar' && (
  <Spinner
    size={16}
    weight="bold"
    className="animate-spin"
    style={{ color: 'var(--light-amber)' }}
  />
)}
{f.status === 'varning' && (
  <Warning
    size={16}
    weight="bold"
    style={{ color: 'var(--light-orange)' }}
  />
)}
{f.status === 'väntar' && (
  <Pause
    size={16}
    weight="bold"
    style={{ color: 'var(--light-t3)' }}
  />
)}
{f.status === 'fel' && (
  <XCircle
    size={16}
    weight="bold"
    style={{ color: 'var(--light-red)' }}
  />
)}
```

**Status-pill rad 292 (⚠ inline):**
- Byts till `<Warning size={14} weight="bold" />` inline med text
- Färg: `var(--light-orange)`

**Verifiera:** Befintlig komponent-struktur. Om filen använder helper-funktion eller ternary i array.map → anpassa till strukturen, behåll **logiken** men byt **rendering**.

### Op 2 — KvalitetsPanel.tsx (5 emojis + datastruktur)

**Plats:** components/KvalitetsPanel.tsx, rad 9-12 (allvarlighetConfig) + rad 196 (toggle)

**Q1 val B — IconComponent som komponent-referens:**

**Befintlig struktur (rad 9-12):**
```tsx
const allvarlighetConfig = {
  bra: { ikon: '✅', färg: 'var(--light-green)', ... },
  tips: { ikon: '💡', färg: 'var(--light-amber)', ... },
  varning: { ikon: '⚠️', färg: 'var(--light-orange)', ... },
  fel: { ikon: '❌', färg: 'var(--light-red)', ... },
};
```

**Migration:**

Lägg till imports (rad 1):
```tsx
import { CheckCircle, Lightbulb, Warning, XCircle, CaretUp, CaretDown, type Icon } from "@phosphor-icons/react";
```

**OBS:** Phosphor exporterar `Icon`-typ för komponent-referens. Om import-syntax inte fungerar (TypeScript-konflikt) → använd `ComponentType<IconProps>` eller `React.ComponentType` istället. Verifiera vid migration.

Byt datastruktur till:
```tsx
const allvarlighetConfig = {
  bra: {
    IconComponent: CheckCircle,
    färg: 'var(--light-green)',
    // ...övriga befintliga fält
  },
  tips: {
    IconComponent: Lightbulb,
    färg: 'var(--light-amber)',
    // ...
  },
  varning: {
    IconComponent: Warning,
    färg: 'var(--light-orange)',
    // ...
  },
  fel: {
    IconComponent: XCircle,
    färg: 'var(--light-red)',
    // ...
  },
};
```

**Användning i rendering:**

Befintligt (förmodlig):
```tsx
<span style={{ ... }}>{config.ikon}</span>
```

Byts till:
```tsx
<config.IconComponent
  size={14}
  weight="bold"
  style={{ color: config.färg }}
/>
```

**Toggle ▲▼ rad 196:**
```tsx
{expanderad ? (
  <CaretUp size={12} weight="bold" />
) : (
  <CaretDown size={12} weight="bold" />
)}
```

**Verifiera:** Alla användningar av `config.ikon` (eller motsv) genom hela filen. Byt **alla** till `config.IconComponent`-rendering.

### Op 3 — GranskningSida.tsx (12 emojis + StatBox-redesign)

**Plats:** components/GranskningSida.tsx

**Q2 val A — StatBox icon-prop till ReactNode:**

#### Op 3.1 — StatBox helper-redesign

**Befintlig (förmodlig):**
```tsx
function StatBox({ icon, label, count, ... }: { icon: string; ... }) {
  return (
    <div>
      <span>{icon}</span>
      <span>{count}</span>
      <span>{label}</span>
    </div>
  );
}
```

**Migration:**
```tsx
function StatBox({ icon, label, count, ... }: { icon: ReactNode; ... }) {
  return (
    <div>
      <span>{icon}</span>
      <span>{count}</span>
      <span>{label}</span>
    </div>
  );
}
```

**Import (rad 1):**
```tsx
import { type ReactNode } from "react";
import { CheckCircle, Warning, XCircle, ListBullets, ClipboardText, CaretUp, CaretDown, Check, Sparkle, Lightbulb } from "@phosphor-icons/react";
```

#### Op 3.2 — 4 StatBox-användningar (rad 155-158)

**Befintlig:**
```tsx
<StatBox icon="✅" label="Matchade" count={...} />
<StatBox icon="⚠️" label="Att bekräfta" count={...} />
<StatBox icon="❌" label="Ej uppfyllda" count={...} />
<StatBox icon="📋" label="Totalt" count={...} />
```

**Migration:**
```tsx
<StatBox
  icon={<CheckCircle size={16} weight="bold" style={{ color: 'var(--light-green)' }} />}
  label="Matchade"
  count={...}
/>
<StatBox
  icon={<Warning size={16} weight="bold" style={{ color: 'var(--light-orange)' }} />}
  label="Att bekräfta"
  count={...}
/>
<StatBox
  icon={<XCircle size={16} weight="bold" style={{ color: 'var(--light-red)' }} />}
  label="Ej uppfyllda"
  count={...}
/>
<StatBox
  icon={<ListBullets size={16} weight="bold" style={{ color: 'var(--light-t3)' }} />}
  label="Totalt"
  count={...}
/>
```

#### Op 3.3 — Övriga emojis i GranskningSida

| Rad | Emoji | Byts till |
|-----|-------|-----------|
| 164 | 📋 (Projektinfo-header) | `<ClipboardText size={16} weight="bold" />` |
| 184, 193 | ⚠️ (Kräver bekräftelse) | `<Warning size={14} weight="bold" style={{ color: 'var(--light-orange)' }} />` |
| 210, 219 | ❌ (Ej uppfyllda) | `<XCircle size={14} weight="bold" style={{ color: 'var(--light-red)' }} />` |
| 239 | ✅ (Matchade collapsed) | `<CheckCircle size={14} weight="bold" style={{ color: 'var(--light-green)' }} />` |
| 245 | ▲▼ (Matchade toggle) | `<CaretUp/Down size={12} weight="bold" />` per state |
| 251 | ✓ (Matchade-rad-prefix) | `<Check size={12} weight="bold" style={{ color: 'var(--light-green)' }} />` |
| 265 | ⚠ (Risker-rubrik) | `<Warning size={16} weight="bold" style={{ color: 'var(--light-orange)' }} />` |
| 273 | ✦ (Möjligheter-rubrik) | `<Sparkle size={16} weight="bold" style={{ color: 'var(--light-green)' }} />` |
| 284 | 💡 (Rekommendation) | `<Lightbulb size={16} weight="bold" style={{ color: 'var(--light-amber)' }} />` |

**Verifiera vid migration:**
- Inline-justering: emojis bytas till Phosphor inom samma span/div, med `style={{ verticalAlign: 'middle' }}` om text-justering blir off
- Storlekar matchar **font-size** i kringliggande text
- Färger följer **kontext** (orange för varning, grön för bekräftelse, etc)

### Op 4 — UtfallsKnappar.tsx (3 emojis)

**Plats:** components/UtfallsKnappar.tsx (rad-nummer ej i inventering, grep efter emojis)

**Befintlig (förmodlig):**
- `⏳` Sparing-state
- `✓` Vunnet-knapp
- `✗` Förlorat-knapp

**Migration:**

Lägg till imports:
```tsx
import { Spinner, Check, X } from "@phosphor-icons/react";
```

Migrera:
- `⏳` → `<Spinner size={14} weight="bold" className="animate-spin" />` (inom sparing-state)
- `✓` → `<Check size={14} weight="bold" style={{ color: 'var(--light-green)' }} />` (Vunnet-knapp)
- `✗` → `<X size={14} weight="bold" style={{ color: 'var(--light-red)' }} />` (Förlorat-knapp)

**Verifiera:** Grep efter emojis i filen för komplett scope. UtfallsKnappar är flaggad som "utanför 3E-scope" — kontrollera att inga andra emojis missats.

### Op 5 — ForanmalanTracker.tsx stepper-klar-state-bug-fix

**Plats:** components/ForanmalanTracker.tsx rad 338-340

**Befintlig (live):**
```tsx
const klar = i < nuvarandeStegIdx;
const aktiv = i === nuvarandeStegIdx;
```

**Migration:**
```tsx
const klar = i < nuvarandeStegIdx
             || (i === nuvarandeStegIdx && fp.nuvarande_steg === 'klar');
const aktiv = i === nuvarandeStegIdx && fp.nuvarande_steg !== 'klar';
```

**Verifiering (från Claude Codes DEL 3-analys):**

Alla downstream-användningar verifierade säkra:
- `klickbar = klar || aktiv` (rad 341) — fortfarande sant för sista steget ✓
- `vald` separate state, opåverkad ✓
- `stegLogg` opåverkad ✓
- boxShadow-conditional: när alla klar → ingen aktiv → ingen amber-glow-ring → korrekt ✓
- Cirkel background: sista cirkel blir light-green ✓
- Stegnamn color: sista stegnamnet blir light-green ✓
- Datum-färg: sista datum-färg blir light-green ✓
- "← Du är här"-text: visas inte när klar (det är OK — klar har datum) ✓

**Effekt på UI:** När `fp.nuvarande_steg === 'klar'`, steg 6 (sista) rendras som **klar** istället för aktiv. Stepper visar full grön progression. Konsistent med status-pill "Nätbolag godkänt — Klar".

---

### ⏸ STOP 1 — Visuell verifiering 3F.1

**Test-villkor:** Flera olika projekt för att täcka olika komponenter.

#### Test 1 — AnbudsUppladdning

**Plats:** Projekt med uppladdade dokument (Tab 1).

**Verifiera:**
- Fil-status-ikoner är Phosphor (inte emoji)
- Korrekt färgkodning (grön klar, amber laddar, orange varning, etc)
- Spinner roterar för "laddar"-state (om testbart)
- Inline-justering OK med fil-namn

#### Test 2 — KvalitetsPanel

**Plats:** Projekt med utförd analys (Tab 1, KvalitetsPanel-section under uppladdade dokument).

**Verifiera:**
- allvarlighetConfig-ikoner Phosphor per state (bra/tips/varning/fel)
- Färger matchar live's mappning
- Toggle ▲▼ → CaretUp/CaretDown
- Expanderad/kollapsad fungerar

#### Test 3 — GranskningSida

**Plats:** Projekt med genomförd formell analys (Tab 2, GranskningSida).

**Verifiera:**
- **4 StatBox-ikoner Phosphor** (CheckCircle/Warning/XCircle/ListBullets)
- Projektinfo-header ClipboardText
- Kräver bekräftelse-emojis → Warning per rad
- Ej uppfyllda-emojis → XCircle per rad
- Matchade collapsed → CheckCircle + CaretUp/Down toggle
- Matchade-rad-prefix → Check (mindre)
- Risker-rubrik → Warning
- Möjligheter-rubrik → Sparkle
- Rekommendation-rubrik → Lightbulb

#### Test 4 — UtfallsKnappar

**Plats:** Projekt med pipeline_status === 'inskickat' eller 'tilldelning' (Tab 3 Block 11 ELLER Pipeline-vyn där UtfallsKnappar renderas).

**Verifiera:**
- Vunnet-knapp → Check (inline med text)
- Förlorat-knapp → X (inline med text)
- Sparing-state → Spinner (animerad)
- Inline-justering OK

#### Test 5 — Stepper-klar-state-fix

**Plats:** Vunnet projekt med tracker som har `nuvarande_steg === 'klar'` (alla 6 steg klara).

**Verifiera:**
- **Steg 6 är nu light-green fylld** (inte light-amber-glow)
- Stepper visar full grön progression
- Klar-meddelande Block 8 renderar korrekt
- Inga "nästa steg"-knappar visas
- Status-pill "Nätbolag godkänt — Klar" matchar steg 6 styling

**Bonus-test:** Hitta projekt med tracker som **inte är klar** (mellan steg 1-5) — verifiera att stepper-logiken fortfarande fungerar:
- Steg före aktiv = klar (light-green fylld)
- Aktiv steg = light-amber-glow + amber border
- Steg efter aktiv = inaktiv (light-bg + light-border)

#### Test 6 — Inga JS-fel + Inga regressions

- Konsol fri från fel
- Tidigare migrerade komponenter (KalkylVy, SnabboffertVy, RotKalkyl, ForanmalanTracker-rest) intakt
- Alla tabs renderar korrekt

---

### Op 6 — Build

```bash
npm run build
```

**Förväntat:** 0 fel, 0 nya warnings.

**Verifiera:**
- Inga TypeScript-fel kring `Icon`-typ-import från Phosphor
- Inga TypeScript-fel kring `ReactNode`-import i GranskningSida StatBox
- `IconComponent`-rendering i KvalitetsPanel typkorrekt

### Op 7 — Lokal commit

**Commit-meddelande:**

```
fix(ui): Steg 3F.1 — komponent-emojis till Phosphor + stepper-klar-state-fix

EMOJI-MIGRATION (~25 emojis i 4 komponenter):
- AnbudsUppladdning.tsx: fil-status ✅⏳⚠️⏸️❌ → CheckCircle/Spinner/Warning/Pause/XCircle
- KvalitetsPanel.tsx: allvarlighetConfig ✅💡⚠️❌ → CheckCircle/Lightbulb/Warning/XCircle + datastruktur IconComponent + CaretUp/Down toggle
- GranskningSida.tsx: 12 emojis → CheckCircle/Warning/XCircle/ListBullets/ClipboardText/Check/Sparkle/Lightbulb + CaretUp/Down + StatBox icon prop ReactNode
- UtfallsKnappar.tsx: ⏳✓✗ → Spinner/Check/X

BUG-FIX:
- ForanmalanTracker.tsx stepper rad 338-340: klar/aktiv-logik för sista steget när nuvarande_steg === 'klar'
- Steg 6 visas nu som klar (light-green fylld) istället för aktiv (light-amber-glow)
- Stepper visar full grön progression när projektet är klart
- Konsistent med status-pill "Nätbolag godkänt — Klar"

DESIGN-VAL:
- KvalitetsPanel: ikon: string → IconComponent: typeof Icon (komponent-referens för flexibilitet)
- GranskningSida StatBox: icon: string → icon: ReactNode (helper-konvention)
- Spinner får animate-spin för laddar/sparar-states
- weight="bold" enligt CLAUDE.md-standard

PHOSPHOR-IMPORTS (21 unika ikoner):
CheckCircle, Spinner, Warning, Pause, XCircle, Lightbulb, CaretUp,
CaretDown, ListBullets, ClipboardText, Check, Sparkle, X

⚡ BEVARAS PERMANENT (SveBud-identitet enligt CLAUDE.md).

KVAR FÖR 3F.2 + 3F.3:
- Lib-emojis (foranmalan-regler.ts + rot-regler.ts, ~20 emojis)
- SnabboffertVy moment-typer (9 emojis i kategoriInfo)
- ForanmalanTracker lib-prop-emojis (jobbtyper + steg)
- page.tsx (~25 emojis: instruktionsruta, Block 3 toolbar, GenererarVy, etc)

Spec: docs/PROMPT_app_design_step3f1.md
```

**Lokal commit. INTE push förrän visuell verifiering bekräftats.**

---

## Plan mode-avvikelser uppmuntras

Om Claude Code under inventering eller migration upptäcker:

1. **Andra emojis i filerna som inte var i inventeringen** → Lista dem, fråga om de ska migreras
2. **Komponent-struktur skiljer sig från specens antaganden** → Behåll live-struktur, rapportera
3. **Phosphor-import-syntax inkompatibel med befintlig kod** → Anpassa, rapportera
4. **Datastruktur-ändring i KvalitetsPanel bryter typningen** → Föreslå alternativ (ReactNode-fallback)
5. **Inline-justering blir off med Phosphor-ikoner** → Lägg till verticalAlign, rapportera
6. **Stepper-fix avslöjar dolda edge-cases** → Stoppa, rapportera

Lärdom från 3B-3E: **Live ÄR sanningen, spec är förslag.**

---

## Sammanfattning för operatören

**Filer som ändras:**
- `components/AnbudsUppladdning.tsx` (~5 emojis)
- `components/KvalitetsPanel.tsx` (~5 emojis + datastruktur)
- `components/GranskningSida.tsx` (~12 emojis + StatBox-redesign)
- `components/UtfallsKnappar.tsx` (~3 emojis)
- `components/ForanmalanTracker.tsx` (bug-fix, inga emojis)

**Operationer:** 7 (5 migration + build + commit)

**Stop-punkter:** 1 (efter Op 5, före Op 6 build)

**Phosphor-imports:** 21 unika ikoner (varierande per fil)

**Estimerat:** ~25 emojis migrerade + 1 bug-fix

**⚡ bevaras permanent** — INGA ⚡-användningar i 3F.1 (de är i lib + page.tsx → 3F.2 + 3F.3).

**Phosphor-skuld kvar för 3F.2 + 3F.3:** ~60 emojis (15 i lib/foranmalan-regler.ts + 5 i lib/rot-regler.ts + 9 SnabboffertVy + ~30 page.tsx).

**Lokal commit. Push diskuteras efter STOP 1-verifiering.**

**Använd svenska.**
