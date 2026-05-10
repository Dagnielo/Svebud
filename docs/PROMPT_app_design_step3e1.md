# Steg 3E.1 — Tab 3 (Anbud) + KalkylVy migration

**Scope:** page.tsx Tab 3-blocket (rad 809-1422) + KalkylVy.tsx (129 rader)
**Estimerat:** ~743 rader migration, 84 mörka tokens, 22 emoji-platser
**Stop-punkter:** 1 (efter all migration, före build)
**Push-strategi:** Lokal commit. Push diskuteras efter STOP 1-verifiering.

---

## Designprinciper (från 3D-lärdomar)

1. **Live ÄR sanningen.** Ren färg-migration utan UX-ändringar.
2. **Spec är förslag.** Plan mode-avvikelser uppmuntras vid live-konflikt.
3. **Phosphor-skuld accepteras.** ~22 emojis i Tab 3 + KalkylVy behålls för Steg 3F-rensnings-commit.
4. **Konsekvens med 3D.** Samma token-mappning, samma boxShadow-pattern, samma struktur-bevarande filosofi.

---

## Token-mappning (från 3D — oförändrad)

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
| `var(--yellow-bg)` eller motsv. | `var(--light-amber-glow)` |

**boxShadow på alla kort:** `0 1px 2px rgba(14,27,46,.04)`

---

## Phosphor-imports (NYA i Steg 3E.1)

Lägg till i `page.tsx` (rad 1, befintlig Phosphor-import):

```tsx
import {
  // ... befintliga
  Check,           // Q5 — Kontaktperson infogad-feedback
  Download,        // Q6 — Ladda ner PDF/Word
  ClipboardText,   // Q7 — Förbered mail kopiera-knappar
  PaperPlaneTilt,  // Q8 — Markera som skickat
} from "@phosphor-icons/react";
```

Lägg till i `KalkylVy.tsx`:

```tsx
import { Plus, X } from "@phosphor-icons/react";
```

---

## Operationer

### FAS 1 — Tab 3-blocket i page.tsx (8 op)

#### Op 1 — Block 1 wrapper (rad 809-862, formell-flöde)

**Plats:** TabsContent value="anbud" outer wrapper + analysTyp !== 'snabb' conditional

**Ändring:**
- Wrapper-styling om finns: token-byte enligt mappning
- Ingen UX-ändring
- Inga komponentändringar (KalkylVy + RotKalkyl renderas oförändrat — KalkylVy migreras i Op 9)

#### Op 2 — Block 2 (rad 864-885, snabbofferts-info-text)

**Plats:** `analysTyp === 'snabb'` conditional rendering — info-text + tab-byte-knapp till Tab 2

**Ändring:**
- Vit kort + light-border + boxShadow
- Rubrik light-t1
- Brödtext light-t2
- "Gå till Snabboffert"-knapp: light-amber-glow bg + light-amber border + light-amber text + Phosphor ArrowLeft (om passar) ELLER behåll text-only
- Eventuella emojis kvar för 3F

#### Op 3 — Block 3 (rad 887-977, Anbudsutkast-rullgardin) — STÖRSTA

**Plats:** Hela utkast-redigerings-zonen med toolbar + förhandsvisning + textarea + fade-gradient

**Q1 + Q2 + Q3 designval applicerade:**

**Wrapper:**
- Vit kort + light-border + boxShadow

**Toolbar (övre del):**
- Light-cream bg (skiljer från innehåll)
- Knappar: light-bg + light-border + light-t1 default → light-amber-glow + light-amber-border när aktiv
- "Förhandsvisa" / "Redigera" / etc behåller emojis (📋 etc) för 3F

**Förhandsvisnings-zon (när `förhandsgranskning === true`):**
- **light-cream bg** (papper-känsla per Q2)
- HTML-render via `dangerouslySetInnerHTML` — bg `#fff` BEHÅLLS (HTML-dokument-kontext per din DEL 5-notering)
- Innehåll-padding light-t1 text

**Textarea-zon (när `förhandsgranskning === false`):**
- **Vit bg** (input-känsla per Q2)
- Border light-border
- Text light-t1
- Placeholder light-t3

