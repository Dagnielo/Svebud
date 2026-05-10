# PROMPT_app_design_step3c.md

## Steg 3C — Tab 1 (Dokument) + AnbudsUppladdning + KvalitetsPanel

**Datum:** 2 maj 2026
**Mål:** Ljus migration av Dokument-tab + 2 komponenter
**Estimerad tid:** 0,5–1 dag Claude Code-arbete (~1-2 timmar)
**Risk:** Låg-medel (3 filer, designspråk etablerat)
**Beroende:** Steg 3B lokal commit (`9b05cd6`) klar
**Följdsteg:** Steg 3D (Tab 2 Analys + GranskningSida + SnabboffertVy + RotKalkyl)

> **Vad detta gör:** Migrerar Dokument-taben och två specialkomponenter
> till ljus design. Phosphor ersätter alla emojis i dessa komponenter.

---

## Designprincip-kontext

Från `CLAUDE.md ## Designprinciper`:
> SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår
> elinstallation. AI är medlet — inte budskapet, inte identiteten.

**Konsekvenser för Steg 3C:**
- **Designspråk-konsekvens** med Pipeline-vyn + Steg 3B-ramen
- **Phosphor Bold** ersätter alla emojis (📁 📋 🔍 etc.)
- **Lärdom från 3A:** Live ÄR sanningen. Spec-kod nedan är förslag —
  kopiera EXAKT styling för delar som ska se identiska ut, anpassa
  bara färger + ikoner

---

## Designval (bekräftade — alla rekommendationer)

| Aspekt | Val | Konsekvens |
|--------|-----|------------|
| Dokument-tab tom-state | A | Vit ruta + Phosphor Folder-ikon |
| AnbudsUppladdning drag-zon | A | Cream-bg + amber dashed border |
| Knappar i AnbudsUppladdning | A | Phosphor FolderOpen + ClipboardText |
| KvalitetsPanel "Granska anbud"-knapp | A | Amber primärknapp |
| KvalitetsPanel betyg-rendering | A | Behåll struktur, byt färger |
| KvalitetsPanel 🔍-emoji | A | Phosphor MagnifyingGlass |

---

## Vad som ÄR i scope

- `app/(app)/projekt/[projektId]/page.tsx` — Dokument-tab-blocket (rad ~687-761)
- `components/AnbudsUppladdning.tsx` — full migration till ljus
- `components/KvalitetsPanel.tsx` — full migration till ljus
- Alla emojis i dessa komponenter byts till Phosphor

## Vad som INTE är i scope

- GranskningSida, SnabboffertVy, RotKalkyl (Steg 3D)
- KalkylVy, ForanmalanTracker (Steg 3E)
- Anbud-tab (Steg 3E)
- Föranmälan-tab (Steg 3E)
- Auto-spara-logik — bevaras
- Polling-logik — bevaras
- API-anrop — bevaras
- PostHog-events — inga nya

---

## Operationer

### Op 1 — Dokument-tab tom-state i page.tsx

**Hitta** Dokument-tab-blocket i page.tsx (rad ~687-761 enligt 3A-inventering, kan ha flyttats efter 3B).

**Hitta** tom-state-renderingen — när inga dokument finns. Live har sannolikt:
- Mörk ruta
- Text "Dokumenten behöver analyseras" eller liknande
- Eventuellt ikon

**Ändringar:**

```typescript
// Wrapper för tom-state
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: oförändrat
boxShadow: 'none' → '0 1px 2px rgba(14,27,46,.04)'

// Text
color: 'var(--muted-custom)' → 'var(--light-t3)'
```

**Lägg till Phosphor-ikon:**

```typescript
import { Folder } from '@phosphor-icons/react'

<div style={{ textAlign: 'center', padding: '64px 20px' }}>
  <Folder
    size={48}
    weight="bold"
    color="var(--light-t4)"
    style={{ marginBottom: 16 }}
  />
  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--light-t2)', marginBottom: 4 }}>
    {/* befintlig huvudtext */}
  </div>
  <div style={{ fontSize: 13, color: 'var(--light-t4)' }}>
    {/* befintlig undertext om finns */}
  </div>
</div>
```

**Bevara:** All conditional logik (visas-bara-om-tom etc.).

---

### Op 2 — Dokumentlistan i Dokument-tab

**Hitta** Dokumentlistan-renderingen — när dokument finns.

