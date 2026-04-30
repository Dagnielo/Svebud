-- Migration 012 — Profil Etapp A: firma_profil + firma_egenskap_källa
-- Spec: docs/PROMPT_profil_v1.md (Etapp A)
-- Datum: 1 maj 2026

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
