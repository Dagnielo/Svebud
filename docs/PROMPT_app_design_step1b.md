# PROMPT_app_design_step1b.md

## Steg 1B — Central layout + auth centraliseras

**Datum:** 1 maj 2026
**Mål:** Skapa `app/(app)/layout.tsx`, refaktorera 8 page.tsx, utöka `proxy.ts`
**Estimerad tid:** 1–1,5 dag Claude Code-arbete
**Risk:** Medel (arkitekturändring, 8 sidor påverkas)
**Beroende:** Steg 1A klar och commit:ad
**Följdsteg:** Steg 1B-2 (nestlad layout för projekt-detaljvy), Steg 1C (Sidebar-redesign)

> **Vad detta gör:** Eliminerar duplicerad user-fetch + Sidebar-mounting från 8 sidor. Skapar `app/(app)/layout.tsx` som Server Component med server-side auth via `lib/supabase/server.ts`. Olåggade användare redirectas centralt. Fixar `/statistik`-säkerhetsluckan.

---

## Designprincip + arkitekturprincip

**Design:** "Yrkesverktyg, inte AI-identitet" (`CLAUDE.md ## Designprinciper`).

**Arkitektur:** Server Components för data-fetch där möjligt. Client Components endast när interaktivitet kräver. Boilerplate hör inte hemma i page-filer.

---

## Kontext från inventeringen (1 maj 2026)

- **8 sidor** har identiskt user-fetch-mönster + Sidebar-mounting
- **`proxy.ts`** (Vercel Routing Middleware) skyddar 3 prefix: `/dashboard`, `/projekt`, `/uppfoljning`
- **`/statistik`** saknar både server- och client-skydd → silent säkerhetslucka
- **`projekt/[projektId]`** har annan layout (ingen Sidebar) — hanteras i Steg 1B-2

---

## Operationer

### Op 2.1 — Verifiera lib/supabase/server.ts

Filen finns enligt inventeringen men används inte. Verifiera att den exporterar en `createClient()` för Server Components.

**Hitta** `lib/supabase/server.ts`:

```bash
cat lib/supabase/server.ts
```

