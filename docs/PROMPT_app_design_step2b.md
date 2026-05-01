# PROMPT_app_design_step2b.md

## Steg 2B — Alla projekt-vyn redesign

**Datum:** 1 maj 2026
**Mål:** `app/(app)/(authenticated)/alla-projekt/page.tsx`
**Estimerad tid:** 0,5–1 dag Claude Code-arbete
**Risk:** Låg-medel (1 fil ändras stort, ny sortering tillkommer)
**Beroende:** Steg 1A-1D + Steg 2A klara och deployade
**Följdsteg:** Steg 3 (Projekt-detaljvyn)

> **Vad detta gör:** Alla projekt-vyn (svebud.se/alla-projekt) går från mörk till ljus design, behåller segmented filter-buttons, lägger till klickbar kolumn-sortering, byter emojis mot Phosphor-ikoner, använder pills för anbudsläge i AI-status-kolumnen.

---

## Designprincip-kontext

Från `CLAUDE.md ## Designprinciper`:
> SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår elinstallation. AI är medlet — inte budskapet, inte identiteten.

**Konsekvenser för Alla projekt-vyn:**
- **Phosphor Bold** ersätter alla emojis (📁 📄 ⚠️ 🔥 📅)
- **Tabell-design är subtil** — yrkesverktyg, inte färgglatt dashboard
- **Sortering är funktionell** — klickbara headers med pil-ikon, inte gimmickar
- **AI-status får pills för bedömning, text för process** — färg betyder *kategori*, text betyder *tillstånd*

---

## Designval (bekräftade av användaren)

| Aspekt | Val | Konsekvens |
|--------|-----|------------|
| Filter-UX | Segmented buttons | Behåll befintlig 5-knapps-rad, ljus design |
| Sortering | Klickbara kolumn-headers | Pil-ikon vid aktiv sortering, 3-4 sorterbara kolumner |
| AI-status | Pills för anbudsläge, text för process | STARKT/BRA/OSÄKERT/SVÅRT som färgade pills, "Ej analyserad"/"Analyserar..." som text |
| Emoji-byte | Alla 5 till Phosphor | FolderOpen, FileText, Warning, Fire, Calendar |
| Status-CTA | Hoppas över | Tabellen är översikt — CTA tillhör detaljvyn |
| KPI-strip | Hoppas över | Tabellen ÄR data — duplicerar inte |
| Layout | Vänster-justerad | "Alla projekt" rubrik + sökruta + filter — standard tabellmönster |

---

## Kontext från inventeringen

**Datakällor per kolumn (varierar — viktigt att förstå):**

| Kolumn | Källa |
|--------|-------|
| Projekt | `projekt.namn` + `projekt.beskrivning` |
| Värde | `anbud[].extraherad_data['värde_kr'].värde` |
| Deadline | `projekt.deadline` ELLER `anbud[].extraherad_data['sista_anbudsdag'].värde` |
| Kundtyp | `anbud[].kund_typ` |
| AI-status | `getAiStatus(p)` — bedömning eller process-state |
| Pipeline | `getPipelineKolumn(p)` |
| Skapad | `projekt.skapad` |
| Dokumenträknare | `anbudCount[p.id]` |

**Befintlig logik som ska bevaras:**
- `getAiStatus(p)` med prioritetsordning (anbudsläge → process-state → "Ej analyserad")
- `formatKr(v)` — siffra till "1.5 M" / "234k" / "1 234"
- `getPipelineKolumn` — re-exporterad från `ProjektKort`
- Segmented filter (5 knappar) + sökruta-logik (AND-kombination)
- Hover via inline mouseenter/leave

**Type-städning (bonus):**
- `(p as Record<string, unknown>).kravmatchning` — onödig efter konsolideringen
- `(p as Record<string, unknown>).deadline` — onödig efter konsolideringen
- Båda kan tas bort (Projekt-typ har dem nu)

---

## Operationer

### Op 1 — Sortering-state och helper-funktion

**Lägg till i `app/(app)/(authenticated)/alla-projekt/page.tsx`:**

