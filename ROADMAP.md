# SveBud — ROADMAP

**Senast uppdaterad:** 30 april 2026 (efter Landing 2.5 — FAQ utökad till 8 frågor)
**Syfte:** Indexfilen för SveBuds fortsatta utveckling. Binder ihop landningssida (`PROMPT_landing_v5.md`), produktfeatures (`svebud-nya-funktioner-prompts.md`) och profil-systemet (`PROMPT_profil_v1.md`).

**Öppna denna fil först** när du ska bestämma vad som byggs härnäst.

---

## Status just nu — var står du?

| Yta | Färdig | Återstår |
|-----|--------|----------|
| **Landningssida** | 60% | Fas 3 (strukturella tillägg) — copy-mjukning, FAQ, om oss-sida, beta-formulär |
| **Dashboard** | 75% | Uppföljnings-banner (#4) |
| **Statistik-sida** | 100% | — |
| **Projekt-detaljvy** | 70% | Email-kanal-källa (#5), uppföljnings-knappar (#4) |
| **Profil-systemet** | 0% | Hela Features #11 — 5 etapper (A–E), 7–8 dagar |
| **Backend / agenter** | 80% | Firecrawl-scrapers (#6), prisförslag (#9) |
| **Analytics** | 100% | — |

**Översättning:**
Två stora produkt-pelare återstår: **Profil-systemet** (helt nytt) och **Tillväxt-features** (uppföljning, email-kanal, prisförslag, referral). Plus landningssida-polering.

---

## Avklarat

### 26 april 2026 — Vecka 1 + Win/Loss-grunden ✅

- ✅ Landing 1.1 — Påhittade logotyper borttagna
- ✅ Landing 1.2 — "4,9/5 från betaanvändare" borttaget
- ✅ Landing 1.3 — Statistiksiffror redan fixade
- ✅ Landing 1.4 — "⚡ Analys"-tagg ändrad till "Kalkyl pågår"
- ✅ Landing 1.5 — Demo-video-sektion redan borttagen
- ✅ Features #1 — PostHog Analytics live på EU-host (eu.posthog.com), 8 events trackade
- ✅ Migration 010 körd (Win/Loss-kolumner + stavningsfix + backfill)
- ✅ Features #2 — Win/Loss UI: knappar, dialoger, PostHog-events
- ✅ Features #2 Fas 2 — DRY-extraktion till `<UtfallsKnappar>`-komponent

### 27 april 2026 — Win/Loss Dashboard ✅

- ✅ Migration 011 körd (`ai_insikter_cache`-tabell med RLS)
- ✅ Features #3 — Win/Loss Dashboard `/statistik`:
  - 4 KPI-kort, win rate per projekttyp, fördelning per prisnivå
  - AI-insikter via Claude API med 24h cache + force-rate-limit
  - Sorterbar tabell över alla avslutade anbud
- ✅ Bugfix: `parseClaudeJSON` i `lib/utils.ts` generaliserad — hanterar både JSON-objekt OCH JSON-arrays
- ✅ `PROMPT_profil_v1.md` skapad — komplett spec för Features #11 Profil-systemet

### 28 april 2026 — Landing 2.1 + #proof-fix ✅

- ✅ Landing 2.1 — Standardisera primärknapp + sekundärknapp överallt (`.btn-s` + `.pbtn.sec` enhetliga, ⚡ före text på alla större primär-CTA, Pro-emfas behållen)
- ✅ Bugfix: horisontell overflow i #proof-sektionen (`.proof-grid` responsive + `.burl` ellipsis)
- ✅ Landing 2.2 — Logo-konsolidering: footer-logo bytt från inline-stilar till klass-baserad markup. `.logo` + `.logo-bolt` + `.logo-name` med `.sm`-modifier för mindre storlek (28×28 / 20px) i footer.
- ✅ Landing 2.3 — 10 emoji-ikoner bytta mot Phosphor Bold via CDN. Pain-cards (`ph-files`, `ph-clipboard-text`, `ph-trend-down`), film-slides (`ph-upload-simple`, `ph-check-circle`, `ph-calculator`, `ph-paper-plane-tilt`), proof-cards (`ph-kanban`, `ph-file-text`, `ph-flow-arrow`). **Landing Fas 2 KLAR ✅.**

- ✅ Landing 2.4 — Hoppat över. Specens features (Du behöver inte läsa /
  AI-betyg 1-10 / Snabboffert) finns inte i nuvarande landing.html.
  Innehållet städades i tidigare iteration. Specens intent (juridisk
  träffsäkerhet + integritetsoro) är uppfylld genom frånvaro. Samma
  mönster som 1.3 och 1.5.

- ✅ Landing 3.4 — Jämförelsetabell uppdaterad: trovärdiga tider
  (3-4 tim läsning, 15 min skriva istället för 2 min), ny föranmälan-rad
  (30 min utan / 5 min med), totalsumma ~12 tim, fotnot om första-
  uppsättning. Hero stat-kort synkat (576 tim/14 v). Sub-texter borttagna
  i höger kolumn för symmetri. Känd kvarvarande bug: kort-alignment
  (se Tekniska skulder).

- ✅ Landing 2.5 — FAQ utökad från 5 till 8 frågor: ny ansvarsfråga
  som plats 1 (yrkesansvar förtydligat), Fortnox/Visma-export och
  foranmalan/nätbolag-integration tillagda med ärlig roadmap (Q3-Q4
  2026), uppsägningsfrågan ersatt med rikare version (bindningstid
  + dataexport).

---

## Nästa steg — vart är vi på väg?

### Just nu — Copy-mjukning + Uppföljning

| # | Arbete | Fil | Tid |
|---|--------|-----|-----|
| 1 | Features #4 — Uppföljnings-notifikation på dashboard | Features [#4] | 1–2 dagar |

**Total: ~1–2 dagar.** Landningssidan visuellt + textmässigt komplett för Fas 2 + 3.4. Nästa steg: Features #4 (Uppföljning på dashboard).

### Vecka därefter — Strukturella tillägg + Email-kanal

| # | Arbete | Fil | Tid |
|---|--------|-----|-----|
| 8 | Landing 3.1 — Om oss-sida | Landing [3.1] | 1 dag |
| 9 | Landing 3.3 — Trial-längd 30 dagar från första uppladdning | Landing [3.3] | 4 timmar |
| 10 | Landing 3.2 — Beta-ansökningsformulär | Landing [3.2] | 1 dag |
| 11 | Features #5 — Email-kanal (Resend Inbound) | Features [#5] | 2 dagar |

**Total: ~4 dagar.** Landningssidan komplett (alla tre faser). Email-kanalen öppen.

### Senare — Infrastruktur + tillväxt

| # | Arbete | Fil | Tid |
|---|--------|-----|-----|
| 12 | Features #6 — Firecrawl-scrapers (verifiera/bygg) | Features [#6] | 1 dag |
| 13 | Features #8 — SEO-landningssidor (4 st) | Features [#8] | 2–3 dagar |
| 14 | Features #7 — Uppdatera landning med nya feature-kort | Features [#7] | 1 dag |
| 15 | Landing 3.5 — Brand assets (favicon, OG-image, social-share) | Landing [3.5] | 1–2 dagar (kräver designat SVG först) |

**Kritiskt:** Features #7 får ENDAST marknadsföra features som faktiskt är live.

### Vecka 6–7 — Profil-systemet (Features #11)

**Detta är en stor pelare — 7–8 dagar fokus, 5 migrationer, ny vy med 6 tabbar.**

| # | Arbete | Fil | Tid |
|---|--------|-----|-----|
| 11a | Etapp A — DB-grund + Företaget-tabben + Bolagsverket-hämtning | PROMPT_profil_v1.md | 2 dagar |
| 11b | Etapp B — Behörigheter + AI-extraktion av certifikat | PROMPT_profil_v1.md | 2 dagar |
| 11c | Etapp C — Team + Referenser auto-länkade till vunna anbud | PROMPT_profil_v1.md | 1 dag |
| 11d | Etapp D — AI-lärda benchmarks | PROMPT_profil_v1.md | 2 dagar |
| 11e | Etapp E — Mallar med versionshantering | PROMPT_profil_v1.md | 1 dag |

**Total: ~7–8 dagar.** Varje etapp är självständig och kan deployas separat. Migration 012–016.

**Filosofin är kritisk:** Profil-systemet ska INTE vara ett formulär eller en wizard. Profilen byggs av sig själv från riktigt arbete. Läs filosofi-sektionen i `PROMPT_profil_v1.md` innan etapp A startas.

**Förberedelse innan vecka 6 startar:**
- Registrera Bolagsverket Näringslivsregistret API (bolagsverket.se) — kan ta dagar att få igenom. Starta processen redan nu.
- Reservplan: använd Firecrawl mot allabolag.se som fallback. Profilen fungerar lika bra.

### Efter Profil-systemet

| # | Arbete | Fil | Tid |
|---|--------|-----|-----|
| 15 | Features #9 — Prisförslag baserat på Win/Loss + benchmarks | Features [#9] | 1–2 dagar |
| 16 | Features #10 — Referral-program | Features [#10] | 2–3 dagar |

**Notera:** #9 är nu efter #11. Anledning: #9 läser från `firma_benchmarks`-tabellen som skapas i #11 Etapp D. Att bygga #9 först innebär dubbel logik som behöver refaktoreras.

---

## Fyra kritiska beroenden

### Beroende 1: PostHog före Landing Fas 2 ✅
**Status:** Löst. PostHog är live, Landing Fas 2 kan köras.

### Beroende 2: Features #7 krockar med PROMPT_landing_v5.md
Lösning: Kör hela `PROMPT_landing_v5.md` först (alla tre faser), **sedan** Features #7 som lager ovanpå. Och #7 får inte marknadsföra features som inte är byggda. Just nu kan #7 nämna Win/Loss + Statistik (klara), men inte uppföljning, email-kanal eller profil förrän #4, #5 och #11 är live.

### Beroende 3: Features #9 (Prisförslag) kräver #11 Etapp D
**Ändrad ordning:** #9 läser från `firma_benchmarks`-tabellen som skapas i #11 Etapp D. #9 kan inte byggas före #11 Etapp D utan att skapa dubbel logik. Detta är **anledningen** till att #11 prioriteras före #9 i nuvarande roadmap.

### Beroende 4: Features #11 Etapp D kräver Win/Loss-data
Win/Loss UI är live (Features #2). Etapp D (AI-lärda benchmarks) ger värde först vid **≥10 markerade anbud** med utfall. Du har 5 testanbud idag → Etapp A–C kan köras direkt, Etapp D bör vänta tills produktionsdata finns (alternativt skapa fler testanbud).

Etapp E (Mallar) behöver **minst 1 genererat anbud** med fullständig text för att första mall-extraktionen ska fungera.

---

## Realistisk tidslinje framåt

Med dagens tempo:

- **Slut nästa vecka:** Landningssidan polerad visuellt + Uppföljning klar
- **Om 2 veckor:** Landningssidan i mål + Email-kanal öppen
- **Om 3–4 veckor:** Alla "Om oss" + beta-ansökan på plats, SEO-sidor publicerade
- **Om 4–5 veckor:** Profil-systemet etapp A–C i mål (grund, cert-extraktion, team/referenser)
- **Om 5–6 veckor:** Profil etapp D + E i mål, prisförslag (#9) byggt ovanpå benchmarks
- **Om 6–7 veckor:** Första riktiga kunder med komplett profil-system
- **Om 7–8 veckor:** Referral-program

Du har redan investerat ~2 dagar som motsvarar ungefär 2.5 veckor av planen.

---

## Vad som inte är med i denna roadmap

Följande är **medvetet utanför** och ska inte blandas in:

- **Bas+ mellanvariant (890 kr/mån)** — vänta tills minst 3 beta-kunder explicit frågar
- **Tre demo-val** på landningssidan — ersatt med enkel textrad
- **ÄTA-modul, nätbolagsintegration, Fortnox-integration** — separat produkt-roadmap
- **Demo-video** — behåll borttagen tills video är helt klar
- **Onboarding-wizard / kom-igång-flöde** — Profil-systemet ersätter detta. Profilen byggs av sig själv från arbete, inte från ett formulär.
- **Multi-firma per användare** — en användare = ett företag. Inte i scope för MVP.
- **Behörighetsroller inom team-modulen** — Business-tier-feature, separat sprint.
- **Export av profil till PDF** — vänta till feedback finns från riktiga användare.

Tekniska skulder att åtgärda när tid finns:

- **Optimering av polling i `projekt/[projektId]/page.tsx`** — `hämta()` gör 5 sekventiella queries. Inte akut.
- **Förlorat-flödet i `<UtfallsKnappar>`** — nollar inte `vinnande_pris` när status ändras från vunnet → förlorat. TODO-kommentar tillagd. Inte akut, KPI-queryn skyddar.
- **Compare-tabell höger kort sitter ~10-15px högre än vänster** —
  orsak: `.cmpgrid` har `align-items:center` (rad 271 i landing.html).
  Fix: byt till `align-items:start` (alignar topparna) eller
  `align-items:stretch` (korten fyller samma höjd). Inte showstopper,
  fixas vid nästa landing-pass.

---

## Så använder du denna struktur i Claude Code

```
Jag kör nu [Landing-fil punkt X.Y / Features-fil prompt #N / Profil etapp X]
enligt [PROMPT_landing_v5.md / svebud-nya-funktioner-prompts.md / PROMPT_profil_v1.md].

[Klistra in punkten/prompten/etappen]

Kör Plan mode först.
```

**Kör aldrig två prompter parallellt som rör samma fil eller samma vy.**

---

## Valideringsflöde (gäller alla tre filerna)

Innan varje sprint-avslut:

1. **`npm run build`** — inga TypeScript-fel
2. **Live-test** end-to-end — inte bara att det kompilerar
3. **Kolla mot acceptanskriterierna** i originalfilen — inte minnesbaserat
4. **PostHog-check** — loggas rätt events?
5. **"Vän-check"** — visa featuren för någon utanför projektet. Vad minns de efter 60 sekunder?
6. **Mockup-jämförelse** (för Features #11) — öppna `mockups/4_profil.html` parallellt med live-vyn. Identifiera 3 visuella avvikelser och åtgärda eller dokumentera bort.

---

## Snabbreferens — filstruktur

```
SveBud/
├── ROADMAP.md                           ← du är här (öppna först)
├── PROMPT_landing_v5.md                 ← detaljspec landningssida
├── PROMPT_profil_v1.md                  ← NY (27 april) — Features #11 megaprompt
├── svebud-nya-funktioner-prompts.md     ← detaljspec produktfeatures
├── CLAUDE.md                            ← befintlig projektkontext
├── components/
│   ├── UtfallsKnappar.tsx               ← Win/Loss UI (26 april)
│   ├── ProjektKort.tsx                  ← använder UtfallsKnappar (kompakt)
│   ├── Sidebar.tsx                      ← med 📊 Statistik-länk (27 april)
│   └── Profil/                          ← NY (etapp A+)
│       ├── Företaget.tsx
│       ├── Behörigheter.tsx
│       ├── Team.tsx
│       ├── Referenser.tsx
│       ├── Benchmarks.tsx
│       └── Mallar.tsx
├── lib/
│   ├── posthog.ts                       ← PostHog client (26 april)
│   ├── posthog-server.ts                ← PostHog server (26 april)
│   ├── utils.ts                         ← parseClaudeJSON med array-stöd (27 april)
│   ├── bolagsverket-agent.ts            ← NY (etapp A)
│   ├── cert-extraction-agent.ts         ← NY (etapp B)
│   ├── benchmark-agent.ts               ← NY (etapp D)
│   └── profilstyrka.ts                  ← NY (etapp A)
├── app/(app)/
│   ├── statistik/
│   │   └── page.tsx                     ← Win/Loss Dashboard (27 april)
│   └── profil/                          ← NY (etapp A)
│       └── page.tsx
├── app/api/
│   ├── statistik/
│   │   └── insikter/
│   │       └── route.ts                 ← AI-insikter med cache (27 april)
│   └── profil/                          ← NY
│       ├── hämta-bolagsverket/route.ts  ← (etapp A)
│       ├── cert/ladda-upp/route.ts      ← (etapp B)
│       └── benchmarks/räkna-om/route.ts ← (etapp D)
├── public/
│   ├── landing.html                     ← Fas 1 färdig, Fas 2-3 kvar
│   └── images/                          ← 5 JPG-filer
├── mockups/
│   ├── 1_landing.html
│   ├── 2_dashboard.html
│   ├── 3_projekt_detalj.html
│   └── 4_profil.html                    ← NY (designreferens för Features #11)
└── supabase/
    └── migrations/
        ├── 010_winloss_kompletta_kolumner.sql   ← körd 26 april
        ├── 011_ai_insikter_cache.sql            ← körd 27 april
        ├── 012_firma_profil.sql                 ← NY (etapp A)
        ├── 013_certifikat.sql                   ← NY (etapp B)
        ├── 014_team_och_referenser.sql          ← NY (etapp C)
        ├── 015_firma_benchmarks.sql             ← NY (etapp D)
        └── 016_anbudsmallar.sql                 ← NY (etapp E)
```

---

## Avklarade migrationer (för referens)

| # | Vad | Datum |
|---|-----|-------|
| 010 | Win/Loss kompletta kolumner + stavningsfix + backfill | 26 april 2026 |
| 011 | AI-insikter cache-tabell med RLS + rate limiting | 27 april 2026 |
| 012 | firma_profil + firma_egenskap_källa | (etapp A) |
| 013 | certifikat + storage-bucket firma-certifikat | (etapp B) |
| 014 | team_person + referensprojekt + auto-länk till anbud | (etapp C) |
| 015 | firma_benchmarks + benchmark_lärningslogg | (etapp D) |
| 016 | anbudsmall med versionshantering | (etapp E) |

---

## Sist men viktigt — fokusdisciplin

Det som **inte är OK** att göra härifrån:

- Hoppa över Landing Fas 2 ("ser ju OK ut redan")
- Köra Features #7 innan #4, #5 och #11 är i produktion
- Bygga Features #9 (Prisförslag) innan Features #11 Etapp D (Benchmarks)
- Skapa ett "fyll i din firma-profil"-formulär eller en "kom igång"-wizard i Features #11
- Lägga till nya features i ROADMAP utan kundintervjuer
- Refaktorera prematurt utan ny bugg som motiverar det

Om någon av dessa frestelser uppstår — stanna, öppna denna fil, påminn dig om varför ordningen är som den är.

---

*Senast uppdaterad: 30 april 2026 — efter Landing 2.5 (FAQ utökad till 8 frågor). Uppdatera denna fil efter varje slutförd sprint.*
