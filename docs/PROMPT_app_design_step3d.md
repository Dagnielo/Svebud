# PROMPT_app_design_step3d.md

## Steg 3D — Tab 2 (Analys & Bedömning) + 3 komponenter

**Datum:** 2 maj 2026
**Mål:** Ljus migration av Analys-tab + GranskningSida + SnabboffertVy + RotKalkyl
**Estimerad tid:** 1 dag Claude Code-arbete (~2-3 timmar)
**Risk:** Medel (4 filer, ~1227 rader, alternativ rendering-logik)
**Beroende:** Steg 3B (`9b05cd6`) + Steg 3C (`b3b905f`) live på origin/main
**Följdsteg:** Steg 3E (Tab 3 Anbud + Tab 4 Föranmälan + KalkylVy + ForanmalanTracker)

> **Vad detta gör:** Migrerar Analys-tab och 3 specialkomponenter till
> ljus design. Tab 2 har **alternativ rendering** baserat på `analysTyp`:
> formell analys → GranskningSida, snabb analys → SnabboffertVy + RotKalkyl
> + kundfrågor.

---

## Designprincip-kontext

Från `CLAUDE.md ## Designprinciper`:
> SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår
> elinstallation. AI är medlet — inte budskapet, inte identiteten.

**Konsekvenser för 3D:**
- **Designspråk-konsekvens** med Pipeline-vyn + Steg 3B-3C
- **Phosphor Bold** ersätter alla emojis i dessa komponenter
- **Lärdom från 3A:** Live ÄR sanningen. Spec-kod är förslag — bara
  färger + ikoner byts, struktur bevaras

---

## Designval (bekräftade — alla rekommendationer)

| Aspekt | Val | Konsekvens |
|--------|-----|------------|
| GranskningSida wrapper | A | Vit kort + shadow |
| GO/NO-GO badge | B | Phosphor CheckCircle/XCircle/Warning |
| Match-procent | A | Stor siffra + dynamisk färg (≥80% grön / 60-80% amber / <60% röd) |
| Krav-lista | A | Behåll struktur + Phosphor Check/X |
| Möjligheter/Risker | C | Header-ikon + bullets med bg-färg |
| SnabboffertVy redigerbara fält | A | Behåll tabell, byt färger |
| RotKalkyl ROT-typer | A | Segmented buttons (Alla projekt-konsekvent) |
| Kundfrågor-sektion | B | Phosphor Question + Plus |

---

## Vad som ÄR i scope

- `app/(app)/projekt/[projektId]/page.tsx` — Analys-tab-blocket (rad ~764-882)
  - Inkluderar conditional-rendering (formell vs snabb)
  - Inkluderar kundfrågor-sektion
- `components/GranskningSida.tsx` — full migration (353 rader)
- `components/SnabboffertVy.tsx` — full migration (440 rader)
- `components/RotKalkyl.tsx` — full migration (434 rader)

## Vad som INTE är i scope

- KalkylVy, ForanmalanTracker (Steg 3E)
- Anbud-tab (Steg 3E)
- Föranmälan-tab (Steg 3E)
- Markdown-rendering — bevaras
- Auto-spara-logik — bevaras (auto-spara med 800ms-debounce i RotKalkyl, auto-spara i SnabboffertVy)
- Polling-logik — bevaras
- API-anrop — bevaras
- ROT-beräkning-logik (`lib/rot-regler`) — bevaras
- PostHog-events — inga nya

---

## Operationer

### FAS 1 — Formell analys-flödet (GranskningSida + page.tsx-block)

#### Op 1 — Tab 2-blocket i page.tsx (Analys-tab)

**Hitta** Analys-tab-blocket i page.tsx (rad ~764-882 enligt 3A-inventering — kan ha flyttats efter 3B-3C).

**Conditional-rendering struktur:**

