# PROMPT — Landningssida uppdatering v5.1

**Baserat på:** svebud_uppdateringar_v2.md (828 rader, ~80 acceptanskriterier)
**Konsoliderat till:** 3 faser, ~20 konkreta ändringar, tydlig pushback på det som ska skjutas upp
**Format:** Klar att läggas i Claude Code som spec
**Målfil:** `public/landing.html` (i denna iteration verifierad mot `svebud-landing-ljus_preview_1.html`)

**Vad som är nytt i v5.1:**
- Fas 1 verifierad mot faktisk filinnehåll — exakta strängar, CSS-klasser och HTML-strukturer
- Casing-fix: `Används av elfirmor` (inte `ANVÄNDS AV...`), `⚡ Analys` (inte `⚡ ANALYS`)
- "40 sid"-fotnot borttagen från Fas 1 (ändringen var marginell, gör den hellre i Fas 2 om alls)
- Fas 2 och Fas 3 är ännu inte verifierade mot faktisk fil — gör det innan körning

---

## Övergripande princip

Sidans copy och bildspråk är starka. Problemet är 4–5 små oärliga element som undergräver allt annat. Fas 1 fixar dessa innan något annat rörs. Fas 2 städar design-inkonsekvenser. Fas 3 lägger till nya strukturer. Ingenting tempo-drivet ska byggas innan trust-fixarna är klara.

---

## FAS 1 — Trust-fixar (rent redigeringsarbete, ingen kod)

**Mål:** Inga oärliga element kvar på sidan. Körs direkt denna vecka.

> **Exakt målfil verifierad:** `public/landing.html` (motsvarande den uppladdade `svebud-landing-ljus_preview_1.html`). Alla strängar och CSS-klasser nedan är hämtade ordagrant från filen — sök på exakt det som står inom citationstecken.

### 1.1 Ta bort påhittade logotyper

**Nuläge:** Sidan har en strip-sektion med åtta påhittade företagsnamn. Sektionen finns mellan hero och pain, och inleds med kommentaren `<!-- STRIP -->`.

**Exakt HTML-struktur som ska bort:**
```html
<!-- STRIP -->
<div id="strip">
  <div class="strip-lbl">Används av elfirmor i hela Sverige</div>
  <div class="ltrack">
    <div class="litem"><div class="lico">⚡</div><span class="lname">Eriksson El AB</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Lindqvist El &amp; Kraft</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">PHel AB</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Svensson Elektro</span></div>
    <!-- ...fler litem... -->
  </div>
</div>
```

**Gör detta:** Ta bort hela `<div id="strip">...</div>`-blocket inklusive HTML-kommentaren `<!-- STRIP -->` ovanför. Ersätt inte med något — bättre tomt än falskt tills riktiga betakunder finns med skriftligt medgivande.

**Sökstrategi för Claude Code:**
- Sök efter `id="strip"` för att lokalisera blocket
- Eller sök efter `class="strip-lbl"` om id-strategin inte hittar
- Verifiera att alla `<div class="litem">` försvinner — det finns minst åtta sådana

**Acceptans:**
- [ ] Inga av strängarna `Eriksson El AB`, `Lindqvist`, `PHel AB`, `Svensson Elektro`, `Nordin`, `Bergström`, `Johansson`, `Magnusson` kvar i filen.
- [ ] CSS-klasserna `.strip-lbl`, `.ltrack`, `.litem`, `.lico`, `.lname` kan vara kvar i `<style>`-blocket — de är döda men gör ingen skada. Bonus om Claude Code rensar dem också.
- [ ] Sektionen ovanför (hero) och nedanför (pain — `<section id="pain">`) hänger ihop visuellt utan glapp.

### 1.2 Ta bort "4,9/5 från betaanvändare"

**Nuläge:** Raden visas i hero, inom `<div class="hero-trust">`, direkt efter `<div class="hero-risk">` (med ✓-raderna "Inget kreditkort", "Klar på 5 min", "Avbryt när som helst").

**Exakt HTML som ska bort:**
```html
<div class="hero-trust">
  <span class="stars">★★★★★</span>
  <span class="trust-txt"><strong>4,9/5 från betaanvändare</strong> · Elfirmor i hela Sverige</span>
</div>
```

