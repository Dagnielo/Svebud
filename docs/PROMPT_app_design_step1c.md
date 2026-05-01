# PROMPT_app_design_step1c.md

## Steg 1C — Sidebar-redesign med Phosphor + ljusa tokens

**Datum:** 1 maj 2026
**Mål:** `components/Sidebar.tsx`
**Estimerad tid:** 4 timmar
**Risk:** Låg (en komponent)
**Beroende:** Steg 1A + 1B + 1B-2 klara
**Följdsteg:** Steg 1D (KpiKort-extraktion)

> **Vad detta gör:** Sidebar:n går från mörk navy med emoji-ikoner till ljus design med Phosphor Bold-ikoner. Detta är **första synliga designändringen** i appen.

---

## Designprincip-kontext

Från `CLAUDE.md`:
> Phosphor Bold som enda ikon-system (industriell, neutral, professionell)

Sidebar:n är **central varumärkesyta** — den syns på alla sidor. Designen här sätter tonen för hela app-redesignen.

---

## Operationer

### Op 4.1 — Verifiera Phosphor är importerad

Sidebar är Client Component. Phosphor kan importeras via npm (`@phosphor-icons/react`) eller via CDN (som landningssidan).

Inventering visade att landningssidan använder CDN. För komponenter i appen är **npm-paket bättre** (tree-shaking, type-safety).

**Verifiera:**
```bash
grep "phosphor" package.json
```

Om `@phosphor-icons/react` inte finns, lägg till:
```bash
npm install @phosphor-icons/react
```

### Op 4.2 — Mappning emoji → Phosphor

| Nuvarande emoji | Label | Phosphor-ikon |
|-----------------|-------|---------------|
| ⚡ | Pipeline | `Lightning` (representerar elnät, OK enligt designprincip) |
| ➕ | Nytt projekt | `Plus` |
| 📁 | Alla projekt | `Folders` |
| 📊 | Statistik | `ChartBar` |
| 🏢 | Företagsprofil | `Buildings` |
| 📜 | Certifikat | `Certificate` |
| ⚙️ | Inställningar | `Gear` |

### Op 4.3 — Ny Sidebar.tsx

**Hitta** `components/Sidebar.tsx`. Backup:a innan refaktor:

```bash
cp components/Sidebar.tsx components/Sidebar.tsx.bak
```

**Ersätt hela filen** med:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Lightning,
  Plus,
  Folders,
  ChartBar,
  Buildings,
  Certificate,
  Gear,
} from '@phosphor-icons/react'
import type { UserProfil } from '@/lib/types/user'

type Props = {
  user: UserProfil | null
}

const navItems = [
  { href: '/dashboard', icon: Lightning, label: 'Pipeline' },
  { href: '/nytt-projekt', icon: Plus, label: 'Nytt projekt' },
  { href: '/alla-projekt', icon: Folders, label: 'Alla projekt' },
  { href: '/statistik', icon: ChartBar, label: 'Statistik' },
  { href: '/profil', icon: Buildings, label: 'Företagsprofil' },
  { href: '/certifikat', icon: Certificate, label: 'Certifikat' },
  { href: '/installningar', icon: Gear, label: 'Inställningar' },
]