```typescript
{aktivTab === 'analys' && (
  <>
    {analysTyp === 'formell' && <GranskningSida ... />}
    {analysTyp === 'snabb' && (
      <>
        <SnabboffertVy ... />
        <RotKalkyl ... />
        {/* kundfrågor-sektion */}
      </>
    )}
  </>
)}
```

**Verifiera:** Bevara denna struktur. Bara wrapper-styling och kundfrågor-
sektionen migreras i page.tsx.

**Wrapper-styling för Tab 2:**

```typescript
// Tab 2-content-wrapper
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: oförändrat
boxShadow: 'none' → '0 1px 2px rgba(14,27,46,.04)'
padding: oförändrat
```

**OBS:** Om GranskningSida/SnabboffertVy/RotKalkyl har egna wrappers
behöver vi kanske INTE en yttre wrapper. Verifiera live-strukturen.

---

#### Op 2 — GranskningSida full migration

**Fil:** `components/GranskningSida.tsx` (353 rader)

**2.1 Wrapper**

```typescript
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: oförändrat (sannolikt 12)
boxShadow: 'none' → '0 1px 2px rgba(14,27,46,.04)'
padding: oförändrat
```

**2.2 Rubrik (oftast "Granskning av förfrågan" eller liknande)**

```typescript
color: 'var(--white-custom)' → 'var(--light-t1)'
fontSize: oförändrat
fontWeight: oförändrat
```

**2.3 GO/NO-GO badge — Phosphor-byten**

```typescript
import { CheckCircle, XCircle, Warning } from '@phosphor-icons/react'

// Före (text-only):
<span style={{ background: GO_COLOR, ... }}>GO</span>
<span style={{ background: NOGO_COLOR, ... }}>NO-GO</span>

// Efter (med ikon):
{verdictGoNoGo === 'GO' && (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--light-green-bg)',
    color: 'var(--light-green)',
    border: '1px solid var(--light-green)',
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
  }}>
    <CheckCircle size={20} weight="bold" />
    GO
  </span>
)}

{verdictGoNoGo === 'NO-GO' && (
  <span style={{
    background: 'var(--light-red-bg)',
    color: 'var(--light-red)',
    border: '1px solid var(--light-red)',
    /* samma styling */
  }}>
    <XCircle size={20} weight="bold" />
    NO-GO
  </span>
)}

{verdictGoNoGo === 'VILLKORLIG' && (
  <span style={{
    background: 'var(--light-amber-glow)',
    color: 'var(--light-amber)',
    border: '1px solid var(--light-amber)',
    /* samma styling */
  }}>
    <Warning size={20} weight="bold" />
    VILLKORLIG GO
  </span>
)}
```

**OBS:** Verifiera live-text för "VILLKORLIG GO" — kan vara annan
formulering. Bevara live-text.

**2.4 Match-procent — dynamisk färg**

```typescript
function getMatchFärg(procent: number): string {
  if (procent >= 80) return 'var(--light-green)'
  if (procent >= 60) return 'var(--light-amber)'
  return 'var(--light-red)'
}

// Stor siffra
<div style={{
  fontSize: 48,  // bevara live-fontSize
  fontWeight: 800,
  color: getMatchFärg(matchProcent),
  ...
}}>
  {matchProcent}%
</div>

// "Match"-text under
<div style={{
  fontSize: 13,
  color: 'var(--light-t3)',
  textAlign: 'center',
}}>
  Matchning mot din profil
</div>
```

**OBS:** Verifiera live-trösklar. ≥80/60-80/<60 är min spec — live kan
ha andra. Live ÄR sanningen.

**2.5 Sammanfattning**

```typescript
// Wrapper för sammanfattnings-text
background: 'var(--navy-light)' → 'var(--light-cream)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
color: 'var(--soft)' → 'var(--light-t2)'
borderRadius: oförändrat
padding: oförändrat
```

**2.6 Krav-lista — matchade krav (Phosphor Check)**