```typescript
// Sortering state
type SorteringNyckel = 'skapad' | 'värde' | 'deadline'
type SorteringOrdning = 'asc' | 'desc'

const [sortNyckel, setSortNyckel] = useState<SorteringNyckel>('skapad')
const [sortOrdning, setSortOrdning] = useState<SorteringOrdning>('desc')

// Klick-handler för kolumn-header
function hanteraSortering(nyNyckel: SorteringNyckel) {
  if (sortNyckel === nyNyckel) {
    // Toggle ordning
    setSortOrdning(sortOrdning === 'asc' ? 'desc' : 'asc')
  } else {
    // Ny kolumn — default desc för datum/värde, asc för text
    setSortNyckel(nyNyckel)
    setSortOrdning('desc')
  }
}
```

**Lägg sortering i den befintliga `filtrerade`-pipelinen:**

```typescript
const filtreradeOchSorterade = useMemo(() => {
  // ...befintlig filter+sök-logik
  const filtrerade = projekt.filter(/* befintlig */)

  return filtrerade.sort((a, b) => {
    let aVärde: number | string | null = null
    let bVärde: number | string | null = null

    switch (sortNyckel) {
      case 'skapad':
        aVärde = new Date(a.skapad).getTime()
        bVärde = new Date(b.skapad).getTime()
        break
      case 'värde':
        // Anbud-aggregat — om värdet finns
        aVärde = getProjektVärde(a) ?? 0
        bVärde = getProjektVärde(b) ?? 0
        break
      case 'deadline':
        aVärde = a.deadline ? new Date(a.deadline).getTime() : Infinity
        bVärde = b.deadline ? new Date(b.deadline).getTime() : Infinity
        break
    }

    if (aVärde === null || bVärde === null) return 0
    const diff = aVärde < bVärde ? -1 : aVärde > bVärde ? 1 : 0
    return sortOrdning === 'asc' ? diff : -diff
  })
}, [projekt, sök, filter, sortNyckel, sortOrdning, anbud])
```

**OBS:** `getProjektVärde(p)` är en helper som hämtar värde från anbud-data. Om den inte finns redan, lägg till:

```typescript
function getProjektVärde(p: Projekt): number | null {
  // Hitta första anbud för projektet med extraherat värde
  const projektAnbud = anbud.filter(a => a.projekt_id === p.id)
  for (const a of projektAnbud) {
    const v = a.extraherad_data?.['värde_kr']?.värde
    if (typeof v === 'number') return v
  }
  return null
}
```

(Anpassa fältnamn om de skiljer sig från specens antaganden — verifiera mot live-koden.)

---

### Op 2 — Phosphor-ikon-import

**Lägg till imports högst upp:**

```typescript
import {
  FolderOpen,
  FileText,
  Warning,
  Fire,
  Calendar,
  CaretUp,
  CaretDown,
  CaretUpDown,
  MagnifyingGlass,
} from '@phosphor-icons/react'
```

`@phosphor-icons/react` är redan installerat (Steg 1C).

---

### Op 3 — Emoji-byten

Byt alla 5 emojis mot Phosphor-ikoner:

| Plats (rad) | Före | Efter |
|-------------|------|-------|
| Empty-state (~193) | `📁` | `<FolderOpen size={48} weight="bold" color="var(--light-t4)" />` |
| Dokumenträknare (~272) | `📄 N` | `<FileText size={12} weight="bold" /> N` |
| Deadline-varning kritisk | `⚠️` | `<Warning size={12} weight="bold" />` |
| Deadline akut | `🔥` | `<Fire size={12} weight="bold" />` |
| Deadline normal | `📅` | `<Calendar size={12} weight="bold" />` |

(Verifiera exakt placering i koden — vissa emojis kan vara i ternary-uttryck.)

---

### Op 4 — Page-bg och root-styling till ljus

**Hitta** root-`<div>` eller wrapper i `alla-projekt/page.tsx`. Ersätt:

```typescript
// Före
style={{ background: 'var(--navy)', minHeight: '100vh', ... }}

// Efter
style={{ background: 'var(--light-cream)', minHeight: '100vh', ... }}
```

(Samma cream-bg som dashboard från Steg 2A — visuell konsekvens.)

---

### Op 5 — Header-rad (rubrik + sökruta + sort-info)

**Hitta** header-blocket (innehåller "Alla projekt"-rubrik + sökruta).

**Ersätt** med ny ljus design:

