# PROMPT_landing_v7.md

## Migrera landningssidan: mörk → ljus + alla audit-fixar

**Datum:** 1 maj 2026
**Källa:** `mockups/svebud-landing-ljus_5.html` (lokal fil i `~/Downloads/` eller motsvarande)
**Mål:** `public/landing.html` (ersätt helt)
**Estimerad tid:** 4–5 timmar Claude Code-arbete
**Status:** Redo att köras (Plan mode först)

> **Varför v7 istället för v6?** v6 städade fel sida — `public/landing.html` är fortfarande den gamla mörka designen, inte den ljusa mockupen vi auditerade. v7 är den ärliga migreringen. v6 commit 1 (logotyp + favicon på mörk live) är redan pushad och behöver inte rullas tillbaka — favicon-filen överlever filersättningen, logotyp-CSS:en försvinner naturligt när vi byter fil.

---

## Designprincip (förankras i CLAUDE.md)

**SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår elinstallation. AI är medlet — inte budskapet, inte identiteten.**

Praktiska konsekvenser:

- Ingen blixt-emoji som identitetsbärare (varken i logotyp eller CTA-knappar)
- Inga AI-buzzwords i feature-badges ("Imponerar", "AI-driven", "Smart")
- Riktiga branschfakta med källhänvisning, ej påhittad social proof
- Phosphor Bold som enda ikon-system

---

## Översikt — 3 commits

| # | Commit | Tid | Innehåll |
|---|--------|-----|----------|
| 1 | feat(landing): migrera till ljus design v7 | 1 tim | Filersättning + Inter-font + logotyp-byte (B2 wordmark) + favicon-länk |
| 2 | feat(landing): applicera audit-fixar på ny ljus | 3 tim | Kör PROMPT_landing_v6.md mot den nya filen — alla 13 audit-fixar |
| 3 | docs: Designprinciper i CLAUDE.md | 5 min | Tillägg av designprincip-sektion (samma som v6 commit 3) |

---

## Före du börjar — Plan mode

Klistra in i Claude Code:

```
Läs docs/PROMPT_landing_v7.md.

Detta är en migrations-spec. Den har 3 commits:
- Commit 1: Filersättning + logotyp (detaljerade operationer i denna fil)
- Commit 2: Återanvänd PROMPT_landing_v6.md mot den nya filen
- Commit 3: CLAUDE.md-tillägg

Kör Plan mode för Commit 1 först. När jag godkänt och commit 1
är pushad, läs PROMPT_landing_v6.md och kör Plan mode för den.
Vänta på godkännande mellan varje commit.

OBS: Mockupen ligger i ~/Downloads/svebud-landing-ljus_5.html
(eller fråga användaren om annan plats). Den har 5 base64-bilder
inbäddade — totalstorlek ~1.4 MB. Detta är medvetet och OK.
```

---

## Commit 1 — Filersättning + logotyp + favicon

### Operation 1.1 — Hitta källfilen

Mockupen finns lokalt på Dagnielos dator. Vanlig plats:

```bash
~/Downloads/svebud-landing-ljus_5.html
```

Om den inte är där, fråga var den ligger. **Verifiera storlek innan kopiering** — den ska vara ~1.4 MB (5 base64-bilder inbäddade):

```bash
ls -lh ~/Downloads/svebud-landing-ljus_5.html
```

Om den är mindre än 100 KB är det fel fil — bilderna är inte med.

### Operation 1.2 — Ersätt public/landing.html

```bash
cp ~/Downloads/svebud-landing-ljus_5.html public/landing.html
```

**Verifiera:**
```bash
wc -l public/landing.html        # ska visa ~1027 rader
grep -c "data:image" public/landing.html   # ska visa 5 (5 inbäddade bilder)
```

### Operation 1.3 — Lägg till Inter-font-import

I den nya filen, hitta `<link href="https://fonts.googleapis.com/...">`-raden i `<head>` och uppdatera den.

**Hitta detta exakt:**

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
```

(Detta är troligen redan så — Inter är troligen redan importerad i mockupen. Verifiera att raden ser ut som ovan, eller anpassa.)

Om Inter saknas, ändra raden så att den inkluderar `Inter:wght@400;500;600;700;800`.

### Operation 1.4 — Lägg till favicon-länk

Favicon-filen `public/favicon.svg` skapades i v6 commit 1 och finns redan i repot. Vi behöver bara länka den.

**Hitta detta exakt** (efter Google Fonts-länken):

```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css">
```

(Eller motsvarande Phosphor-länk om version skiljer sig.)

**Lägg till efter den:**

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
```

Om Phosphor-länken inte finns alls, lägg till båda.