**Fade-gradient (rad 925-929):**
- `linear-gradient(transparent, var(--navy-mid))` → `linear-gradient(transparent, var(--light-cream))` (per Q3 — matchar förhandsvisnings-zon)
- VIKTIGT: Bara om gradienten ligger ÖVER förhandsvisnings-zonen. Om den ligger över textarea-zonen → använd `var(--light-bg)`. Verifiera live.

**Toggle-knapp (rad ~970, "Förhandsvisa" / "Redigera"):**
- Light-amber-glow bg + light-amber border + light-amber text

#### Op 4 — Block 4 (rad 980-1047, Prisöversikt med IIFE-conditional avdrag)

**Q4 designval applicerat:**

**Wrapper:**
- **light-cream bg** (matchar Summering i SnabboffertVy per Q4)
- Light-border + boxShadow

**2-grid layout:**
- Vänster kolumn: labels light-t3 (uppercase + small) eller light-t2 (regular)
- Höger kolumn: värden light-t1 (regular) eller light-amber (Total)

**IIFE-avdrag-conditional (om `mom.length > 0`):**
- Avdrag-rad light-t2 + minus-tecken light-red eller light-orange
- "Kunden betalar"-rad highlight med **light-amber-glow bg** + light-amber text (per Q4)

**Total inkl moms:**
- Light-amber stor text (matchar SnabboffertVy)

#### Op 5 — Block 5 (rad 1050-1125, Kontaktperson + infoga-knapp)

**Q5 designval applicerat — Phosphor Check:**

**Wrapper:**
- Vit kort + light-border + boxShadow

**Select (kontaktperson-väljare):**
- Light-bg + light-border + light-t1
- Hover/focus light-amber-border

**Infoga-knapp — växlar styling baserat på `kontaktInfogad` state:**

| `kontaktInfogad` | Styling | Ikon | Text |
|------------------|---------|------|------|
| `false` | light-amber-glow bg + light-amber border + light-amber text | Phosphor `Plus` | "Infoga kontaktinfo" |
| `true` | light-green-bg + light-green border + light-green text | Phosphor `Check` | "Kontaktinfo infogad" |

**Preview (om finns):**
- Light-off bg + light-t2 text

#### Op 6 — Block 7 (rad 1138-1167, Ladda ner-knappar)

**Q6 designval applicerat — Båda primär:**

**Wrapper:**
- Vit kort eller inline ingen wrapper (verifiera live) + light-border om wrapper finns

**Två knappar (PDF + Word):**
- BÅDA primär-styling: light-amber bg + light-navy text + light-amber-border
- Phosphor `Download` ikon vänster om text
- Hover state: subtilare amber

#### Op 7 — Block 8 (rad 1170-1275, Förbered mail) — STORT

**Q7 designval applicerat — Vit kort + Phosphor ClipboardText:**

**Wrapper:**
- Vit kort + light-border + boxShadow

**Rubrik:**
- light-t1 + Phosphor `EnvelopeSimple` eller behåll emoji för 3F

**Ämnesrad (input):**
- Light-bg + light-border + light-t1
- Label light-t3 ovanför

**Följebrev (textarea):**
- Light-bg + light-border + light-t1 (samma som Block 3 textarea-zon)
- Label light-t3 ovanför
- Placeholder light-t3

**Två kopiera-knappar:**
- Light-amber-glow bg + light-amber border + light-amber text
- Phosphor `ClipboardText` ikon vänster
- "Kopiera ämnesrad" / "Kopiera följebrev"

#### Op 8 — Block 9 (rad 1278-1309, Markera som skickat)

**Q8 designval applicerat — Light-cream bg + grön knapp + Phosphor PaperPlaneTilt:**

**Wrapper:**
- **Light-cream bg** (skickat-zone, lugnare actions-känsla per Q8)
- Light-border + boxShadow

**Datum-input:**
- Light-bg + light-border + light-t1
- Label light-t3 ovanför

**"Markera som skickat"-knapp:**
- light-green-bg + light-green border + light-green text (eller light-navy text för kontrast — verifiera live)
- Phosphor `PaperPlaneTilt` ikon vänster

#### Op 9 — Block 10 (rad 1312-1405, Inskickningshistorik) — STÖRSTA #2

**Q9 designval applicerat — Vit kort + light-green highlight på senaste:**

**Wrapper:**
- Vit kort + light-border + boxShadow

**Rubrik:**
- light-t1 + räknare light-t3