**Gör detta:** Ta bort hela `<div class="hero-trust">...</div>`-blocket. Ingen ersättning — ingen star-rating utan namngiven källa får finnas på sidan.

**Sökstrategi:**
- Sök efter `class="hero-trust"` eller strängen `4,9/5 från betaanvändare`
- Spacingen ska kollas — `.hero-risk` ovanför kan behöva mer bottom-margin om hero känns för komprimerat efter borttagningen

**Acceptans:**
- [ ] Strängen `4,9` finns inte kvar någonstans i filen.
- [ ] Strängen `betaanvändare` finns inte kvar.
- [ ] CSS-klasserna `.hero-trust`, `.stars`, `.trust-txt` kan rensas från `<style>`-blocket (valfritt).
- [ ] Hero ser fortfarande balanserat ut.

### 1.3 Fixa felaktiga statistiksiffror

**Nuläge:** I sektionen efter pain finns fyra stora amber-färgade siffror med små grå undertexter. Två av dem är problematiska:

| Siffra | Befintlig undertext | Status |
|--------|---------------------|--------|
| `38%` | `Av anbud återsänds på grund av saknade dokument eller certifikat` | ❌ saknar källa |
| `3 dgr` | `Typisk svarstid vid en BRF-upphandling om elinstallation` | ❌ felaktigt — BRF har 2–4 veckors svarstid |
| `6–8 v.` | (Ellevio föranmälan) | ✅ OK |

**Exakt HTML-mönster (varje siffra):**
```html
<div style="background:var(--white);text-align:center;padding:28px 16px">
  <div style="font-size:40px;font-weight:800;letter-spacing:-.04em;color:var(--amber)">38%</div>
  <div style="font-size:13px;color:var(--t3);margin-top:4px">Av anbud återsänds...</div>
</div>
```

**Gör detta:**

**a) 38%-siffran** — ändra till en av två:
- **Option A (att föredra):** Ta bort hela kortet (det yttersta `<div>` med padding). Anpassa grid-kolumner om nödvändigt.
- **Option B:** Behåll men markera ärligt:
  ```html
  <div style="...color:var(--amber)">~38%</div>
  <div style="...color:var(--t3);margin-top:4px">Anbud återsänds pga saknade dokument (uppskattat från beta-deltagares erfarenhet)</div>
  ```

**b) 3 dgr-siffran** — ändra till `2–4 v.` och uppdatera undertexten:
```html
<div style="...color:var(--amber)">2–4 v.</div>
<div style="...color:var(--t3);margin-top:4px">Typisk svarstid vid en BRF-upphandling om elinstallation</div>
```

**Sökstrategi:**
- Sök efter `>38%<` (med < och > för att undvika false positives)
- Sök efter `>3 dgr<`

**Acceptans:**
- [ ] Strängen `>38%<` finns inte kvar utan att vara markerad som uppskattning, ELLER kortet är borttaget.
- [ ] Strängen `>3 dgr<` finns inte kvar — ersatt med `>2–4 v.<`.
- [ ] Statistik-grid ser fortfarande balanserat ut (2 eller 3 kort, beroende på val ovan).

### 1.4 Hero-mockupens "⚡ Analys"-tagg

**Nuläge:** Hero har en mockup-dashboard med tre rader. Mittersta raden (Hammarby Fastigheter) har en otydlig AI-tagg.

**Exakt HTML att hitta:**
```html
<div class="brow">
  <div class="bdot" style="background:#4A9EFF"></div>
  <span class="bname">Hammarby Fastigheter</span>
  <span class="bval">920K</span>
  <span class="btag tai">⚡ Analys</span>
</div>
```

(`tai` står sannolikt för "tag AI" — färglogik i CSS.)

**Gör detta:** Byt taggens text från `⚡ Analys` till `Kalkyl pågår`. Bevara CSS-klassen `tai` (färgen är OK), bara texten ska ändras.

**Slutresultat på alla tre rader:**
```
BRF Kungsholmen        1,8M   [Starkt läge]   (klass: tgo)
Hammarby Fastigheter   920K   [Kalkyl pågår]  (klass: tai)
BRF Solrosen           380K   [Skickat ✓]     (klass: tsent)
```

**Sökstrategi:**
- Sök efter den exakta strängen `⚡ Analys` (med litet a) — det är ENDA förekomsten i filen
- Säkerställ att inga andra `Analys`-strängar ändras av misstag (t.ex. om "AI-analys" finns någon annanstans)