### Operation 1.5 — Logotyp-CSS (B2 wordmark)

**Hitta detta exakt:**

```css
.nlogo{display:flex;align-items:center;gap:9px;text-decoration:none}
.nbolt{width:32px;height:32px;background:var(--navy);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.nname{font-size:20px;font-weight:800;color:var(--navy);letter-spacing:-.03em}
.nname span{color:var(--amber)}
```

**Ersätt med:**

```css
.nlogo{display:flex;align-items:baseline;text-decoration:none}
.nname{font-family:'Inter',sans-serif;font-size:22px;font-weight:800;color:var(--navy);letter-spacing:-.035em;display:inline-flex;align-items:baseline}
.nname span:not(.nname-dot){color:var(--amber)}
.nname-dot{display:inline-block;width:5px;height:5px;background:var(--amber);border-radius:50%;margin-left:1px}
```

### Operation 1.6 — Logotyp-HTML i nav

**Hitta detta exakt:**

```html
    <a href="#" class="nlogo">
      <div class="nbolt">⚡</div>
      <span class="nname">Sve<span>Bud</span></span>
    </a>
```

**Ersätt med:**

```html
    <a href="#" class="nlogo">
      <span class="nname">Sve<span>Bud</span><span class="nname-dot"></span></span>
    </a>
```

### Operation 1.7 — Logotyp-HTML i footer

**Hitta detta exakt:**

```html
        <div style="display:flex;align-items:center;gap:9px">
          <div style="width:28px;height:28px;background:var(--amber);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px">⚡</div>
          <span style="font-size:20px;font-weight:800;color:rgba(255,255,255,.85);letter-spacing:-.03em">Sve<span style="color:var(--amber)">Bud</span></span>
        </div>
```

**Ersätt med:**

```html
        <a href="#" class="nlogo footer-logo">
          <span class="nname sm">Sve<span>Bud</span><span class="nname-dot"></span></span>
        </a>
```

**Lägg till CSS** (i samma block som `.nname`):

```css
.nname.sm{font-size:18px;color:rgba(255,255,255,.85);font-family:'Inter',sans-serif;font-weight:800;letter-spacing:-.035em}
.nname.sm span:not(.nname-dot){color:var(--amber)}
.nname.sm .nname-dot{width:4px;height:4px}
.footer-logo{display:inline-flex;text-decoration:none}
```

### Verifiering Commit 1

```bash
npm run build                                       # 0 fel
grep -c "nbolt" public/landing.html                 # 0 (helt borttaget)
grep -c "⚡" public/landing.html                     # antal — noteras (städas i commit 2)
grep -c "Inter:" public/landing.html                # 1 (font-import)
grep -c "favicon.svg" public/landing.html           # 1 (favicon-länk)
grep -c "data:image" public/landing.html            # 5 (bilder inbäddade)
ls public/favicon.svg                               # finns kvar från v6 commit 1
```

**Visuell smoke-test (öppna `public/landing.html` lokalt):**

- Sidan är **ljus** — vit/cream bakgrund, mörk text
- Nav visar "SveBud." utan blixt-ruta — Inter font, prick efter Bud
- Hero har Midjourney-foton (de 5 base64-bilderna ska synas)
- Hero-typografi i Cormorant Garamond fortfarande (hero-rubriker — vi rör dem inte i v7)
- Pricing-sektion finns, FAQ finns, footer finns
- Favicon i webbläsarflik visar amber prick på navy

**OBS:** Sidan kommer ha kvar fake-rating "4,9/5", påhittade firmnamn-strip, beta-program-section, blixt i CTA, etc. Det är förväntat — de städas i commit 2.

### Commit-meddelande

```
feat(landing): migrera till ljus design v7 (ersätter mörk)

Byter ut public/landing.html med innehåll från
mockups/svebud-landing-ljus_5.html. Detta är hela design-
migreringen mörk → ljus i ett svep.

Innehåller också logotyp-bytet (B2 wordmark, Inter-font, prick
efter Bud) som tidigare gjordes på den mörka sidan i v6 commit 1.
Den mörka logotyp-CSS:en försvann naturligt med filersättningen.

Den nya sidan har kvar audit-flaggade element (4,9/5, fake-firm-
strip, beta-program, blixt i CTA, etc) — dessa städas i kommande
commit 2 enligt PROMPT_landing_v6.md.

Spec: docs/PROMPT_landing_v7.md (Commit 1)
```

---

## Commit 2 — Audit-fixar (kör v6-specen)

Nu när `public/landing.html` har samma struktur som mockupen v6 var skriven mot, fungerar v6-specens str_replace-operationer som de var tänkta att göra från början.

