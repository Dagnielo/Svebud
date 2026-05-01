# PROMPT_landing_v6.md

## Konsoliderad landningssida-uppdatering (v5 → v6)

**Datum:** 1 maj 2026
**Källa:** `svebud-landing-ljus_5.html`
**Mål:** `public/landing.html`
**Estimerad tid:** 4–6 timmar Claude Code-arbete
**Status:** Redo att köras (kör Plan mode först)

> Denna spec konsoliderar 13 designaudit-beslut, en ny logotyp-behandling och en designprincip-förankring. Den ersätter `PROMPT_landing_v5.md` som källa för publicerad v6.

---

## Designprincip att förankra

**SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår elinstallation. AI är medlet — inte budskapet, inte identiteten.**

Praktiska konsekvenser:

- Ingen blixt-emoji som identitetsbärare (varken i logotyp eller CTA-knappar)
- Inga AI-buzzwords i feature-badges ("Imponerar", "AI-driven", "Smart")
- Riktiga branschfakta med källhänvisning, ej påhittad social proof
- Phosphor Bold som enda ikon-system (industriell, neutral, professionell)

**Åtgärd vid sprintstart:** Lägg till denna princip i `CLAUDE.md` under en ny rubrik `## Designprinciper`. Detta gör att framtida Claude Code-sessioner respekterar principen utan att den måste upprepas i varje prompt.

---

## Översikt — 10 sekventiella steg

| # | Område | Tid |
|---|--------|-----|
| 1 | Phosphor Bold CDN (förberedelse) | 5 min |
| 2 | Logotyp-byte (B2 wordmark, blixt bort) | 30 min |
| 3 | Hero — fake rating + dashboard-mockup-tagg | 15 min |
| 4 | Strip — fake-firmnamn ut, statistik-strip in | 1 tim |
| 5 | Pain & Features ikoner → Phosphor Bold | 1 tim |
| 6 | Feature-badges → konkreta löften | 15 min |
| 7 | Compare inline-stilar → komponentklasser | 1 tim |
| 8 | Beta-program-section (ta bort) | 5 min |
| 9 | Branschfakta — siffror + källhänvisningar | 30 min |
| 10 | Pricing-alert ut + CTA-blixt ut + footer-länkar | 30 min |

**Acceptanskriterier för hela specen:** se sista sektionen.

---

## Före du börjar — Plan mode

Klistra in i Claude Code:

```
Läs docs/PROMPT_landing_v6.md. Kör Plan mode först.
Lista alla str_replace-operationer du planerar att göra mot
public/landing.html. Lista också nya filer som ska skapas
(favicon.svg). Vänta på mitt godkännande innan du redigerar.
```

---

## Steg 1 — Phosphor Bold CDN

**Vad:** Lägg till Phosphor Bold-ikoner som CDN-länk. Behövs i Steg 5.

**Hitta `<head>`-blocket** och lägg till efter den befintliga Google Fonts-länken:

```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css">
```

**Verifiera:** Öppna sidan i webbläsare. DevTools Network ska visa `style.css` från `unpkg.com` med status 200.

---

## Steg 2 — Logotyp-byte (B2 wordmark)

**Vad:** Ersätt blixt-rutan `[⚡] SveBud` med ren wordmark `SveBud.` där pricken efter "Bud" är amber.

**Designval:** Variant B2 från designaudit. Pricken på baseline = "ord-mark som påstår något". Fungerar i alla storlekar (favicon, navbar, hero-display) utan att tappa identitet.

### 2.1 — CSS-uppdatering för nav-logotyp

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
.nname span{color:var(--amber)}
.nname-dot{display:inline-block;width:5px;height:5px;background:var(--amber);border-radius:50%;margin-left:1px}
```

### 2.2 — HTML i nav

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

### 2.3 — HTML i footer

Footer-loggan har inline-stilar (rad ~945–948 i v5). Refaktorera till samma klassbaserade markup som nav, men med klassen `.sm` för mindre storlek.

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
.nname.sm{font-size:18px;color:rgba(255,255,255,.85)}
.nname.sm span:not(.nname-dot){color:var(--amber)}
.nname.sm .nname-dot{width:4px;height:4px}
.footer-logo{display:inline-flex}
```

### 2.4 — Favicon

**Skapa ny fil:** `public/favicon.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0E1B2E" rx="6"/>
  <circle cx="16" cy="20" r="3.2" fill="#C8960A"/>
</svg>
```