**Acceptans:**
- [ ] Strängen `⚡ Analys` finns inte längre i filen.
- [ ] `Kalkyl pågår` finns på Hammarby-raden.
- [ ] CSS-klassen `btag tai` är oförändrad (bara texten innanför ändras).

### 1.5 Demo-video-sektionen — bedöm och bestäm

**Nuläge:** `<section id="demo">` innehåller `<div class="video-wrap rv d1" onclick="playDemo()">` med en placeholder-thumbnail. Play-knappen är en CSS-genererad triangel (ingen riktig video).

**Exakt HTML-struktur:**
```html
<section id="demo">
  <p class="rv">Se hur en elfirma tar emot ett BRF-underlag på 40 sidor...</p>
  <div class="video-wrap rv d1" onclick="playDemo()">
    <div class="video-thumb" id="video-thumb">
      <div class="video-badge">Demo · BRF Solbacken · Laddinfrastruktur</div>
      <div class="video-title">Så här ser det ut i praktiken</div>
      <div class="video-sub">Från uppladdning till exporterat anbud</div>
      <div class="play-btn" id="play-btn">
        <div class="play-pulse"></div>
        <div class="play-arrow"></div>
      </div>
    </div>
    <!-- Ersätt med Loom iframe: ... -->
  </div>
</section>
```

**Beslut Claude Code ska fråga användaren om:**

> **Spelar play-knappen en riktig video idag?** Kolla `playDemo()`-funktionen i `<script>`-blocket. Om den bara visar en alert eller är tom — videon finns inte.

**Två vägar:**

**A) Videon finns INTE (vanligaste fallet):**
- Ta bort hela `<section id="demo">...</section>`
- Verifiera att navigation-länken `<a href="#demo">` också tas bort eller pekar på något annat
- En play-knapp som inte spelar något är värre än ingen video alls

**B) Videon finns och fungerar:**
- Behåll sektionen
- Verifiera att ingen kvarvarande "demo"-text ger falska förväntningar

**Acceptans:**
- [ ] Antingen: `<section id="demo">` är borttagen och `href="#demo"` i navigation är borttagen/uppdaterad.
- [ ] Eller: Play-knappen leder till en faktisk, fungerande video (Loom, YouTube etc.).
- [ ] Inga "kommer snart"-platshållare kvar.

---

## FAS 2 — Design-polish och copy-mjukning (nästa vecka)

**Mål:** Rensa ut inkonsekvenser som samlat ger amatörintryck. Inga nya features.

### 2.1 Standardisera primärknappens färg

**Nuläge:** Primär-CTA har olika färg på olika platser:
- Hero: mörk knapp, gul blixt, vit text
- Pricing: gul knapp, mörk text
- Beta: gul knapp, mörk text
- Topnav: mörk knapp, gul blixt, vit text

**Gör detta:** Välj **gul bakgrund + navy text + blixt-ikon** som standard för ALL primär-CTA. Ghost-knapp (navy border + navy text, transparent bakgrund) för sekundär.

**Exempel:**
```
[⚡ Testa gratis]         ← gul bg, navy text (primär överallt)
[Se demo]                 ← ghost, navy border/text (sekundär överallt)
```

**Acceptans:**
- [ ] Alla primär-CTA har identisk färgkombination.
- [ ] Alla sekundär-CTA har identisk färgkombination.
- [ ] Minst 4.5:1 kontrast textfärg mot knappfärg.

### 2.2 Konsolidera logotypen till en variant

**Nuläge:** Minst två varianter av logotypen används på sidan — svart avrundad fyrkant med gul blixt i navbar, annorlunda variant på andra ställen.

**Gör detta:** Välj **navy avrundad fyrkant + gul blixt inuti + "SveBud"-text bredvid**. Navy-bakgrunden harmoniserar med cream/navy/gul-paletten bättre än svart (som läser "tech startup" snarare än "byggt för elfirmor").

**Acceptans:**
- [ ] Samma logotyp-variant används på alla platser (navbar, hero, footer, favicon).
- [ ] Logotypen fungerar skalad för både 32x32 (favicon) och 512x512 (OG-bild).

### 2.3 Byt ut AI-genererade feature-ikonerna

