# PROMPT_app_design_step1d.md

## Steg 1D — KpiKort extraktion till delad komponent

**Datum:** 1 maj 2026
**Mål:** Skapa `components/KpiKort.tsx`, refaktorera `app/(app)/statistik/page.tsx`
**Estimerad tid:** 4 timmar
**Risk:** Låg (DRY-refaktor)
**Beroende:** Steg 1A klar (för ljusa tokens)
**Följdsteg:** Steg 2 (Pipeline + Alla projekt) kan använda denna komponent

> **Vad detta gör:** Bryter ut `function KpiKort` från `statistik/page.tsx` till delad komponent. Applicerar ljusa tokens. Förbereder för återanvändning på `/dashboard` (KPI-strip).

---

## Operationer

### Op 5.1 — Hitta nuvarande KpiKort

Inventeringen visade att den ligger inline i `statistik/page.tsx:486`. Verifiera:

```bash
grep -n "function KpiKort" app/\(app\)/statistik/page.tsx
```

### Op 5.2 — Skapa components/KpiKort.tsx

**Skapa fil**:

```typescript
'use client'

import type { ComponentType } from 'react'

export type KpiKortProps = {
  label: string
  value: string | number
  sub?: string
  färg?: 'amber' | 'green' | 'red' | 'orange' | 'blue' | 'neutral'
  ikon?: ComponentType<{ size?: number; weight?: 'bold' }>
}

const färgMap = {
  amber: 'var(--light-amber)',
  green: 'var(--light-green)',
  red: 'var(--light-red)',
  orange: 'var(--light-orange)',
  blue: 'var(--light-blue)',
  neutral: 'var(--light-t3)',
}

export default function KpiKort({ label, value, sub, färg = 'neutral', ikon: Ikon }: KpiKortProps) {
  return (
    <div
      style={{
        background: 'var(--light-bg)',
        border: '1px solid var(--light-border)',
        borderRadius: 12,
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Topp-streck för färgkodning */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: färgMap[färg],
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            color: 'var(--light-t4)',
          }}
        >
          {label}
        </div>
        {Ikon && <Ikon size={16} weight="bold" />}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '-.03em',
          color: 'var(--light-t1)',
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>

      {sub && (
        <div style={{ fontSize: 13, color: 'var(--light-t3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
```

### Op 5.3 — Refaktorera statistik/page.tsx

**Hitta** den inline-deklarerade `function KpiKort` längst ner i filen.

**Ta bort** den helt.

**Lägg till import** högst upp i filen:

```typescript
import KpiKort from '@/components/KpiKort'
```

**Verifiera** att de 4 användningarna av `<KpiKort ... />` i sidan fortsätter fungera. Props-API:t är samma (label, value, sub, färg) så inga ändringar krävs där.

**OBS om prop-namn:** Specen använder `färg` som prop-namn (matchar inventeringens "färg"-attribut). Om befintlig användning skiljer sig — anpassa.

### Op 5.4 — Bygg och verifiera

```bash
npm run build
npm run dev
```

Öppna `/statistik`. KPI-korten ska se ut **annorlunda** nu — ljusa istället för mörka. Detta är **första content-redesign-tecknet** i appen.

**Förväntat:**
- 4 KPI-kort på toppen är ljusa (vit bg, mörk text)
- Topp-streck fortfarande färgkodade (gul/grön/blå/orange) — eller vad som specas
- Värdena läsbara

---

## Commit-meddelande

```
feat(app-design): KpiKort extraherad till delad komponent (Steg 1D)

Bryter ut function KpiKort från statistik/page.tsx till
components/KpiKort.tsx. Applicerar ljusa tokens (--light-*).
Förbereder för återanvändning på /dashboard i Steg 2.

- Komponent har props: label, value, sub, färg, ikon (valfri Phosphor)
- Färgsystem: amber/green/red/orange/blue/neutral
- KPI-korten på /statistik nu ljusa

Spec: docs/PROMPT_app_design_step1d.md
```

---

## Acceptanskriterier

- [ ] `components/KpiKort.tsx` finns
- [ ] `function KpiKort` borttagen från `statistik/page.tsx`
- [ ] 4 KPI-kort på `/statistik` renderas korrekt med ljusa tokens
- [ ] Färg-prop fungerar för alla 6 varianter
- [ ] Valfri Phosphor-ikon kan skickas in
- [ ] `npm run build` 0 fel
- [ ] Commit lokal, ej pushad

---

## Risker

**Risk 1: Färg-prop-namn på svenska**
Vi använder `färg` (inte `color`) som prop. Detta matchar projektets svenska konventioner. Verifiera att TypeScript hanterar detta korrekt.

**Risk 2: Backward-incompatible API**
Om befintliga `<KpiKort>`-användningar hade fler props som inte finns i nya komponenten, måste vi addera dem.

---

## Efter Steg 1A-1D

Efter alla 4 steg:
- Tokens etablerade (1A)
- Layout centraliserad (1B)
- Projekt-detalj separerad (1B-2)
- Sidebar ljus och Phosphor-anpassad (1C)
- KpiKort delad och ljus (1D)

**Hela appen är fortfarande mörk i sin innehållsdel** — bara Sidebar och KPI-kort är ljusa. Content-redesign kommer i Steg 2-4.

**Detta är medvetet "etappvis migration"** — när du verifierar Steg 1 live, ser du att 1) Sidebar fungerar bra ljust, 2) KPI-kort fungerar bra ljust, 3) ingen ny bug introducerad. Det ger trygghet att fortsätta med Steg 2-4.

**Push-strategi:** Kan pushas efter alla 4 steg är klara, eller stegvis. Diskutera med Dagnielo.