Varje dokument-rad har:
- Filnamn
- Statuspunkt (extraherad / väntar)
- Storlek/datum

**Ändringar (per rad):**

```typescript
// Rad-wrapper
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: oförändrat
hover: 'var(--navy-light)' → 'var(--light-off)'
boxShadow: 'none' → '0 1px 2px rgba(14,27,46,.04)'

// Filnamn
color: 'var(--white-custom)' → 'var(--light-t1)'

// Statuspunkt
'var(--green)' → 'var(--light-green)' (extraherad)
'var(--yellow)' → 'var(--light-amber)' (väntar)

// Storlek/datum-undertitel
color: 'var(--muted-custom)' → 'var(--light-t3)'
```

**Phosphor-byten** om emojis finns (📄 → `FileText`):

```typescript
import { FileText } from '@phosphor-icons/react'

<FileText size={16} weight="bold" color="var(--light-t3)" />
```

---

### Op 3 — AnbudsUppladdning full migration till ljus

**Fil:** `components/AnbudsUppladdning.tsx` (293 rader enligt 3A-inventering)

**Ändringar:**

#### 3.1 Wrapper

```typescript
background: 'var(--navy)' → 'var(--light-cream)'
// Eller om wrapper är transparent — behåll
```

#### 3.2 Drag-drop-zon

```typescript
// Idle state (ingen drag)
background: 'var(--navy-mid)' → 'var(--light-cream)'
border: '2px dashed var(--navy-border)' → '2px dashed var(--light-amber)'
color: 'var(--white-custom)' → 'var(--light-t1)'

// Drag-over state
background: 'var(--navy-light)' → 'var(--light-amber-glow)'
border: '2px dashed var(--yellow)' → '2px dashed var(--light-amber)'

// Hover state (om finns)
background: oförändrad eller 'var(--light-off)'
```

#### 3.3 Drop-zon-text

```typescript
// "Dra och släpp alla dokument..."
color: 'var(--white-custom)' → 'var(--light-t1)'

// "PDF · Word · Excel..." (filtyper)
color: 'var(--steel)' → 'var(--light-t3)'

// "Max 20 MB per fil"
color: 'var(--muted-custom)' → 'var(--light-t4)'
```

#### 3.4 Knappar — emojis till Phosphor

```typescript
// Före
<button>📁 Välj filer</button>
<button>📋 Klistra in text / mail</button>

// Efter
import { FolderOpen, ClipboardText } from '@phosphor-icons/react'

<button style={{
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: 'var(--light-bg)',
  border: '1px solid var(--light-border)',
  color: 'var(--light-t1)',
  padding: '10px 16px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}}>
  <FolderOpen size={16} weight="bold" />
  Välj filer
</button>

<button style={{ /* samma styling */ }}>
  <ClipboardText size={16} weight="bold" />
  Klistra in text / mail
</button>
```

#### 3.5 Manuell text-input-modal (om finns)

Om det finns en modal/popover för "Klistra in text":

```typescript
// Modal-wrapper
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
boxShadow: lägg till '0 4px 16px rgba(14,27,46,.12)' för modal-effekt

// Textarea
background: 'var(--navy)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
color: 'var(--white-custom)' → 'var(--light-t1)'

// Bekräfta-knapp
background: 'var(--yellow)' → 'var(--light-amber)'
color: 'var(--navy)' → 'var(--light-navy)'
```

#### 3.6 Uppladdnings-progress (om finns)

```typescript
// Progress-bar bg
background: 'var(--navy-light)' → 'var(--light-cream)'

// Progress-bar fill
background: 'var(--yellow)' → 'var(--light-amber)'

// Status-text under bar
color: 'var(--steel)' → 'var(--light-t3)'
```

---

### Op 4 — KvalitetsPanel full migration till ljus

**Fil:** `components/KvalitetsPanel.tsx` (302 rader enligt 3A-inventering)

#### 4.1 Wrapper

```typescript
background: 'var(--navy-mid)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
borderRadius: oförändrat
boxShadow: 'none' → '0 1px 2px rgba(14,27,46,.04)'
padding: oförändrat
```

#### 4.2 Header — 🔍-emoji till Phosphor

```typescript
// Före
<h2>🔍 Kvalitetsgranskning</h2>

// Efter
import { MagnifyingGlass } from '@phosphor-icons/react'

<h2 style={{
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--light-t1)',
}}>
  <MagnifyingGlass size={18} weight="bold" />
  Kvalitetsgranskning
</h2>
```