```typescript
import { Check } from '@phosphor-icons/react'

// Per matchat krav:
<li style={{
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  color: 'var(--light-t2)',
  fontSize: 14,
  marginBottom: 6,
}}>
  <Check
    size={16}
    weight="bold"
    color="var(--light-green)"
    style={{ marginTop: 3, flexShrink: 0 }}
  />
  <span>{krav.text}</span>
</li>
```

**2.7 Krav-lista — ouppfyllda krav (Phosphor X)**

```typescript
import { X } from '@phosphor-icons/react'

// Per ouppfyllt krav:
<li style={{ /* samma som matchat */ }}>
  <X
    size={16}
    weight="bold"
    color="var(--light-red)"
    style={{ marginTop: 3, flexShrink: 0 }}
  />
  <span>{krav.text}</span>
</li>
```

**2.8 Möjligheter-sektion (header-ikon + bg-färg)**

```typescript
import { Plus } from '@phosphor-icons/react'

<div style={{
  background: 'var(--light-green-bg)',
  border: '1px solid var(--light-green)',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
}}>
  <h3 style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--light-green)',
    margin: 0,
    marginBottom: 12,
  }}>
    <Plus size={18} weight="bold" />
    Möjligheter
  </h3>
  <ul style={{ /* bullet list */ }}>
    {/* möjligheter */}
  </ul>
</div>
```

**2.9 Risker-sektion (header-ikon + bg-färg)**

```typescript
import { Warning } from '@phosphor-icons/react'

<div style={{
  background: 'var(--light-amber-glow)',
  border: '1px solid var(--light-amber)',
  borderRadius: 8,
  padding: 16,
}}>
  <h3 style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--light-amber)',
    margin: 0,
    marginBottom: 12,
  }}>
    <Warning size={18} weight="bold" />
    Risker
  </h3>
  <ul style={{ /* bullet list */ }}>
    {/* risker */}
  </ul>
</div>
```

**2.10 Loader/spinner under analys**

Om GranskningSida har polling-state:

```typescript
// "Analys pågår..."-text
color: 'var(--steel)' → 'var(--light-t3)'

// Spinner-färg
'var(--yellow)' → 'var(--light-amber)'
```

---

#### ⏸ STOP 1 — Visuell verifiering av formell analys-flöde

**Före build + commit. Kör endast efter Op 1-2 är klara.**

Hard reload `localhost:3000/projekt/[någon-id]` med ett projekt som har
**formell analys** (`analysTyp === 'formell'`).

Klicka på Analys-tab. Verifiera:

1. Tab 2-content-wrapper ljus (vit + shadow)
2. GranskningSida vit kort med subtil shadow
3. GO/NO-GO badge med Phosphor-ikon (CheckCircle/XCircle/Warning)
4. Match-procent stor siffra med dynamisk färg
5. Sammanfattning i ljus cream-bg
6. Matchade krav: Phosphor Check + light-green
7. Ouppfyllda krav: Phosphor X + light-red
8. Möjligheter-sektion: light-green-bg + Plus-ikon
9. Risker-sektion: light-amber-glow + Warning-ikon
10. Inga JS-fel i DevTools

**Om allt OK** → fortsätt med FAS 2 (snabb-analys-flödet).

**Om något ser fel** → felsök innan FAS 2 startar. Vi vill inte ha buggar
i formell-flödet som blandar sig med snabb-flödet.

---

### FAS 2 — Snabb-analys-flödet (SnabboffertVy + RotKalkyl + kundfrågor)

#### Op 3 — SnabboffertVy full migration

**Fil:** `components/SnabboffertVy.tsx` (440 rader)

**3.1 Wrapper**

```typescript
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: oförändrat
boxShadow: 'none' → '0 1px 2px rgba(14,27,46,.04)'
padding: oförändrat
```

**3.2 Rubrik**

