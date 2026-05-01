# PROMPT_app_design_step1a.md

## Steg 1A — Ljusa designtokens parallellt med mörka

**Datum:** 1 maj 2026
**Mål:** `app/globals.css`
**Estimerad tid:** 4 timmar Claude Code-arbete
**Risk:** Låg (additivt — inget bryts)
**Beroende:** Inga (kan köras självständigt)
**Följdsteg:** Steg 1B (layout-refaktor använder dessa tokens)

> **Vad detta gör:** Introducerar nya ljusa designtokens parallellt med befintliga mörka. Sidor ser fortfarande mörka ut efter denna spec — eftersom komponenter använder gamla tokens. Tokens är förberedelse för Steg 1B-1D.

---

## Designprincip att respektera

Från `CLAUDE.md ## Designprinciper` (etablerad 1 maj 2026):

> SveBud ska se ut som ett yrkesverktyg byggt av människor som förstår elinstallation. AI är medlet — inte budskapet, inte identiteten.

Praktisk konsekvens för designtokens:
- Tokens ska matcha landningssidan v7 exakt (samma palett)
- Inga emoji-färger, inga AI-glansiga gradienter
- Subtila borders + tydlig typografi över färgrutor

---

## Källa för tokens

Från `public/landing.html` (live ljus design, hash `b4522b6`):

```css
:root {
  --navy: #0E1B2E;          /* Primär mörk navy */
  --amber: #C8960A;         /* Primär amber/guld */
  --off: #F8F7F4;           /* Varm off-white bakgrund */
  --cream: #F0EBE2;         /* Mörkare cream för accent-sektioner */
  --border: #E5E3E0;        /* Subtil grå border */
  --light-border2: #D4D1CC; /* Något mörkare border för accent */
  --white: #FFFFFF;         /* Ren vit */
  --t1: #0E1B2E;            /* Primär text — samma som navy */
  --t2: #2D3E52;            /* Sekundär text — mörk grå-blå */
  --t3: #5A6B7D;            /* Tertiär text — medel grå-blå */
  --t4: #8A99AB;            /* Quaternär text — ljus grå-blå */
}
```

Plus statusfärger (verifiera mot landing.html):
```css
--green: #16A34A;       /* Vunnet/success */
--red: #DC2626;         /* Förlorat/error */
--orange: #EA580C;      /* Warning/deadline-varning */
--blue: #2563EB;        /* Info/neutral accent */
--amber-glow: rgba(200,150,10,.06);   /* Subtil amber bg */
--amber-border: rgba(200,150,10,.18); /* Amber border */
```

---

## Operationer

### Op 1.1 — Verifiera live-tokens

Innan vi skriver något, verifiera att tokens i landing.html stämmer.

```bash
grep -E "^\s*--" public/landing.html | head -30
```

Rapportera utdrag. Om tokens skiljer sig från ovan — använd live-värdena, inte specens.

### Op 1.2 — Lägg till ljusa tokens i `:root`

**Hitta** `:root {` i `app/globals.css`.

**Lägg till** efter befintliga tokens men innan `}`:

```css
  /* ════════════════════════
     LJUSA TOKENS (Steg 1A — parallellt med mörka)
     Aktiveras när komponenter migreras i Steg 1B-1D.
     Avvecklas mörka tokens i Steg 1D-städ.
  ════════════════════════ */

  /* Bakgrunder */
  --light-bg: #FFFFFF;          /* Ren vit primär bg */
  --light-off: #F8F7F4;         /* Varm off-white sekundär bg */
  --light-cream: #F0EBE2;       /* Cream för accent-sektioner */

  /* Borders */
  --light-border: #E5E3E0;
  --light-border2: #D4D1CC;

  /* Text på ljus bg */
  --light-t1: #0E1B2E;          /* Primär text — samma som navy */
  --light-t2: #2D3E52;
  --light-t3: #5A6B7D;
  --light-t4: #8A99AB;

  /* Accent — samma navy + amber som mörkt */
  --light-navy: #0E1B2E;
  --light-amber: #C8960A;

  /* Status-färger anpassade för ljus bg */
  --light-green: #16A34A;
  --light-red: #DC2626;
  --light-orange: #EA580C;
  --light-blue: #2563EB;

  /* Subtila accent-bg */
  --light-amber-glow: rgba(200,150,10,.06);
  --light-amber-border: rgba(200,150,10,.18);
  --light-green-bg: rgba(22,163,74,.08);
  --light-red-bg: rgba(220,38,38,.06);
  --light-orange-bg: rgba(234,88,12,.08);
```