**Nuläge:** Sex feature-kort har ikoner som ser AI-genererade ut (DALL-E-stil, bryter hantverkskänslan).

**Gör detta:** Ersätt alla sex med **Phosphor-ikoner** (filled-variant, 1.5px linjevikt). Phosphor passar cream-paletten varmare än Lucide.

| Feature | Nuvarande ikon | Ny Phosphor-ikon |
|---------|---------------|------------------|
| Automatisk kravanalys | Target/arrow | `list-checks` |
| AI-kalkyl med ROT | Calculator | `receipt` |
| Professionellt anbud | Dokument | `certificate` |
| Föranmälan-tracker | Blixt | `flow-arrow` |
| Kvalitetsgranskning | Hand + penna | `magnifying-glass-plus` |
| Snabboffert | Mobiltelefon | `paper-plane-tilt` |

**Acceptans:**
- [ ] Alla sex feature-ikoner från samma ikon-bibliotek (Phosphor).
- [ ] Samma linjevikt genomgående.
- [ ] Ingen ikon har raster/foto-kvalitet — alla är SVG-vektorer.

### 2.4 Mjuka upp tre copy-formuleringar

#### 2.4a "Du behöver inte läsa igenom det" (steg 1)

**Nuläge:** Juridiskt svagt. Elfirman har slutligt ansvar för anbudet.

**Byt till:**
> "Du slipper grovarbetet — SveBud extraherar alla krav, sammanfattar uppdraget och matchar mot din profil. Du granskar sedan AI:ns analys istället för att läsa 40 sidor från grunden."

#### 2.4b "AI-betyg 1–10" (kvalitetsgranskning)

**Nuläge:** En siffersskala på eget arbete upplevs som kränkande av seniora ägare.

**Byt till tre-stegs-skala:**
```
Granskning före skick · TRYGGHET

Innan du skickar anbudet gör SveBud en sista koll:
• Saknas något certifikat? → Varning.
• Är priset ovanligt lågt eller högt för projekttypen? → Notering.
• Finns oklara formuleringar som kan tolkas fel? → Förslag.

Resultat: Komplett ✓ / Några justeringsförslag / Flera punkter att granska
```

Inget 1–10-betyg.

#### 2.4c "Snabboffert auto-detekterar"

**Nuläge:** Väcker integritetsoro — läser SveBud min inkorg?

**Byt till:**
```
Snabboffert · FÖR INFORMELLA FÖRFRÅGNINGAR

För förfrågningar som inte kräver fullt FU:
• Klistra in text från mejl eller skriv in manuellt
• SveBud skapar en enkelsidig offert med kalkyl
• Bra för villakunder, service-jobb, ROT-arbeten

Vi läser inte din inkorg. Du matar in texten själv när du behöver.
```

**Acceptans (alla 2.4):**
- [ ] Ingen formulering som antyder att användaren inte behöver granska.
- [ ] Ingen sifferbetyg-skala på eget arbete.
- [ ] Snabboffert-sektionen adresserar integritetsfrågan explicit.

### 2.5 Utöka FAQ med fyra kritiska frågor

**Nuläge:** 5 frågor synliga.

**Lägg till (och placera i denna ordning):**

1. **"Vem bär ansvaret om AI:n missar ett krav?"** (första eller andra frågan)
   > Du som elfirma har alltid slutligt ansvar för anbudets innehåll. SveBud är ett verktyg som förbereder analys och kalkyl — du granskar och godkänner innan det skickas. AI:n ersätter inte ditt yrkesansvar.

2. **"Kan jag exportera till Fortnox eller Visma?"**
   > PDF-export till anbud fungerar idag. Direkt integration med Fortnox och Visma är planerad för Q3 2026. Tills dess kan du ladda upp vår PDF-faktura-bilaga manuellt.

3. **"Är ni integrerade med foranmalan.nu eller nätbolagen?"**
   > Status uppdateras manuellt i dagens version. Handläggningstider per nätbolag är inbyggda (Vattenfall, E.ON, Ellevio m.fl.). Direktintegration planeras Q3–Q4 2026.

4. **"Hur säger jag upp?"**
   > I appen under Inställningar → Abonnemang. Ingen bindningstid efter första månaden. Din data exporteras på begäran innan kontot stängs.