**Förväntat:** Något i stil med:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* ... */ } }
  )
}
```

Om filen är annorlunda — anpassa nedanstående `(app)/layout.tsx`-kod efter den faktiska export-signaturen.

### Op 2.2 — Skapa lib/types/user.ts

UserProfil-typen är duplicerad i 8 sidor. Lyft ut till delad typ.

**Skapa fil** `lib/types/user.ts`:

```typescript
export type UserProfil = {
  fullnamn: string | null
  företag: string | null
  tier: string | null
  initialer: string
}
```

(Anpassa fält om inventeringen visar att de skiljer sig från denna struktur.)

### Op 2.3 — Skapa app/(app)/layout.tsx

**Skapa fil** `app/(app)/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import type { UserProfil } from '@/lib/types/user'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profil } = await supabase
    .from('profiler')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const namn = (profil as Record<string, unknown> | null)?.fullnamn as string | null
  const företag = (profil as Record<string, unknown> | null)?.företag as string | null
  const tier = (profil as Record<string, unknown> | null)?.tier as string | null

  const user: UserProfil = {
    fullnamn: namn,
    företag,
    tier,
    initialer: namn
      ? namn.split(' ').map(d => d[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
      : '?',
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 ml-[220px]">
        {children}
      </main>
    </div>
  )
}
```

**Anteckning om `ml-[220px]`:** Sidebar:n har width: 220px enligt inventeringen. Margin på main säkerställer att content inte hamnar under sidebar:n. Detta värde ska sannolikt göras till en CSS-variabel i Steg 1C.

### Op 2.4 — Utöka proxy.ts skyddade-array

Inventering visade att `/statistik`, `/profil`, `/alla-projekt`, `/certifikat`, `/installningar`, `/nytt-projekt` saknar server-skydd.

Med ny `(app)/layout.tsx` är de nu skyddade via layout-redirect, men **dubbelt skydd** är värt eftersom proxy.ts körs på platform-nivå (snabbare).

**Hitta** i `proxy.ts`:

```typescript
const skyddade = ['/dashboard', '/projekt', '/uppfoljning']
```

**Ersätt med:**

```typescript
const skyddade = [
  '/dashboard',
  '/projekt',
  '/uppfoljning',
  '/statistik',
  '/profil',
  '/alla-projekt',
  '/certifikat',
  '/installningar',
  '/nytt-projekt',
]
```

### Op 2.5 — Refaktorera 8 page.tsx (ta bort boilerplate)

För **var och en** av dessa filer:

- `app/(app)/dashboard/page.tsx`
- `app/(app)/statistik/page.tsx`
- `app/(app)/profil/page.tsx`
- `app/(app)/alla-projekt/page.tsx`
- `app/(app)/uppfoljning/page.tsx`
- `app/(app)/certifikat/page.tsx`
- `app/(app)/installningar/page.tsx`
- `app/(app)/nytt-projekt/page.tsx`

Gör följande ändringar:

#### Ta bort imports

```typescript
import Sidebar from '@/components/Sidebar'              // TA BORT
import { createClient } from '@/lib/supabase/client'    // BEHÅLL om används för annat
import { useRouter } from 'next/navigation'             // TA BORT om enda användning var login-redirect
```

#### Ta bort UserProfil-typ-deklaration

```typescript
type UserProfil = {                       // TA BORT
  fullnamn: string | null
  /* ... */
}
```

#### Ta bort user-state och fetch-useEffect

```typescript
const [user, setUser] = useState<UserProfil | null>(null)   // TA BORT

useEffect(() => {                                            // TA BORT HELA BLOCKET
  async function hämta() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: profil } = await supabase.from('profiler').select('*').eq('id', authUser.id).single()
    if (profil) {
      setUser({ /* ... */ })
    }
  }
  hämta()
}, [])
```

#### Ta bort Sidebar-mount

I JSX-returnen:

```jsx
return (
  <div>
    <Sidebar user={user} />            {/* TA BORT */}
    <main>
      {/* ... */}
    </main>
  </div>
)
```

**Ersätt med:**

```jsx
return (
  <>
    {/* page-content direkt — Sidebar och main-wrapper kommer från (app)/layout.tsx */}
  </>
)
```

#### Specialhantering per sida

**`/dashboard`** — använder `user` i UppföljningsBanner-prop? Om ja, behåll en client-component-version som hämtar user via separat hook eller props från en server-component-wrapper. Diskutera vid implementation.

**`/profil`** — använder user-data för att fylla i formuläret. Behöver fortfarande hämta `profil` från Supabase, men `authUser` och redirect kommer från layout. Ta bort redirect-logiken, behåll profil-fetch.

**`/statistik`** — om sidan inte använder `user` alls i sin logik, är refaktorn trivial: ta bort hela auth-blocket.

### Op 2.6 — Hantera client/server-component-gränsen

Här är subtiliteten: **layout är Server Component, men sidor är `'use client'`.**

Det är OK i Next.js — Server Components kan rendera Client Components. Men det betyder att:

1. `(app)/layout.tsx` är Server Component (ingen `'use client'`)
2. Page-filer behåller `'use client'`-direktivet
3. Sidebar är Client Component (har `'use client'`) — eftersom den har `Link`-komponenter och eventuellt interaktivitet

**Verifiera:** Sidebar.tsx har `'use client'` redan enligt inventeringen. Inget byte krävs.

### Op 2.7 — Bygg och smoke-test

```bash
npm run build
```

**Förväntat:** 0 fel. Om TypeScript klagar på saknade props eller typer — adressera innan deploy.

```bash
npm run dev
```

**Visuell smoke-test:**

1. Logga ut. Försök besöka `/dashboard` direkt → ska redirect:a till `/login`
2. Försök besöka `/statistik` direkt utan login → ska redirect:a (luckan stängd!)
3. Logga in. Verifiera alla 8 sidor renderar med Sidebar
4. Klicka mellan sidor — Sidebar förblir stabil (ingen flicker)
5. Öppna en projekt-detaljvy → **OBS:** sidan kommer få Sidebar nu eftersom den ligger under `(app)/`. Detta är BUG som fixas i Steg 1B-2.

### Op 2.8 — Rapportera potentiella issues

Efter implementation, rapportera:

1. **Filer ändrade:** lista alla 8 + nya `(app)/layout.tsx` + `lib/types/user.ts` + `proxy.ts`
2. **Build-status:** TypeScript-fel? Warnings?
3. **Runtime-issues:** Console-fel i webbläsare? Hydration mismatches?
4. **Projekt-detaljvyn:** Hur ser den ut nu med Sidebar? (Förväntad bug — fixas i 1B-2)

---

## Commit-meddelande

```
feat(app-design): central layout + server-side auth (Steg 1B)