**Visa-historik-toggle:**
- Light-amber-glow bg + light-amber text
- ▲▼ emojis behålls för 3F

**Versions-lista (när `visaHistorik === true`):**

Per inskickning:
- **Senaste version (`i === 0`):** **light-green-bg** wrapper + light-green border + label "Senaste"
- **Äldre versioner (`i > 0`):** light-off bg + light-border

Per rad innehåll:
- Version-nummer light-t1 (bold)
- Datum light-t3
- Anbud-snapshot-toggle (▲▼) — emoji kvar för 3F

**Anbud-snapshot (när `expanderadVersion === insk.version`):**
- HTML-render via `dangerouslySetInnerHTML` — bg `#fff` BEHÅLLS
- Padding light-t1 text

#### Op 10 — Block 11 (rad 1408-1418, Tilldelning-wrapper)

**Q10 designval applicerat — Light-amber-glow card:**

**Conditional:** `pipeline_status === 'inskickat' || === 'tilldelning'`

**Wrapper:**
- **light-amber-glow bg** (signalerar "väntar på beslut" per Q10)
- Light-amber border + boxShadow

**Rubrik (om finns):**
- light-amber text + ikon (Phosphor `Hourglass` om passar, eller behåll emoji för 3F)

**UtfallsKnappar:**
- Renderas oförändrat (egen komponent — egen migration vid behov)

---

### FAS 2 — KalkylVy.tsx (1 op)

#### Op 11 — KalkylVy.tsx full migration

**Q11 designval applicerat — Spegla SnabboffertVy:**

**Wrapper:**
- Vit kort + light-border + boxShadow

**Rubrik:**
- "Egen kalkyl" eller motsv. light-t1
- Eventuell emoji kvar för 3F

**Moment-tabell:**

**Tabell-header:**
- light-off bg
- Kolumn-labels light-t4 uppercase small
- Kolumner: Beskrivning / Timmar / Timpris / Material / Belopp / [✕ ta-bort]

**Tabell-rader (per moment):**
- light-bg eller vit (vid hover light-off)
- Inputs: light-bg + light-border + light-t1
- Auto-beräknat belopp light-t2 (read-only feel)

**"+ Lägg till rad"-knapp:**
- Light-amber-glow bg + light-amber border + light-amber text
- Phosphor `Plus` ikon vänster

**Ta-bort-knapp per rad (✕):**
- Light-red text + hover light-red-bg
- Phosphor `X` ikon (ersätter eventuell ✕-emoji om finns)

**Summering (botten av tabell):**
- **light-cream bg** (matchar SnabboffertVy per Q11)
- "Summa exkl moms" light-t2
- "Moms 25%" light-t2
- **"Total inkl moms" light-amber stor text** (matchar SnabboffertVy)

---

### FAS 3 — Verifiering + Build + Commit

#### ⏸ STOP 1 — Visuell verifiering Tab 3

**Test-villkor:** Projekt med utkast genererat (analysTyp === 'formell' eller 'snabb' med utkast).

**Test 1 — Formell-flöde (analysTyp !== 'snabb'):**
- KalkylVy ljus + moment-tabell ljus + Total inkl moms light-amber
- RotKalkyl ljus (redan migrerad i 3D — verifiera att inget brutits)

**Test 2 — Snabb-flöde (analysTyp === 'snabb'):**
- Block 2 info-text ljus
- Tab-byte-knapp till Tab 2 fungerar

**Test 3 — Block 3 (Anbudsutkast):**
- Toolbar light-cream bg
- Förhandsvisnings-zon light-cream bg (papper-känsla)
- Textarea-zon vit bg (input-känsla)
- Fade-gradient matchar förhandsvisnings-zon
- Toggle "Förhandsvisa"/"Redigera" fungerar

**Test 4 — Block 4 (Prisöversikt):**
- Light-cream bg
- Total inkl moms light-amber
- Avdrag (om ROT aktiv) light-amber-glow highlight på "Kunden betalar"

**Test 5 — Block 5 (Kontaktperson):**
- Infoga-knapp light-amber-glow + Phosphor Plus när inte infogad
- Växlar till light-green-bg + Phosphor Check när infogad
- State-toggle fungerar

**Test 6 — Block 7 (Ladda ner):**
- Två amber primärknappar med Phosphor Download