```typescript
color: 'var(--white-custom)' → 'var(--light-t1)'
```

**3.3 Tabell-header**

```typescript
// Header-rad-bg
background: 'var(--navy)' → 'var(--light-off)'

// Header-text
color: 'var(--steel)' → 'var(--light-t4)'
fontSize: oförändrat
fontWeight: oförändrat
textTransform: oförändrat
letterSpacing: oförändrat
```

**3.4 Tabell-rader**

```typescript
// Rad-wrapper
background: 'var(--navy-mid)' → 'var(--light-bg)'
borderBottom: '1px solid var(--navy-border)' → '1px solid var(--light-border)'

// Hover (om finns)
hover-background: 'var(--navy-light)' → 'var(--light-off)'
```

**3.5 Inputs (timmar, timpris, materialkostnad)**

```typescript
// Input-fält
background: 'var(--navy)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
color: 'var(--white-custom)' → 'var(--light-t1)'

// Focus
focus-border: 'var(--yellow)' → 'var(--light-amber)'

// Label (om finns ovanför inputen)
color: 'var(--steel)' → 'var(--light-t3)'
```

**3.6 Beskrivning-textarea**

```typescript
background: 'var(--navy)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
color: 'var(--white-custom)' → 'var(--light-t1)'
```

**3.7 Total-rad / summa**

```typescript
// Wrapper
background: 'var(--navy-light)' → 'var(--light-cream)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
fontWeight: oförändrat (sannolikt 700)

// Total-text
color: 'var(--white-custom)' → 'var(--light-t1)'
```

**3.8 "Lägg till moment"-knapp (om finns)**

```typescript
import { Plus } from '@phosphor-icons/react'

background: 'var(--navy-light)' → 'var(--light-bg)'
border: '1px dashed var(--navy-border)' → '1px dashed var(--light-border)'
color: 'var(--steel)' → 'var(--light-t2)'

// Med Phosphor:
<button>
  <Plus size={16} weight="bold" />
  Lägg till moment
</button>
```

**3.9 "Ta bort moment"-knapp (om finns per rad)**

```typescript
import { Trash } from '@phosphor-icons/react'

color: 'var(--red)' → 'var(--light-red)'

// Med Phosphor:
<button onClick={...}>
  <Trash size={14} weight="bold" />
</button>
```

---

#### Op 4 — RotKalkyl full migration

**Fil:** `components/RotKalkyl.tsx` (434 rader)

**4.1 Wrapper**

```typescript
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: oförändrat
boxShadow: 'none' → '0 1px 2px rgba(14,27,46,.04)'
padding: oförändrat
```

**4.2 Rubrik**

```typescript
color: 'var(--white-custom)' → 'var(--light-t1)'
```

**4.3 ROT-typer från radio-buttons → segmented buttons**

Live har sannolikt:

```typescript
// Före
<label><input type="radio" .../> Hushållsarbete</label>
<label><input type="radio" .../> Trädgårdsarbete</label>
<label><input type="radio" .../> ...</label>
```

Efter (segmented buttons stil — matchande Alla projekt-vyn):

```typescript
<div style={{
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginBottom: 16,
}}>
  {ROT_TYPER.map((typ) => {
    const aktiv = valdRotTyp === typ.kod
    return (
      <button
        key={typ.kod}
        onClick={() => setValdRotTyp(typ.kod)}
        style={{
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 500,
          background: aktiv ? 'var(--light-amber-glow)' : 'var(--light-bg)',
          border: `1px solid ${aktiv ? 'var(--light-amber)' : 'var(--light-border)'}`,
          color: aktiv ? 'var(--light-amber)' : 'var(--light-t2)',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all .12s ease',
        }}
      >
        {typ.label}
      </button>
    )
  })}
</div>
```

**OBS:** Verifiera mot live-strukturen. Om live har fler attribut
(beskrivning, exempel) — bevara dem.

**4.4 Auto-spara-indikator (om visas)**