**Uppdatera `<head>`** — om favicon redan finns, ersätt; annars lägg till:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
```

**Verifiera Steg 2:**

- Nav visar "SveBud." utan blixt-ruta
- "Sve" är navy, "Bud" är amber, prick efter Bud är amber
- Footer-logga ser likadan ut men mindre och med ljus färg på "Sve"
- Favicon i webbläsarflik visar amber prick på navy bakgrund
- Inget `⚡` syns någonstans i nav eller footer

---

## Steg 3 — Hero (fake rating + dashboard-mockup-tagg)

**Vad:** Två separata fixar i hero-sektionen. Båda är ROADMAP-fixar som inte landade i v5-mockupen.

### 3.1 — Ta bort fake rating

**Beslutet:** "4,9/5 från betaanvändare" är osanning eftersom inga betaanvändare har rate:at. ROADMAP 1.2 tog bort detta från live 26 april. Replikera fixen här.

**Hitta detta exakt:**

```html
        <div class="hero-trust">
          <span class="stars">★★★★★</span>
          <span class="trust-txt"><strong>4,9/5 från betaanvändare</strong> · Elfirmor i hela Sverige</span>
        </div>
```

**Ersätt med:**

```html
        <div class="hero-trust">
          <span class="trust-txt">Byggt med svenska elfirmor i pilotgrupp · Stockholm-baserat team</span>
        </div>
```

**CSS-justering** för `.hero-trust` (utan stars):

**Hitta detta exakt:**

```css
.hero-trust{display:flex;align-items:center;gap:10px;margin-top:28px;padding-top:24px;border-top:1px solid var(--border)}
.stars{color:var(--amber);font-size:13px;letter-spacing:2px}
.trust-txt{font-size:13px;color:var(--t4)}
.trust-txt strong{color:var(--t3);font-weight:600}
```

**Ersätt med:**

```css
.hero-trust{margin-top:28px;padding-top:24px;border-top:1px solid var(--border)}
.trust-txt{font-size:13px;color:var(--t4)}
```

### 3.2 — Dashboard-mockup-tagg "⚡ Analys" → "Kalkyl pågår"

**Hitta detta exakt:**

```html
            <div class="brow"><div class="bdot" style="background:#4A9EFF"></div><span class="bname">Hammarby Fastigheter</span><span class="bval">920K</span><span class="btag tai">⚡ Analys</span></div>
```

**Ersätt med:**

```html
            <div class="brow"><div class="bdot" style="background:#4A9EFF"></div><span class="bname">Hammarby Fastigheter</span><span class="bval">920K</span><span class="btag tai">Kalkyl pågår</span></div>
```

**Verifiera Steg 3:**

- Hero visar inte längre "4,9/5"
- Hero visar text om pilotgrupp + Stockholm
- Inga stjärnor (★★★★★) i hero
- Mini-dashboard till höger visar "Kalkyl pågår" på Hammarby-raden

---


## Steg 4 — Strip (fake-firmnamn ut, statistik-strip in)

**Vad:** Ta bort hela strip-sektionen med 16 påhittade elfirmor. Ersätt med en branschstatistik-strip med källhänvisningar.

**Beslut:** "Verifierbar branschauktoritet" istället för "fake social proof". ROADMAP 1.1 tog bort detta från live 26 april. Här ersätts det dessutom med något bättre.

### 4.1 — Ta bort hela strip-blocket

**Hitta detta exakt** (hela `<div id="strip">` blocket från rad ~435 till ~455):

```html
<!-- STRIP -->
<div id="strip">
  <div class="strip-lbl">Används av elfirmor i hela Sverige</div>
  <div class="ltrack">
    <div class="litem"><div class="lico">⚡</div><span class="lname">Eriksson El AB</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Lindqvist El &amp; Kraft</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">PHel AB</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Svensson Elektro</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Nordin El &amp; Installation</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Bergström Elteknik</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Johansson El AB</span></div>
    <div class="litem"><div class="lname">Magnusson Eltjänst</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Eriksson El AB</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Lindqvist El &amp; Kraft</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">PHel AB</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Svensson Elektro</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Nordin El &amp; Installation</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Bergström Elteknik</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Johansson El AB</span></div>
    <div class="litem"><div class="lico">⚡</div><span class="lname">Magnusson Eltjänst</span></div>
  </div>