```jsx
<div style={{
  background: 'var(--light-bg)',
  borderBottom: '1px solid var(--light-border)',
  padding: '24px 32px',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 24,
}}>
  <div>
    <h1 style={{
      fontSize: 24,
      fontWeight: 800,
      color: 'var(--light-t1)',
      margin: 0,
      letterSpacing: '-.02em',
    }}>
      Alla projekt
    </h1>
    <div style={{ fontSize: 13, color: 'var(--light-t4)', marginTop: 4 }}>
      {filtreradeOchSorterade.length} av {projekt.length} projekt
    </div>
  </div>

  {/* Sökruta */}
  <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
    <MagnifyingGlass
      size={16}
      weight="bold"
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--light-t4)',
      }}
    />
    <input
      type="text"
      placeholder="Sök projektnamn eller beskrivning..."
      value={sök}
      onChange={(e) => setSök(e.target.value)}
      style={{
        width: '100%',
        padding: '10px 12px 10px 38px',
        background: 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderRadius: 8,
        fontSize: 13,
        color: 'var(--light-t1)',
        outline: 'none',
      }}
    />
  </div>
</div>
```

---

### Op 6 — Filter-rad (segmented buttons)

**Hitta** filter-knappraden (5 knappar: Alla / Inkorg / Under arbete / Inskickat / Tilldelning).

**Ersätt** med ljus segmented design:

```jsx
<div style={{
  background: 'var(--light-cream)',
  padding: '16px 32px',
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
}}>
  {[
    { värde: 'alla', label: 'Alla' },
    { värde: 'inkorg', label: 'Inkorg' },
    { värde: 'under_arbete', label: 'Under arbete' },
    { värde: 'inskickat', label: 'Inskickat' },
    { värde: 'tilldelning', label: 'Tilldelning' },
  ].map((f) => {
    const aktiv = filter === f.värde
    return (
      <button
        key={f.värde}
        onClick={() => setFilter(f.värde)}
        style={{
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 500,
          background: aktiv ? 'var(--light-amber-glow)' : 'var(--light-bg)',
          border: `1px solid ${aktiv ? 'var(--light-amber-border)' : 'var(--light-border)'}`,
          color: aktiv ? 'var(--light-amber)' : 'var(--light-t2)',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all .12s ease',
        }}
      >
        {f.label}
      </button>
    )
  })}
</div>
```

---

### Op 7 — Tabell-redesign

Detta är den största ändringen. Tabell-strukturen är samma 8-grid-kolumn-layout men nya färger + sorteringsfunktion på 3 headers.

**Tabell-wrapper:**

```jsx
<div style={{
  margin: '0 32px 32px 32px',
  background: 'var(--light-bg)',
  border: '1px solid var(--light-border)',
  borderRadius: 12,
  overflow: 'hidden',
}}>
  {/* Header-rad */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: '2fr 100px 110px 100px 110px 110px 100px 70px',
    padding: '12px 20px',
    borderBottom: '1px solid var(--light-border)',
    background: 'var(--light-off)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    color: 'var(--light-t4)',
  }}>
    <div>Projekt</div>

    <SorterbarHeader
      label="Värde"
      nyckel="värde"
      aktivNyckel={sortNyckel}
      ordning={sortOrdning}
      onClick={hanteraSortering}
    />

    <SorterbarHeader
      label="Deadline"
      nyckel="deadline"
      aktivNyckel={sortNyckel}
      ordning={sortOrdning}
      onClick={hanteraSortering}
    />

    <div>Kundtyp</div>
    <div>AI-status</div>
    <div>Pipeline</div>

    <SorterbarHeader
      label="Skapad"
      nyckel="skapad"
      aktivNyckel={sortNyckel}
      ordning={sortOrdning}
      onClick={hanteraSortering}
    />

    <div></div>
  </div>

  {/* Tom-state */}
  {filtreradeOchSorterade.length === 0 ? (
    <div style={{ padding: '64px 20px', textAlign: 'center' }}>
      <FolderOpen
        size={48}
        weight="bold"
        color="var(--light-t4)"
        style={{ marginBottom: 12 }}
      />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--light-t2)', marginBottom: 4 }}>
        Inga projekt matchar
      </div>
      <div style={{ fontSize: 13, color: 'var(--light-t4)' }}>
        Justera filter eller skapa nytt projekt
      </div>
    </div>
  ) : (
    /* Rader */
    filtreradeOchSorterade.map((p, i) => (
      <ProjektRad
        key={p.id}
        projekt={p}
        värde={getProjektVärde(p)}
        deadline={getProjektDeadline(p)}
        kundtyp={getKundtyp(p)}
        aiStatus={getAiStatus(p)}
        pipeline={getPipelineKolumn(p)}
        anbudCount={anbudCount[p.id] ?? 0}
        ärSista={i === filtreradeOchSorterade.length - 1}
      />
    ))
  )}
</div>
```