```typescript
// "Sparar..." eller "Sparat"
color: 'var(--steel)' → 'var(--light-t4)'
```

**4.5 ROT-beräknings-resultat**

```typescript
// Wrapper för resultat
background: 'var(--navy-light)' → 'var(--light-cream)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'

// Avdragsbelopp (stor siffra)
color: 'var(--green)' → 'var(--light-green)'
fontSize: oförändrat
fontWeight: oförändrat

// Förklaring-text
color: 'var(--soft)' → 'var(--light-t2)'

// Subtila detaljer (max-tak, regler etc.)
color: 'var(--steel)' → 'var(--light-t4)'
```

**4.6 "AI-förslag"-flagga (om föreslagenTyp prop används)**

Om RotKalkyl visar "AI föreslår: Hushållsarbete" eller liknande:

```typescript
// Wrapper
background: 'var(--blue-glow)' → 'var(--light-blue-bg)'
border: '1px solid var(--blue-accent)' → '1px solid var(--light-blue)'
color: 'var(--blue-accent)' → 'var(--light-blue)'
```

---

#### Op 5 — Kundfrågor-sektion i page.tsx

**Hitta** kundfrågor-sektion-rendering i page.tsx (inom Analys-tab-blocket).

Live har:
- Lista över AI-genererade frågor (`kundFrågor` state)
- Textfält för "Lägg till fråga"
- Sannolikt en "Spara"-knapp eller auto-spara

**5.1 Sektion-wrapper**

```typescript
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: oförändrat
boxShadow: 'none' → '0 1px 2px rgba(14,27,46,.04)'
padding: oförändrat
```

**5.2 Sektion-rubrik med Phosphor**

```typescript
import { Question } from '@phosphor-icons/react'

<h3 style={{
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--light-t1)',
  margin: 0,
  marginBottom: 12,
}}>
  <Question size={18} weight="bold" />
  Frågor till kund
</h3>
```

**5.3 Fråga-rad (per fråga)**

```typescript
// Wrapper
background: 'var(--navy-light)' → 'var(--light-off)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'

// Fråga-text
color: 'var(--soft)' → 'var(--light-t2)'

// Ta-bort-knapp (om finns)
color: 'var(--red)' → 'var(--light-red)'
```

**5.4 "Lägg till fråga"-input**

```typescript
import { Plus } from '@phosphor-icons/react'

// Input-fält
background: 'var(--navy)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
color: 'var(--white-custom)' → 'var(--light-t1)'

// "Lägg till"-knapp
<button>
  <Plus size={14} weight="bold" />
  Lägg till
</button>

// Knapp-styling
background: 'var(--yellow)' → 'var(--light-amber)'
color: 'var(--navy)' → 'var(--light-navy)'
```

---

#### ⏸ STOP 2 — Visuell verifiering av snabb-analys-flöde

**Före build + commit. Kör endast efter Op 3-5 är klara.**

Hard reload `localhost:3000/projekt/[någon-id]` med ett projekt som har
**snabb analys** (`analysTyp === 'snabb'`).

Klicka på Analys-tab. Verifiera:

1. SnabboffertVy vit kort med subtil shadow
2. SnabboffertVy tabell ljus (vit bg + ljus border)
3. SnabboffertVy inputs ljus med focus-amber
4. SnabboffertVy total-rad cream-bg
5. RotKalkyl vit kort med subtil shadow
6. RotKalkyl ROT-typer som segmented buttons (light-amber-glow vid aktiv)
7. RotKalkyl resultat-blocket cream-bg + light-green-belopp
8. Kundfrågor-sektion vit kort med Phosphor Question
9. "Lägg till fråga"-input + Phosphor Plus
10. Auto-spara fungerar (typing → DB-uppdatering)
11. Inga JS-fel i DevTools

**Om allt OK** → fortsätt med Op 6 (build) + Op 7 (commit).