</div>
```

**Notera:** I v5 finns en typo på en av raderna (`<div class="litem"><div class="lname">Magnusson Eltjänst</span></div>` saknar `<div class="lico">⚡</div>` och slutar med `</span>` istället för `</div>`). Om ovanstående exakta sträng inte hittas av Claude Code — använd istället en manuell sökning från `<!-- STRIP -->` till `</div>` precis innan `<!-- ═══ PAIN ═══ -->`.

**Ersätt med:**

```html
<!-- STATISTIK-STRIP -->
<div id="stats">
  <div class="wrap">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-num">5 200+</div>
        <div class="stat-lbl">Elinstallationsföretag i Sverige</div>
        <div class="stat-src">Källa: Installatörsföretagen, 2024</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">38%</div>
        <div class="stat-lbl">Av anbud återsänds pga saknade dokument</div>
        <div class="stat-src">Källa: branschundersökning 2025</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">6–8 v.</div>
        <div class="stat-lbl">Typisk handläggningstid föranmälan</div>
        <div class="stat-src">Källa: Ellevio kundservice 2025</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">15%</div>
        <div class="stat-lbl">Grön teknik-avdrag på laddbox-installation</div>
        <div class="stat-src">Källa: Skatteverket 2026</div>
      </div>
    </div>
  </div>
</div>
```

### 4.2 — CSS för statistik-strip

**Hitta detta exakt** (CSS för gamla strip):

```css
#strip{padding:20px 0;background:var(--off);border-top:1px solid var(--border);border-bottom:1px solid var(--border);overflow:hidden}
.strip-lbl{text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--t4);margin-bottom:14px}
.ltrack{display:flex;gap:56px;align-items:center;width:max-content;animation:marquee 30s linear infinite}
.ltrack:hover{animation-play-state:paused}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.litem{display:flex;align-items:center;gap:8px;opacity:.45;white-space:nowrap;transition:opacity .2s}
.litem:hover{opacity:.8}
.lico{width:20px;height:20px;background:var(--ag);border:1px solid var(--ab);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--amber)}
.lname{font-size:13px;font-weight:500;color:var(--t2)}
```

**Ersätt med:**

```css
#stats{padding:48px 0;background:var(--off);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.stat-card{padding:20px 16px;text-align:center;border-right:1px solid var(--border)}
.stat-card:last-child{border-right:none}
.stat-num{font-size:32px;font-weight:800;letter-spacing:-.03em;color:var(--amber);line-height:1.1;margin-bottom:8px}
.stat-lbl{font-size:13px;color:var(--t2);line-height:1.5;margin-bottom:6px;font-weight:500}
.stat-src{font-size:11px;color:var(--t4);line-height:1.4;font-style:italic}
@media (max-width:760px){
  .stats-grid{grid-template-columns:1fr 1fr;gap:0}
  .stat-card{border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:16px 12px}
  .stat-card:nth-child(2n){border-right:none}
  .stat-card:nth-last-child(-n+2){border-bottom:none}
}
```

**OBS:** Källhänvisningarna ovan är **placeholders**. Dagnielo: ersätt med faktiska källor du verifierat. Om en källa inte kan verifieras → ta bort den siffran helt hellre än att fejka. Sanning > kvantitet.

**Verifiera Steg 4:**

- Inga elfirma-namn syns någonstans
- Strip-sektionen visar 4 statistik-kort med siffror, beskrivning och källa
- Inget `⚡` i strip-området
- Mobilvy: 2x2 grid

---

## Steg 5 — Pain & Features ikoner → Phosphor Bold

**Vad:** Byt ut emoji-ikoner i pain-cards (📂📋📉) och features-cards (🎯🧮📄⚡✍️📱) mot Phosphor Bold-ikoner.

**Beslut:** Konsekvent ikon-system. ROADMAP 2.3 bytte pain-cards till Phosphor på live, men features-cards fanns ej i scope. Här fixas båda.

### 5.1 — CSS för Phosphor-ikoner

Lägg till i CSS-blocket (efter `.feat-icon` om den finns, annars i ikonrelaterad sektion):

```css
.piico, .feat-icon{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:var(--ag);border:1px solid var(--ab);border-radius:10px;color:var(--amber);font-size:24px;flex-shrink:0}
.piico i, .feat-icon i{font-size:24px}
```

### 5.2 — Pain-cards (3 ikoner)

**Hitta detta exakt:**

```html
          <div class="pi rv">
            <span class="piico">📂</span>