**Helper-komponent `SorterbarHeader`:**

Skapa som lokal komponent i samma fil (eller flytta till `components/SorterbarHeader.tsx` om vi vill återanvända):

```typescript
function SorterbarHeader({
  label,
  nyckel,
  aktivNyckel,
  ordning,
  onClick,
}: {
  label: string
  nyckel: SorteringNyckel
  aktivNyckel: SorteringNyckel
  ordning: SorteringOrdning
  onClick: (nyckel: SorteringNyckel) => void
}) {
  const aktiv = aktivNyckel === nyckel
  const Ikon = aktiv ? (ordning === 'asc' ? CaretUp : CaretDown) : CaretUpDown

  return (
    <button
      onClick={() => onClick(nyckel)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        textTransform: 'inherit',
        letterSpacing: 'inherit',
        color: aktiv ? 'var(--light-t1)' : 'var(--light-t4)',
      }}
    >
      {label}
      <Ikon size={11} weight="bold" />
    </button>
  )
}
```

---

### Op 8 — Rad-redesign

**Skapa `ProjektRad`-komponent** (lokal i samma fil):

```typescript
function ProjektRad({
  projekt,
  värde,
  deadline,
  kundtyp,
  aiStatus,
  pipeline,
  anbudCount,
  ärSista,
}: {
  projekt: Projekt
  värde: number | null
  deadline: string | null
  kundtyp: string | null
  aiStatus: { label: string; färg: string; ärAnbudsläge: boolean }
  pipeline: string
  anbudCount: number
  ärSista: boolean
}) {
  const router = useRouter()
  const [hover, setHover] = useState(false)

  const deadlineInfo = deadline ? formatteraDeadline(deadline) : null

  return (
    <div
      onClick={() => router.push(`/projekt/${projekt.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 100px 110px 100px 110px 110px 100px 70px',
        padding: '14px 20px',
        borderBottom: ärSista ? 'none' : '1px solid var(--light-border)',
        background: hover ? 'var(--light-off)' : 'var(--light-bg)',
        cursor: 'pointer',
        alignItems: 'center',
        transition: 'background .1s ease',
      }}
    >
      {/* Projekt namn + dokumenträknare */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--light-t1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {projekt.namn}
          </div>
          {projekt.beskrivning && (
            <div style={{
              fontSize: 12,
              color: 'var(--light-t4)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {projekt.beskrivning}
            </div>
          )}
        </div>
        {anbudCount > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--light-t3)',
          }}>
            <FileText size={12} weight="bold" />
            {anbudCount}
          </span>
        )}
      </div>

      {/* Värde */}
      <div style={{ fontSize: 13, color: värde ? 'var(--light-t1)' : 'var(--light-t4)', fontWeight: värde ? 600 : 400 }}>
        {värde ? formatKr(värde) : '—'}
      </div>

      {/* Deadline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
        {deadlineInfo ? (
          <>
            <deadlineInfo.Ikon size={12} weight="bold" color={deadlineInfo.färg} />
            <span style={{ color: deadlineInfo.färg, fontWeight: 500 }}>
              {deadlineInfo.text}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--light-t4)' }}>—</span>
        )}
      </div>

      {/* Kundtyp */}
      <div style={{ fontSize: 13, color: kundtyp ? 'var(--light-t2)' : 'var(--light-t4)' }}>
        {kundtyp ?? '—'}
      </div>

      {/* AI-status — pill om anbudsläge, text om process-state */}
      <div>
        {aiStatus.ärAnbudsläge ? (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            padding: '3px 8px',
            borderRadius: 4,
            color: aiStatus.färg,
            background: aiStatus.bgFärg,
          }}>
            {aiStatus.label}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--light-t3)' }}>
            {aiStatus.label}
          </span>
        )}
      </div>

      {/* Pipeline-pill */}
      <div>
        <PipelinePill kolumn={pipeline} />
      </div>

      {/* Skapad */}
      <div style={{ fontSize: 12, color: 'var(--light-t3)' }}>
        {formatteraDatumKort(projekt.skapad)}
      </div>

      {/* Pil-ikon */}
      <div style={{ textAlign: 'right', color: 'var(--light-t4)' }}>
        →
      </div>
    </div>
  )
}
```

---

### Op 9 — Pipeline-pill-komponent (mini)

**Lokal helper:**

```typescript
function PipelinePill({ kolumn }: { kolumn: string }) {
  const config = {
    inkorg: { label: 'Inkorg', färg: 'var(--light-amber)', bg: 'var(--light-amber-glow)' },
    under_arbete: { label: 'Under arbete', färg: 'var(--light-blue)', bg: 'var(--light-blue-bg)' },
    inskickat: { label: 'Inskickat', färg: 'var(--light-green)', bg: 'var(--light-green-bg)' },
    tilldelning: { label: 'Tilldelning', färg: 'var(--light-orange)', bg: 'var(--light-orange-bg)' },
  }[kolumn] ?? { label: kolumn, färg: 'var(--light-t3)', bg: 'var(--light-cream)' }

  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      padding: '3px 8px',
      borderRadius: 4,
      color: config.färg,
      background: config.bg,
    }}>
      {config.label}
    </span>
  )
}
```

---

### Op 10 — getAiStatus uppdatering

Befintlig `getAiStatus` returnerar `{ label, färg }`. Vi behöver också `bgFärg` och flagga `ärAnbudsläge` så ProjektRad vet om pill eller text.

**Modifiera till:**

```typescript
function getAiStatus(p: Projekt): {
  label: string
  färg: string
  bgFärg: string
  ärAnbudsläge: boolean
} {
  const kravmatch = p.kravmatchning
  const läge = kravmatch ? hämtaAnbudsläge(kravmatch) : null

  if (läge) {
    const v = bedömningsVisning(läge)
    return {
      label: v.kort,
      färg: v.färg,
      bgFärg: v.bgFärg,
      ärAnbudsläge: true,
    }
  }
  if (p.rekommendation_status === 'pågår') {
    return { label: 'Analyserar...', färg: 'var(--light-t3)', bgFärg: '', ärAnbudsläge: false }
  }
  if (p.analys_komplett) {
    return { label: 'Analyserad', färg: 'var(--light-t2)', bgFärg: '', ärAnbudsläge: false }
  }
  if (p.jämförelse_status === 'klar') {
    return { label: 'Analyserad', färg: 'var(--light-t2)', bgFärg: '', ärAnbudsläge: false }
  }
  return { label: 'Ej analyserad', färg: 'var(--light-t4)', bgFärg: '', ärAnbudsläge: false }
}
```

**OBS:** Type-cast `(p as Record<string, unknown>).kravmatchning` är inte längre nödvändigt — Projekt-typen har `kravmatchning` direkt.

---

### Op 11 — Deadline-formattering till Phosphor

Befintliga deadline-renderingen använder emoji-baserad logik. Ny:

```typescript
function formatteraDeadline(deadline: string): {
  text: string
  färg: string
  Ikon: typeof Calendar
} {
  const dagar = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (dagar < 0) {
    return {
      text: `${Math.abs(dagar)}d försenad`,
      färg: 'var(--light-red)',
      Ikon: Warning,
    }
  }
  if (dagar <= 3) {
    return {
      text: dagar === 0 ? 'Idag' : `${dagar}d kvar`,
      färg: 'var(--light-red)',
      Ikon: Fire,
    }
  }
  if (dagar <= 7) {
    return {
      text: `${dagar}d kvar`,
      färg: 'var(--light-orange)',
      Ikon: Warning,
    }
  }
  return {
    text: `${dagar}d kvar`,
    färg: 'var(--light-t3)',
    Ikon: Calendar,
  }
}
```

---

### Op 12 — Type-städning

Ta bort onödiga type-castningar:

```typescript
// Före (rad ~44 och 239)
const kravmatch = (p as Record<string, unknown>).kravmatchning as ...
const deadline = (p as Record<string, unknown>).deadline as string | null

