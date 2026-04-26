# SveBud — ROADMAP

**Syfte:** Detta är indexfilen för SveBuds fortsatta utveckling. Den binder ihop två specifikationer — en för landningssidan och en för produktfeatures — och ger den konsoliderade prioriteringsordningen över båda.

**Öppna denna fil först** när du ska bestämma vad som byggs härnäst.

---

## De två spec-filerna

| Fil | Handlar om | Antal ändringar | Estimerad tid |
|-----|-----------|----------------|---------------|
| `PROMPT_landing_v5.md` | Landningssidan (`public/landing.html`) | 14 punkter fördelat på 3 faser | ~4 veckor elapsed, ~5 dagars faktiskt arbete |
| `svebud-nya-funktioner-prompts.md` | Produktfeatures i appen | 10 prompter fördelat på 4 sprintar | ~8 veckor elapsed, ~15 dagars faktiskt arbete |

De är **medvetet separerade**: landningssida och produktfeatures är olika arbeten med olika testflöden. Landning mäts i konvertering (klick → signup → trial), features mäts i användarbeteende (retention, task completion).

---

## Kritiska beroenden mellan filerna

Det finns tre punkter där filerna överlappar eller blockerar varandra. Läs dessa innan du börjar planera sprintar.

### Beroende 1: PostHog ska upp **före** Landing Fas 2

**Varför:** När landningssidan polish-ändras (Fas 2 i landing-filen) behöver du kunna mäta om ändringarna förbättrar konvertering. Utan PostHog är det blindflyg.

**Praktisk konsekvens:** Features #1 (PostHog) ska implementeras **innan** Landing Fas 2 börjar. Men Landing Fas 1 (trust-fixarna) kan köras först — de är rena redigeringar och behöver inte mätas, de är rätt oavsett.

### Beroende 2: Features #7 "Uppdatera landningssidan" krockar med Landing v5