```

**Ersätt med:**

```html
          <div class="pi rv">
            <span class="piico"><i class="ph-bold ph-files"></i></span>
```

**Hitta detta exakt:**

```html
          <div class="pi rv d1">
            <span class="piico">📋</span>
```

**Ersätt med:**

```html
          <div class="pi rv d1">
            <span class="piico"><i class="ph-bold ph-clipboard-text"></i></span>
```

**Hitta detta exakt:**

```html
          <div class="pi rv d2">
            <span class="piico">📉</span>
```

**Ersätt med:**

```html
          <div class="pi rv d2">
            <span class="piico"><i class="ph-bold ph-trend-down"></i></span>
```

### 5.3 — Features-cards (6 ikoner)

| Feature | Gammal emoji | Ny Phosphor-klass |
|---------|--------------|-------------------|
| Automatisk kravanalys | 🎯 | `ph-target` |
| AI-kalkyl med ROT | 🧮 | `ph-calculator` |
| Professionellt anbud | 📄 | `ph-file-text` |
| Föranmälan-tracker | ⚡ | `ph-lightning` |
| Kvalitetsgranskning | ✍️ | `ph-pencil-line` |
| Snabboffert | 📱 | `ph-device-mobile` |

**OBS:** `ph-lightning` är OK här — det är en **ikon-representation** av ett konkret koncept (föranmälan/elnät), inte en identitetsbärande blixt. Designprincipen säger "ingen blixt som identitet" — i ikonsammanhang för elnät är det rätt visuell metafor.

För varje feature, hitta `<div class="feat-icon">EMOJI</div>` och ersätt med `<div class="feat-icon"><i class="ph-bold ph-NAMN"></i></div>`.

**Exempel** för första:

**Hitta:**
```html
        <div class="feat-icon">🎯</div>
```

**Ersätt med:**
```html
        <div class="feat-icon"><i class="ph-bold ph-target"></i></div>
```

Upprepa för alla 6.

**Verifiera Steg 5:**

- Ingen emoji syns i pain-sektionen
- Ingen emoji syns i features-sektionen
- Phosphor-ikonerna har samma amber-färg som badge-systemet
- Alla 9 ikoner (3 pain + 6 features) renderas korrekt

---


## Steg 6 — Feature-badges → konkreta löften

**Vad:** Byt ut copywriter-badges ("Imponerar", "AI-driven", "Sparar timmar") mot konkreta funktionspåståenden.

**Beslut:** Designprincip — "AI är medlet, inte budskapet". Elektriker läser "Imponerar" och bockar av "marknadsföringsspråk". Konkreta löften ger trovärdighet.

### Mappning

| Feature | Gammal badge | Ny badge |
|---------|--------------|----------|
| Automatisk kravanalys | Automatisk | Inkluderat |
| AI-kalkyl med ROT | Sparar timmar | ROT + grön teknik |
| Professionellt anbud | Imponerar | PDF + Word |
| Föranmälan-tracker | Proaktiv | Pro-feature |
| Kvalitetsgranskning | AI-driven | Inkluderat |
| Snabboffert | Flexibel | Pro-feature |

För varje feature-card, hitta `<span class="feat-badge">GAMMAL</span>` och ersätt med `<span class="feat-badge">NY</span>`.

**Exempel:**

**Hitta:**
```html
        <span class="feat-badge">Imponerar</span>
```

**Ersätt med:**
```html
        <span class="feat-badge">PDF + Word</span>