export default function Sidebar({ user }: Props) {
  const pathname = usePathname()

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 220,
        height: '100vh',
        background: 'var(--light-bg)',
        borderRight: '1px solid var(--light-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
      }}
    >
      {/* Logo — wordmark från landningssidan v7 */}
      <div style={{ padding: '0 8px 24px', marginBottom: 8, borderBottom: '1px solid var(--light-border)' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            textDecoration: 'none',
            fontFamily: "'Inter', sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--light-navy)',
            letterSpacing: '-.035em',
          }}
        >
          Sve<span style={{ color: 'var(--light-amber)' }}>Bud</span>
          <span
            style={{
              display: 'inline-block',
              width: 4,
              height: 4,
              background: 'var(--light-amber)',
              borderRadius: '50%',
              marginLeft: 1,
            }}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                color: active ? 'var(--light-navy)' : 'var(--light-t3)',
                background: active ? 'var(--light-amber-glow)' : 'transparent',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                transition: 'background .12s ease',
              }}
            >
              <Icon size={18} weight="bold" color={active ? 'var(--light-amber)' : 'var(--light-t3)'} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Användar-profil längst ner */}
      {user && (
        <div style={{ borderTop: '1px solid var(--light-border)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--light-amber)',
                color: 'var(--light-navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {user.initialer}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--light-t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullnamn || 'Användare'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--light-t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.företag || ''}
              </div>
            </div>
          </div>
          <form action="/logout" method="post">
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: '1px solid var(--light-border2)',
                borderRadius: 8,
                color: 'var(--light-t2)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Logga ut
            </button>
          </form>
        </div>
      )}
    </aside>
  )
}
```

### Op 4.4 — Verifiera /logout-route

Sidebar:n har en `<form action="/logout">`. Om denna route inte finns, behöver den skapas.

**Verifiera:**
```bash
ls app/api/logout/ 2>/dev/null
ls app/logout/ 2>/dev/null
```

Om ingen route finns, **skapa** `app/api/logout/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

Om logout fanns redan med annan implementation — behåll den och ändra Sidebar:s `action`-prop därefter.

### Op 4.5 — Bygg och visuell test

```bash
npm run build && npm run dev
```

Öppna alla 8 sidor sekventiellt.

**Förväntat:**
- Sidebar är ljus (vit bakgrund) på alla sidor
- "SveBud."-wordmark visas korrekt med amber prick
- Phosphor-ikoner renderas (inga emojis)
- Aktiv sida har subtil amber-glow-bakgrund
- User-avatar nere till vänster med initialer i amber-cirkel
- Logout-knapp fungerar

**Visuell jämförelse:** Hard reload `/dashboard`. Sidebar är ljus, content är fortfarande mörk → konsekvent inkonsekvens. Det är ok — content-redesign kommer i Steg 2-3.

---

## Commit-meddelande

```
feat(app-design): Sidebar-redesign med Phosphor + ljusa tokens (Steg 1C)

Sidebar:n går från mörk navy med emoji-ikoner till ljus design med
Phosphor Bold-ikoner. Använder ljusa tokens från Steg 1A.

- Wordmark "SveBud." matchar landningssidan v7
- 7 emoji-ikoner ersatta med Phosphor Bold (npm-paket)
- Aktiv sida har amber-glow-bakgrund
- User-avatar nere till vänster med initialer
- Eventuell ny /api/logout-route skapad

Spec: docs/PROMPT_app_design_step1c.md
```

---

## Acceptanskriterier

- [ ] `npm run build` 0 fel
- [ ] Sidebar ljus på alla 8 sidor
- [ ] 7 emoji-ikoner ersatta med Phosphor
- [ ] Wordmark renderas korrekt (Sve navy, Bud amber, prick amber)
- [ ] Aktiv sida har visuell highlight
- [ ] Phosphor-paket installerat (`@phosphor-icons/react` i package.json)
- [ ] /logout fungerar
- [ ] Commit lokal, ej pushad

---

## Risker

**Risk 1: `usePathname` returnerar olika på server vs client**
Sidebar är Client Component med `usePathname()`. Detta är OK för Next.js 13+ men verifiera att inga hydration-warnings uppstår.

**Risk 2: Phosphor-ikon-tree-shaking**
`@phosphor-icons/react` är stort. Importera bara de 7 ikoner vi använder, inte hela biblioteket.

**Risk 3: Inline-stilar vs Tailwind**
Specen använder inline-stilar för konsistens med befintlig Sidebar. Du kan välja Tailwind-utilities istället — säg till Claude Code om du föredrar det.

---

