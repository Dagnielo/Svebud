# PRD v1 — SveBud kärnflöde

**Klassificering · GO/NO-GO · Offertgenerering utan AI-priser**

---

**Version:** 1.1  
**Datum:** 14 maj 2026  
**Status:** F1-F8 besvarade — redo för Fas 2 (mock-ups)  
**Källor:** Diskussion 14 maj 2026, ANBUD_SEKTIONSMATRIS.md, svebud-wireframe-v2.html, svebud-granska.jsx, PROMPT_landing_v8.md

---

## Innehåll

1. [Vision & icke-mål](#1-vision--icke-mål)
2. [Klassificering — vattendelaren](#2-klassificering--vattendelaren)
3. [GO/NO-GO-beslut](#3-gono-go-beslut)
4. [Risker — internt vs offert](#4-risker--internt-vs-offert)
5. [Onboarding + LOU/LUF-tillägg på /profil](#5-onboarding--loulluf-tillägg-på-profil)
6. [Prisinmatning — kunden räknar, vi strukturerar](#6-prisinmatning--kunden-räknar-vi-strukturerar)
7. [Tab 3 "Anbud & Skicka" — omdesign](#7-tab-3-anbud--skicka--omdesign)
8. [Implementationsfaser](#8-implementationsfaser)
9. [Öppna frågor & antaganden](#9-öppna-frågor--antaganden)

---

## 1. Vision & icke-mål

### 1.1 Strategisk position

> **"SveBud räknar inte. SveBud skriver."**

SveBud är **steget före kalkylverktyget** (EL-VIS, Wikells, BidCon, Sedab). Vi konkurrerar **inte** med dessa — vi gör det de inte gör:

- Läser ofiltrerat förfrågningsunderlag (FFU)
- Klassificerar förfrågans typ
- Matchar krav mot kundens profil
- Ger tydligt GO/NO-GO-beslut
- Skriver anbudstexten
- Strukturerar tomma prisfält åt kunden
- Levererar färdigt anbud-PDF

### 1.2 Vad SveBud gör

| Aktivitet | Roll |
|---|---|
| Läser FFU (PDF, DOCX, mail) | Extraherar krav + metadata |
| Klassificerar förfrågan | 1 av 6 anbudstyper (mappade till 3 huvudkategorier) |
| Matchar krav mot profil | Skall-krav + bör-krav + risk-flaggor |
| GO/NO-GO-beslut | Tydlig verdict + motivering per krav |
| Skriver anbudstext | Per sektion enligt anbudstypens schema |
| Strukturerar prisfält | Tomma fält per arbetsmoment, ingen AI-prissuggestion |
| Återanvänder kundens historik | Visar kundens egna tidigare priser som påminnelse |
| Exporterar PDF + spårar | Skickat-status, uppföljning |

### 1.3 Vad SveBud INTE gör (icke-mål)

| Funktion | Varför inte |
|---|---|
| Räkna timmar/mängder | Kalkylverktygens domän — vi skickar mängder, kunden räknar tid |
| Sätta timpris | Kundens affärsbeslut, ej AI:s |
| Föreslå marginal | Affärshemlighet per firma |
| Hämta grossistpriser | Kundens kalkylsystem |
| Bidcon/EL-VIS-funktioner | Inte vår planhalva |

### 1.4 GO/NO-GO som produktkärna

**Det viktigaste värdet är inte snabbare anbudsskrivande — det är att veta inom 90 sekunder att man INTE ska lämna anbud.**

Lennart-personan (elfirma-ägare) lägger tid på anbud han ändå inte vinner. SveBuds primära värde är att eliminera den tiden — säga "nej, du har inte ISO 9001 som krävs, släpp det här".

---

## 2. Klassificering — vattendelaren

### 2.1 3 huvudkategorier (slutkund) → 6 backend-typer

**På landningssidan visas 3 kategorier — användaren orkar inte 6.**

```
LANDNINGSSIDA              BACKEND-ANBUDSTYPER
═══════════════════════════════════════════════════════════════

Konsument          ──→     B2C konsument
                           ABS 18 småhus

Företag & BRF      ──→     AB 04 utförande
                           ABT 06 totalentreprenad
                           Service/jouravtal

Offentligt         ──→     LOU/LUF
```

### 2.2 Klassificerings-flow

```
1. Kunden laddar upp FFU (PDF/DOCX/mail)
   │
   ▼
2. Agent läser dokumentet
   - Avsändare (BRF? Fastighetsbolag? Kommun?)
   - Volym (uppskattat värde)
   - Kontraktsform (AB 04? ABT 06? LOU?)
   - Nyckelord (lägenhet? ramavtal? upphandling?)
   │
   ▼
3. Returnerar klassificering + confidence
   { typ: "AB 04 utförande", confidence: 0.92, motivering: "..." }
   │
   ▼
4. Kunden ser klassificeringen
   "Detta ser ut som en BRF/fastighetsbolag-förfrågan
    enligt AB 04. Stämmer det?"
   │
   ├─→ Bekräftar  → låser sektionsschema + GO/NO-GO-kriterier
   └─→ Justerar  → kunden väljer rätt typ manuellt
```

### 2.3 Klassificerings-output styr nedströms

När typ är låst genereras allt nedströms enligt **ANBUD_SEKTIONSMATRIS.md**:

| Output | Vad styr klassificeringen |
|---|---|
| Sektionsschema | Vilka sektioner ska anbudet ha (S01-S27) |
| Krav-checklista | Vilka skall-krav + bör-krav matchas mot profil |
| Onboarding-tillägg | LOU/LUF-fält visas om Offentligt |
| Offert-mall | Sektioner, ton, layout per typ |
| Risk-identifiering | Typ-specifika risk-mönster |

### 2.4 Triggers för automatisk klassificering

Per ANBUD_SEKTIONSMATRIS.md — varje typ har:

- **Avsändar-mönster** (BRF, fastighetsbolag, industri, myndighet)
- **Volym-spann** (30k → flera Mkr)
- **Kontraktsform-nyckelord** ("AB 04", "ABT 06", "upphandling")
- **Innehålls-nyckelord** ("BRF", "ramavtal", "ATEX", "anbudsförfrågan")

---

## 3. GO/NO-GO-beslut

### 3.1 Modell: krav-matchning som gap-analys

**Per krav i underlaget:** Finns det i kundens profil? Ja/Nej/Delvis.

**Output per krav:**

```javascript
{
  id: "iso9001",
  type: "obligatoriskt" | "rekommenderat",
  title: "ISO 9001 — Kvalitetsledning",
  description: "...",
  foundInProfile: true | false,
  page: "sida 4, punkt 3.2.1",
  status: "found" | "missing",
  action: "upload" | "ai-generate" | "manual" | null,
  resolution: "auto" | "fixed" | "manual-later" | "skipped" | null,
}
```

### 3.2 Score-beräkning

Per `svebud-granska.jsx` prototypen:

```javascript
score = (resolved_obligatoriska / total_obligatoriska) * 100
       + bonus_för_bör_krav

canGenerate = obligatoryMissing === 0
```

**Tröskelvärden:**

- `score >= 85%` → **GO** (grön)
- `score 65-84%` → **PRELIMINÄRT** (amber, lös flaggade gaps först)
- `score < 65%` → **NO-GO** (röd, för många skall-krav saknas)

**Obligatoriska skall-krav är hard gate** — om något saknas är det NO-GO oavsett bör-krav-poäng.

### 3.3 Resolution-flow per gap

För varje saknad krav-rad kan kunden:

| Action | Vad händer |
|---|---|
| **Upload** | Ladda upp certifikat/dokument → gap markeras som "fixed" |
| **AI-generate** | AI skriver text för bör-krav (t.ex. hållbarhetsbeskrivning) |
| **Manual now** | Skriv in svar direkt i formulär |
| **Fix later** | Markera som "tar jag senare" — räknas 0.6 av 1 i score |
| **Skip** | Hoppa över — räknas 0 |

### 3.4 Kategori-specifika krav

Per ANBUD_SEKTIONSMATRIS.md — varje typ har "Vanliga skäl att förlora":

**Konsument:**
- Pris för högt utan motivering
- ROT-besparing otydlig
- Inga referenser från liknande
- För "professionell" ton

**Företag & BRF:**
- Otillräcklig inställelsetid/beredskap
- Saknar miljödokumentation
- För få jämförbara referenser
- Otydlig ÄTA-hantering

**Industri (Företag & BRF):**
- Ytlig säkerhetsplan
- Saknar branschspecifika referenser
- Otydlig driftstopp-hantering
- För låg ansvarsförsäkring
- ATEX-kompetens otydlig

**Offentligt (LOU):**
- Skall-krav obesvarade
- Inkonsekvent svarsformat
- Otillräckliga bör-krav-svar
- Avtalsavvikelser försökt motivera

### 3.5 UI-design (utkast)

Per `svebud-granska.jsx`-prototypen:

```
┌─────────────────────────────────────────────────────────┐
│  ANALYS & BEDÖMNING                                     │
│  ─────────────────────────────────────                  │
│                                                         │
│  Matchningsgrad: 67% (PRELIMINÄRT)                      │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░                              │
│                                                         │
│  Obligatoriska kvar:  2                                 │
│  Rekommenderade kvar: 2                                 │
│                                                         │
│  ─────────────────────────────────────                  │
│                                                         │
│  KRAV ATT LÖSA INNAN ANBUD                              │
│                                                         │
│  ⚠ ISO 9001 — Kvalitetsledning      [Skall-krav]       │
│    Sida 4, punkt 3.2.1                                  │
│    [Ladda upp] [Markera som senare] [Hoppa över]        │
│                                                         │
│  ⚠ ISO 14001 — Miljöledning         [Skall-krav]       │
│    Sida 5, punkt 3.4                                    │
│    [Ladda upp] [Markera som senare] [Hoppa över]        │
│                                                         │
│  ✓ ELSÄK-FS 2017:3 — Auktorisation                      │
│    Finns redan i din profil                             │
│                                                         │
│  ✓ Referens — liknande uppdrag                          │
│    Förskola Järfälla 2024 matchar                       │
│                                                         │
│  ─────────────────────────────────────                  │
│                                                         │
│  [Generera anbud] (disabled — fixa obligatoriska först) │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Risker — internt vs offert

### 4.1 Två typer av risker

| Typ | Beskrivning | Hantering |
|---|---|---|
| **Prissättnings-risker** | Mängd/material/tid okänd, kräver tilläggspris | Går i internt kalkyl, dolt på offert |
| **Juridiska/avtalsrisker** | Otydligheter i underlaget som kan ge tvist | Text-flaggor + förbehåll i offert |

### 4.2 Risk-flöde (UI)

```
1. AI identifierar 3 risker under analys
   │
   ▼
2. Kunden ser i kalkyl-vyn:
   ┌─────────────────────────────────────────────────┐
   │ ⚠ RISKER ATT BEDÖMA                              │
   │                                                 │
   │ ☐ Vatten i golv ej dokumenterat                 │
   │   Pris: [_____] kr                              │
   │   ☐ Visa på offert                              │
   │                                                 │
   │ ☐ Yttertaksgenomföringar saknar mått            │
   │   Pris: [_____] kr                              │
   │   ☐ Visa på offert                              │
   │                                                 │
   │ ☐ Befintliga ledningar ej kartlagda             │
   │   Pris: [_____] kr                              │
   │   ☐ Visa på offert                              │
   └─────────────────────────────────────────────────┘
   │
   ▼
3. Kunden bockar i 2 av 3:
   ☑ Vatten i golv         → +8 000 kr (dold på offert)
   ☐ Yttertaksgenomföringar (skippas)
   ☑ Befintliga ledningar  → +5 000 kr (dold på offert)
   │
   ▼
4. Internt kalkyl-vy (bara kunden ser):
   Demontering:      45 000 kr
   Ny installation:  120 000 kr
   Risker:           13 000 kr  ← dold på offert default
   ─────────────────
   Totalt:           178 000 kr
   │
   ▼
5. Offert till slutkund (PDF):
   Demontering:      45 000 kr
   Ny installation:  133 000 kr  ← 120 + 13 (risk-prisbakat)
   ─────────────────
   Totalt:           178 000 kr
```

### 4.3 Toggle "Visa på offert" per risk

**Default: AV** (risk-pris bakas in i ordinarie rad — bakas i den rad AI:n associerar risken till).

**Om kunden togglar PÅ:** Risk får egen rad på offert med text "Tillkommande för X" eller "Risk-tillägg: Y".

### 4.4 Förbehåll i offert-text

Per risk kan AI auto-generera förbehåll-formulering. **Kunden väljer per risk** om förbehåll ska genereras.

**Exempel:**

Risk: "Vatten i golv ej dokumenterat"

Förbehåll auto-genereras: 
> *"Anbudet förutsätter att golvkonstruktionen är torr vid arbetets start. Vid förekomst av fukt eller vattenskada tillkommer ÄTA enligt § 22 i AB 04."*

Kunden klickar checkbox: **☑ Lägg till förbehåll i offert** → texten infogas i sektion "Avtalsvillkor" eller "Förbehåll".

### 4.5 Inbakning av risk-pris

**Default-strategi (A3):**

- Risk-pris läggs som separat rad i **interna kalkyl-tabellen**
- Toggle "Visa på offert" är default AV
- Vid offert-export bakas risk-priset in i den arbetsmoment-rad som AI:n associerar risken till
- Slutkund ser bara förhöjd siffra på den raden

**Exempel:**

```
Internt:
  Demontering          25 000 kr
  Risker (dold):        8 000 kr (kopplad till demontering)
                       ─────────
  Demontering totalt:  33 000 kr

Offert till slutkund:
  Demontering          33 000 kr
```

Om risken inte är kopplad till specifik rad → läggs i "diverse"-post på offert (eller toggle på som egen rad).

---

## 5. Onboarding + LOU/LUF-tillägg på /profil

### 5.1 Generell onboarding (6 steg — Brainbid)

**Alla nya kunder går igenom samma 6 steg:**

| Steg | Vad | Tid |
|---|---|---|
| 1 | **Hämta firma** — orgnr → Bolagsverket-data | 30 sek |
| 2 | **Kontaktperson** — minst 1 person | 1 min |
| 3 | **Certifikat** — förkryssade vanliga + egna | 1,5 min |
| 4 | **Företagsbeskrivning** — AI-utkast + godkännande | 1,5 min |
| 5 | **Tidigare anbud** (frivilligt) — ladda upp för ton-träning | 2 min |
| 6 | **Klart** — ladda upp första FU → trial startar | — |

**Total tid: 5-6 min.**

### 5.2 LOU/LUF-tillägg — INTE i onboarding

**Beslut:** LOU/LUF-konfiguration ligger i `/profil`, **inte** i initial onboarding.

**Rationale:**
- Onboarding ska vara snabb och generell — alla orkar 5 min
- Kunder som inte svarar på offentlig upphandling behöver inte se LOU-fält
- LOU-konfig kan kompletteras "vid bästa tillfälle" — t.ex. när första LOU-jobb kommer

### 5.3 Expanderbar sektion på `/profil`

**Plats:** Ny sektion i `/profil` mellan "Anbudsinställningar" och "Timpriser" (placering att bekräfta).

**Beteende:**

```
┌─────────────────────────────────────────────────────┐
│  ANBUDSTYPER & SPECIALKRAV                          │
│                                                     │
│  Vilka anbudstyper svarar du på?                    │
│  ☑ Konsument (BRF-medlemmar, villaägare)            │
│  ☑ Företag & BRF (BRF, fastighet, industri)         │
│  ☐ Offentligt (LOU/LUF — kommun, region, statlig)   │
│                                                     │
│  ▼ Komplettera för Offentligt                       │
│    (visas bara om Offentligt är ikryssat)           │
└─────────────────────────────────────────────────────┘
```

**När "Offentligt" bockas i → expanderbar sektion visas:**

```
┌─────────────────────────────────────────────────────┐
│  OFFENTLIGT — KRAV ENLIGT LOU/LUF                   │
│                                                     │
│  Kollektivavtal                                     │
│    ○ Ja, vilket: [_______]                          │
│    ○ Nej (hängavtal)                                │
│                                                     │
│  Senaste skattedeklaration                          │
│    [Datum] eller [Ladda upp]                        │
│                                                     │
│  Hållbarhetsdeklaration                             │
│    [Skriv text eller ladda upp]                     │
│                                                     │
│  ID06-status                                        │
│    ☐ Vi har ID06                                    │
│                                                     │
│  Kreditrating (UC/Bisnode)                          │
│    Senaste värde: [_______]  Datum: [_______]       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.4 Profilstyrka påverkas

`lib/profilstyrka.ts` beräkningen utökas:

- Bas-poäng (16-17p): generella onboarding-fält
- LOU/LUF-poäng (+4-5p): bara om Offentligt är valt
- **Max-poäng beror på vilka kategorier kunden valt**

Om kund bara svarar på Konsument: max 17p
Om kund svarar på Offentligt också: max 21-22p

**Visning:** "Profilstyrka 76% — Stark profil för Konsument + Företag/BRF"

### 5.5 Triggers för LOU/LUF-prompt

Två sätt LOU-konfig kan triggas:

**A. Användaren bockar i "Offentligt"** i `/profil` → expander öppnas direkt
**B. Användaren laddar upp ett LOU-FU** → system upptäcker att Offentligt inte är ikryssat → varning + länk till `/profil`

```
┌─────────────────────────────────────────────────────┐
│  ⚠ Detta ser ut som offentlig upphandling           │
│                                                     │
│  Du har inte konfigurerat profilen för LOU/LUF.     │
│  Komplettera nu för bästa GO/NO-GO-analys.          │
│                                                     │
│  [Komplettera nu] [Fortsätt utan komplettering]     │
└─────────────────────────────────────────────────────┘
```

---

## 6. Prisinmatning — kunden räknar, vi strukturerar

### 6.1 Strategi B (per dina svar)

**SveBud föreslår mängder, INTE priser.**

- AI extraherar arbetsmoment + mängder från FFU/ritning
- AI skapar tomma prisfält per moment
- Kunden fyller i timmar och material från sitt kalkylverktyg
- AI:n suggesterar **aldrig** priser (förbjudet — kärnvärde)
- AI:n visar **kundens egna historiska priser** från liknande projekt som påminnelse

### 6.2 UI-mönster (per wireframe-v2.html sektion 4)

```
┌─────────────────────────────────────────────────────┐
│  KALKYL (intern — bara du ser detta)                │
│                                                     │
│  Moment                          Timmar   Material  │
│  ─────────────────────────────────────────────────  │
│  Demontering befintlig central   [___]    [___]     │
│                                                     │
│  Ny elcentral 16-grupp × 24      [240000] kr        │
│  förra: 228 000                                     │
│                                                     │
│  Belysningspunkter enligt RFP    [___]    [___]     │
│                                                     │
│  Märkning & dokumentation        [___]    [___]     │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Återanvänd från tidigare anbud:                    │
│  SveBud visar dina egna priser från liknande        │
│  projekt. Vi rekommenderar inte — vi påminner.      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.3 Historik-suggestion (din egen data)

**Algoritm:**

1. När prisfält renderas: leta i kundens historiska anbud efter liknande moment
2. Om matchning hittas: visa "förra: X kr" under fältet (grå text)
3. Klickbar → fyller i fältet med samma siffra
4. Aldrig automatisk inifyllning — alltid kundens explicita val

**Ingen tredjepartsdata** (Rexel-priser, Wikells, etc) — bara kundens egen historia.

### 6.4 Mängd-extraktion (AI-output)

AI extraherar och visar:

| Källa | Vad extraheras |
|---|---|
| Mängdförteckning (PDF/Excel) | Direkt — kvantiteter per moment |
| Ritning (PDF) | Uppskattat — mätningar, antal uttag, längd kabel |
| Textbeskrivning | Tolkat — t.ex. "32 lägenheter" → 32 centraler |

AI markerar varje mängd med **säkerhet**:

- **Hög** (grön): direkt från MF, exakt
- **Medel** (amber): tolkat från text
- **Låg** (röd): uppskattat från ritning eller text → flaggat som risk

### 6.5 Vad AI INTE gör

- Inga timpriser
- Inga material-pålägg
- Inga grossistuppgifter
- Inga marginaler
- Inga konkurrent-jämförelser

---

## 7. Tab 3 "Anbud & Skicka" — omdesign

### 7.1 A + B kombo (per din spec)

**Övre del:** Prisinmatning per moment (wireframe v2 sektion 4-stil)
**Nedre del:** Expanderbara anbudssektioner (gamla mockup 2_dashboard.html-stil)
**Sidopanel:** Dokument + aktivitet + risker

### 7.2 Layout-skiss (text-form)

```
┌──────────────────────────────────────────────────────────────┐
│ [Tillbaka] BRF Kungsholmen          [Sätt deadline][Exportera]│
├──────────────────────────────────────────────────────────────┤
│ ① Dokument ✓ → ② Analys ✓ → ③ Anbud & Skicka ← Du tittar här │
├─────────────────────────────────────────────┬────────────────┤
│ KALKYL (intern)                             │ DOKUMENT (7)   │
│                                             │ • FFU.pdf      │
│ Moment             Timmar  Mtrl   Belopp    │ • Ritning1.pdf │
│ ─────────────────────────────────────       │ • ...          │
│ Demontering        [_]    [_]    [_]        │                │
│ Ny installation    [_]    [_]    [_]        │ AKTIVITET      │
│ ROT-avdrag         [auto-beräknat]          │ • 09:14 Analys │
│ Grön teknik        [auto-beräknat]          │ • 09:12 PDF    │
│                                             │ • 15 apr 17:42 │
│ ─────────────────────────────────────       │                │
│ Risker att bedöma:                          │ RISKER (3)     │
│ ☐ Vatten i golv ej dok.   [_] kr            │ ⚠ Vatten dok.  │
│ ☐ Yttertak saknar mått    [_] kr            │ ⚠ Yttertak     │
│ ☐ Ledningar ej kartlagda  [_] kr            │ ⚠ Ledningar    │
│                                             │                │
│ ─────────────────────────────────────       │                │
│ Totalt internt:        178 000 kr           │                │
│ Totalt offert:         178 000 kr           │                │
│ (risker bakade in)                          │                │
│                                             │                │
├─────────────────────────────────────────────┤                │
│ ANBUDSSEKTIONER (text-utkast)               │                │
│                                             │                │
│ ▶ 01  Anbudsbrev                ✓ Klar      │                │
│ ▶ 02  Företagspresentation      ✓ Klar      │                │
│ ▶ 03  Förståelse av uppdraget   ✓ Klar      │                │
│ ▶ 04  Utförandebeskrivning      ⚠ Granska   │                │
│ ▶ 05  Tidsplan                  ✓ Klar      │                │
│ ▶ 06  Prisspecifikation         ✓ Klar      │                │
│ ▶ 07  Garantier                 ✓ Klar      │                │
│ ▶ 08  Försäkringar              ✓ Klar      │                │
│ ▶ 09  Referenser                ✓ Klar      │                │
│ ▶ 10  Kontaktperson             ✓ Klar      │                │
│ ▶ 11  Förbehåll                 ⚠ 2 nya     │                │
│                                             │                │
├──────────────────────────────────────────────────────────────┤
│ [Förhandsgranska offert]  [Spara utkast]  [Generera PDF]     │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Sektionsschema från ANBUD_SEKTIONSMATRIS.md

Antalet sektioner och ordningen styrs av klassificeringen:

- **BRF**: 13 sektioner (kort företagspres, ROT-info, etc)
- **Fastighetsbolag**: 15 sektioner (service-/beredskap, kvalitetsplan)
- **Industri**: 15 sektioner (säkerhetsplan, ATEX, driftsamordning)
- **LOU**: 15+ sektioner (ordning LÅST av upphandlingen, inte matrisen)

### 7.4 Per sektion: redigerbar text + status

```
┌──────────────────────────────────────────────────────────────┐
│ ▼ 04  Utförandebeskrivning                       ⚠ Granska    │
│ ─────────────────────────────────────────────                │
│                                                              │
│ [Textfält — AI-genererat utkast som kunden kan justera]      │
│                                                              │
│ Demontering inleder arbetet, varefter ny stigarledning...    │
│ [...]                                                        │
│                                                              │
│ [AI-omformulera]  [Bevara senaste sparade]  [Markera klar]   │
└──────────────────────────────────────────────────────────────┘
```

**Status per sektion:**

- ✓ **Klar** — AI-genererad + kunden granskad
- ⚠ **Granska** — AI-genererad, väntar granskning
- 🔴 **Tom** — krav men inget AI-utkast (ovanligt)
- 🚫 **Ej tillämplig** — sektion skippad för denna typ

### 7.5 Risker integration

**Riskmodulen i sidopanelen** (visas alltid om risker finns):

```
RISKER (3)
─────────────────
⚠ Vatten i golv ej dokumenterat
  → Lägg till förbehåll? [Ja] [Nej]
  → Prissätt? Se kalkyl.

⚠ Yttertaksgenomföringar
  → Lägg till förbehåll? [Ja] [Nej]
  → Prissätt? Se kalkyl.

⚠ Ledningar ej kartlagda
  → Lägg till förbehåll? [Ja] [Nej]
  → Prissätt? Se kalkyl.
```

Förbehåll-checkboxar **synkar med sektion 11 (Förbehåll)** i offert-texten — bockar i "Ja" → text infogas automatiskt.

### 7.6 Förhandsgranska offert

Innan PDF-export: full förhandsgranska som visar:

- Anbudet **utan riskposter** (såvida inte kunden togglat på)
- Anbudet **utan interna anteckningar**
- Anbudet **utan "tidigare anbud-jämförelser"**

**Två lägen:**

- **Internt läge:** Kalkyl + risker + utkasttext (för kunden själva)
- **Slutkundläge:** Bara det som slutkunden får (för förhandsgranskning av offert)

---

## 8. Implementationsfaser

### 8.1 Fas 1 — PRD-godkännande (NU)

- [x] Bekräfta mappning 3→6
- [x] Bekräfta LOU/LUF på `/profil`
- [x] Bekräfta risk-strategi A3/B3/C3
- [x] PRD v1 skriven
- [ ] **PRD v1 godkänd av Dagnielo** ← väntar

### 8.2 Fas 2 — Mock-ups (HTML-prototyper)

**Mål:** Statiska HTML-prototyper per kärnskärm. Snabb iteration, ingen kod-överhead.

Föreslagen ordning:

| Skärm | Skill / referens | Tid |
|---|---|---|
| Klassificerings-resultat + bekräftelse | wireframe v2 stil | 1-2 h |
| GO/NO-GO-analys (gap-lista) | svebud-granska.jsx → HTML | 2-3 h |
| Anbudstyper & specialkrav (i /profil) | Ny sektion | 1-2 h |
| Tab 3 Anbud & Skicka — kalkyl-delen | A+B kombo | 2-3 h |
| Tab 3 Anbud & Skicka — sektionsredigering | A+B kombo | 2 h |
| Risker-modulen | Sidopanel + checkboxar | 1 h |
| Förhandsgranska offert (slutkundläge) | PDF-look | 1-2 h |

**Total mock-up-tid: ~10-15 timmar** (kan delas över flera sessions)

Mock-ups skickas till Dagnielo som artifact + lagras i `docs/mockups/`. Iteration tills Dagnielo godkänner.

### 8.3 Fas 3 — Implementation (modulär)

Plan mode-baserad implementation, en modul i taget:

| Modul | Beroenden | Estimat |
|---|---|---|
| Klassificerings-flow + UI | LLM-call till klassificerare | 2-3 dagar |
| Gap-analys + GO/NO-GO-vy | Klassificering klar | 3-4 dagar |
| LOU/LUF-sektion i /profil | Bara UI + DB-fält | 1-2 dagar |
| Risk-identifierare | LLM-call till risk-agent | 2-3 dagar |
| Risker-modulen i Tab 3 | Risk-identifierare klar | 1-2 dagar |
| Prisinmatning utan AI-priser | UI-refaktor av nuvarande kalkyl | 2-3 dagar |
| Historik-suggestion | DB-queries över kundens anbud | 2 dagar |
| Sektionsredigering med statusar | Befintlig + status-fält | 1-2 dagar |
| Förhandsgranska (intern/slutkund) | All ovan klar | 2 dagar |
| PDF-export utan riskposter | Befintlig PDF + filter | 1-2 dagar |

**Total implementations-tid: ~3-4 veckor** (om en person jobbar full-tid)

Med Plan mode-disciplin: ingen rush, kvalitet över hastighet. Varje modul får sin egen mini-PRD vid mock-up-fas.

### 8.4 Fas 4 — Validering med Göran

**Innan implementations-fas avslutas:**

- Demo med Göran (eller liknande elfirma-ägare)
- Verifiering: är klassificeringen rätt? Är GO/NO-GO användbar? Är risker-modulen användbar?
- Justeringar baserade på feedback
- **Inte release förrän Göran säger "ja, jag skulle använda detta"**

---

## 9. Öppna frågor & antaganden

### 9.1 Antaganden vi gjort

**A1.** Klassificeraren körs en gång per FFU vid upload — om kunden uppdaterar FFU klassas om
**A2.** Score-trösklar (85/65) är gissningar — kan kalibreras efter pilotanvändare
**A3.** Default-risk-bakning (A3 strategi) kopplar risk till specifik rad — fungerar oftast, men ej alltid
**A4.** Profilstyrka-poäng räknas om dynamiskt när kunden bockar i nya kategorier
**A5.** Historik-suggestion behöver minst 3-5 tidigare anbud för att vara meningsfull — nya kunder ser inga suggester

### 9.2 Beslut från F1-F8 (14 maj 2026)

**F1 — PDF-export-läge: BÅDA — två separata knappar**

- **"Exportera offert"** (slutkundläge) — primär knapp, det vanliga
- **"Exportera internt"** (internt läge) — sekundär, för Lennarts egen pärm/projekthantering med risk-priser synliga

**Konsekvens för implementation:**
- PDF-export-modulen måste stödja två lägen via prop/parameter
- UI: två knappar i Tab 3-footern, inte en toggle
- Internt-PDF inkluderar alla risk-rader + aktivitetslogg + interna anteckningar

---

**F2 — Klassificerings-osäkerhet: VARNING, ej tvinga**

Tre confidence-tröskelvärden:

- **≥ 0.85** → "Detta är AB 04 utförande. Stämmer det?" + bekräfta-knapp
- **0.7-0.85** → "Detta verkar vara AB 04 utförande, men jag är inte helt säker." + bekräfta + alternativ-dropdown
- **< 0.7** → "Jag är osäker. Det kan vara AB 04 eller ABT 06." + visa båda + kunden väljer

**Konsekvens för implementation:**
- Klassificerings-agent måste returnera confidence-värde (0.0-1.0)
- UI växlar layout baserat på confidence-tröskel
- Spara confidence i databasen → kvalitetsmätning över tid

---

**F3 — Risker-räckvidd: BÅDA, separerade**

- **"Risker i underlaget"** — från FFU-analys (vatten i golv, mängder saknas, etc)
- **"Risker baserat på din historik"** — bara om ≥3 jämförelseprojekt finns
  - "I 2 av 3 liknande BRF-projekt hade du extra arbete med trapphus-belysning"
  - "Din genomsnittliga ÄTA-andel på BRF-projekt är 12%"

**Konsekvens för implementation:**
- Risk-modulen har TVÅ sektioner i UI (inte en blandad lista)
- Historik-risker visas bara när data finns — annars helt dolda
- Beroende: Win/Loss-data flywheel (se F7) behövs för att aktivera sektion 2

---

**F4 — LOU utan profil-konfig: KÖR ANALYS, varning + länk**

- Visa varning **överst** i analysvyn: "Du har inte konfigurerat LOU-profil — analysen blir mindre precis. [Komplettera nu]"
- Kör GO/NO-GO ändå med tillgängliga data
- Markera flaggade gaps som "Kräver LOU-data" istället för "Saknas i profil"
- Efter LOU-konfig → kunden klickar "Kör om analys" på samma projekt

**Konsekvens för implementation:**
- GO/NO-GO-engine får ny status: "kräver-konfig" (skiljs från "saknas-i-profil")
- "Kör om analys"-knapp på projekt-detaljvyn (existerar troligen redan, verifiera)
- LOU-FU-detektion triggar varning även innan analys körs

---

**F5 — Förbehåll-text: MALLAD med AI-redigering**

- Per risktyp finns en standard-formulering (mallad)
- Kunden klickar **"Använd standard"** → mall-text infogas
- Kunden klickar **"Anpassa"** → AI omformulerar baserat på specifik kontext

**Standard-mallar (initial uppsättning):**

| Risk-typ | Standardformulering |
|---|---|
| Vatten/fukt ej dokumenterat | "Anbudet förutsätter att golvkonstruktionen är torr vid arbetets start. Vid förekomst av fukt eller vattenskada tillkommer ÄTA enligt § 22 i AB 04." |
| Mängd-osäkerhet | "Mängder enligt mängdförteckning. Vid avvikelser >10% justeras anbudssumman proportionellt." |
| Bef. installationer ej kartlagda | "Anbudet baseras på utförande av nya installationer. Kartläggning och anpassning till befintliga ledningar prissätts som ÄTA vid behov." |
| Tidsfönster oklart | "Tidsplan förutsätter normal arbetsdag 07-16 vardagar. Arbete utanför ordinarie tid offereras separat." |
| ATEX-zon nämnd men ej specificerad | "Anbudet förutsätter ATEX-zon 22. Vid annan zonklassificering tillkommer specialarbete." |

**Konsekvens för implementation:**
- Skapa `risk_forbehall_mallar`-tabell i databasen
- Mallar kan utökas över tid baserat på Göran-feedback + win/loss-data
- AI-omformulering är separat LLM-call när kunden klickar "Anpassa"

---

**F6 — Sektionsstatus: MANUELL markering + auto-flagga**

**State machine:**

```
[AI genererar sektion] → "Granska" (amber)
[Kunden klickar "Markera klar"] → "Klar" (grön)
[Kunden eller AI redigerar klar sektion] → "Granska" (amber)
[FFU re-laddas (nytt underlag)] → alla sektioner → "Granska"
```

**Före PDF-export:**

Om någon sektion är "Granska" → visa varning:
```
"3 sektioner är ej granskade:
 - 04 Utförandebeskrivning
 - 11 Förbehåll
 - 18 Projektorganisation
Exportera ändå?  [Nej, granska först] [Ja, exportera ändå]"
```

**Konsekvens för implementation:**
- Lägg till `granskning_status` på sektion-objektet (enum: 'granska' | 'klar')
- Lägg till `senast_granskad_at` timestamp för audit
- PDF-export-flow innehåller pre-check som öppnar varnings-dialog

---

**F7 — Win/loss-data integration: GO/NO-GO, EJ klassificering**

**I klassificering:** Inget. Klassificering är textanalys av underlaget.

**I GO/NO-GO:** Tre platser:

1. **Score-modifierare**
   - "Du har förlorat 5 av 5 senaste BRF-anbud — undersök varför innan du lägger till"
   - Sänker rekommendation från GO → PRELIMINÄRT

2. **Risker-baserat-på-historik** (sektion 2 i risk-modulen, se F3)

3. **Profilstyrka i kontext**
   - "Profilstyrka 76% är bra för Konsument, men otillräckligt för LOU/LUF"
   - Visar olika tröskelvärden per kategori

**Konsekvens för implementation:**
- Win/Loss-data flywheel måste vara funktionell innan F7-features aktiveras
- Visa "Detta är vad SveBud lärt sig om dig"-mikrokopiering så kunden förstår
- Tidsplan: Win/loss-integration i **PRD v2**, inte v1-implementation

---

**F8 — Mobile-UX: Desktop-first för Tab 3, mobile för inkorg + GO/NO-GO-snabbvy**

**Mobile-vänliga vyer:**
- Inkorg / pipeline
- Snabb GO/NO-GO-blick på en ny förfrågan
- Notifikationer
- Status-uppdateringar
- /profil-redigering (för LOU/LUF-fält)

**Desktop-required:**
- Tab 3 Anbud & Skicka (komplex multi-panel-layout)
- Detaljerad kalkyl-redigering
- Sektionsredigering

**Mobile-fallback för Tab 3:**

```
"Detta projekt är redo för redigering.
Öppna på dator för bästa upplevelse.

[Skicka länk till min mejl] [Visa ändå (begränsad UX)]"
```

**Konsekvens för implementation:**
- Tab 3 implementeras desktop-first — ingen tid spenderas på mobil-responsivitet
- Mobile-blocker visas vid viewport < 1024px på Tab 3-rutterna
- Inkorg + GO/NO-GO-vy responsifieras fullt — fungerar perfekt på mobil
- Sparar uppskattat 3-5 utvecklingsdagar (mobile-Tab3-responsifiering)

---

### 9.3 Konsekvenser för implementation (samlat)

**Beslut F1-F8 påverkar följande moduler:**

| Modul | F-beslut som påverkar |
|---|---|
| PDF-export | F1 (två lägen) |
| Klassificerings-UI | F2 (confidence-tröskelvärden) |
| Risk-modul | F3 (två sektioner), F5 (mallad text), F7 (historik) |
| GO/NO-GO-engine | F4 (kräver-konfig-status), F7 (score-modifierare) |
| Sektion-status | F6 (state machine) |
| Tab 3 (Anbud & Skicka) | F1, F6, F8 |
| Onboarding | (oförändrad — F4 påverkar /profil, inte onboarding) |
| Win/Loss-flywheel | F3 + F7 (förstärker behovet, men prioriteras till PRD v2) |

**Nya databastabeller/fält som behövs:**

- `risk_forbehall_mallar` (mallar för förbehåll-text)
- `projekt.klassificering_confidence` (decimal 0.0-1.0)
- `sektion.granskning_status` (enum)
- `sektion.senast_granskad_at` (timestamp)
- `kund.lou_konfig_klar` (boolean — triggar varning vid LOU-FU)

### 9.4 Beslut som ska tas i mock-up-fas

- Färgschema för risker (amber? annan?)
- Ikon-val per sektion-status
- Animering på status-byte
- Auto-spara-frekvens (efter varje keystroke? Var 30:e sekund?)
- Sektions-numrering (S01-S27 från matrisen visas eller döljs?)

---

## 10. Referenser

- **ANBUD_SEKTIONSMATRIS.md** — sektionsbibliotek S01-S27 + scheman per anbudstyp
- **svebud-wireframe-v2.html** — strategisk position + prisinmatning + 10 landningssida-sektioner
- **svebud-granska.jsx** — gap-analys-prototyp (referenskod för GO/NO-GO-UI)
- **PROMPT_landing_v8.md** — 3-kategori-modell + 6-stegs onboarding (Brainbid)
- **CLAUDE.md** — designprinciper (yrkesverktyg, ej AI-buzzwords, Phosphor som ikoner)
- **ROADMAP.md** — projektstatus efter Steg 4 KOMPLETT (14 maj 2026)

---

## Versionshistorik

| Version | Datum | Ändring |
|---|---|---|
| 1.0 | 2026-05-14 | Första utkast efter diskussion 14 maj. Konsoliderar 3+6-kategorisering, GO/NO-GO som produktkärna, risk-strategi A3/B3/C3, LOU/LUF på /profil, prisinmatning utan AI-priser, Tab 3 omdesign A+B. |
| 1.1 | 2026-05-14 | F1-F8 besvarade. Lägger till sektion 9.2 (Beslut F1-F8 med rationale + implementations-konsekvenser), 9.3 (Konsekvenser samlat + nya DB-fält), 9.4 (Mock-up-fas-beslut). Status uppgraderat till "Redo för Fas 2". |

---

**Slut PRD v1.1.**