```

Upprepa för alla 6 badges.

**Verifiera Steg 6:**

- Inga badges innehåller orden "AI", "Smart", "Imponerar", "Sparar timmar", "Proaktiv", "Flexibel", "Automatisk"
- Två features har badge "Pro-feature" (Föranmälan + Snabboffert) — detta signalerar att de är låsta för Bas-tier
- Två features har badge "Inkluderat" (Kravanalys + Kvalitetsgranskning) — alltid med
- Två features har specifika tekniska löften (ROT + grön teknik, PDF + Word)

---

## Steg 7 — Compare inline-stilar → komponentklasser

**Vad:** Refaktorera "Utan SveBud / Med SveBud"-rutorna i compare-sektionen från ~30 rader inline-stilar till två komponentklasser.

**Beslut:** Designsystem-disciplin. Inline-stilar bryter mot underhållbarhet och gör tema-byten omöjliga.

### 7.1 — Lägg till CSS

Lägg till i CSS-blocket (efter `.cmp-grid`-relaterade regler):

```css
.cmp-card{border-radius:10px;padding:16px}
.cmp-card-bad{background:rgba(220,38,38,.04);border:1px solid rgba(220,38,38,.18)}
.cmp-card-good{background:rgba(22,163,74,.04);border:1px solid rgba(22,163,74,.18)}
.cmp-head{font-size:12px;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em}
.cmp-head-bad{color:var(--t4)}
.cmp-head-good{color:var(--green)}
.cmp-list{display:flex;flex-direction:column;gap:7px}
.cmp-row{font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start}
.cmp-mark{flex-shrink:0;margin-top:1px}
.cmp-mark-bad{color:var(--red)}
.cmp-mark-good{color:var(--green)}
```

### 7.2 — HTML-refaktorering

**Hitta detta exakt** (Compare-sektionens "Utan SveBud / Med SveBud"-block, rad ~595–614):

```html
          <div style="background:rgba(220,38,38,.04);border:1px solid rgba(220,38,38,.18);border-radius:10px;padding:16px">
            <div style="font-size:12px;font-weight:600;color:var(--t4);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Utan SveBud</div>
            <div style="display:flex;flex-direction:column;gap:7px">
              <div style="font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--red);flex-shrink:0;margin-top:1px">—</span> Läser igenom hela underlaget på kvällen</div>
              <div style="font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--red);flex-shrink:0;margin-top:1px">—</span> Öppnar förra anbudets Word-fil och börjar byta namn</div>
              <div style="font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--red);flex-shrink:0;margin-top:1px">—</span> Hoppas att inget certifikat saknas</div>
              <div style="font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--red);flex-shrink:0;margin-top:1px">—</span> Skickar fredag — och är osäker på om det håller</div>
            </div>
          </div>
          <div style="background:rgba(22,163,74,.04);border:1px solid rgba(22,163,74,.18);border-radius:10px;padding:16px">
            <div style="font-size:12px;font-weight:600;color:var(--green);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Med SveBud</div>
            <div style="display:flex;flex-direction:column;gap:7px">
              <div style="font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--green);flex-shrink:0;margin-top:1px">✓</span> Laddar upp underlaget — SveBud läser det åt dig</div>
              <div style="font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--green);flex-shrink:0;margin-top:1px">✓</span> Ser direkt vilka krav du uppfyller och vilka som kräver åtgärd</div>
              <div style="font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--green);flex-shrink:0;margin-top:1px">✓</span> Justerar kalkylen på en halvtimme</div>
              <div style="font-size:13px;color:var(--t2);display:flex;gap:8px;align-items:flex-start"><span style="color:var(--green);flex-shrink:0;margin-top:1px">✓</span> Skickar ett professionellt anbud — med god marginal</div>
            </div>
          </div>
```

**Ersätt med:**

```html
          <div class="cmp-card cmp-card-bad">
            <div class="cmp-head cmp-head-bad">Utan SveBud</div>
            <div class="cmp-list">
              <div class="cmp-row"><span class="cmp-mark cmp-mark-bad">—</span> Läser igenom hela underlaget på kvällen</div>
              <div class="cmp-row"><span class="cmp-mark cmp-mark-bad">—</span> Öppnar förra anbudets Word-fil och börjar byta namn</div>
              <div class="cmp-row"><span class="cmp-mark cmp-mark-bad">—</span> Hoppas att inget certifikat saknas</div>
              <div class="cmp-row"><span class="cmp-mark cmp-mark-bad">—</span> Skickar fredag — och är osäker på om det håller</div>
            </div>
          </div>
          <div class="cmp-card cmp-card-good">
            <div class="cmp-head cmp-head-good">Med SveBud</div>
            <div class="cmp-list">
              <div class="cmp-row"><span class="cmp-mark cmp-mark-good">✓</span> Laddar upp underlaget — SveBud läser det åt dig</div>
              <div class="cmp-row"><span class="cmp-mark cmp-mark-good">✓</span> Ser direkt vilka krav du uppfyller och vilka som kräver åtgärd</div>
              <div class="cmp-row"><span class="cmp-mark cmp-mark-good">✓</span> Justerar kalkylen på en halvtimme</div>
              <div class="cmp-row"><span class="cmp-mark cmp-mark-good">✓</span> Skickar ett professionellt anbud — med god marginal</div>
            </div>
          </div>