### Hur du kör Commit 2

Klistra in i Claude Code:

```
Läs docs/PROMPT_landing_v6.md.

Kör Plan mode. Listan kommer nu skilja sig från förra körningen
— de flesta steg som var NO-OP är nu NEW WORK eftersom vi har
bytt från mörk till ljus.

Notera: Steg 2.4 (favicon) och Steg 1 (Phosphor CDN) är troligen
redan gjorda från v7 commit 1 — markera som NO-OP. Övriga steg
körs.

Använd samma beslut som tidigare:
- Statistik-strip: ENDAST 1 kort (15% Skatteverket) — övriga
  3 har overifierad/påhittad data
- Inter-font för wordmark (redan gjort i commit 1, men eventuella
  CSS-överföringar till v6:s logotyp-block ska anpassas)
- Beta-program-section: ta bort helt
- Footer Bransch-länkar: disabled-styling med tooltip

Vänta på godkännande av planen innan redigering.
```

### Förväntade NEW WORK-steg från v6-specen efter migreringen

| v6-steg | Status efter v7 commit 1 |
|---------|--------------------------|
| 1 — Phosphor CDN | NO-OP (redan i mockupen) eller NEW WORK om saknas |
| 2 — Logotyp | NO-OP (gjort i v7 commit 1) |
| 3.1 — Fake rating | **NEW WORK** |
| 3.2 — Hero mockup-tagg | **NEW WORK** |
| 4 — Strip → stats | **NEW WORK** |
| 5 — Pain & Features Phosphor | **NEW WORK** (mockupen har emojis) |
| 6 — Feature-badges | **NEW WORK** |
| 7 — Compare inline | **NEW WORK** |
| 8 — Beta-program | **NEW WORK** |
| 9 — Branschfakta "3 dgr" | **NEW WORK** |
| 10.1 — Pricing alert | **NEW WORK** |
| 10.2 — Blixt i CTA | **NEW WORK** |
| 10.3 — Footer Bransch | **NEW WORK** (kontrollera om Bransch-block finns i mockupen) |

Cirka 11 av 13 steg är nu NEW WORK. Det är arbetet vi sparade genom att inte skriva v6 från början mot mörk.

### Commit-meddelande

```
feat(landing): applicera audit-fixar på ny ljus design (v7 commit 2)

Kör PROMPT_landing_v6.md mot den migrerade ljusa landningssidan.
Alla 13 audit-beslut applicerade enligt designauditen 1 maj.

- Tar bort fake "4,9/5"-rating (Landing 1.2-fix, nu replikerad)
- Tar bort fake elfirma-strip (16 påhittade firmnamn)
- Lägger till statistik-strip med 1 verifierat kort (15% Grön
  teknik, källa Skatteverket)
- Phosphor Bold på alla pain + features-ikoner (9 totalt)
- Feature-badges → konkreta löften (PDF + Word, ROT + grön
  teknik, Pro-feature, Inkluderat)
- Compare inline-stilar → komponentklasser (.cmp-card)
- Beta-program-section borttagen
- "3 dgr" → "2-4 v." i branschfakta + källhänvisningar
- Pricing-alert → riktiga signup-länkar
- Blixt-emoji bort från alla CTA-knappar
- Footer Bransch-länkar disabled tills SEO-sidor finns

Spec: docs/PROMPT_landing_v6.md (alla 10 steg)
Spec: docs/PROMPT_landing_v7.md (Commit 2)
```

---

## Commit 3 — Designprinciper i CLAUDE.md

**Operation 3.1** — Lägg till `## Designprinciper`-sektion i `CLAUDE.md`.

Plats: Efter befintlig `## Lärdomar`-sektion (eller om den inte finns — sist i filen). Verifiera vid implementering.

```markdown
---

## Designprinciper

**SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår elinstallation. AI är medlet — inte budskapet, inte identiteten.**

Praktiska konsekvenser:

- Ingen blixt-emoji som identitetsbärare (varken i logotyp eller CTA-knappar)
- Inga AI-buzzwords i feature-badges ("Imponerar", "AI-driven", "Smart")
- Riktiga branschfakta med källhänvisning, ej påhittad social proof
- Phosphor Bold som enda ikon-system (industriell, neutral, professionell)

Källa: PROMPT_landing_v6.md / PROMPT_landing_v7.md, etablerad 1 maj 2026.
```

### Commit-meddelande

```
docs: Designprinciper i CLAUDE.md

Förankrar designprincipen "AI är medlet, inte budskapet" så
framtida Claude Code-sessioner respekterar den utan att den måste
upprepas i varje prompt.

Spec: docs/PROMPT_landing_v6.md (Designprinciper-sektion)
```