**Detta är det viktigaste beroendet att förstå.** Features-filens Sprint 3 innehåller en prompt (#7) som uppdaterar landningssidan med nya feature-kort ("Vet vad som vinner", "Följer upp när du glömmer", etc.). Samtidigt har vi `PROMPT_landing_v5.md` som är en helt annan uppsättning landningssida-ändringar.

**Risk:** Om båda körs parallellt skriver Claude Code över varandras ändringar.

**Lösning:**
- Kör hela `PROMPT_landing_v5.md` först (alla tre faser)
- **Sedan** — och bara då — kör Features #7 som LAGER OVANPÅ, inte istället för
- Features #7 ska uppdateras så att dess "Ändring 3" (nya feature-sektionen) läggs in i den redan polishade landning från v5, inte i den ursprungliga

**Ännu viktigare:** Features #7 marknadsför features som kanske inte finns än. Du får inte lägga till feature-kortet "Vet vad som vinner" på landningssidan förrän Win/Loss-systemet (Features #2 + #3) är live i produktion. Samma för "Följer upp när du glömmer" → kräver Features #4. Annars lovar sidan saker produkten inte gör.

### Beroende 3: Features #9 "Prisförslag historik" kräver Win/Loss-data

Features-filen säger detta explicit, men det är värt att upprepa: #9 fungerar inte utan att #2 och #3 är igång och att användaren markerat minst 3–5 anbud som vunna/förlorade. Detta betyder #9 realistiskt kan gå live först 4–6 veckor efter #2, inte direkt efter.

---

## Konsoliderad prioritetsordning

Här är planen över båda filerna, vecka för vecka. Siffrorna i hakparenteser pekar på originalfilen så du kan slå upp detaljer.

### Vecka 1 — Trust först, mätning parallellt

| Arbete | Fil | Tid |
|--------|-----|-----|
| Ta bort påhittade logotyper | Landing [1.1] | 30 min |
| Ta bort "4,9/5 utan källa" | Landing [1.2] | 15 min |
| Fixa statistiksiffror (38%, "3 dgr") | Landing [1.3] | 30 min |
| Fixa "⚡ ANALYS"-taggen i hero | Landing [1.4] | 15 min |
| Ta bort/fixa demo-video-sektionen | Landing [1.5] | 30 min – 1 dag |
| PostHog-integration | Features [#1] | 4 timmar |

**Total:** ~2 dagar. **Utfall:** Inga oärliga element kvar. Mätning på plats.

### Vecka 2 — Win/Loss-grunden + landing-polish

| Arbete | Fil | Tid |
|--------|-----|-----|
| Win/Loss UI (vunnet/förlorat-knappar) | Features [#2] | 1 dag |
| Win/Loss Dashboard (`/statistik`) | Features [#3] | 1–2 dagar |
| Primärknapp standardiseras | Landing [2.1] | 1 timme |
| Logotyp konsolideras | Landing [2.2] | 2 timmar |
| Byt ut AI-genererade feature-ikoner | Landing [2.3] | 2 timmar |

**Total:** ~3 dagar. **Utfall:** Win/Loss-systemet börjar samla data. Landning ser polerad ut.

### Vecka 3 — Copy-mjukning och FAQ

| Arbete | Fil | Tid |
|--------|-----|-----|
| Tre copy-mjukningar (steg 1, kvalitetsgranskning, snabboffert) | Landing [2.4] | 2 timmar |
| FAQ utökas med 4 kritiska frågor | Landing [2.5] | 1 timme |
| Justera tidsberäkningar i jämförelsetabellen | Landing [3.4] | 30 min |
| Uppföljnings-notifikation på dashboard | Features [#4] | 1–2 dagar |

**Total:** ~2 dagar. **Utfall:** Landningssida helt i mål. Uppföljning börjar hjälpa användare.

### Vecka 4 — Strukturella tillägg på landning

| Arbete | Fil | Tid |
|--------|-----|-----|
| Om oss-sida | Landing [3.1] | 1 dag |
| Trial-längd → 30 dagar från första uppladdning | Landing [3.3] | 4 timmar |
| Beta-ansökningsformulär | Landing [3.2] | 1 dag |
| Email-kanal (Resend Inbound) | Features [#5] | 2 dagar |

**Total:** ~4 dagar. **Utfall:** Landning komplett. Email-kanalen öppen.

### Vecka 5–6 — Infrastruktur

| Arbete | Fil | Tid |
|--------|-----|-----|
| Firecrawl-scrapers (om ej körda) | Features [#6] | 1 dag |
| Verifiera 1–2 veckors Win/Loss-data | — | Kontinuerligt |

**Total:** Lugnare vecka. Samla data från vecka 1–4. Intervjua betakunder.

### Vecka 7–8 — Integration + marknadsföring av nya features

| Arbete | Fil | Tid |
|--------|-----|-----|
| Uppdatera landning med nya feature-kort (**ENBART för features som är live**) | Features [#7] | 1 dag |
| SEO-landningssidor (4 st) | Features [#8] | 2–3 dagar |
| Prisförslag baserat på historik | Features [#9] | 1–2 dagar |

**Total:** ~1 vecka. **Kritiskt:** Features #7 får bara marknadsföra det som fungerar. Kolla av mot faktisk produkt innan copy läggs på sidan.

### Vecka 9+ — Tillväxt

| Arbete | Fil | Tid |
|--------|-----|-----|
| Referral-program | Features [#10] | 2–3 dagar |

---

## Vad som inte är med i denna roadmap

Följande är **medvetet utanför** de här två filerna och ska inte blandas in:

- **Bas+ mellanvariant (890 kr/mån)** — rekommenderas uppskjuten tills minst 3 beta-kunder explicit frågar efter den (se landing-fil sektion "DETTA SKA INTE BYGGAS NU")
- **Tre demo-val** på landningssidan — ersatt med enkel textrad, inte produktförändring
- **ÄTA-modul, tilldelning-kolumn med ÄTA, nätbolagsintegration, Fortnox-integration** — hör hemma i separat produkt-roadmap, inte landningssida-arbete
- **Demo-video** — behåll borttagen tills video är helt produktionsklar

---

## Så använder du denna struktur i Claude Code

När du ska köra en specifik punkt, håll dig på samma nivå. Till exempel:

```
Jag kör nu Landing-fil punkt 1.1 (ta bort påhittade logotyper)
enligt PROMPT_landing_v5.md.

[Klistra in punkt 1.1]

Kör Plan mode först.
```

Eller:

```
Jag kör nu Features-fil prompt #2 (Win/Loss UI)
enligt svebud-nya-funktioner-prompts.md.

[Klistra in hela prompt #2]

Kör Plan mode först.
```

**Kör aldrig två prompter parallellt som rör samma fil** — landing-punkterna rör `public/landing.html`, vilket betyder att du kör dem sekventiellt även om de är oberoende i teorin. Samma för features som rör samma tabeller (t.ex. #2 och #3 både rör `projekt`-tabellen).

---

## Valideringsflöde (gäller båda filerna)

Innan varje sprint-avslut:

1. **Kör `npm run build`** — inga TypeScript-fel.
2. **Testa flödet end-to-end** — inte bara att det kompilerar.
3. **Kolla mot acceptanskriterierna** i originalfilen — inte minnesbaserat.
4. **PostHog-check** (från och med vecka 2): loggas rätt events?
5. **Kvalitetsgate: "vän-check"** — visa sidan/featuren för någon utanför projektet. Vad minns de efter 60 sekunder?

---

## Snabbreferens — filstruktur

```
SveBud/
├── ROADMAP.md                           ← du är här (öppna först)
├── PROMPT_landing_v5.md                 ← detaljspec landningssida
├── svebud-nya-funktioner-prompts.md     ← detaljspec produktfeatures
├── CLAUDE.md                            ← befintlig projektkontext
├── public/
│   ├── landing.html                     ← målfil för landing-spec
│   └── images/                          ← 5 JPG-filer från senaste sessionen
└── supabase/
    └── migrations/
        └── 00X_*.sql                    ← nya migrationer per prompt
```

---

## Sist men viktigt — fokusdisciplin

Den här roadmapen är ~9 veckors arbete om allt går utan friktion. I verkligheten kommer det ta 12–14 veckor. Det är OK.

Det som **inte är OK** är att:
- Hoppa över Fas 1 på landningssidan ("trust-fixarna kan vi göra senare")
- Köra Landing Fas 2 innan PostHog är på plats
- Lansera Features #7 innan features #2, #3 och #4 är i produktion
- Skriva upp nya features i ROADMAP som inte är validerade av kundintervjuer

Om någon av de här frestelserna uppstår — stanna, öppna denna fil, påminn dig om varför ordningen är som den är.

---

*Dokumenterat: april 2026.
Uppdatera denna ROADMAP efter varje slutförd sprint — stryk klara punkter, lägg till nya insikter.
Denna fil är levande, spec-filerna är stabila.*
