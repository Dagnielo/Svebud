# SveBud — ROADMAP

**Senast uppdaterad:** 14 maj 2026 (natt, kl ~03:00) — App-redesign Steg 4C (/nytt-projekt) LIVE på svebud.se
**Syfte:** Indexfilen för SveBuds fortsatta utveckling. Binder ihop landningssida (`docs/PROMPT_landing_v7.md`), produktfeatures (`svebud-nya-funktioner-prompts.md`) och profil-systemet (`docs/PROMPT_profil_v1.md`).

**Öppna denna fil först** när du ska bestämma vad som byggs härnäst.

---

## Status just nu — var står du?

| Yta | Färdig | Återstår |
|-----|--------|----------|
| **Landningssida** | 100% | Eventuella strukturella tillägg (Om oss-sida, trial-längd 30 dagar) — i backlog |
| **Dashboard (Pipeline)** | 100% | — (ljus design klar i Steg 2A) |
| **Alla projekt** | 100% | — (ljus design + sortering klar i Steg 2B) |
| **Statistik-sida** | 60% | Steg 4 — ljus design (Steg 2A-tokens portas) |
| **Projekt-detaljvyn** | 75% | Steg 3E (Tab 3 Anbud + Tab 4 Föranmälan) + Steg 3F (Phosphor-skuld) |
| **Profil-systemet** | 60% | Steg 4 — ljus design + Etapp B–E (cert/team/benchmarks/mallar) |
| **Certifikat** | 50% | Steg 4 — ljus design + AI-extraktion (Etapp B) |
| **Inställningar** | 50% | Steg 4 — ljus design |
| **Backend / agenter** | 80% | Firecrawl-scrapers (#6), prisförslag (#9) |
| **Analytics** | 90% | PostHog-events på detaljvyn (Steg 3) |

**Översättning:**
Två stora produkt-pelare återstår: **Profil-systemet** (helt nytt) och **Tillväxt-features** (uppföljning, email-kanal, prisförslag, referral). Landningssidan är komplett.

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
- ✅ `docs/PROMPT_profil_v1.md` skapad — komplett spec för Features #11 Profil-systemet

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

- ✅ Compare-tabell alignment-fix — `.cmpgrid` ändrad från
  `align-items:center` till `align-items:start`. Topparna alignar nu.

### 30 april 2026 — Features #4 — Uppföljnings-notifikation ✅

- ✅ Del A — `lib/hooks/useUppföljningar.ts` shared hook med dual-write
  till `uppföljning` + `projekt.tilldelning_status`. Tre-nivåers
  sortering (förfallna först, sen kommande kronologiskt, null sist).
  PostHog-event `uppföljning_utfall_markerat` med `{ utfall, från_state,
  projektId }`.
- ✅ Del C — `components/UppföljningsBanner.tsx` på dashboard. Visar
  antal förfallna åtgärder (`nästa_åtgärd <= NOW()`) med klickbar
  "Visa →"-länk till `/uppföljning`. Brand-design via CSS-variabler
  (`var(--yellow-glow)`), inte generic Tailwind. Skeleton-state +
  null-render vid count=0 eller fel.
- ✅ Del B — `app/(app)/uppföljning/page.tsx` aktiverad (var stub).
  Två tabeller: aktiva (med Vunnet/Förlorat/Avbryt-knappar) +
  avslutade (read-only). State-badges för alla 9 states, relativ
  tids-rendering ("Förfallen sedan X dagar" / "Idag" / "Om X dagar").
- ✅ Bugfix efter Features #4: Next.js stöder inte ö i App Router
  mappnamn → `/uppföljning` bytt till `/uppfoljning`. Mappen flyttad
  med `git mv` (historik bevarad). Banner-länk + proxy.ts-skydd
  uppdaterade. Variabel/types/UI-text oförändrad — endast URL-pathen
  är ASCII (samma konvention som `installningar/`, `alla-projekt/`).

### Etapp A — DB-grund + Företaget-tabben ✅ KLAR (1 maj 2026)

Levererat i 9 commits (f9041aa → 4927bc8) på main:

- Migration 012: firma_profil + firma_egenskap_källa (med RLS, källspårning)
- Bolagsverket-agent (Firecrawl mot allabolag.se, gratis tier)
- API-route /api/profil/hamta-bolagsverket
- Profilstyrka-hero på /profil med dynamisk 21-punkts beräkning
- 3 PostHog-events: profil_visad, profil_grunddata_hämtad/_misslyckades

Approach: ADDITIV utvidgning av befintlig /profil-sida (777 → 893 rader).
profiler-tabellen är fortsatt primär källa för formuläret. firma_profil
används som skugg-tabell för Bolagsverket-data + källspårning.

**Hoppade över i Etapp A (medvetet, additiv approach):**

- Källtaggar bredvid auto-fält (Block C av Steg 5) — kan göras som mini-commit senare
- Registreringsflöde-uppdatering (org.nr som obligatoriskt fält) — för riskabelt
  att röra auth-flödet just nu
- Backfill-migration för befintliga användare — onödigt eftersom profiler-tabellen
  redan har orgnr/adress för existerande konton

**Nästa: Etapp B — Behörigheter + AI-extraktion av certifikat (redo att starta).**

### 1 maj 2026 (sen kväll) — Landing v6+v7 LIVE ✅

Sammanslagen design-migrering + audit-applicering på live svebud.se.

**Bakgrund:** Designaudit identifierade att `public/landing.html` (mörk) skiljde sig från `mockups/svebud-landing-ljus_5.html` (ljus = ny designintention). Två separata sidor med samma designspråk men olika sektioner och klassnamn. v6-specen skrevs initialt mot mockupen — vilket gav 13/20 NO-OP-resultat när den kördes mot mörk live. v7 var den ärliga migreringen.

**Levererat i 4 commits på main:**

- `a376bfe` — Logotyp-byte till wordmark + favicon (v6 Steg 2 — på mörk live)
- `6cc2397` — Migrera till ljus design v7 (ersätter mörk `public/landing.html`)
- `b4522b6` — Applicera 14 audit-fixar på ny ljus design (v7 commit 2)
- Designprinciper i CLAUDE.md (v7 commit 3)

**14 audit-fixar applicerade:**

- Fake "4,9/5"-rating borttagen
- "⚡ Analys" → "Kalkyl pågår" i hero-mockup
- Fake elfirma-strip borttagen (16 påhittade firmnamn)
- Phosphor Bold på alla 9 ikoner (3 pain + 6 features) + 3 i Branschkunskap-sektionen
- Feature-badges → konkreta löften (Inkluderat / PDF + Word / ROT + grön teknik / Pro-feature)
- Beta-program-section borttagen
- Branschfakta-rad borttagen (4 osourced siffror — hellre inget än fejk)
- Pricing-alert → riktiga signup-länkar
- Blixt-emoji bort från alla CTA-knappar
- Footer Bransch-länkar disabled tills SEO-sidor finns
- Stats-strip borttagen (visuellt fel placerad enligt användartest)
- Hero-trust-rad borttagen (ärlighet > tom social proof tills riktiga pilotanvändare finns)
- CTA-sektionens bakgrundsbild borttagen (för mörk, bröt mot ljust designspråk)
- "Se demo →"-knapp + risk-rad fick bättre kontrast på ljus bakgrund

**Ny logotyp-behandling:** Variant B2 wordmark — "Sve" navy + "Bud" amber + amber prick på baseline. Inter-font, font-weight 800. Ingen blixt-emoji som identitetsbärare.

**Ny favicon:** Amber prick på navy bakgrund, SVG-format.

**Designprincip förankrad i CLAUDE.md:**
> SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår elinstallation. AI är medlet — inte budskapet, inte identiteten.

**Filer som tillkom/ändrades:**
- `docs/PROMPT_landing_v6.md` — designaudit-spec (13 fixar)
- `docs/PROMPT_landing_v7.md` — migrations-spec (mörk → ljus + körinstruktion för v6)
- `public/landing.html` — komplett ny ljus version (1.4 MB inkl. 5 inbäddade base64-bilder)
- `public/favicon.svg` — ny SVG-favicon
- `CLAUDE.md` — ny `## Designprinciper`-sektion

### 1 maj 2026 — App-redesign Steg 1A → 3A LIVE ✅

**Bakgrund:** Hela inloggade appen migrerades från mörk navy-design till ljus designspråk. Sju steg körda med visuell verifiering före varje commit. Designprincip "yrkesverktyg byggt av människor som förstår elinstallation" förankrad i CLAUDE.md (från Landing v7).

**Levererat i 13 commits på main:**

- ✅ **Steg 1A — Designtokens** parallellt med mörka tokens i `app/globals.css` (25+ `--light-*` tokens inkl. amber/green/red/orange/blue + bg-varianter + text t1-t4 + cream/off-bakgrunder)
- ✅ **Steg 1B + 1B-2 — Central layout via route-grupper.** `app/(app)/(authenticated)/layout.tsx` (Server Component med server-side auth + Sidebar), `lib/types/user.ts`, `app/api/logout/route.ts`. Refaktorerade 8 page.tsx. Route-grupp-arkitektur: `app/(app)/(authenticated)/` för 8 auth-sidor, `app/(app)/projekt/[projektId]/` för stripped detaljvy, 6 publika sidor utanför `(authenticated)/`
- ✅ **Steg 1C — Sidebar** redesign med Phosphor-ikoner (`Lightning`, `Plus`, `Folders`, `ChartBar`, `Buildings`, `Certificate`, `Gear`). Wordmark "SveBud." + amber-prick som logo. Form-action `/api/logout` istället för client-side
- ✅ **Steg 1D — KpiKort** extraherad till `components/KpiKort.tsx` med färg-prop-API (amber/green/red/orange/blue/neutral) och valfri Phosphor-ikon
- ✅ **Steg 2A — Pipeline-vyn** komplett redesign med 7 nya features:
  - `NotifikationsBell` (förfallna uppföljningar, badge med antal)
  - `PipelineFilter` (3 filter-grupper: pipeline-status, kundtyp, anbudsläge)
  - `PipelineSortera` (4 alternativ: deadline, skapad, anbudsläge, värde)
  - `bestämCta`-helper i `lib/projekt-status.ts` för status-baserade CTA:er
  - Konsoliderade `Projekt`-typ till `lib/types/projekt.ts` (3 driftade typer eliminerade)
  - 7 design-iterationer på live (cream/vit/cream-hierarki, kolumn-pills, vänster-stripes, text-färger, sektion-header, neutral KPI, centrering)
  - Ny `--light-card`-token (#EAE5DA) för cream-toned kort-bg
- ✅ **Steg 2B — Alla projekt-vyn** ljus design med klickbar kolumn-sortering (Värde/Deadline/Skapad). Pills för anbudsläge (STARKT/BRA/OSÄKERT/SVÅRT), text för process-state (Analyserar/Analyserad/Ej analyserad). Phosphor ersätter alla 5 emojis (📁📄⚠️🔥📅 → FolderOpen/FileText/Warning/Fire/Calendar). Null-deadline alltid sist oavsett asc/desc.
- ✅ **Steg 3A — Projekt-detaljvyn arkitektur-städning.** `ProjektDetalj`-typ separerad från `Projekt` i `lib/types/projekt.ts` (rekommendation, anbudsutkast, anbudsutkast_redigerat, inskickningar, uppdaterad). Tre komponenter utbrutna från 1632-radersfilen: `components/SidePanel.tsx`, `components/AktivitetsLogg.tsx`, `components/ProjektDetaljHeader.tsx`. **INGA visuella ändringar** — pixel-perfekt match mot live-versionen verifierad. Sidan fortfarande mörk navy — Steg 3B migrerar till ljus.
- ✅ **Bug-fix: Datum-prioritet i ProjektKort** respekterar nu `pipeline_status` (visade "Beslut [datum]" på projekt som flyttats tillbaka från Tilldelning till tidigare status — `tilldelning_datum` finns kvar i DB även efter status-byte)

**Filer som tillkom/ändrades:**
- Nya: `lib/types/projekt.ts`, `lib/types/user.ts`, `lib/projekt-status.ts`, `app/(app)/(authenticated)/layout.tsx`, `app/(app)/projekt/[projektId]/layout.tsx`, `app/api/logout/route.ts`, `components/{KpiKort,NotifikationsBell,PipelineFilter,PipelineSortera,SidePanel,AktivitetsLogg,ProjektDetaljHeader}.tsx`
- Migrerade: 8 page.tsx (auth-sidor), `components/{Sidebar,ProjektKort}.tsx`, `lib/verdict.ts` (light-tokens i `bedömningsVisning`)
- Tokens: 25+ `--light-*` i `app/globals.css` parallellt med mörka tokens

**Commits (kronologisk):**
- `01b91f6` Steg 1A — introducera ljusa designtokens parallellt
- `b4e6cb3` Steg 1B — central layout + server-side auth
- `b8e6790` Steg 1B-2 — nestlad layout för projekt-detalj + fix av publika sidor
- `59f2e2e` Steg 1C — Sidebar redesign med Phosphor + ljusa tokens
- `bc46751` Steg 1D — KpiKort extraherad till delad komponent
- `82ccf92` Steg 2A del 1/2 — typkonsolidering + bestämCta-helper + ljusa verdict-tokens
- `c7385d8` Steg 2A del 2/2 — ProjektKort redesign (ljus + CTA + anbudsläge-badge)
- `b38ba31` Bug-fix datum-prioritet i ProjektKort
- `4ebd43d` Steg 2A del 2/2 — header + KPI-strip + filter/sortera + bell
- `eb04e49` Steg 2A polish — Pipeline-vy hierarki + läsbarhet
- `da4de70` Steg 2A polish (forts) — sektion-header + neutral KPI + centrering
- `6dc2051` Steg 2B — Alla projekt-vyn ljus + sortering
- `b243011` Steg 3A — typkonsolidering + komponent-extraktion (refactor, no visual change)

### 2 maj 2026 — App-redesign Steg 3B → 3D LIVE ✅

**Bakgrund:** Tre stegs visuell migration av Projekt-detaljvyn (`/projekt/[id]`) på en dag. 3 av 4 tabs (Dokument, Analys + ramen) är nu ljusa. Tab 3 (Anbud-utkast) och Tab 4 (Föranmälan) återstår för 3E. Phosphor-skuld har växt till ~35 emojis i 5+ platser — hanteras dedikerat i Steg 3F.

**Levererat i 3 commits på main:**

- ✅ **Steg 3B (`9b05cd6`) — Ramen ljus.** Page-bg cream, header vit (1px ljus border, 3px gul accent borta), stepper i light-tokens (3 states: done/active/inaktiv med amber-glow ring runt aktiv cirkel), Föranmälan-flik bevarar vertikal-stepper-struktur, instruktionsruta amber-glow + amber-knappar, höger-panel vita kort med subtil shadow. Phosphor: Calendar/Lightning/ArrowLeft/Check ersätter 4 emojis i ramen
- ✅ **Steg 3C (`b3b905f`) — Dokument-tab + AnbudsUppladdning + KvalitetsPanel.** Dokumentlista vit-card-rader med shadow, AnbudsUppladdning Card vit (drag-zon **bevarar live UX** — subtil idle / amber vid drag), KvalitetsPanel **bevarar 4-nivå-betyg-trösklar** (≥9/≥7/≥5/<5 + 5 labels). Phosphor: FolderOpen/ClipboardText/FloppyDisk/X/MagnifyingGlass/FileText/CaretUp/CaretDown/Check ersätter knapp-ikoner
- ✅ **Steg 3D (`c1f2973`) — Analys-tab + 3 komponenter + gating-rutor.** GranskningSida ren färg-migration (alla strukturer bevarade — anbudsläge-kort med 64px procent-cirkel, 4 StatBox, krav-listor, Risker/Möjligheter, Rekommendation, ScanningIndikator), SnabboffertVy + RotKalkyl (5-grid ROT-typer som segmented buttons + 3-grid inställningar), Kundfrågor-sektion med Phosphor `Question` + `Plus`. Op 5.5: Gating-rutor på Tab 3 ("Analysera förfrågan först") till ljus — bug fångad av användaren

**Designprincip-konsekvens:**

- Pixel-perfekt match mot Pipeline-vyn + Alla projekt-vyn på alla migrerade ytor
- 64px procent-cirkel + `bedömningsVisning` bevarad i GranskningSida (specens GO/NO-GO-design ignorerad — bryter bedömnings-metaforen som finns på rest-av-appen)
- 4-nivå-betyg-trösklar bevarade i KvalitetsPanel (Utmärkt/Bra/Godkänt/Bristfälligt/Allvarliga brister)
- Drag-drop-UX i AnbudsUppladdning bevarad (subtil idle / amber vid drag — inte specens "amber alltid")

**Filer som migrerades:**
- `app/(app)/projekt/[projektId]/page.tsx` — Tab 1 + Tab 2-blocket + Kundfrågor + Tab 3-gating
- `components/SidePanel.tsx`, `components/AktivitetsLogg.tsx`, `components/ProjektDetaljHeader.tsx` (3B)
- `components/AnbudsUppladdning.tsx`, `components/KvalitetsPanel.tsx` (3C)
- `components/GranskningSida.tsx`, `components/SnabboffertVy.tsx`, `components/RotKalkyl.tsx` (3D)

**Phosphor-skuld efter 3D (~35 emojis i 5+ platser):**
- Stepper instruktionsruta: 📎📊⚡📋 + 🔍⏳
- AnbudsUppladdning fil-status: ✅⏳⚠️⏸️❌
- KvalitetsPanel allvarlighet + statistik + åtgärds-knappar: ✅💡⚠️❌🔄▲
- GranskningSida: ✅⚠️❌📋✓▲▼✦💡 + ⚠ + ℹ
- SnabboffertVy moment-typer: ⚡🔌💡🔨☀️🚨🏢🔍🔧
- ROT_TYPER (i lib/rot-regler.ts): emojis per ROT-typ

Hanteras dedikerat i **Steg 3F** (rensnings-commit efter 3E).

### 14 maj 2026 (natt-avslutning kl ~01:45) — Steg 4A LIVE ✅

#### Steg 4A — KLAR & LIVE ✅
- Commit: `f770675` (refactor(ui): Steg 4A — light-migration /installningar)
- Docs: `59f7c29` (docs: krav på detaljerade visuella testinstruktioner)
- /installningar fullt migrerad till light-tokens
- Hantera plan-knapp-bug fångad i verifiering och fixad innan push
- Live på svebud.se

#### Lärdomar tillagda i CLAUDE.md
- Visuell verifiering kräver var/handling/förväntat/bugg-indikator per punkt
- shadcn outline-variant ärver bg-background — kräver explicit
  `background: transparent` + `!important` hover-override på light-mode-sidor

#### Småjobb / framtida
- PRO-badge alpha-bg-fix i tierInfo (cosmetic, ej blocker)
- Skapa `variant="outline-light"` i Button-komponenten för 4B-4F
  (eliminerar !important-spam)
- Hover-states saknas på amber-knappar (pre-existing)
- /priser fortfarande mörk (utanför Steg 4-scope, beslut behövs)

#### Återstående Steg 4
- 4B /certifikat (0,5 dag)
- 4C /nytt-projekt (0,5 dag)
- 4D /uppfoljning (1 dag)
- 4E /profil (1 dag, 777 rader)
- 4F /statistik (1,5 dag)

### 14 maj 2026 (natt-avslutning kl ~02:00) — Småjobb LIVE ✅

#### Småjobb LIVE ✅
- Commit: `515a867` (fix(ui): outline-light Button-variant + PRO-badge alpha-bg)
- Ny återanvändbar `variant="outline-light"` i Button-komponenten
- /installningar Hantera plan-knapp använder nu outline-light istället
  för !important-hack
- PRO-badge alpha-bg-regression fixad via `tierInfo.bg`-fält per tier
- Netto -4 rader kod (10 till, 14 bort)

#### Konsekvens för Steg 4B-4F
- outline-light-varianten är nu tillgänglig för alla light-mode-sidor
- Eliminerar förväntat !important-spam i kommande sidor
- Etablerar mönster: light-mode-shadcn-knappar använder outline-light, inte outline

#### Återstående småjobb
- Hover-states saknas på amber-länkar (pre-existing, ej introducerad)
- /priser fortfarande mörk (utanför Steg 4-scope, beslut behövs)

#### Återstående Steg 4 (oförändrat)
- 4B /certifikat · 4C /nytt-projekt · 4D /uppfoljning · 4E /profil · 4F /statistik

### 14 maj 2026 (natt-fortsättning kl ~02:30) — Steg 4B LIVE ✅

#### Steg 4B — KLAR & LIVE ✅
- Commit: `c2186e5` (refactor(ui): Steg 4B — light-migration /certifikat)
- 1 fil, +42/-39, 37 light-tokens, 0 mörka kvar
- Kategori-kort (El-auktorisation, SSG-kurser, Arbetsmiljö, Övrigt) +
  Erfarenhetsområden-kort migrerade
- Checkbox-state-styling (aktiv light-t1 / inaktiv light-t3) etablerad
- Erfarenhet-chips toggle med light-amber-glow för aktiv
- Custom add + delete-flow (Phosphor X bonus-fix)

#### Bonus-fynd
- 2 ✕-emojis missade i 3F.4-inventeringen migrerade till Phosphor X
- Lärdom: 3F-grep-strategi missade vissa kontexter
- Småjobb: sweep-script för missade Unicode-emojis i hela kodbasen
  efter Steg 4F

#### Återstående Steg 4
- 4C /nytt-projekt (0,5 dag, helt mörk)
- 4D /uppfoljning (1 dag)
- 4E /profil (1 dag, 777 rader)
- 4F /statistik (1,5 dag)

### 14 maj 2026 (natt-fortsättning kl ~03:00) — Steg 4C LIVE ✅

#### Steg 4C — KLAR & LIVE ✅
- Commit: `4392d44` (refactor(ui): Steg 4C — light-migration /nytt-projekt)
- 2 filer, +24/-20, 18 light-tokens, 0 mörka kvar
- Form-baserad sida: inputs + primär CTA + Avbryt-knapp + validering
- Form-flow verifierad: skapa projekt → navigerar till /projekt/[id]
- Wrapper-bg-bugg fixad (saknade background helt)

#### Ny Button-variant
- `variant="outline-light-neutral"` (grå outline för Avbryt/sekundära)
- Komplement till `outline-light` (amber)
- Återanvändbar för 4D-4F sekundär-knappar
- Etablerar Button-variant-system för light-mode-sidor

#### Status efter natt-pass
- 4 av 7 authenticated-sidor migrerade till light-tokens:
  alla-projekt (Steg 2B), 4A installningar, 4B certifikat, 4C nytt-projekt
- Återstår: 4D /uppfoljning · 4E /profil · 4F /statistik

---

## Nästa steg — vart är vi på väg?

### Just nu — App-redesign Steg 3 (detaljvyn) — 3 av 4 tabs ljusa

Steg 3A-3D klara och live på svebud.se. Återstår:

| # | Arbete | Fil | Tid |
|---|--------|-----|-----|
| 1 | **Steg 3E** — Tab 3 (Anbud) + Tab 4 (Föranmälan) — KalkylVy + ForanmalanTracker + utkast-redigering + prisöversikt + kontakt + kvalitet + skicka + historik | `app/(app)/projekt/[projektId]/page.tsx` + `components/{KalkylVy,ForanmalanTracker}.tsx` | 1–1,5 dag |
| 2 | **Steg 3F** — Phosphor-skuld-rensning (~35 emojis i 5+ platser) | Alla migrerade filer från 3B–3E | 0,5 dag |

**Total kvar för Steg 3: 1,5–2 dagar.** Sen: **Steg 4** (Statistik + Profil + Certifikat + Inställningar — bara estetik, en spec).

### Vecka därefter — Strukturella tillägg + Email-kanal

| # | Arbete | Fil | Tid |
|---|--------|-----|-----|
| 8 | Landing 3.1 — Om oss-sida | Landing [3.1] | 1 dag |
| 9 | Landing 3.3 — Trial-längd 30 dagar från första uppladdning | Landing [3.3] | 4 timmar |
| 10 | Features #5 — Email-kanal (Resend Inbound) | Features [#5] | 2 dagar |

**Total: ~3 dagar.** Landningssidan komplett. Email-kanalen öppen.

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
| 11a | Etapp A — DB-grund + Företaget-tabben + Bolagsverket-hämtning | docs/PROMPT_profil_v1.md | 2 dagar |
| 11b | Etapp B — Behörigheter + AI-extraktion av certifikat | docs/PROMPT_profil_v1.md | 2 dagar |
| 11c | Etapp C — Team + Referenser auto-länkade till vunna anbud | docs/PROMPT_profil_v1.md | 1 dag |
| 11d | Etapp D — AI-lärda benchmarks | docs/PROMPT_profil_v1.md | 2 dagar |
| 11e | Etapp E — Mallar med versionshantering | docs/PROMPT_profil_v1.md | 1 dag |

**Total: ~7–8 dagar.** Varje etapp är självständig och kan deployas separat. Migration 012–016.

**Filosofin är kritisk:** Profil-systemet ska INTE vara ett formulär eller en wizard. Profilen byggs av sig själv från riktigt arbete. Läs filosofi-sektionen i `docs/PROMPT_profil_v1.md` innan etapp A startas.

**Förberedelse innan vecka 6 startar:**
- **Bolagsverket-API uppdaterat 2025:** Näringslivsregistret stängde 30 september 2025. Idag finns två API:er:
  - **API för värdefulla datamängder** (gratis, inget avtal) — täcker grunddata: namn, adress, organisationsform, status, registreringsdatum. Räcker för Profil-systemets etapp A.
  - **API för företagsinformation** (anslutningsavgift + månadsavgift, papper i posten) — djupare data som verksamhetsbeskrivning, styrelse, aktiekapital. Behövs INTE för MVP.
- **Plan när Etapp A startar:** ansök gratis-API (5 min, nycklar via mejl/SMS samma dag). Om blockerat — Firecrawl mot allabolag.se/orgnr/{orgnr} som fallback (redan inbyggt i `lib/bolagsverket-agent.ts`).
- **Inget brådskar.** Tidigare antagande att processen tar dagar gällde det gamla betal-API:et.

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

### Beroende 2: Features #7 krockar med docs/PROMPT_landing_v5.md
Lösning: Kör hela `docs/PROMPT_landing_v5.md` först (alla tre faser), **sedan** Features #7 som lager ovanpå. Och #7 får inte marknadsföra features som inte är byggda. Just nu kan #7 nämna Win/Loss + Statistik (klara), men inte uppföljning, email-kanal eller profil förrän #4, #5 och #11 är live.

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

## Backlog — dokumenterade specer utan sprint-tid

Specer som ligger i `docs/` men inte är schemalagda i nuvarande plan.
Hämtas in i en framtida sprint baserat på kundfeedback eller naturligt
flöde efter Profil-systemet.

- **`docs/PROMPT_foranmalan_tracker.md`** — Föranmälan-tracker till
  nätbolagen. Dashboard-feature. Komplement till Features #6
  (Firecrawl-scrapers).
- **`docs/PROMPT_rot_kalkyl.md`** — ROT-avdragskalkyl. Dashboard-feature.
  Lyfter ROT-avdrag som första-klass i kalkyl-flödet.

**Spec-uppdateringar att göra vid Etapp A-start:**

- **`docs/PROMPT_profil_v1.md` rad 49 + 51 + 134-141** — uppdatera referenser till "Bolagsverket Näringslivsregistret API" till "API för värdefulla datamängder" (gratis-API:et som ersatte Näringslivsregistret 30 sept 2025). Funktionsnamn `hämtaFöretagsdata()` och fallback-logik mot allabolag.se är OK som de är.

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

---

## Lärdomar

### Spec-bug: Kolumnnamn ska verifieras mot DB-schema (1 maj 2026)

Två 400-buggar i Features #4 hook (`useUppföljningar.ts`) berodde på
spec-fel där kolumnnamn antogs istället för verifierades:

- `projekt.typ` (kolumn finns inte) — borttagen
- `projekt.sista_anbudsdag` (heter egentligen `deadline`) — bytt

TypeScript fångar inte detta — bara Supabase runtime returnerar 400.
Felmeddelandet i konsolen visar URL men ej specifik felkod, så det
tar tid att diagnostisera utan att kolla Network → Response-bodyn.

**Regel framåt:** Innan en hook/route specas med specifika kolumner —
kör först:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'X' ORDER BY ordinal_position;
```

och referera schema-listan i specen.

### Spec-bug, andra lager: ASCII-mappnamn för API-routes (1 maj 2026)

Next.js stöder inte ä/ö i mappnamn för app-router (även för API-routes).
Detta var samma issue som löstes igår med /uppfoljning. Idag uppstod
samma bug i /api/profil/hamta-bolagsverket — DevTools Network visade
404 på encoded URL %C3%A4mta-bolagsverket.

**Regel framåt:** ALLA mappnamn under app/ måste vara ASCII. Variabel-,
funktions-, kommentar- och stränglitteraler behåller svensk text.
Logging-prefix (t.ex. `[hämta-bolagsverket]`) bevaras som debug-strängar.

### Spec-bug, tredje lager: Verifiera kolumnnamn ASCII vs svenska tecken (1 maj 2026)

Migration 006 använder ASCII-kolumnnamn (`antal_montorer`, `omsattning_msek`,
`postnr`) medan Migration 012 använder svenska tecken (`antal_montörer`,
`omsättning_senaste_år`, `postnummer`). Båda är giltiga men inte konsekventa
i schemat.

**Regel framåt:** När en hook eller funktion läser från MULTIPLA tabeller
eller migrations — kontrollera kolumnnamnen i VARJE migrationsfil
INNAN spec skrivs. Använd:

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Spec-bug, fjärde lager: Vercel env-variabler måste sättas per miljö (1 maj 2026)

När en ny tjänst läggs till lokalt med API-nyckel i .env.local — kom ihåg
att variabeln ALLTID måste läggas till i Vercel manuellt för Production.
.env.local är inte synkad med Vercel.

Build kraschade efter Etapp A-deploy med:
"Error: API key is required for the cloud API. Set FIRECRAWL_API_KEY env"

Roten: FIRECRAWLER_API_KEY fanns lokalt men inte i Vercel Production.
Variabeln behöver läggas till i ALLA tre miljöer (Production, Preview,
Development) för att fungera överallt.

**Regel framåt:** När en ny env-variabel läggs i .env.local lokalt —
lägg DIREKT till den i Vercel också, för alla 3 miljöer. Annars
kraschar nästa Production-build.

### Spec-bug, femte lager: Mockup ≠ live (1 maj 2026)

När en designspec skrivs ska den verifieras mot den faktiska filen
som ska ändras (`public/landing.html` på `main`), inte mot mockup-
filer som `mockups/svebud-landing-ljus_5.html`. Mockup-filer driftar
och representerar designintention, inte implementations-verklighet.
Två separata HTML-filer kan ha samma designspråk men helt olika
sektioner, klassnamn och copy.

PROMPT_landing_v6 skrevs mot ljus-mockupen. Live var fortfarande
mörk. Resultat: Claude Code rapporterade 13/20 NO-OP eftersom
specens strängar inte fanns i live. v6 commit 1 städade mörk sida
som ändå skulle skrotas. v7 var den ärliga migreringen.

**Regel framåt:** Innan en designspec skrivs:

1. `git show HEAD:public/<fil>.html | head -50` — bekräfta vilken
   version som faktiskt är live
2. Diff:a mot mockupen visuellt
3. Anchora exakta `old_string`-strängar mot live, inte mockup
4. Om migrering behövs: skriv en separat migrations-spec FÖRST,
   sen audit-fixar PÅ den migrerade filen

### Spec-bug, sjätte lager: Spec-kod är förslag, live ÄR sanningen (1 maj 2026)

I Steg 3A (refaktor utan visuella ändringar) skrev specen kod för
`ProjektDetaljHeader.tsx` med uppfunna CSS-tokens (`var(--white-custom)`,
`var(--steel-glow)`, `var(--blue-glow)`) som inte fanns i `globals.css`.
Specen sa även snabboffert-badge är blå — live är grön. Och den
saknade 14 styling-detaljer som live hade (3px gul borderBottom,
beskrivning/skapad-undertitel, "Sätt deadline →"-text, 📅-emoji,
doljs-på-föranmälan-villkor m.fl.).

Vid ren refaktorering ÄR den existerande live-koden den enda
sanningen. Spec-kod skriven från minnet är **förslag**, inte
specifikation.

**Regel framåt:**

- Vid refaktor-specer: skriv prop-interface (designat) men markera
  kod-block som **"Implementation: kopiera EXAKT från live"**
- Vid redesign-specer: skriv styling-detaljer som **"riktning + exempel"**,
  inte som **"så ska det se ut"**
- Verifiera CSS-tokens mot `globals.css` innan de används i spec-kod
- Plan mode i Claude Code måste flagga divergens mellan spec och live
  INNAN implementation startar

### Spec-bug, sjunde lager: Stop-checkpoint måste matcha kompilerings-grafen (1 maj 2026)

Steg 2B-specen sa "stop efter Op 7 för visuell verifiering". Op 7
anropade `<ProjektRad>` som först definierades i Op 8. Vid Op 7-stopp
skulle koden inte kompilera — alltså omöjligt att visuellt verifiera.

Stop-checkpoints får inte sättas mitt i en kompilerings-graf. När
Op N refererar till komponenter eller helpers som introduceras i
Op N+1, N+2... måste stoppet vara EFTER alla dessa.

**Regel framåt:**

- När en spec skrivs med stop-checkpoint: läs igenom alla operationer
  EFTER stoppet och verifiera att inget av dem introducerar referenser
  till dependencies från före-operationer.
- Plan mode i Claude Code ska identifiera och föreslå korrekt
  stop-position om specen är fel.
- För Steg 2B blev korrekt stopp efter Op 11 (alla helpers + komponenter
  klara, innan städning + build + commit).

### Spec-bug, åttonde lager: Datum-prioritet måste villkoras med pipeline_status (1 maj 2026)

ProjektKort visade "Beslut 15 apr." på projekt som inte var i
tilldelnings-status. Orsak: `tilldelning_datum` finns kvar i databasen
även efter att projekt flyttats tillbaka från Tilldelning till tidigare
status. Logiken kollade bara om datum-fältet hade värde, inte om
projektet faktiskt var i rätt status.

Datum-baserad rendering måste villkoras med tillstånds-baserad logik
när tillstånd kan ändras men databas-fält behålls.

**Regel framåt:**

- `skickat_datum` får ENDAST visas om `pipeline_status === 'inskickat'`
- `tilldelning_datum` får ENDAST visas om `pipeline_status === 'tilldelning'`
- Generell princip: när status-fält och tidsstämpel-fält co-existerar
  i samma rad, alltid villkora visning på status först

```typescript
// Korrekt prioritet:
if (pipeline_status === 'inskickat' && skickat_datum) {
  visa "Skickat {datum}"
} else if (pipeline_status === 'tilldelning' && tilldelning_datum) {
  visa "Beslut {datum}"
} else if (deadline) {
  visa deadline
}
```

### Spec-bug, nionde lager: Hela sektioner kan vara fundamentalt fel (2 maj 2026)

I Steg 3D antog specen att GranskningSida hade en GO/NO-GO/VILLKORLIG-
badge med Phosphor CheckCircle/XCircle/Warning. Live hade INGEN sådan
sektion — komponenten använder `bedömningsVisning(anbudsläge)` från
`lib/verdict.ts` (samma helper som ProjektDetaljHeader) för att visa
en stor anbudsläge-kort med 64px procent-cirkel och visning.label
("Starkt läge" / "Bra läge" / "Osäkert läge" / "Svårt läge").

Specen var inte bara fel om färger eller tokens — den antog en helt
annan UI-design som inte fanns. Att introducera GO/NO-GO i 3D skulle
ha brutit bedömnings-metaforen som finns på rest-av-appen.

Också: specens "match-procent-trösklar (≥80/60-80/<60)" var irrelevanta
— procent-färgen kommer från anbudsläge, inte trösklar.

**Regel framåt:**

- Innan en designspec skrivs för en EXISTERANDE komponent: läs alltid
  hela live-koden för komponenten, inte bara från minnet eller från
  3A-inventeringen
- För migrations-specer (mörk → ljus utan UX-ändringar): ENBART
  färg-byten — ingen ny struktur, ingen ny logik, ingen ny UI
- Plan mode i Claude Code måste flagga när specen antar struktur som
  inte finns i live, INNAN implementation startar
- "Live ÄR sanningen" gäller också på sektion-nivå, inte bara
  styling-nivå

### Spec-bug, tionde lager: Inline-blocks i page.tsx missas av komponent-fokuserade specer (2 maj 2026)

Steg 3D-specen täckte 4 filer (page.tsx Tab 2-blocket + 3 specialkomponenter)
men missade gating-rutan i Tab 3 (Anbud) som visar "Analysera förfrågan
först" / "Redo att generera anbud" när `!utkast`. Den var inline-renderad
i page.tsx (rad 817-839), inte separat komponent. Efter Steg 3B-3D var
ramen + Tab 1 + Tab 2 ljusa — men Tab 3-gating-rutan var fortfarande
mörk navy. Användaren upptäckte buggen via skärmdump.

Lösning: Op 5.5 lades till mitt i 3D för att migrera gating-rutorna.

**Regel framåt:**

- Strukturella specer som fokuserar på komponenter måste ALLTID scanna
  page.tsx för inline-blocks som visas conditionally
- Vanliga inline-blocks att leta efter: gating-rutor, empty-states,
  loading-states, conditional-renderings inom samma TabsContent
- För detaljvyer med många tabs: lista alla "icke-komponent"-rutor
  per tab i 3A-inventeringen så de inte glöms i 3B-3E

```bash
# Scanna page.tsx för inline-block-mönster:
grep -n 'background:\|border:\|borderRadius:' page.tsx | grep -v 'components/'
```

### Meta-lärdom: Plan mode + visuell verifiering = säkraste flödet (2 maj 2026)

Sju spec-buggar fångade på 2 dagar (1 maj till 2 maj) utan en enda
produktionsincident:

- 6:e lager: Spec-kod är förslag, live ÄR sanningen
- 7:e lager: Stop-checkpoint måste matcha kompilerings-grafen
- 8:e lager: Datum-prioritet måste villkoras med pipeline_status
- 9:e lager: Hela sektioner kan vara fundamentalt fel (GO/NO-GO i GranskningSida)
- 10:e lager: Inline-blocks missas av komponent-fokuserade specer

Mönstret som fungerar:

1. **Plan mode** flaggar avvikelser mellan spec och live INNAN implementation
2. **Stop-checkpoints** mellan operationer låter användaren visuellt verifiera
3. **Skärmdumpar + visuell verifiering** fångar buggar som inte syns i kod-review
4. **Lokal commit + push först efter visuell OK** = ingen produktionsincident
5. **"Live ÄR sanningen"** är inte ett slogan, det är ett verktyg —
   tillämpas på styling, struktur, och sektioner

**Regel framåt:**

- Behåll detta flöde för Steg 3E + 3F + Steg 4
- Fortsätt nummerera lärdomar för att se mönstret över tid
- Vid 15:e lager (om det kommer): överväg om spec-formatet behöver
  fundamental omarbetning, inte bara fler regler

---

## Så använder du denna struktur i Claude Code

```
Jag kör nu [Landing-fil punkt X.Y / Features-fil prompt #N / Profil etapp X]
enligt [docs/PROMPT_landing_v5.md / svebud-nya-funktioner-prompts.md / docs/PROMPT_profil_v1.md].

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
├── CLAUDE.md                            ← befintlig projektkontext
├── docs/                                ← alla aktiva planeringsspecer
│   ├── PROMPT_landing_v6.md             ← designaudit-spec (13 fixar)
│   ├── PROMPT_landing_v7.md             ← migrations-spec mörk→ljus + körinstruktion för v6
│   ├── PROMPT_profil_v1.md              ← Features #11 megaprompt
│   ├── PROMPT_foranmalan_tracker.md     ← Backlog: föranmälan-tracker
│   └── PROMPT_rot_kalkyl.md             ← Backlog: ROT-avdragskalkyl
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
│   ├── landing.html                     ← LJUS DESIGN LIVE (1 maj v6+v7)
│   ├── favicon.svg                      ← NY (1 maj v7)
│   └── images/                          ← 5 JPG-filer
├── mockups/
│   ├── 1_landing.html
│   ├── 2_dashboard.html
│   ├── 3_projekt_detalj.html
│   └── 4_profil.html                    ← Skapas under Features #11 etapp A
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

*Senast uppdaterad: 2 maj 2026 (kväll) — App-redesign Steg 3B → 3D LIVE på svebud.se. Uppdatera denna fil efter varje slutförd sprint.*