---

## Slutgiltig validering

### Bygg- och kompileringskontroll

```bash
npm run build
```

Inga TypeScript- eller HTML-fel.

### Acceptanskriterier — checklista

**Designsystem:**
- [ ] Sidan är ljus (vit/cream bakgrund, mörk text)
- [ ] Logotyp = "SveBud." utan blixt-emoji, prick efter Bud, Inter-font
- [ ] Favicon = amber prick på navy bakgrund
- [ ] Inga emoji-ikoner — Phosphor Bold överallt
- [ ] Inga ⚡-tecken i CTA-knappar

**Trovärdighet:**
- [ ] Inga påhittade firmnamn någonstans
- [ ] Ingen "4,9/5"-rating
- [ ] Statistik har källhänvisning under siffran
- [ ] Beta-program-section borttagen

**Kod-kvalitet:**
- [ ] Inga `alert()` i pricing-knappar
- [ ] Compare-sektionen har klassbaserad markup utan inline-stilar
- [ ] Designprincipen tillagd i CLAUDE.md

**Funktionellt:**
- [ ] Alla 5 Midjourney-bilder syns (base64 inbäddade)
- [ ] PostHog-events fyrar fortfarande
- [ ] Pricing-toggle (månad/år) fungerar
- [ ] FAQ-accordion fungerar
- [ ] Smooth-scroll till sektioner via nav-länkar fungerar

**Källhänvisningar (manuellt verifieras före deploy):**
- [ ] 15% Grön teknik-avdrag → Skatteverket-källa verifierad
- [ ] Övriga statistik-siffror — borttagna eller verifierade

### Vän-check

Visa sidan för någon utanför projektet. Fråga efter 60 sekunder:

- "Vad gör SveBud?"
- "Vem är det för?"
- "Kände du dig manipulerad någonstans?"

Ny version ska kännas ärlig och professionell — inte tech-startup-kosmetik.

---

## Efter denna spec

När v7 är pushad och svebud.se visar ljus design:

1. **Uppdatera `ROADMAP.md`** — flytta Landing-arbetet till "Avklarat", lägg till en ny "Lärdom" om mockup-vs-live-driften (se nedan)
2. **Spela in Loom-demo** på dashboarden — när dashboarden är redesignad (Spår 2)
3. **Påbörja Spår 2** — Dashboard-redesign enligt designspråk etablerat på den nya ljusa landningen

### Ny lärdom till ROADMAP

```markdown
### Spec-bug, femte lager: Mockup ≠ live (1 maj 2026)

När en designspec skrivs ska den verifieras mot den faktiska
filen som ska ändras (`public/landing.html` på `main`), inte
mot mockup-filer som `mockups/svebud-landing-ljus_5.html`.

Mockup-filer driftar och representerar designintention, inte
implementations-verklighet. Två separata HTML-filer kan ha
samma designspråk men helt olika sektioner, klassnamn och copy.

PROMPT_landing_v6 skrevs mot ljus-mockupen. Live var fortfarande
mörk. Resultat: Claude Code rapporterade 13/20 NO-OP eftersom
specens strängar inte fanns i live. v6 commit 1 städade mörk
sida som ändå skulle skrotas. v7 var den ärliga migreringen.

**Regel framåt:** Innan en designspec skrivs:

1. `git show HEAD:public/<fil>.html | head -50` — bekräfta vilken
   version som faktiskt är live
2. Diff:a mot mockupen visuellt
3. Anchora exakta `old_string`-strängar mot live, inte mockup
4. Om migrering behövs: skriv en separat migrations-spec FÖRST,
   sen audit-fixar PÅ den migrerade filen
```

---

## Risker

1. **Mockupen kan ha drift sedan vi auditerade den.** Om Dagnielo har modifierat `svebud-landing-ljus_5.html` lokalt sedan 1 maj morgon, kan delar av specen vara fel. Verifiera mot lokal version innan körning.

2. **Base64-bilder gör commit-storleken stor.** Den initiala commit:en kommer vara ~1.4 MB. Det är OK för en static landing page, men värt att veta att framtida ändringar bör hålla bilderna.

3. **`npm run build` kan klaga på inline-stilar i base64-bilderna.** Om så sker, kontrollera om Next.js har en specifik konfig för stora HTML-filer.

4. **Hero-typografi är fortfarande Cormorant Garamond i mockupen.** Detta är ett medvetet val (editorial kontrast mot Inter-logotypen) — vi gör inget åt det i v7. Om dissonans uppstår, separat designsamtal.

---

*Slut på PROMPT_landing_v7.md. Frågor? Fråga innan du börjar.*