#### 4.3 "Granska anbud"-knapp (huvudknapp)

```typescript
background: 'var(--yellow)' → 'var(--light-amber)'
color: 'var(--navy)' → 'var(--light-navy)' (eller behåll om matchar)
border: oförändrat eller 'none'
fontSize: oförändrat
fontWeight: oförändrat (sannolikt 600)
padding: oförändrat
borderRadius: oförändrat

// Hover
hover-background: 'var(--yellow-bright)' → 'var(--light-amber-hover)' eller mörkare amber

// Disabled (om "laddar")
opacity: 0.5
cursor: 'not-allowed'
```

#### 4.4 Loader/spinner under granskning

```typescript
color: 'var(--yellow)' → 'var(--light-amber)'
// Om spinner är CSS-animation — uppdatera färg
```

#### 4.5 Betyg-display (0-10)

Live har sannolikt en stor siffra för betyget.

```typescript
// Stor betyg-siffra
color: dynamisk per betyg:
  ≥8: 'var(--light-green)'
  5-7: 'var(--light-amber)'
  <5: 'var(--light-red)'

// "/ 10"-text bredvid
color: 'var(--light-t3)'

// Bg eller ram för betyg-display
background: 'var(--light-cream)' eller 'var(--light-bg)'
```

#### 4.6 Kategori-feedback (Pris/Fullständighet/Språk/Juridik/ROT/Risk)

Varje kategori har sannolikt:
- Kategorinamn
- Status-ikon eller färg
- Feedback-text

```typescript
// Kategori-rad-wrapper
background: 'var(--navy-light)' → 'var(--light-off)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'

// Kategorinamn
color: 'var(--white-custom)' → 'var(--light-t1)'

// Status-ikon-färg (per allvarlighet)
'var(--green)' (OK) → 'var(--light-green)'
'var(--yellow)' (varning) → 'var(--light-amber)'
'var(--red)' (kritisk) → 'var(--light-red)'

// Feedback-text
color: 'var(--soft)' → 'var(--light-t2)'
```

#### 4.7 Filter-knappar (allvarlighets-filter)

```typescript
// Idle
background: 'var(--navy-light)' → 'var(--light-bg)'
border: '1px solid var(--navy-border)' → '1px solid var(--light-border)'
color: 'var(--steel)' → 'var(--light-t2)'

// Aktiv
background: 'var(--yellow-glow)' → 'var(--light-amber-glow)'
border: '1px solid var(--yellow)' → '1px solid var(--light-amber)'
color: 'var(--yellow)' → 'var(--light-amber)'
```

---

### Op 5 — Build + smoke-test

```bash
npm run build
```

**Förväntat:** 0 fel.

```bash
npm run dev
```

**Visuell smoke-test (lokalt):**

Öppna `localhost:3000/projekt/[någon-id]`.

**Test 1 — Dokument-tab utan filer (tom-state):**
- Vit ruta + Phosphor Folder-ikon
- Tydlig text om vad som ska göras
- Hela tab-zonen ljus (matchar ramen från 3B)

**Test 2 — AnbudsUppladdning drag-zon:**
- Cream-bg + amber dashed border
- Phosphor FolderOpen + ClipboardText i knappar
- Text läsbar mörk
- (Om möjligt: testa drag-over-state)

**Test 3 — KvalitetsPanel (om navigerbar):**
- Vit kort med shadow
- Phosphor MagnifyingGlass i header
- "Granska anbud"-knapp i amber
- Betyg-display + kategorier ljusa

**Test 4 — Visuell konsekvens med ramen:**
- Dokument-tab matchar Pipeline-vyns designspråk
- Inga mörka navy-zoner kvar i Dokument-tab eller AnbudsUppladdning

**OBS:** Analys-tab + Anbud-tab fortfarande mörka — det är förväntat,
migreras i 3D-3E.

---

### Op 6 — Commit (lokal, no push)