**Acceptans:**
- [ ] Minst 9 frågor totalt i FAQ.
- [ ] Ansvarsfrågan är första eller andra.
- [ ] Fortnox/Visma och nätbolagsintegration nämnda med ärlig roadmap.

---

## FAS 3 — Strukturella tillägg (veckorna efter)

**Mål:** Fylla ut sidan med det som saknas strategiskt.

### 3.1 Om oss-sida

**Nuläge:** Ingen "Om oss"-länk i navbar. Underligt för en produkt som positionerar sig som "byggt av någon som förstår branschen".

**Gör detta:**
- Lägg till "Om oss" i navbar (mellan "Funktioner" och "Priser").
- Skapa sida `/om-oss` med:
  - Grundarens bild och roll
  - Kort backstory: varför projektet startade
  - Branschkoppling (personlig erfarenhet eller nätverk)
  - Var produkten utvecklas (Sverige, EU-servrar)
  - Kontaktuppgifter utöver e-post (telefon eller LinkedIn)

**Acceptans:**
- [ ] "Om oss" finns i navbar, fungerar på desktop och mobil.
- [ ] Sidan har grundarens bild, roll, branschkoppling.
- [ ] Minst en kontaktkanal utöver e-post.

### 3.2 Beta-ansökningsformulär

**Nuläge:** "Ansök om beta-plats →"-knapp leder ingenstans eller till trasig sida.

**Gör detta:** Bygg fungerande formulär med dessa fält:
- Namn
- Företag + org.nr
- Antal anställda
- Geografi (Stockholm / Göteborg / Malmö / Uppsala / Övrigt)
- Primär jobbtyp (BRF / Industri / Villa / Kommersiell / Blandat)
- Antal anbud per månad idag
- Fritext: "Berätta kort om din anbudsprocess idag"
- Samtycke till beta-villkor (GDPR + tidig-produkt-risk)

Skicka bekräftelsemejl automatiskt. Löfte: "Svar inom 48 timmar."

**Om du inte hinner bygga formuläret nu:** ta bort knappen från landningssidan. Ett trasigt formulär är sämre än ingen knapp.

**Acceptans:**
- [ ] Formuläret sparar data i Supabase.
- [ ] Bekräftelsemejl via Resend fungerar.
- [ ] "Svar inom 48 h"-löftet hålls (internt arbetsflöde).

### 3.3 Trial-längd: 30 dagar från första uppladdning

**Nuläge:** 14 dagar från registrering.

**Gör detta:**
- Byt "14 dagar" mot "30 dagar" på landning, pricing, FAQ.
- Trial startar vid första uppladdat FU, inte vid registrering.
- Lägg till faktaruta som förklarar: "I elbranschen kan det ta 1–2 veckor innan rätt förfrågan kommer in. Din trial räknas från första uppladdning — inte från när du skapar kontot."

**Acceptans:**
- [ ] "14 dagar" är borta från alla landningsside-ytor.
- [ ] Backend räknar trial från första uppladdning.
- [ ] Fakta-rutan finns synlig bredvid CTA.

### 3.4 Justera tidsberäkningarna i jämförelsetabellen

**Nuläge:**
| Moment | Utan | Med |
|--------|------|-----|
| Läsa underlag (40 sid) | 2–3 tim | 60 sek |
| Kontrollera krav | 30 min | 10 sek |
| Kalkylera i Excel | 3–5 tim | 20 min |
| Skriva anbud i Word | 2–3 tim | **2 min** ← optimistiskt |
| Samla certifikat | 45 min | **0 sek** ← antar redan uppladdat |
| **Total** | **~11 tim** | **~45 min** |

**Gör detta:** Justera till trovärdiga siffror:

| Moment | Utan | Med |
|--------|------|-----|
| Läsa underlag (40 sid) | 3–4 tim | 60 sek |
| Kontrollera krav mot profil | 30 min | 10 sek |
| Kalkylera + justera | 3–5 tim | 20 min |
| Skriva + granska anbud | 2–3 tim | 15 min |
| Samla certifikat (efter uppsättning) | 45 min | 0 sek |
| Föranmälan | 30 min | 5 min |
| **Total** | **~12 tim** | **~45 min** |

Lägg till fotnot:
> "Första uppsättning av företagsprofil + certifikat tar ~60 min. Därefter sparas tiden på varje anbud."