```

**Verifiera Steg 7:**

- HTML i compare-sektionen har inga `style=`-attribut
- Visuellt identiskt med innan (rödaktig "Utan", grönaktig "Med")
- DevTools Inspector visar `class="cmp-card cmp-card-bad"` i HTML

---

## Steg 8 — Beta-program-section (ta bort)

**Vad:** Ta bort hela mörka beta-program-blocket mellan compare och pricing.

**Beslut:** "Håll designen och websidan ren". Den mörka navy-rutan mitt på en ljus sida är visuellt brus och bryter mot ljust designspråk.

**Hitta detta exakt** (rad ~765–791):

```html
    <!-- Beta-program -->
    <div style="margin-top:72px;background:var(--navy);border-radius:16px;padding:48px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center" class="rv">
```

Detta är öppningstaggen — hitta hela blocket från denna `<div>` till dess matchande `</div>` (det stänger precis innan `<!-- Branschfakta-raden behålls -->`).

**Ta bort hela blocket inklusive HTML-kommentaren `<!-- Beta-program -->`.**

**Verifiera Steg 8:**

- Inga mörka navy-rutor mitt på sidan
- Compare-sektionen följs direkt av branschfakta-raden
- Inget visuellt sömmar — sidan flyter ljust hela vägen

**OBS för senare:** Innehållet om beta-programmet (full Pro-tillgång under beta, direkt kontakt med grundare, reducerat pris vid lansering) är ändå ett bra säljargument. Lägg det i ROADMAP-backlog som "Beta-ansökningsformulär" enligt Landing 3.2 — där hör det hemma.

---

## Steg 9 — Branschfakta — siffror + källhänvisningar

**Vad:** Korrigera felaktig statistik och lägg till källor till alla 4 siffror.

**Beslut:** ROADMAP 1.3 ändrade "3 dgr" till "2-4 v." på live. Replikera. Plus: lägg till källor (samma princip som Steg 4).

### 9.1 — Korrigera "3 dgr" till "2-4 v."

**Hitta detta exakt:**

```html
      <div style="background:var(--white);text-align:center;padding:28px 16px">
        <div style="font-size:40px;font-weight:800;letter-spacing:-.04em;color:var(--amber)">3 dgr</div>
        <div style="font-size:13px;color:var(--t3);margin-top:4px">Typisk svarstid vid en BRF-upphandling om elinstallation</div>
      </div>
```

**Ersätt med:**

```html
      <div class="bf-card">
        <div class="bf-num">2–4 v.</div>
        <div class="bf-lbl">Typisk svarstid vid en BRF-upphandling om elinstallation</div>
        <div class="bf-src">Källa: branschpraxis 2025</div>
      </div>
```

### 9.2 — Refaktorera övriga 3 branschfakta-kort

För varje övrigt kort i branschfakta-raden, byt från inline-stilar till `.bf-card`-klass och lägg till `<div class="bf-src">`-rad. Exempel:

**Hitta:**
```html
      <div style="background:var(--white);text-align:center;padding:28px 16px">
        <div style="font-size:40px;font-weight:800;letter-spacing:-.04em;color:var(--amber)">40 sid.</div>
        <div style="font-size:13px;color:var(--t3);margin-top:4px">Genomsnittligt förfrågningsunderlag för en BRF-upphandling</div>
      </div>
```

**Ersätt med:**
```html
      <div class="bf-card">
        <div class="bf-num">40 sid.</div>
        <div class="bf-lbl">Genomsnittligt förfrågningsunderlag för en BRF-upphandling</div>
        <div class="bf-src">Källa: SveBud branschanalys 2025</div>
      </div>
```

Upprepa för "38%" och "6–8 v."-korten.

### 9.3 — CSS för bf-card

Lägg till:

```css
.bf-card{background:var(--white);text-align:center;padding:28px 16px}
.bf-num{font-size:40px;font-weight:800;letter-spacing:-.04em;color:var(--amber);line-height:1.1}
.bf-lbl{font-size:13px;color:var(--t3);margin-top:8px;line-height:1.5}
.bf-src{font-size:11px;color:var(--t4);margin-top:6px;font-style:italic}
```

**OBS:** Källhänvisningarna här är **placeholders**. Verifiera och korrigera innan deploy. Om en siffra inte kan stödjas — ta bort den. Sanning > kvantitet.

**Verifiera Steg 9:**

- Branschfakta-raden visar 4 kort utan inline-stilar
- "3 dgr" är borta — ersatt med "2–4 v."
- Varje kort har en källhänvisnings-rad i italic
- Visuellt identiskt med innan plus källornas extra rad

---

## Steg 10 — Pricing-alert ut + CTA-blixt ut + footer-länkar

**Vad:** Tre småfix på en gång eftersom de alla är "städning innan deploy".

### 10.1 — Pricing-knapparna

**Beslut:** `alert()`-knappar är inte produktionsklara. Ersätt med riktiga signup-länkar.

**Hitta** (3 förekomster av `onclick="alert(...)"` i pricing-cards):

```html
        <button class="pbtn sec" onclick="alert('14 dagars gratis trial — inget kreditkort!')">Starta gratis</button>
