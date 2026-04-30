# PROMPT — Profil-systemet (v1)

**Senast uppdaterad:** 27 april 2026
**Hör till:** ROADMAP.md → Features #11 — Profil-systemet
**Detaljspec för:** Komplett firma-profil med AI-extraktion av certifikat, Bolagsverket-integration, team-modul, auto-genererade referenser från vunna anbud, AI-lärda benchmarks och anbudsmallar.

**Mockup-referens:** `mockups/4_profil.html` (skapad i designsession 27 april — visar layout, färgval, drop-zone, källtaggar).

**Tidsestimat totalt:** 7–8 arbetsdagar fördelat på 5 etapper (kan köras separat).

---

## Filosofi — läs detta först. Bryt inte mot det.

Profilen är **inte ett formulär**. Profilen är en **biprodukt av riktigt arbete**.

Fyra principer som alltid gäller, oavsett vad användaren tycks be om i stunden:

1. **Profilen byggs av sig själv från det verkliga arbetet i appen** — inget separat onboarding-formulär, ingen wizard, inga 47 fält att fylla i.
2. **AI extraherar från dokument istället för att be om text-inmatning** — användaren drar in en PDF, AI:n läser ut fält. Aldrig "fyll i fält X" om det går att extrahera från ett dokument.
3. **Frågor ställs bara när de behövs för att leverera värde just nu** — inte för förmodade framtida behov. Om FU:n inte kräver ISO-certifiering ska AI:n inte fråga om det.
4. **Smarta gissningar som användaren bekräftar med ett klick** — alla fält som kan hämtas från Bolagsverket, SCB eller Skatteverket ska vara förifyllda. Tomt fält är ett misslyckande.

Om Claude Code någon gång skriver kod som genererar ett "fyll i din firma-profil"-formulär eller en "kom igång"-wizard innan första anbudet — **stanna och läs om denna sektion**.

---

## Översikt — vad ska byggas

En ny vy `/profil` med 6 tabbar enligt mockup. All data byggs upp organiskt från:

- **Registrerings-flödet** — hämtar grunddata från Bolagsverket vid första inloggning
- **Cert-uppladdning** — drag-drop, AI extraherar typ/datum/nummer
- **Vunna anbud** — auto-skapar referensprojekt med metadata
- **Sparade timpriser/marginaler** — lärs in från användarens kalkyl-justeringar (benchmarks)
- **Genererade anbudssektioner** — sparas som mallar med versionshantering

Ingen separat onboarding-flow. Profilen växer av sig själv. Vyn är ett **bibliotek** att granska och justera, inte en startsida att fylla i.

---

## Beroenden