```
feat(detaljvyn): Tab 1 (Dokument) + AnbudsUppladdning + KvalitetsPanel ljus (Steg 3C)

Migrerar Dokument-tab och 2 specialkomponenter från mörk till ljus
designspråk. Hela Dokument-flödet (uppladdning, dokumentlista, kvalitets-
granskning) är nu konsekvent med Pipeline-vyn + Steg 3B-ramen.

Migrerade filer:
- app/(app)/projekt/[projektId]/page.tsx (Dokument-tab-blocket)
- components/AnbudsUppladdning.tsx (full migration)
- components/KvalitetsPanel.tsx (full migration)

Designändringar:
- Dokument-tab tom-state: vit ruta + Phosphor Folder
- Dokumentlista-rader: vit bg + ljus border + subtil shadow
- AnbudsUppladdning drag-zon: cream-bg + amber dashed
- AnbudsUppladdning knappar: Phosphor FolderOpen + ClipboardText
- KvalitetsPanel: vit kort + amber primärknapp
- KvalitetsPanel header: Phosphor MagnifyingGlass

Phosphor ersätter emojis:
- 📁 → FolderOpen (Välj filer-knapp)
- 📋 → ClipboardText (Klistra in text-knapp)
- 🔍 → MagnifyingGlass (KvalitetsPanel header)
- 📄 → FileText (om finns i dokumentlistan)

OBS: Analys-tab + Anbud-tab fortfarande mörka — migreras i 3D-3E.

Spec: docs/PROMPT_app_design_step3c.md
```

---

## Acceptanskriterier

- [ ] `npm run build` 0 fel
- [ ] Dokument-tab tom-state: vit ruta + Phosphor Folder
- [ ] Dokumentlista-rader (om dokument finns): vit bg + ljus border
- [ ] Statuspunkter på dokument: light-green/light-amber
- [ ] AnbudsUppladdning drag-zon: cream-bg + amber dashed
- [ ] AnbudsUppladdning text läsbar
- [ ] AnbudsUppladdning knappar: Phosphor FolderOpen + ClipboardText
- [ ] AnbudsUppladdning manuell text-modal (om finns): ljus
- [ ] AnbudsUppladdning progress-bar (om kan ses): light-amber
- [ ] KvalitetsPanel vit kort med shadow
- [ ] KvalitetsPanel header: Phosphor MagnifyingGlass
- [ ] KvalitetsPanel "Granska anbud"-knapp: amber primär
- [ ] KvalitetsPanel betyg: färg per nivå (≥8 grön, 5-7 amber, <5 röd)
- [ ] KvalitetsPanel kategorier: ljus design
- [ ] KvalitetsPanel filter-knappar: light-amber-glow vid aktiv
- [ ] Inga emojis kvar i de migrerade komponenterna
- [ ] Inga konsole-fel
- [ ] Auto-spara fungerar (om relevant)
- [ ] Drag-drop-funktionalitet fungerar
- [ ] Filuppladdning fungerar (om testbar)
- [ ] Analys-tab + Anbud-tab fortfarande mörka (förväntat)
- [ ] Commit lokal, ej pushad

---

## Risker

**Risk 1: Drag-drop-state-handling bryter vid styling-ändring**
AnbudsUppladdning har sannolikt state för "isDragging" som styr
drag-over-styling. Verifiera att state-logiken inte påverkas av
färg-byten.

**Risk 2: KvalitetsPanel betyg-färg-logik**
Min spec säger "≥8 grön, 5-7 amber, <5 röd" — verifiera mot live-logik.
Live kan ha andra trösklar.

**Risk 3: AnbudsUppladdning manuell text-modal**
Specen antar att modal/popover finns. Om den är inline-rendering eller
helt annan struktur — anpassa.

**Risk 4: KvalitetsPanel kategorier**
Inventering sa "Pris/Fullständighet/Språk/Juridik/ROT/Risk" men det
kan vara annorlunda struktur i live. Anpassa efter faktisk rendering.

**Risk 5: Spec-kod ≠ live (lärdom från 3A)**
Använd EXAKT live-styling för struktur (padding, fontSize, fontWeight,
margins). Specens kod är förslag — bara färger + ikoner som ska bytas.

**Risk 6: Filtyper-text "PDF · Word · Excel · Mail · Bilder · XML"**
Verifiera att färg på separator-prickar är `--light-t4` (subtila).
Om de är amber blir det visuellt brus.

---

## Ej i scope (Steg 3D-3E)

- GranskningSida + SnabboffertVy + RotKalkyl (Tab 2 / Analys)
- KalkylVy (Tab 3 / Anbud)
- ForanmalanTracker (Tab 4 / Föranmälan)
- Anbud-tab utkast-redigering, prisöversikt, kontakt, skicka, historik
- Markdown-rendering
- PDF/Word-export
- PostHog-events utöver befintliga
