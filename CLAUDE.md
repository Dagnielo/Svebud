




# Svebud – Claude Code Instruktioner


## Läsregler för Claude Code
- Läs ALDRIG filer i `node_modules/`, `.next/`, `.vercel/`, `public/` utan att jag uttryckligen ber om det
- Läs ALDRIG `package-lock.json` — använd `package.json` istället
- Vid start: läs BARA denna fil (CLAUDE.md) och `README.md`. Vänta sedan på instruktioner.
- Arbeta alltid med specifika filer jag pekar ut, inte "hela projektet"

## Vad är Svebud?
AI-driven anbudshantering för svenska elinstallationsföretag (elfirmor).
Målgrupp: B2B-elfirmor som lämnar anbud till BRF-föreningar, fastighetsbolag och industrikunder.
Varumärke: Svebud (svebud.se) – tidigare kallat AnbudAI.

---

## Tech Stack
- **Framework:** Next.js 15 med App Router
- **Databas:** Supabase (EU-region Frankfurt)
- **Hosting:** Vercel
- **Betalningar:** Stripe Checkout
- **E-post:** Resend
- **UI:** shadcn/ui + Tailwind CSS
- **Språk:** TypeScript
- **AI-agenter:** 5 st autonoma Claude-agenter (Opus 4.6 + Sonnet 4.6)

---

## Design – följ alltid dessa regler
- **Primärfärg (gul):** #F5C400 – INTE #F5C518 eller annan gul
- **Bakgrund (navy):** #0E1B2E – INTE #0F1A2E
- **Typsnitt:** DM Sans (brödtext) + JetBrains Mono (kodnummer/priser)
- **Designreferens:** `AnbudAI_Dashboard.html` i projektroten – matcha den exakt

---

## Kritiska regler – bryt aldrig dessa

### Vercel
- `vercel.json` med `maxDuration` MÅSTE alltid finnas
- Ändra ALDRIG `vercel.json` utan att explicit fråga användaren
- Utan denna fil kraschar alla agenter i produktion (default 10s timeout)

### Supabase
- SQL-migreringar körs ALDRIG automatiskt
- Skriv alltid SQL-kod som användaren kör manuellt i Supabase Dashboard
- Alla tabeller ska ha Row Level Security (RLS) aktiverat
- Använd alltid EU-region (Frankfurt)

### Bygge
- Kör alltid `npm run build` efter större ändringar
- Noll TypeScript-fel = grön, annars fixa innan du fortsätter
- Lägg aldrig känsliga nycklar i kod – använd alltid `.env.local`

### Branschterminologi (använd rätt termer)
- **FFU** = Förfrågningsunderlag (inte "upphandlingsdokument")
- **AB 04** = standardkontrakt B2B elentreprenad
- **EL 19** = konsumentkontrakt
- **AFF 09** = servicekontrakt
- **ROT** = 30% skattereduktion (material+arbete, max 50 000 kr/år)
- **Grön teknik** = laddbox 15%, solceller 20%, batteri 20%
- **Föranmälan** = pre-notification till nätoperatör

---

## Projektstruktur
```
app/
  (auth)/          → login, registrera, auth/callback
  (app)/           → dashboard, projekt/[id], uppföljning, priser
  api/             → agentroutes, checkout, webhook
lib/               → 5 agentfiler + supabase/client.ts + server.ts
components/        → UI-komponenter
supabase/
  migrations/      → SQL-filer (körs manuellt!)
```

---

## De 5 agenterna
| Agent | Fil | Trigger | Vercel timeout |
|-------|-----|---------|----------------|
| 1 – Dokumentinläsare | `document-agent.ts` | Filuppladdning | 60s |
| 2 – Extraktion | `extraction-agent.ts` | Auto efter Agent 1 | 120s |
| 3 – Jämförelse | `comparison-agent.ts` | Manuell knapp | 180s |
| 4 – Rekommendation | `recommendation-agent.ts` | Manuell knapp | 120s |
| 5 – Uppföljning | `followup-agent.ts` | Cron 06:00 dagligen | 300s |

---