| Krav | Status |
|---|---|
| Win/Loss UI (Features #2) | ✅ Live — krävs för att referenser ska auto-skapas från vunna anbud |
| Win/Loss data (≥10 markerade anbud) | ⚠ Endast 5 testanbud idag — benchmarks får värde först vid ≥10 |
| Anthropic API-nyckel i Vercel env | ✅ Antas finnas (används av andra agenter) |
| Bolagsverket Näringslivsregistret API | ❌ Måste registreras på `bolagsverket.se` — gratis för basinfo, eller använd öppen `allabolag.se`-scraper via Firecrawl som fallback |

**Reservplan om Bolagsverket-API blockeras:** använd Firecrawl mot `allabolag.se/orgnr/{orgnr}` i etapp A. Profilen fungerar lika bra.

---

## Etapper — kör i ordning

Varje etapp är en självständig leverans. **Kör Plan mode först innan varje etapp.** Mellan etapperna: `npm run build` ska vara grön och en live-test ska bekräfta att etappen fungerar.

| Etapp | Vad | Tid | Migration |
|---|---|---|---|
| **A** | DB-grund + `/profil`-sida + Företaget-tabben + Bolagsverket-hämtning | 2 dagar | 012 |
| **B** | Behörigheter-tabben + cert-drop-zone + AI-extraktion av certifikat | 2 dagar | 013 |
| **C** | Team-tabben + Referenser-tabben (auto-länkat till vunna anbud) | 1 dag | 014 |
| **D** | Benchmarks-tabben + AI-lärda standardvärden från anbudshistorik | 2 dagar | 015 |
| **E** | Mallar-tabben + automatisk mall-extraktion vid genererade anbud | 1 dag | 016 |

---

## Etapp A — DB-grund + Företaget-tabben

### Migration 012 — `firma_profil` + `firma_egenskap`

```sql
-- ETT företag per användare. Fält som hämtas från Bolagsverket är
-- separerade från fält användaren själv styr över.

CREATE TABLE firma_profil (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  användar_id                   UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Auto-hämtat från Bolagsverket / SCB / Skatteverket
  organisationsnummer           TEXT NOT NULL,
  företagsnamn                  TEXT NOT NULL,
  adress                        TEXT,
  postnummer                    TEXT,
  ort                           TEXT,
  sni_kod                       TEXT,
  sni_beskrivning               TEXT,
  antal_anställda               INT,
  omsättning_senaste_år         BIGINT,
  f_skatt_registrerad           BOOLEAN,
  moms_registrerad              BOOLEAN,
  bolagsverket_senast_hämtat    TIMESTAMPTZ,

  -- Manuellt bekräftat / uppdaterat
  antal_montörer                INT,
  verksamhetsområde_radie_km    INT DEFAULT 50,
  kollektivavtal                TEXT,
  miljöpolicy_text              TEXT,
  kvalitetspolicy_text          TEXT,
  logotyp_url                   TEXT,
  företagspresentation          TEXT,

  -- Beräknad fält (uppdateras nightly via cron eller on-write)
  profilstyrka_procent          INT DEFAULT 0,

  skapad                        TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad                    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE firma_profil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firma_egen" ON firma_profil
  FOR ALL USING (användar_id = auth.uid());

CREATE TRIGGER firma_ts BEFORE UPDATE ON firma_profil
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();

-- Lagrar varifrån varje fält kommer (Bolagsverket / AI / Manuellt)
-- Behövs för källtaggar i UI:n och för att veta vad som får skrivas över
-- vid nästa Bolagsverket-hämtning.
CREATE TABLE firma_egenskap_källa (
  firma_id      UUID REFERENCES firma_profil(id) ON DELETE CASCADE,
  fält_namn     TEXT NOT NULL,
  källa         TEXT NOT NULL CHECK (källa IN ('bolagsverket', 'scb', 'skatteverket', 'ai_extraherat', 'manuellt')),
  hämtat        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (firma_id, fält_namn)
);

ALTER TABLE firma_egenskap_källa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "källa_egen" ON firma_egenskap_källa
  FOR ALL USING (firma_id IN (SELECT id FROM firma_profil WHERE användar_id = auth.uid()));
```

### Backend — Bolagsverket-hämtning

`lib/bolagsverket-agent.ts`:

```ts
export async function hämtaFöretagsdata(orgnr: string): Promise<FöretagsData> {
  // Försök 1: Bolagsverket Näringslivsregistret API (kräver registrering)
  // Försök 2: Firecrawl mot allabolag.se/orgnr/{orgnr} som fallback
  // Returnera: { företagsnamn, adress, sni_kod, antal_anställda, omsättning, f_skatt, moms }
}
```

API-route `app/api/profil/hämta-bolagsverket/route.ts`:
- Tar `orgnr` från body
- Hämtar via `bolagsverket-agent`
- Skriver till `firma_profil` + sätter källa = `'bolagsverket'` för alla auto-fält
- Returnerar uppdaterad profil
- **`maxDuration: 30`** i vercel.json

### Registreringsflöde — uppdatering

I `app/(auth)/registrera/page.tsx`:
- Lägg till **organisationsnummer** som obligatoriskt fält (utöver e-post + lösenord)
- Direkt efter `auth.signUp()` → anropa `/api/profil/hämta-bolagsverket` med org.nr
- Skapa `firma_profil`-rad med hämtad data
- Visa bekräftelsesida: *"Vi vet redan följande om er — stämmer det?"* med 4–5 fält att bekräfta. Inga tomma fält att fylla i.

### UI — `/profil`-sida

`app/(app)/profil/page.tsx`:

- Server-komponent som hämtar `firma_profil` + `firma_egenskap_källa`
- Renderar profilstyrka-hero + tabb-nav (samma struktur som mockupen `4_profil.html`)
- 6 tabbar i ordning: Företaget · Behörigheter · Team · Referenser · Benchmarks · Mallar
- I etapp A: bara Företaget-tabben är aktiv. Övriga tabbar visar "Kommer i nästa version"-platshållare.

`components/Profil/Företaget.tsx`:
- Visar alla fält från `firma_profil`
- Källtagg per fält baserat på `firma_egenskap_källa`
- Knapp **"Hämta uppdatering från Bolagsverket"** (top-höger)
- Inline-redigering på manuella fält (logotyp, miljöpolicy, verksamhetsområde)
- Drag-drop logo-uppladdning till Supabase Storage `firma-logos/`-bucket

### Profilstyrka-beräkning

Funktion i `lib/profilstyrka.ts`:

```ts
// Räknar 21 datapunkter. Returnerar 0–100.
// Uppdateras varje gång firma_profil eller relaterade tabeller skrivs till.
export function beräknaProfilstyrka(profil: FirmaProfil, certifikat: Cert[], team: Person[], referenser: Ref[], benchmarks: Benchmarks): number
```

Vikt per kategori (totalt 21 punkter):
- Grunddata Bolagsverket: 5 punkter
- Aktiva certifikat: 5 punkter (1 per certifikat-typ upp till 5)
- Team minst 3 montörer registrerade: 2 punkter
- Minst 3 referensprojekt med kund-godkännande: 3 punkter
- Logotyp + företagspresentation: 2 punkter
- Benchmarks (timpris, pålägg, marginal satta): 3 punkter
- Mallar (minst företagspresentation + 1 metodbeskrivning): 1 punkt

### PostHog-events (etapp A)

| Event | När |
|---|---|
| `profil_visad` | När `/profil`-sidan laddas |
| `profil_grunddata_hämtad` | När Bolagsverket-anrop lyckas |
| `profil_grunddata_misslyckades` | När fallback till allabolag.se behövs |
| `profil_logotyp_uppladdad` | När logo sparas |

### Acceptanskriterier — etapp A

- [ ] Ny användare som registrerar sig med org.nr får automatiskt `firma_profil`-raden ifylld
- [ ] `/profil` laddar utan fel för alla användare (även de som registrerat sig innan denna feature — kör backfill-migration)
- [ ] Källtaggar visas korrekt för varje fält (⚡ Bolagsverket / Manuellt)
- [ ] "Hämta uppdatering"-knappen funkar och skriver inte över manuellt redigerade fält (kontrollera mot `firma_egenskap_källa`)
- [ ] Profilstyrka beräknas och visas i hero — initialt ~25–30% på en ny profil
- [ ] Bygg är grön: `npm run build`

---

## Etapp B — Behörigheter + cert-extraktion

### Migration 013 — `certifikat`

```sql
CREATE TABLE certifikat (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id            UUID REFERENCES firma_profil(id) ON DELETE CASCADE,
  typ                 TEXT NOT NULL,         -- 'EL_KLASS_1', 'ANSVARSFORSAKRING', 'HETA_ARBETEN', 'ISO_9001', etc.
  namn                TEXT NOT NULL,         -- "Auktorisation EL klass 1"
  utfärdare           TEXT,                  -- "Elsäkerhetsverket"
  certifikat_nummer   TEXT,                  -- "2018-4471"
  utfärdat_datum      DATE,
  giltigt_t_o_m       DATE,
  belopp_msek         NUMERIC,               -- för försäkringar
  innehavare_person   TEXT,                  -- för personliga cert (Heta arbeten)
  fil_url             TEXT NOT NULL,         -- Supabase Storage path
  ai_extraherat_data  JSONB,                 -- rådata från AI-extraktionen
  ai_konfidensgrad    NUMERIC,               -- 0.0–1.0
  manuellt_bekräftat  BOOLEAN DEFAULT FALSE,
  skapad              TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certifikat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_egen" ON certifikat
  FOR ALL USING (firma_id IN (SELECT id FROM firma_profil WHERE användar_id = auth.uid()));

CREATE TRIGGER cert_ts BEFORE UPDATE ON certifikat
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();

CREATE INDEX cert_giltighet ON certifikat (giltigt_t_o_m) WHERE giltigt_t_o_m IS NOT NULL;
```

Storage-bucket: `firma-certifikat` (privat, max 10 MB, PDF + JPG + PNG).

### AI-extraktion

`lib/cert-extraction-agent.ts`:

```ts
export async function extraheraCertifikat(filUrl: string, mediaTyp: string): Promise<ExtraheradCert> {
  // 1. Hämta filen som base64
  // 2. Anropa Claude Sonnet 4 med structured output
  // 3. System prompt: "Du är expert på svenska elcertifikat. Extrahera följande
  //    fält ur dokumentet: typ, namn, utfärdare, nummer, datum, giltighet, belopp.
  //    Returnera JSON. Sätt konfidensgrad 0–1."
  // 4. Identifiera typ via mappning (Auktorisation EL klass 1 → 'EL_KLASS_1' etc.)
  // 5. Returnera strukturerat objekt + konfidensgrad
}
```

API-route `app/api/profil/cert/ladda-upp/route.ts`:
- Multipart upload, validera storlek + filtyp
- Spara till Supabase Storage
- Anropa `cert-extraction-agent`
- Skriv till `certifikat`-tabellen med extraherad data
- Returnera certifikat-objekt (UI uppdaterar listan)
- **`maxDuration: 60`** i vercel.json

### UI

`components/Profil/Behörigheter.tsx`:
- Drag-drop-zon (övre del av tabben) som accepterar 1+ filer
- Listar aktiva certifikat i ett 2-kolumns grid
- Färgkod: grön (>90 dagar kvar), orange (30–90 dagar), röd (<30 dagar)
- "Vad saknas"-kort längst ner som visar vad som skulle låsas upp av att ladda upp ISO 9001, BAS-P, ESA, etc.

### Cron — utgångskontroll

Daglig cron (samma `pg_cron`-mönster som Agent 5 om det redan finns):
- Identifiera certifikat med `giltigt_t_o_m < now() + 30 dagar`
- Logga PostHog-event `cert_går_ut_snart`
- Skicka mejl via Resend (mall: "Ditt certifikat X går ut om Y dagar")

### PostHog-events (etapp B)

| Event | När |
|---|---|
| `cert_uppladdad` | När fil drag-droppas |
| `cert_extraherat` | När AI-extraktion lyckas |
| `cert_extraktion_låg_konfidens` | När konfidens < 0.7 (kräver manuell bekräftelse) |
| `cert_borttaget` | När användaren raderar |
| `cert_går_ut_snart` | Daglig cron — för utgående cert |

### Acceptanskriterier — etapp B

- [ ] Drag-drop av PDF lyckas och AI extraherar minst 80% av fälten korrekt vid manuell test (testa med 5 olika cert-typer)
- [ ] Certifikat med konfidensgrad < 0.7 visas med "Bekräfta uppgifter"-prompt
- [ ] Färgkodning på dagar-kvar fungerar
- [ ] "Vad saknas"-kort visar relevanta cert som inte finns i listan
- [ ] Daglig cron triggar mejl när cert går ut inom 30 dagar
- [ ] Bygg är grön

---

## Etapp C — Team + Referenser

### Migration 014 — `team_person` + `referensprojekt`

```sql
CREATE TABLE team_person (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id              UUID REFERENCES firma_profil(id) ON DELETE CASCADE,
  namn                  TEXT NOT NULL,
  roll                  TEXT,
  ecy_certifierad       BOOLEAN DEFAULT FALSE,
  heta_arbeten_giltigt  DATE,
  esa_giltigt           DATE,
  bas_p                 BOOLEAN DEFAULT FALSE,
  bas_u                 BOOLEAN DEFAULT FALSE,
  specialkompetenser    TEXT[],          -- ['DALI', 'fiber', 'industri', 'BRF']
  beläggning_procent    INT DEFAULT 0,
  skapad                TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE team_person ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_egen" ON team_person
  FOR ALL USING (firma_id IN (SELECT id FROM firma_profil WHERE användar_id = auth.uid()));

CREATE TRIGGER team_ts BEFORE UPDATE ON team_person
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();

CREATE TABLE referensprojekt (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id              UUID REFERENCES firma_profil(id) ON DELETE CASCADE,
  projekt_id            UUID REFERENCES projekt(id) ON DELETE SET NULL, -- länk till vunnet anbud
  beställare            TEXT NOT NULL,
  scope                 TEXT NOT NULL,
  år                    INT NOT NULL,
  värde_kkr             INT,
  marginal_procent      NUMERIC,
  äta_procent           NUMERIC,
  projekttid_veckor     INT,
  kund_godkänner_referens BOOLEAN,        -- NULL = ej frågat, TRUE/FALSE = svar
  manuellt_tillagd      BOOLEAN DEFAULT FALSE,
  skapad                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE referensprojekt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_egen" ON referensprojekt
  FOR ALL USING (firma_id IN (SELECT id FROM firma_profil WHERE användar_id = auth.uid()));
```

### Auto-länk till vunna anbud

Vid status-ändring i `<UtfallsKnappar>` (Features #2):
- När anbud markeras som **vunnet** → automatiskt skapa `referensprojekt`-rad med data från `projekt`-tabellen
- `kund_godkänner_referens` lämnas som `NULL` (ej frågat)
- Visa i UI: *"📎 Lagt till som referens — ska vi fråga kunden om de godkänner?"*

### Team-import

`components/Profil/Team.tsx`:
- Tabell-vy enligt mockup
- "+ Ny person"-knapp öppnar dialog med 4 fält (namn, roll, ECY, specialkompetenser)
- "Importera från Fortnox"-knapp **låst i etapp C** (visa coming soon-tooltip)

### PostHog-events (etapp C)

| Event | När |
|---|---|
| `team_person_tillagd` | Manuell tilläggning |
| `referens_auto_skapad` | När vunnet anbud blir referens |
| `referens_kund_godkänd` | Toggle till "JA" |
| `referens_manuellt_tillagd` | Användaren lägger till |

### Acceptanskriterier — etapp C

- [ ] Markera ett anbud som vunnet → referensprojekt-rad skapas automatiskt
- [ ] Toggla "Kund godkänner som referens" funkar och sparas
- [ ] Lägga till team-person manuellt funkar
- [ ] Filtrera referenser efter typ (BRF / Service / Industri / etc.) i UI

---

## Etapp D — Benchmarks (AI-lärt)

### Migration 015 — `firma_benchmarks` + `benchmark_lärningslogg`

```sql
CREATE TABLE firma_benchmarks (
  firma_id                  UUID PRIMARY KEY REFERENCES firma_profil(id) ON DELETE CASCADE,
  standard_timpris          INT,                    -- kr/h, AI-beräknad
  standard_timpris_manuell  INT,                    -- om användaren satt manuellt
  materialpålägg_procent    NUMERIC,
  materialpålägg_manuell    NUMERIC,
  målmarginal_procent       NUMERIC,
  målmarginal_manuell       NUMERIC,
  äta_buffert_procent       NUMERIC,
  äta_buffert_manuell       NUMERIC,
  win_rate_brf              NUMERIC,
  win_rate_service          NUMERIC,
  win_rate_industri         NUMERIC,
  tidsestimat_bias_procent  NUMERIC,                -- positivt = du underskattar
  senaste_beräkning         TIMESTAMPTZ,
  baserat_på_antal_anbud    INT,
  uppdaterad                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE firma_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bench_egen" ON firma_benchmarks
  FOR ALL USING (firma_id IN (SELECT id FROM firma_profil WHERE användar_id = auth.uid()));

-- Append-only logg över hur AI har räknat. Visas i "Hur räknas detta?"-modal.
CREATE TABLE benchmark_lärningslogg (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id        UUID REFERENCES firma_profil(id) ON DELETE CASCADE,
  beräknad        TIMESTAMPTZ DEFAULT NOW(),
  benchmark_typ   TEXT NOT NULL,
  värde_före      NUMERIC,
  värde_efter     NUMERIC,
  baserat_på      JSONB,                            -- vilka anbud, vilka fält användes
  motivering      TEXT
);

ALTER TABLE benchmark_lärningslogg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bench_logg_egen" ON benchmark_lärningslogg
  FOR ALL USING (firma_id IN (SELECT id FROM firma_profil WHERE användar_id = auth.uid()));
```

### Beräkning

`lib/benchmark-agent.ts`:

```ts
// Triggas i tre lägen:
// 1. Nightly cron (för alla firmor med ≥5 avslutade anbud)
// 2. När ett anbud markeras vunnet/förlorat
// 3. Manuell trigger via "Räkna om benchmarks"-knapp

export async function beräknaBenchmarks(firmaId: string): Promise<Benchmarks> {
  // - Hämta alla projekt där win/loss-status är satt
  // - Filtrera på senaste 24 mån (rullande)
  // - För varje benchmark-typ:
  //   * Standard timpris = median av timpriser på vunna anbud
  //   * Materialpålägg = median av pålägg på vunna anbud
  //   * Målmarginal = AI-rekommenderar baserat på faktisk marginal vs planerad
  //   * Win rate per projekttyp = vunna / totala
  //   * Tidsestimat-bias = (faktiska timmar - planerade timmar) / planerade timmar
  // - Logga varje förändring i benchmark_lärningslogg
  // - Skriv över firma_benchmarks (manuella fält rörs ALDRIG)
}
```

### UI

`components/Profil/Benchmarks.tsx`:
- 6-kort-grid enligt mockup
- Varje kort visar AI-värdet med "Lärt från X anbud" som källa
- Om manuellt värde finns → visa båda, prioritera manuellt i kalkyler
- "Hur räknas detta?"-länk öppnar modal med data från `benchmark_lärningslogg`
- "Räkna om"-knapp triggar omberäkning

### Integration med kalkyl

I anbudskalkylen (Features #9 — Prisförslag): hämta från `firma_benchmarks` istället för hårdkodade defaults. Använd `_manuell` om satt, annars AI-värde.

### PostHog-events (etapp D)

| Event | När |
|---|---|
| `benchmark_beräknad` | När AI-omberäkning körs |
| `benchmark_manuellt_överskrivet` | När användaren sätter manuellt värde |
| `benchmark_lärningslogg_visad` | "Hur räknas detta?"-klick |

### Acceptanskriterier — etapp D

- [ ] Med ≥5 vunna anbud i historiken visas alla 6 benchmarks med riktig data
- [ ] Manuellt värde överstyr AI-värde i kalkyl-flödet
- [ ] "Hur räknas detta?"-modal visar minst de 5 senaste lärningsloggarna
- [ ] Nightly cron körs och loggar för alla aktiva firmor

---

## Etapp E — Mallar

### Migration 016 — `anbudsmall`

```sql
CREATE TABLE anbudsmall (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id        UUID REFERENCES firma_profil(id) ON DELETE CASCADE,
  typ             TEXT NOT NULL,        -- 'företagspresentation', 'metodbeskrivning_brf', etc.
  namn            TEXT NOT NULL,
  innehåll        TEXT NOT NULL,
  version         INT DEFAULT 1,
  använd_i_anbud  INT DEFAULT 0,
  senast_använd   TIMESTAMPTZ,
  skapad          TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE anbudsmall ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mall_egen" ON anbudsmall
  FOR ALL USING (firma_id IN (SELECT id FROM firma_profil WHERE användar_id = auth.uid()));

CREATE TRIGGER mall_ts BEFORE UPDATE ON anbudsmall
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();
```

### Auto-extraktion från genererade anbud

I anbudsgenereringsflödet:
- När användaren godkänner ett genererat anbud → erbjud "Spara företagspresentation som mall?"
- Om användaren accepterar → skapa eller versions-bumpa motsvarande `anbudsmall`-rad
- Visa subtilt: *"Sparat som v.4 av Företagspresentation"*

### UI

`components/Profil/Mallar.tsx`:
- Lista enligt mockup
- Klick öppnar mall i editor (textarea med syntax-highlight för Markdown)
- Versionshistorik tillgänglig via dropdown

### PostHog-events (etapp E)

| Event | När |
|---|---|
| `mall_skapad` | Ny mall sparas |
| `mall_versionsbump` | Existerande mall uppdateras |
| `mall_använd` | Mall återanvänds i anbud |

### Acceptanskriterier — etapp E

- [ ] Generera ett anbud → få fråga om att spara som mall
- [ ] Versions-bump fungerar när samma mall sparas igen
- [ ] Använd-räknaren ökar varje gång mall återanvänds
- [ ] Bygg är grön efter samtliga 5 etapper

---

## Vad som inte ingår — undvik scope creep

- **Onboarding-wizard / "kom igång"-flöde** — finns medvetet inte. Användaren registrerar sig, får värde direkt, profilen växer av sig själv.
- **Behörighetsroller inom team** — ej i profil-systemet. Hör hemma i Business-tier (separat senare).
- **Fortnox-integration** — Fortnox-knappen är låst i etapp C, byggs i separat sprint senare.
- **Underentreprenörsregister** — separat feature.
- **Multi-firma per användare** — en användare = ett företag. Inte i scope.
- **Export av profil till PDF** — vänta till feedback finns från riktiga användare.

---

## Validering — innan etapp markeras klar

1. **`npm run build`** — inga TypeScript-fel
2. **Live-test** — kör hela flödet i prod-likt läge, inte bara dev
3. **Acceptanskriterier** — checka av punkt för punkt mot listan i etappen
4. **PostHog** — verifiera att alla events i tabellen loggas
5. **Vän-check** — visa featuren för någon utanför projektet. Vad förstår de efter 60 sekunder utan introduktion?
6. **Mockup-jämförelse** — öppna `mockups/4_profil.html` parallellt med live-vyn. Identifiera 3 visuella avvikelser och åtgärda eller dokumentera bort.

---

## Hur du kör detta i Claude Code

```
Jag kör nu Etapp [A/B/C/D/E] av Features #11 — Profil-systemet
enligt PROMPT_profil_v1.md.

[Klistra in den specifika etappen]

Kör Plan mode först.
```

**Aldrig två etapper parallellt.** Varje etapp ska commitas och deployas separat så regressioner kan isoleras.

**Migrationer:** kör en åt gången i Supabase Dashboard SQL Editor enligt projektkonvention. Vänta på "Success" mellan varje.

**vercel.json:** glöm inte uppdatera `maxDuration` för nya routes (cert-uppladdning 60s, bolagsverket-hämtning 30s, benchmark-beräkning 60s).

---

## Designreferens

Mockup `mockups/4_profil.html` visar:
- Profilstyrka-hero med progress-cirkel + "jobb du kan/missar"
- 6 tabbar med badges för action-items
- Källtaggar (⚡ Bolagsverket / ⚡ AI-extraherat / Manuellt) på varje fält
- Drop-zone som hero-element för cert-uppladdning
- Färgsystem: orange = går ut snart, röd = utgånget, grön = giltigt
- "Värdeluckor"-kort istället för tomma fält

Designen följer befintlig SveBud-stil: navy-bakgrund, gul accent (#F5C400), DM Sans + JetBrains Mono. **Använd existerande designtokens från `app/globals.css`.**

---

*v1 — Megaprompt skapad 27 april 2026. 5 etapper. 5 migrationer (012–016). 7–8 dagars arbete. Levereras separat eller paketerat enligt prioritering i ROADMAP.md.*