Skapar app/(app)/layout.tsx som Server Component med server-side
user-fetch via lib/supabase/server.ts. Eliminerar duplicerad
boilerplate från 8 page.tsx (user-fetch + Sidebar-mounting).

- Ny lib/types/user.ts med delad UserProfil-typ
- Olåggade användare redirectas via layout (utöver proxy.ts)
- proxy.ts skyddade-array utökad med /statistik (säkerhetslucka),
  /profil, /alla-projekt, /certifikat, /installningar, /nytt-projekt
- 8 page.tsx renare — fokus på sin egen funktionalitet

OBS: Projekt-detaljvyn får oavsiktligt Sidebar i denna commit.
Fixas i Steg 1B-2 med nestlad layout.

Spec: docs/PROMPT_app_design_step1b.md
```

---

## Acceptanskriterier

- [ ] `npm run build` 0 fel
- [ ] `app/(app)/layout.tsx` finns och är Server Component
- [ ] `lib/types/user.ts` finns
- [ ] 8 page.tsx har INTE längre Sidebar-import eller user-fetch-useEffect
- [ ] Olåggad användare redirectas från `/statistik` direkt
- [ ] Inloggad användare ser Sidebar konsekvent på alla 8 sidor
- [ ] Sidebar inte flickrar vid navigation mellan sidor
- [ ] Projekt-detaljvyn har Sidebar (förväntad bug — fixas i 1B-2)
- [ ] Commit lokal, ej pushad

---

## Risker och fallback

**Risk 1: Hydration mismatches**
Server Component renderar HTML på server. Client Component hydratiserar. Om props skiljer sig kan vi få React-warnings.

*Fallback:* Om Sidebar.tsx blir komplicerat — kan vi göra en SidebarServer wrapper som tar user och renderar SidebarClient.

**Risk 2: TypeScript-fel i page.tsx**
Sidor som tidigare hade `user: UserProfil | null` kan nu ha tomma referenser om vi missade en användning.

*Fallback:* Grep efter `user.` i alla 8 sidor INNAN refaktor. Lista varje användning. Bestäm hur den ska hanteras (props från layout? separat fetch?).

**Risk 3: Sidor som behöver user-data internt (utöver Sidebar)**
T.ex. `/profil` använder user för att fylla formulär.

*Fallback:* Skapa en client hook `useUser()` som anropar `supabase.auth.getUser()` på client. Eller skicka user som prop från en wrapper-komponent.

**Generell fallback:** Om en sida blir för komplex att refaktorera, **lämna den som den är** för denna spec. Markera i koden med `// TODO Steg 1B: refaktorera när möjligt`. Hellre 6 av 8 sidor refaktorerade än alla brutna.

---

## Efter denna spec

`(app)/layout.tsx` finns. 8 sidor är renare. Sidebar är fortfarande mörk (designen kommer i Steg 1C). Projekt-detaljvyn har felaktigt fått Sidebar — det fixas i nästa spec.

**Nästa: Steg 1B-2 — Nestlad layout för projekt-detaljvyn (utan Sidebar).**
