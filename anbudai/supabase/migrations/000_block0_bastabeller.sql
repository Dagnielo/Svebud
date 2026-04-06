-- Block 0 – Hjälpfunktion och bastabeller (kör ALLRA FÖRST)

CREATE OR REPLACE FUNCTION uppdatera_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.uppdaterad = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Projekt-tabell
CREATE TABLE IF NOT EXISTS projekt (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  användar_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  namn                            TEXT NOT NULL,
  beskrivning                     TEXT,
  förfrågningsunderlag_text       TEXT,
  förfrågningsunderlag_fil        TEXT,
  jämförelse_resultat             JSONB,
  jämförelse_status               TEXT DEFAULT 'ej_startad',
  jämförelse_kräver_granskning    BOOLEAN DEFAULT FALSE,
  jämförelse_granskningsorsaker   TEXT[],
  rekommendation                  JSONB,
  rekommendation_status           TEXT DEFAULT 'ej_startad',
  rekommendation_kräver_granskning BOOLEAN DEFAULT FALSE,
  rekommendation_granskningsorsaker TEXT[],
  tier                            TEXT DEFAULT 'trial',
  stripe_customer_id              TEXT,
  stripe_subscription_id          TEXT,
  prenumeration_status            TEXT DEFAULT 'trial',
  dokument_typ                    TEXT DEFAULT 'anbud'
                                  CHECK (dokument_typ IN ('anbud', 'offert', 'offertbekraftelse')),
  analys_komplett                 BOOLEAN DEFAULT NULL,
  saknade_falt                    TEXT[] DEFAULT '{}',
  lägsta_konfidens                INTEGER DEFAULT NULL,
  gron_teknik                     BOOLEAN DEFAULT false,
  gron_teknik_typ                 TEXT[] DEFAULT '{}',
  skapad                          TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad                      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projekt ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projekt_egna" ON projekt;
CREATE POLICY "projekt_egna" ON projekt
  FOR ALL USING (användar_id = auth.uid());

DROP TRIGGER IF EXISTS projekt_ts ON projekt;
CREATE TRIGGER projekt_ts
  BEFORE UPDATE ON projekt
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();

-- Lägg till kolumner som kanske saknas från tidigare körningar
ALTER TABLE projekt ADD COLUMN IF NOT EXISTS dokument_typ TEXT DEFAULT 'anbud';
ALTER TABLE projekt ADD COLUMN IF NOT EXISTS analys_komplett BOOLEAN DEFAULT NULL;
ALTER TABLE projekt ADD COLUMN IF NOT EXISTS saknade_falt TEXT[] DEFAULT '{}';
ALTER TABLE projekt ADD COLUMN IF NOT EXISTS lägsta_konfidens INTEGER DEFAULT NULL;
ALTER TABLE projekt ADD COLUMN IF NOT EXISTS gron_teknik BOOLEAN DEFAULT false;
ALTER TABLE projekt ADD COLUMN IF NOT EXISTS gron_teknik_typ TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_projekt_inkomplett
ON projekt (analys_komplett) WHERE analys_komplett = false;

-- Profiler-tabell (kopplar Stripe till användare)
CREATE TABLE IF NOT EXISTS profiler (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fullnamn            TEXT,
  företag             TEXT,
  epost               TEXT,
  tier                TEXT DEFAULT 'trial',
  stripe_customer_id  TEXT,
  skapad              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiler ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiler_egna" ON profiler;
CREATE POLICY "profiler_egna" ON profiler
  FOR ALL USING (id = auth.uid());