## Priser
- **Bas:** 490 kr/mån
- **Pro:** 1 290 kr/mån
- **Business:** 2 990 kr/mån

---

## Miljövariabler (finns i .env.local – rör aldrig)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_BAS_MONTHLY / YEARLY
STRIPE_PRICE_PRO_MONTHLY / YEARLY
STRIPE_PRICE_BUSINESS_MONTHLY / YEARLY
RESEND_API_KEY
AVSANDARE_EPOST
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

---

## Commit-konventioner
- `feat:` ny funktionalitet
- `fix:` buggfix
- `chore:` konfiguration, beroenden
- `docs:` dokumentation
- Håll commit-meddelanden på svenska eller engelska, max 72 tecken

---

## Vad du INTE ska göra
- Lägg aldrig till npm-paket utan att fråga användaren först
- Radera aldrig filer utan explicit godkännande
- Ändra aldrig auth-logik eller middleware utan att fråga
- Kör aldrig SQL direkt mot databasen – skriv migrationer istället
- Generera aldrig riktiga API-nycklar eller hemligheter

---

## Lärdomar

### ROT/Grön teknik-avdrag
- ROT-data sparas på `projekt`-tabellen (`rot_aktiverat`, `rot_belopp`, `rot_kund_betalar` etc.)
- RotKalkyl-komponenten unmountas vid tab-byte → `rotData` måste laddas från databasen i `hämta()`, inte bara via `onRotChange`-callback
- ROT-blocket i förhandsgranskning/PDF/Word renderas via `byggRotBlock()` som en separat funktion — ALDRIG inne i `byggKalkylHtml()` (den returnerar '' om utkastet har "## Kalkyl")
- Placering: DOM-manipulation via TreeWalker hittar "TOTALT INKL" och insertar efter
- Regex mot AI-genererad text är OPÅLITLIGT — AI:n formaterar olika varje gång. Använd DOM eller ren HTML-append istället
- Prissammanfattningen i RotKalkyl visar bara total/avdrag/kund betalar — inte arbete/material separat (de blir osynkade)

### Snabboffert vs Formell analys
- Auto-detekteras i `/api/anbud/extrahera` baserat på dokumentlängd och nyckelord
- Snabboffert: `analystyp: 'snabb'` sparas i `kravmatchning` JSONB
- Kalkylmoment auto-sparas med 2s debounce direkt via Supabase (inte API-route)
- Frågor till kund redigeras i steg 2, kopieras i steg 2, visas INTE i steg 3

### Kontaktpersoner
- Sparas som JSONB på `profiler.kontaktpersoner`
- Väljs i steg 3 (inte steg 2) — ingen dubblering
- Infoga/ta bort i anbudet via osynlig markör `<!-- SVEBUD_KONTAKT -->`

### Följebrev
- Redigerbart med auto-save (1.5s debounce)
- Sparas i `projekt.rekommendation.följebrev`
- Kopiera-knappen läser textarea:ns DOM-value (inte state som kan vara null)

### Anbudsläge (ersätter GO/NO-GO)
- 4-gradig skala: STARKT_LÄGE / BRA_LÄGE / OSÄKERT_LÄGE / SVÅRT_LÄGE
- Bakåtkompatibelt via `migreraBedömning()` i `lib/verdict.ts`
- Alla UI-komponenter läser `anbudsläge` med fallback till `go_no_go`

### Kodkvalitet
- Auto-save behöver `laddat`-guard (sparar inte innan data hämtats)
- `useCallback` med state i deps → dubbel fetch. Använd `[]` + eslint-disable
- Hooks måste deklareras före ALLA early returns
- `dangerouslySetInnerHTML` — sanitera med DOMPurify
- Word-export: `<a>` måste appendas till DOM innan `.click()` (Safari/Firefox)
- KalkylVy extraherad till egen fil (undvik state-reset vid hot reload)

### UX-beslut
- Kvalitetsgranskning är valfri — inte automatisk efter generering
- Föranmälan-tracker visas bara efter "Vunnet"
- "Byt till formell kravanalys"-länken borttagen (auto-detektion sköter det)
- Instruktionsrutan baseras på `aktivTab`, inte `aktivtSteg`