// Efter
const kravmatch = p.kravmatchning
const deadline = p.deadline
```

(Projekt-typen från `lib/types/projekt.ts` har båda fälten.)

---

### Op 13 — Build + smoke-test

```bash
npm run build
```

**Förväntat:** 0 fel.

```bash
npm run dev
```

**Visuell smoke-test:**

1. **Bakgrund** — sidan är ljus cream
2. **Header** — "Alla projekt" rubrik + "X av Y projekt"-räknare + sökruta med Phosphor sökikon
3. **Filter-rad** — 5 segmented buttons (aktiv = amber-glow)
4. **Tabell** — vit container, ljus border
5. **Header-rad** — uppercase labels, sorterbar för Värde/Deadline/Skapad
6. **Klick på Värde-header** — sortering aktiveras, pil-ikon visas
7. **Rader** — hover ger ljus-off bakgrund
8. **AI-status-kolumn** — pills för STARKT/BRA/etc., text för "Ej analyserad"
9. **Pipeline-kolumn** — färgade pills (amber/blå/grön/orange)
10. **Tom-state** — om filtret ger 0 träffar: FolderOpen-ikon + meddelande

---

### Op 14 — Commit (lokal, no push)

```
feat(app-design): Alla projekt-vyn ljus design + sortering (Steg 2B)