**Acceptans:**
- [ ] "Skriva anbud 2 min" borttaget, ersatt med realistisk siffra.
- [ ] Föranmälan-rad finns i tabellen.
- [ ] Fotnot om första-uppsättning-tid.

---

## DETTA SKA INTE BYGGAS NU

Följande förslag från v2 skjuter vi upp medvetet:

### Bas+ mellanvariant (890 kr/mån)

**Varför inte:** Fyra prisplaner är krångligare än tre. Det finns inget bevis för att kunder efterfrågar denna prispunkt — det är spekulation. Tre planer konverterar bättre än fyra.

**När ta tillbaka:** Efter minst 5 beta-kundintervjuer där åtminstone 3 explicit säger "jag skulle betala X men inte Y".

### Tre demo-val (BRF / Industri / Villa)

**Varför inte:** Stor produktförändring för marginell vinst. Risken är att ingen av de tre demos är särskilt bra istället för att en är utmärkt.

**Enklare fix istället:** Behåll ett demo-exempel men byt "Bostadsrätterna Solbacken" mot något mer generiskt och lägg till textrad: "Samma logik gäller för BRF, industri, villa och kommersiell fastighet."

### Torsdag kväll-scenariot till egen sektion

**Varför inte:** Scenariot är starkt där det är nu. Att göra det till egen sektion riskerar att fördröja läsaren från att komma till funktionerna.

**Istället:** Behåll placeringen. Mät scroll-djup och uppehållstid. Flytta bara om data säger att användare fastnar där.

### Demo-video produceras

**Varför inte:** En halvfärdig video är sämre än ingen video. Att producera en professionell video tar 2–3 veckors heltid — det är inte ett landningsside-fix.

**Istället:** Ta bort sektionen (se 1.5) tills video är helt klar.

### ÄTA-modul, tilldelning-kolumn, nätbolagsintegration, Fortnox-integration

**Varför inte här:** Dessa är funktionsutökningar i produkten, inte landningsside-fixar. De hör hemma i en separat produkt-roadmap och ska inte blandas in i detta uppdateringspaket.

---

## Prioriteringsordning (ersätter v2 sektion 11)

| Fas | Tid | Innehåll | Pris |
|-----|-----|----------|------|
| Fas 1 | Denna vecka | 1.1 → 1.5 (fem trust-fixar) | Rent copy/config-arbete, ingen ny kod |
| Fas 2 | Nästa vecka | 2.1 → 2.5 (design-polish + FAQ) | 1 dag Claude Code |
| Fas 3 | Veckorna efter | 3.1 → 3.4 (strukturella tillägg) | 2–3 dagar Claude Code |

**Total tid till landningssida v5 komplett:** ~3 veckor om Fas 1 görs direkt.

---

## Valideringsflöde (behåll från v2 sektion 12)

För varje ändring:
1. Verifiera mot acceptanskriterier innan kod.
2. Visuella förändringar: be Claude Code ge HTML-mockup först, implementera sedan.
3. Copy-förändringar: stäm av ton mot torsdag kväll-scenariot — samma varma röst?
4. Färgförändringar: testa mot WCAG AA (4.5:1 på brödtext, 3:1 på stor text).
5. Efter varje fas: visa sidan för någon utanför projektet. Vad minns de efter 60 sekunder?

---

## Bilaga — Prompt-mall för Claude Code

När du kör en enskild ändring från denna fil, använd denna struktur:

```
Jag vill uppdatera landningssidan enligt PROMPT_landing_v5.md, 
specifikt punkt [X.Y].

Nuläge: [kopiera "Nuläge"-texten]
Gör detta: [kopiera "Gör detta"-texten]
Acceptanskriterier: [kopiera listan]

Kör Plan mode först. Visa ändringen innan du implementerar.
Målfil: public/landing.html
```

---

*Dokumentet är en konsoliderad och prioriterad version av svebud_uppdateringar_v2.md. 
Den hoppar medvetet över 30+ punkter som antingen (a) ingår i produkt-roadmap snarare 
än landningssida, (b) är spekulation utan kundbevis, eller (c) skulle förlänga sidan 
utan konverteringsvinst. Följ fas-ordningen — Fas 1 innan Fas 2, Fas 2 innan Fas 3.*
