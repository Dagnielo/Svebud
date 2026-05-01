# PROMPT_app_design_step1b2.md

## Steg 1B-2 — Nestlad layout för projekt-detaljvyn

**Datum:** 1 maj 2026
**Mål:** `app/(app)/projekt/[projektId]/layout.tsx`
**Estimerad tid:** 4 timmar Claude Code-arbete
**Risk:** Låg
**Beroende:** Steg 1B klar och commit:ad
**Följdsteg:** Steg 1C (Sidebar-redesign)

> **Vad detta gör:** Projekt-detaljvyn fick oavsiktligt Sidebar i Steg 1B (genom att ärva från `(app)/layout.tsx`). Denna spec skapar nestlad layout som **överskrider** parent-layoutens Sidebar för enbart projekt-detaljvyn. Stripped layout bevaras (ingen Sidebar) för fokus.

---

## Designval bakom denna spec

Projekt-detaljvyn är **där användaren bygger anbud**. Sidebar är distraktion. Mönstret "stripped layout för focus tasks" är vanligt i SaaS:
- Linear: Issue-detaljvy har minimal chrome
- Notion: Document edit-vy har minimal chrome
- Figma: Design canvas har minimal chrome

Vi följer samma mönster.

---

## Operationer

### Op 3.1 — Skapa nestlad layout

**Skapa fil** `app/(app)/projekt/[projektId]/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProjektDetaljLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth-check (samma som parent-layout, men utan Sidebar-rendering)
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Stripped layout — ingen Sidebar, full bredd för fokus på anbud-bygge
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  )
}
```

### Op 3.2 — Ta bort `ml-[220px]` från projekt-detaljvyn

Eftersom denna nestlade layout nu **ersätter** parent-layoutens main-wrapper (eller snarare: lägger sig som mellanhand), måste vi se till att `ml-[220px]` från parent inte slår igenom.

**Verifiera i webbläsare:** Öppna en projekt-detaljvy. Är content nu på full bredd från vänsterkanten?

Om Sidebar fortfarande syns eller content är förskjutet 220px → parent-layoutens struktur måste justeras.

**Fallback om Sidebar fortfarande syns:**

Det är möjligt att Next.js nestlade layouts ärver parent-strukturen (Sidebar + main). I så fall behöver vi göra parent-layouten **villkorlig** baserat på path.

Alternativ struktur i `app/(app)/layout.tsx`:

```typescript
import { headers } from 'next/headers'
// ...

export default async function AppLayout({ children }) {
  const path = (await headers()).get('x-pathname') || ''
  const isProjektDetalj = /^\/projekt\/[^/]+$/.test(path)

  // Auth-check som tidigare ...

  if (isProjektDetalj) {
    return <>{children}</>  // Stripped — ingen Sidebar
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 ml-[220px]">{children}</main>
    </div>
  )
}
```

**OBS:** `x-pathname`-headers kräver att middleware/proxy sätter dem. Verifiera först om path-detektering är tillgänglig i Server Components.

**Alternativ fallback (säkrare):** Om path-detektering inte fungerar, behåll Sidebar i parent-layouten men gör en CSS-trick i nestlad layout:

```typescript
return (
  <div className="min-h-screen w-full -ml-[220px]">
    {children}
  </div>
)
```

Detta drar tillbaka content 220px så det börjar från vänsterkanten. Sidebar finns kvar i DOM men osynlig genom layering. Inte elegant — men fungerar.

**Bästa lösning:** Diskutera vid implementation. Be Claude Code testa båda alternativen och rapportera vilket som fungerar i praktiken.

### Op 3.3 — Verifiera projekt-detaljvyn

```bash
npm run dev
```

Öppna en projekt-detaljvy (klicka på ett projekt från `/dashboard`).

**Förväntat:**
- Ingen Sidebar
- Content tar full bredd
- Tabs (Dokument, Analys, Anbud, Föranmälan) syns korrekt
- "← Pipeline"-länken fungerar

### Op 3.4 — Verifiera att andra sidor inte påverkats

Öppna `/dashboard`, `/statistik`, `/profil` etc. Sidebar ska finnas där som vanligt.

---

## Commit-meddelande

```
feat(app-design): nestlad layout för projekt-detaljvy (Steg 1B-2)

Skapar app/(app)/projekt/[projektId]/layout.tsx som överskrider
parent-layoutens Sidebar. Projekt-detaljvyn behåller stripped layout
för fokus på anbud-bygge — samma mönster som Linear/Notion/Figma
för focus tasks.

- Auth-check duplicerad (server-side redirect till /login)
- Sidebar exkluderad
- Content full bredd

Spec: docs/PROMPT_app_design_step1b2.md
```

---

## Acceptanskriterier

- [ ] `npm run build` 0 fel
- [ ] `app/(app)/projekt/[projektId]/layout.tsx` finns
- [ ] Projekt-detaljvyn har INGEN Sidebar
- [ ] Content tar full bredd (eller respekterar layout-design)
- [ ] Andra 8 sidor har Sidebar oförändrad
- [ ] Olåggad användare redirectas från projekt-detaljvy
- [ ] Commit lokal, ej pushad

---

## Risker

**Risk 1: Next.js-layout-ärvningsbeteende**
Nestlade layouts kan bete sig olika beroende på Next.js-version. Verifiera först.

**Risk 2: Auth-duplicering**
Vi anropar `supabase.auth.getUser()` i båda layouter. Det är 2 anrop per request för projekt-detaljvyer. Acceptabelt för säkerhet, kan optimeras senare.

---