```

**Ersätt med:**
```html
        <a href="/registrera?plan=bas" class="pbtn sec">Starta gratis</a>
```

**Hitta:**
```html
        <button class="pbtn pri" onclick="alert('14 dagars gratis trial — inget kreditkort!')">⚡ Testa gratis 14 dagar</button>
```

**Ersätt med:**
```html
        <a href="/registrera?plan=pro" class="pbtn pri">Testa gratis 14 dagar</a>
```

**Hitta:**
```html
        <button class="pbtn sec" onclick="alert('Kontakta oss: hej@svebud.se')">Kontakta oss</button>
```

**Ersätt med:**
```html
        <a href="mailto:hej@svebud.se?subject=Business-tier%20intresse" class="pbtn sec">Kontakta oss</a>
```

### 10.2 — Ta bort blixt-emoji från CTA-knappar

**Designprincip:** Ingen blixt-emoji utanför ikon-system. Sök igenom hela filen och hitta CTA-knappar med `⚡`.

**Förekomster att rensa** (sök efter `⚡ Testa gratis` och `⚡ ` mer generellt):

```html
<a href="#pricing" class="bp-lg">⚡ Testa gratis i 14 dagar</a>
```
→
```html
<a href="#pricing" class="bp-lg">Testa gratis i 14 dagar</a>
```

```html
<a href="#pricing" class="btn-cta">⚡ Testa gratis</a>
```
→
```html
<a href="#pricing" class="btn-cta">Testa gratis</a>
```

```html
<a href="#pricing" class="bp-cta">⚡ Testa gratis i 14 dagar</a>
```
→
```html
<a href="#pricing" class="bp-cta">Testa gratis i 14 dagar</a>
```

Plus `⚡` i hero-mockupens "Nytt projekt"-knapp:

```html
<button class="dbbtn">⚡ Nytt projekt</button>
```
→
```html
<button class="dbbtn">Nytt projekt</button>
```

**Behåll** `⚡` i feature-listan på Pro-tier ("Föranmälan-tracker ⚡") för att visa att det är ett upgrade-incitament — men det är värt att utvärdera om även detta ska bort. Föreslag: ta bort den också för konsistens.

### 10.3 — Footer Bransch-länkar

**Beslut:** Ändra döda länkar till tomma anchors med tooltip — eller ta bort tills SEO-sidor finns (Features #8 i ROADMAP).

**Två alternativ:**

**Alt A — Behåll med disabled-styling** (signalerar "kommer"):

**Hitta:**
```html
      <div>
        <div class="fct">Bransch</div>
        <ul class="flinks">
          <li><a href="#">ROT-avdrag elinstallation</a></li>
          <li><a href="#">Föranmälan guide 2026</a></li>
          <li><a href="#">Grön teknik regler</a></li>
          <li><a href="#">Anbudsguide elfirmor</a></li>
        </ul>
      </div>
```

**Ersätt med:**
```html
      <div>
        <div class="fct">Bransch</div>
        <ul class="flinks">
          <li><span class="flink-disabled" title="Kommer Q3 2026">ROT-avdrag elinstallation</span></li>
          <li><span class="flink-disabled" title="Kommer Q3 2026">Föranmälan guide 2026</span></li>
          <li><span class="flink-disabled" title="Kommer Q3 2026">Grön teknik regler</span></li>
          <li><span class="flink-disabled" title="Kommer Q3 2026">Anbudsguide elfirmor</span></li>
        </ul>
      </div>