### Op 1.3 — Lägg till ljusa tokens i `@theme inline`

Tailwind v4 använder `@theme inline` för Tailwind-tokens. Denna fil måste uppdateras parallellt så `bg-light-bg`, `text-light-t1` etc. fungerar som Tailwind-utility-klasser.

**Hitta** `@theme inline {` i `app/globals.css`.

**Lägg till** följande tokens:

```css
  /* Ljusa tokens som Tailwind-utilities */
  --color-light-bg: var(--light-bg);
  --color-light-off: var(--light-off);
  --color-light-cream: var(--light-cream);
  --color-light-border: var(--light-border);
  --color-light-border2: var(--light-border2);
  --color-light-t1: var(--light-t1);
  --color-light-t2: var(--light-t2);
  --color-light-t3: var(--light-t3);
  --color-light-t4: var(--light-t4);
  --color-light-navy: var(--light-navy);
  --color-light-amber: var(--light-amber);
  --color-light-green: var(--light-green);
  --color-light-red: var(--light-red);
  --color-light-orange: var(--light-orange);
  --color-light-blue: var(--light-blue);
```

Detta gör att Claude Code i Steg 1B-1D kan skriva `className="bg-light-bg text-light-t1"` om den föredrar Tailwind-utilities över inline-stilar.

### Op 1.4 — Markera mörka tokens som "deprecated"

Lägg till en kommentar ovanför de mörka tokens:

**Hitta** `:root {` och de första mörka tokens (sannolikt `--yellow:` eller `--navy:`).

**Lägg till kommentar precis innan första mörka token:**

```css
  /* ════════════════════════
     MÖRKA TOKENS (avvecklas i Steg 1D)
     Använd INTE i ny kod. Migrera till --light-* när möjligt.
  ════════════════════════ */
```

Detta är en mental signal till framtida sessioner — inte en hard deprecation. Tokens fungerar fortfarande tills Steg 1D städar dem.

### Op 1.5 — Verifiera att inget brutits

```bash
npm run build
```

**Förväntat:** 0 fel. Eftersom vi bara **lade till** tokens och inte ändrade något, ska build:en passera.

```bash
grep -c "^\s*--light-" app/globals.css
```

**Förväntat:** ~25 träffar (alla nya tokens vi lade in).

### Op 1.6 — Visuell smoke-test

`npm run dev`. Öppna `http://localhost:3000/dashboard`.

**Förväntat resultat:** Sidan ser **EXAKT likadan ut som innan**. Mörk navy bakgrund, mörk Sidebar, gula KPI-toppstreck.

**Om sidan ser annorlunda ut — STOPPA.** Något har gått fel. Rulla tillbaka och felsök.

---

## Commit-meddelande

```
feat(app-design): introducera ljusa designtokens parallellt (Steg 1A)

Lägger till --light-* CSS-variabler i :root + @theme inline för
användning i kommande Steg 1B-1D (layout-refaktor + komponent-
redesign). Befintliga mörka tokens orörda — additivt, inga
breaking changes.

- Ljusa tokens matchar landningssidan v7 (commit b4522b6)
- Tailwind-utilities tillgängliga: bg-light-bg, text-light-t1, etc.
- Mörka tokens markerade som "avvecklas i Steg 1D"

Spec: docs/PROMPT_app_design_step1a.md
```

---

## Acceptanskriterier

- [ ] `npm run build` 0 fel
- [ ] `:root` har 25+ nya `--light-*` tokens
- [ ] `@theme inline` har 15+ nya `--color-light-*` mappningar
- [ ] Befintliga mörka tokens orörda (kan grep:as fortfarande)
- [ ] Mörka tokens har "avvecklas i Steg 1D"-kommentar
- [ ] Visuell smoke-test: `/dashboard` ser oförändrad ut
- [ ] Commit lokal, ej pushad (vänta på Steg 1B-1D innan deploy)

---

## Risker

- **Token-namnkonflikt** — om någon befintlig token redan heter `--light-*`. Verifiera med `grep "^\s*--light" app/globals.css` innan op 1.2.
- **Tailwind v4 syntax** — om `@theme inline {}` inte finns i din version, behöver du anpassa. Verifiera med `grep "@theme" app/globals.css`.

---

## Efter denna spec

Steg 1A är **isolerat och säkert**. Du kan pausa här utan konsekvens. Sidor ser fortfarande mörka ut. Tokens väntar på att användas i Steg 1B.

**Nästa: Steg 1B — `(app)/layout.tsx` + Sidebar-flytt + auth centraliseras.**