---

### Op 6 — Build + smoke-test

```bash
npm run build
```

**Förväntat:** 0 fel.

```bash
npm run dev
```

**Final visuell verifiering:**

Test både `analysTyp === 'formell'` och `analysTyp === 'snabb'` om
möjligt. Båda flödena ska vara ljusa.

**Konsekvens-test:**
- Tab 1 (Dokument): ljus (3C)
- Tab 2 (Analys): ljus (3D — NY!)
- Tab 3 (Anbud): mörk (väntar 3E)
- Tab 4 (Föranmälan): mörk (väntar 3E)

---

### Op 7 — Commit (lokal, no push)

```
feat(detaljvyn): Tab 2 (Analys) + GranskningSida + SnabboffertVy + RotKalkyl ljus (Steg 3D)

Migrerar Analys-tab och 3 specialkomponenter från mörk till ljus
designspråk. Både formell-analys-flödet (GranskningSida) och
snabb-analys-flödet (SnabboffertVy + RotKalkyl + kundfrågor) är
nu konsekventa med Pipeline-vyn + Steg 3B-3C.

Migrerade filer:
- app/(app)/projekt/[projektId]/page.tsx (Analys-tab-blocket + kundfrågor)
- components/GranskningSida.tsx (full migration)
- components/SnabboffertVy.tsx (full migration)
- components/RotKalkyl.tsx (full migration)

Designändringar:
- Tab 2-wrapper: vit + subtil shadow
- GranskningSida: vit kort + Phosphor GO/NO-GO-badges
- Match-procent: dynamisk färg per nivå (≥80 grön / 60-80 amber / <60 röd)
- Krav-lista: Phosphor Check (matchade) / X (ouppfyllda)
- Möjligheter: light-green-bg + Phosphor Plus header-ikon
- Risker: light-amber-glow + Phosphor Warning header-ikon
- SnabboffertVy: vit tabell-design + light-amber focus
- RotKalkyl: ROT-typer som segmented buttons (light-amber-glow vid aktiv)
- Kundfrågor: vit kort + Phosphor Question + Plus

Phosphor ersätter emojis i 3D:
- Inga emojis i ursprungliga komponenter (alla togs i 3A-inventering)
- Lade till: CheckCircle, XCircle, Warning, Check, X, Plus, Question, Trash

OBS: Tab 3 (Anbud) + Tab 4 (Föranmälan) fortfarande mörka — migreras i 3E.

Spec: docs/PROMPT_app_design_step3d.md
```

---

## Acceptanskriterier

### Formell analys-flödet

- [ ] Tab 2-wrapper ljus (vit + shadow)
- [ ] GranskningSida vit kort med subtil shadow
- [ ] GO-badge: Phosphor CheckCircle + light-green
- [ ] NO-GO-badge: Phosphor XCircle + light-red
- [ ] VILLKORLIG-badge: Phosphor Warning + light-amber
- [ ] Match-procent stor siffra med dynamisk färg
- [ ] Sammanfattning ljus cream-bg
- [ ] Matchade krav: Phosphor Check + light-green
- [ ] Ouppfyllda krav: Phosphor X + light-red
- [ ] Möjligheter-sektion: light-green-bg + Plus-ikon
- [ ] Risker-sektion: light-amber-glow + Warning-ikon

### Snabb analys-flödet

- [ ] SnabboffertVy vit kort med shadow
- [ ] SnabboffertVy tabell ljus
- [ ] SnabboffertVy inputs med light-amber focus
- [ ] SnabboffertVy total-rad cream-bg
- [ ] RotKalkyl vit kort med shadow
- [ ] RotKalkyl ROT-typer som segmented buttons
- [ ] RotKalkyl aktiv typ: light-amber-glow + amber border
- [ ] RotKalkyl resultat-block cream-bg + light-green-belopp
- [ ] Kundfrågor-sektion vit kort
- [ ] Kundfrågor: Phosphor Question header
- [ ] Lägg-till-input + Phosphor Plus