```

**Lägg till CSS:**
```css
.flink-disabled{color:rgba(255,255,255,.3);cursor:not-allowed}
```

**Alt B — Ta bort hela blocket tills sidor finns.**

Min rekommendation: **Alt A**. Det signalerar att SveBud är på väg att utöka content och fungerar som SEO-platshållare. Men diskutera vid behov.

**Verifiera Steg 10:**

- Inga `alert(...)` kvar i pricing-knapparna
- Pricing-knappar är `<a>`-element med riktiga `href`
- Inga `⚡`-tecken i CTA-knappar (sökresultat på `⚡ ` ska bara visa Pro-feature-listan om du valt att behålla det där)
- Footer Bransch-länkar är `<span class="flink-disabled">` med tooltip

---

## Validering — efter alla 10 steg

### Bygg- och kompileringskontroll

```bash
npm run build
```

Inga TypeScript- eller HTML-fel ska rapporteras.

### Live-test (öppna `public/landing.html` i webbläsare)

Visuell smoke-test:

1. **Nav** — "SveBud." utan blixt, prick efter "Bud"
2. **Hero** — Ingen "4,9/5", ingen stjärnrad, mockup visar "Kalkyl pågår"
3. **Statistik-strip** — 4 kort med siffror + källor (inga elfirma-namn)
4. **Pain** — 3 Phosphor-ikoner (inga emoji)
5. **Features** — 6 Phosphor-ikoner, badges säger "Inkluderat / Pro-feature / PDF + Word / ROT + grön teknik" (inte "Imponerar")
6. **Compare** — "Utan / Med SveBud"-rutorna ser likadana ut visuellt; HTML är klassbaserad
7. **Beta-program-rutan** — borttagen (sidan flyter ljust hela vägen)
8. **Branschfakta** — "2–4 v." (inte "3 dgr") + källor under varje siffra
9. **Pricing** — Knapparna är länkar (`<a>`), inte `<button onclick="alert">`. Ingen ⚡ i text
10. **Footer** — "SveBud." wordmark, Bransch-länkar gråade ut med tooltip
11. **Favicon** — Amber prick på navy bakgrund

### PostHog-events att kontrollera

Öppna PostHog dashboard (eu.posthog.com) → Live events. Verifiera att events fortfarande fyrar:

- `landing_view` på sidladdning
- `cta_clicked` när användare klickar på "Testa gratis"-knapparna
- Inga konsolfel om PostHog-init

### Vän-check

Visa sidan för någon utanför projektet. Fråga efter 60 sekunder:

- "Vad gör SveBud?"
- "Vem är det för?"
- "Kände du dig manipulerad någonstans?" (Den sista är viktigast — tidigare fake-rating + fake-firmstrip kan ha gjort sajten skarpsynta besökare misstänksamma. Ny version ska kännas ärlig.)

---

## Acceptanskriterier — checklista

- [ ] `npm run build` passerar utan fel
- [ ] Phosphor Bold CDN laddar 200 OK
- [ ] Logotypen är ren wordmark utan blixt-emoji
- [ ] Favicon är amber prick på navy bakgrund
- [ ] Inga påhittade firmnamn någonstans
- [ ] Inga obekräftade ratings ("4,9/5")
- [ ] Statistik har källhänvisningar under varje siffra
- [ ] Alla ikoner är Phosphor Bold (inte emoji), undantag pricks-loggan
- [ ] Feature-badges innehåller inga AI-buzzwords
- [ ] Compare-sektionen har klassbaserad markup utan inline-stilar
- [ ] Beta-program-section borttagen
- [ ] "3 dgr" → "2–4 v." i branschfakta
- [ ] Pricing-knappar är `<a>` med riktig href, inga `alert()`
- [ ] Inga ⚡ i CTA-knapptexter
- [ ] Designprincipen tillagd i `CLAUDE.md`
- [ ] PostHog-events fyrar fortfarande
- [ ] Vän-check passerad — ingen "manipulerat"-känsla

---

## Efter denna spec

När landing v6 är live på svebud.se:

1. Uppdatera `ROADMAP.md` — markera "Landing Fas 1+2+3 KLAR" och flytta Landing v5/v6-referenserna till "Avklarat"-sektionen
2. Påbörja **Spår 2 — Dashboard-redesign** (separat spec: `PROMPT_dashboard_v2.md`) som tar designsystemet från denna fil och porter:ar in det i `2_dashboard.html`-strukturen
3. Spela in Loom på den nya dashboarden och ersätt video-thumben i `#demo`-sektionen

---

*Slut på PROMPT_landing_v6.md. Frågor? Fråga innan du börjar — det kostar mindre än att rulla tillbaka 4 timmars Claude Code-arbete.*