Alla projekt-vyn (svebud.se/alla-projekt) går från mörk till ljus
design matchande Pipeline-vyn. Ny klickbar kolumn-sortering. Phosphor
ersätter alla emojis.

Designändringar:
- Page-bg cream, header + tabell vita med subtila borders
- Segmented filter-buttons (5 st) i ljus design
- Sökruta med MagnifyingGlass-ikon
- Tabell-rader med hover-effect och ljus separation
- AI-status: pills för anbudsläge (STARKT/BRA/OSÄKERT/SVÅRT),
  text för process-state (Analyserar.../Analyserad/Ej analyserad)
- Pipeline-kolumn: färgade pills matchande dashboard-pills

Funktionsändringar:
- Klickbar sortering på 3 kolumner (Värde, Deadline, Skapad)
- Sortering toggle:r mellan asc/desc, default desc för datum/värde
- CaretUp/CaretDown-ikoner indikerar aktiv sortering

Phosphor ersätter alla emojis:
- 📁 → FolderOpen (empty-state, 48px)
- 📄 → FileText (dokumenträknare, 12px)
- ⚠️🔥📅 → Warning/Fire/Calendar (deadline-varianter)

Type-städning:
- Onödiga (p as Record<string, unknown>)-castningar borttagna
  (Projekt-typ har kravmatchning + deadline efter Steg 2A)

Spec: docs/PROMPT_app_design_step2b.md
```

---

## Acceptanskriterier

- [ ] `npm run build` 0 fel
- [ ] Page-bg ljus cream
- [ ] Header med rubrik + räknare + sökruta
- [ ] 5 segmented filter-buttons fungerar (single-select)
- [ ] Sökruta filtrerar projekt på namn/beskrivning
- [ ] Tabell-headers Värde/Deadline/Skapad är klickbara
- [ ] Aktiv sortering visas med CaretUp/CaretDown
- [ ] Sortering toggle:r mellan asc/desc
- [ ] AI-status visar pills för STARKT/BRA/OSÄKERT/SVÅRT
- [ ] AI-status visar text för Analyserar/Analyserad/Ej analyserad
- [ ] Pipeline-kolumn visar färgade pills
- [ ] Hover på rad ger ljus-off bakgrund
- [ ] Klick på rad öppnar `/projekt/[id]`
- [ ] Tom-state visar FolderOpen + meddelande
- [ ] Inga emojis i renderad output
- [ ] Type-castningar borttagna
- [ ] Commit lokal, ej pushad

---

## Risker

**Risk 1: getProjektVärde-helper inte byggd**
Om `anbud[].extraherad_data['värde_kr'].värde` inte finns idag — sortering på Värde sortera fel. Verifiera mot live-data.

**Risk 2: Type-cast-borttagning bryter TypeScript**
Om kompilator klagar på `p.kravmatchning` — det betyder konsolideringen i Steg 2A inte fullt fungerade på denna fil. Kolla import.

**Risk 3: Sortering på datum med null-värden**
Vissa projekt har `deadline: null`. Med `Infinity` hamnar de sist i asc, först i desc. Verifiera att det är OK UX (alternativt visa null-deadline-projekt alltid sist).

**Risk 4: bedömningsVisning returnerar light-tokens**
Steg 2A Op 3 ändrade `bedömningsVisning` till light-tokens. På denna sida (som nu är ljus efter Steg 2B) fungerar det. Pre-existing kontrast-bug på mörk navy-bg är nu borta.

---

## Ej i scope

- KPI-strip ovanför tabellen (medvetet hoppat över)
- Status-CTA-kolumn (medvetet hoppat över)
- PostHog-events (separat sprint om önskat)
- Bulk-actions (markera flera projekt, exportera)
- Datum-range-filter (skapad senaste 30d, etc.)
- Kolumn-konfiguration (visa/dölja kolumner per användare)