**Test 7 — Block 8 (Förbered mail):**
- Vit kort + ämnesrad-input + följebrev-textarea
- Två kopiera-knappar med Phosphor ClipboardText
- Kopiera till clipboard fungerar

**Test 8 — Block 9 (Markera som skickat):**
- Light-cream bg + datum-input
- Grön knapp + Phosphor PaperPlaneTilt
- Markering fungerar (sparar i DB)

**Test 9 — Block 10 (Inskickningshistorik):**
- Vit kort + visa-historik-toggle
- Senaste version light-green-bg highlight
- Äldre versioner light-off bg
- Anbud-snapshot HTML-render (bg `#fff` korrekt)

**Test 10 — Block 11 (Tilldelning):**
- Light-amber-glow card (visas om pipeline_status matchar)
- UtfallsKnappar fungerar

**Test 11 — Inga JS-fel + auto-spara fungerar**

#### Op 12 — Build

```bash
npm run build
```

**Förväntat:** 0 fel, 0 nya warnings.

#### Op 13 — Lokal commit

**Commit-meddelande:**

```
feat(ui): Steg 3E.1 — Tab 3 (Anbud) + KalkylVy till light-tokens

- page.tsx Tab 3-blocket (rad 809-1422, ~84 token-byten)
- 9 inline-blocks migrerade (Block 1-2, 3-5, 7-11)
- Block 3 (Anbudsutkast): toolbar light-cream + textarea vit + förhandsvisning light-cream
- Block 4 (Prisöversikt): light-cream bg + Total inkl moms light-amber
- Block 5 (Kontaktperson): Phosphor Check + Plus, växlande styling
- Block 7 (Ladda ner): Phosphor Download + båda amber primär
- Block 8 (Förbered mail): Phosphor ClipboardText kopiera-knappar
- Block 9 (Markera som skickat): Phosphor PaperPlaneTilt + light-cream bg
- Block 10 (Inskickningshistorik): light-green-bg på senaste version
- Block 11 (Tilldelning): light-amber-glow card
- KalkylVy.tsx full migration (speglar SnabboffertVy struktur)
- Phosphor imports: Check, Download, ClipboardText, PaperPlaneTilt, Plus, X
- Phosphor-skuld: ~22 emojis kvar i Tab 3 + KalkylVy för Steg 3F
- HTML-render dangerouslySetInnerHTML behåller bg #fff (HTML-dokument-kontext)
- Fade-gradient migrerad till var(--light-cream) per förhandsvisnings-zon
```

**Lokal commit. INTE push förrän visuell verifiering live har bekräftats efter eventuell push-diskussion.**

---

## Plan mode-avvikelser uppmuntras

Om Claude Code under inventering eller migration upptäcker:

1. **Live har annan struktur än specen beskriver** → Behåll live's struktur, rapportera avvikelse
2. **Komponent har redan light-tokens** → Skip det blocket, rapportera "redan migrerat"
3. **Subkomponenter eller helpers som specen missar** → Inkludera dem, rapportera tillägg
4. **Inline-blocks som specen missar (likt 3D Op 5.5)** → Lägg till som Op 5.5/6.5/etc, rapportera
5. **Designval visar sig inkompatibelt med live's logik** → Behåll live's logik, rapportera

Lärdom från 3D: **Live ÄR sanningen, spec är förslag.**

---

## Sammanfattning för operatören

**Filer som ändras:**
- `app/(app)/projekt/[projektId]/page.tsx` (Tab 3-blocket, rad 809-1422)
- `components/KalkylVy.tsx` (full migration)

**Operationer:** 13 (10 op page.tsx + 1 op KalkylVy + Build + Commit)

**Stop-punkter:** 1 (efter Op 11, före Op 12 build)

**Phosphor-imports:** 6 nya (Check, Download, ClipboardText, PaperPlaneTilt, Plus, X)

**Estimerat:** ~743 rader migration

**Phosphor-skuld kvar för 3F:** ~22 emojis i Tab 3 + KalkylVy (instruktionsruta-emojis, snabbofferts info-text emojis, Block 3 toolbar-emojis, ▲▼ historik-toggles, eventuella moment-emojis)

**Lokal commit. Push diskuteras efter STOP 1-verifiering.**

**Använd svenska.**