### Funktionalitet

- [ ] `npm run build` 0 fel
- [ ] Auto-spara fungerar (RotKalkyl, SnabboffertVy)
- [ ] ROT-beräkning fungerar
- [ ] Snabboffert-moment redigering fungerar
- [ ] Kundfrågor lägg-till + ta-bort fungerar
- [ ] Tab-bytning fortfarande funktionell
- [ ] Inga konsole-fel
- [ ] Tab 3 + Tab 4 fortfarande mörka (förväntat)
- [ ] Commit lokal, ej pushad

---

## Risker

**Risk 1: GranskningSida verdict-värden**
Min spec antar `verdictGoNoGo === 'GO' | 'NO-GO' | 'VILLKORLIG'`. Live
kan ha andra värden eller annan logik. Verifiera live `goNoGo`-state.

**Risk 2: Match-procent-trösklar**
Min spec säger ≥80/60-80/<60. Live kan ha andra. Använd live's logik.

**Risk 3: SnabboffertVy auto-spara-state**
Komponenten har auto-spara med onChange-callback. Verifiera att färg-
byten inte påverkar state-handling.

**Risk 4: RotKalkyl segmented buttons-byten**
Att gå från radio-buttons till segmented buttons är en strukturell
ändring. Verifiera att state-logik (`valdRotTyp` eller motsvarande) inte
bryts. Bevara `onRotChange`-callback.

**Risk 5: lib/rot-regler-importer**
RotKalkyl använder `beräknaROT`, `ROT_TYPER`, `ROT_REGLER`. Bevara dessa.
Bara UI-styling ändras.

**Risk 6: Kundfrågor-state i page.tsx**
`kundFrågor[]`, `nyFråga` state styrs i page.tsx. Verifiera att add/remove-
logik inte påverkas av styling-ändringar.

**Risk 7: Conditional rendering analysTyp**
Tab 2 visar antingen formell eller snabb. Verifiera att båda flödena
fungerar efter migration.

**Risk 8: Spec-kod ≠ live (lärdom från 3A)**
Använd EXAKT live-styling för struktur (padding, fontSize, fontWeight,
margins). Specens kod är förslag — bara färger + ikoner ska bytas.

**Risk 9: --light-navy-token (eller motsvarande)**
Specen refererar `var(--light-navy)` för knapp-text. Verifiera att den
finns i globals.css eller använd `var(--light-t1)` som alternativ.

---

## Ej i scope (Steg 3E)

- KalkylVy (Anbud-tab)
- ForanmalanTracker (Föranmälan-tab)
- Anbud-tab utkast-redigering, prisöversikt, kontakt, kvalitet, skicka
- Inskickningshistorik
- Markdown-rendering (utkast-förhandsvisning)
- PDF/Word-export
- PostHog-events utöver befintliga
- Phosphor-skuld-rensning (sista commit i Steg 3 eller Steg 3F)

---

## Phosphor-skuld-status efter Steg 3D

Återstår att rensas vid Steg 3 avslutning:

| Plats | Emojis | Steg som migrerar |
|-------|--------|-------------------|
| Stepper instruktionsruta | 📎📊⚡📋 + 🔍⏳ | Steg 3F (eller efter 3E) |
| AnbudsUppladdning fil-status | ✅⏳⚠️⏸️❌ | Steg 3F |
| KvalitetsPanel allvarlighet | ✅💡⚠️❌ | Steg 3F |
| KvalitetsPanel statistik-badges | ❌💡⚠️✅ | Steg 3F |
| KvalitetsPanel åtgärds-knappar | 🔄▲ | Steg 3F |

Total emoji-skuld efter 3D: ~18 emojis i 4 platser.

3D introducerar **inga nya emojis** — alla nya ikoner är Phosphor.
