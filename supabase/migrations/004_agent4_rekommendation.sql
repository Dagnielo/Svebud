-- Block 4 – Agent 4: Rekommendation och branschbenchmark

CREATE TABLE IF NOT EXISTS rekommendation (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id            UUID REFERENCES projekt(id) ON DELETE CASCADE,
  go_no_go              TEXT CHECK (go_no_go IN ('GO', 'NO-GO', 'PRELIMINÄRT')),
  badge_färg            TEXT CHECK (badge_färg IN ('grön', 'röd', 'gul')),
  rubrik                TEXT,
  sammanfattning        TEXT,
  kalkyl                JSONB,
  anbudsdokument        TEXT,
  exporterat_pdf_path   TEXT,
  certifikat_uppfyllda  JSONB,
  status                TEXT DEFAULT 'ej_startad',
  kräver_granskning     BOOLEAN DEFAULT FALSE,
  granskningsorsaker    TEXT[],
  tokens_använda        INTEGER,
  varaktighet_ms        INTEGER,
  skapad                TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rekommendation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rekommendation_egna" ON rekommendation;
CREATE POLICY "rekommendation_egna" ON rekommendation
  FOR ALL USING (
    projekt_id IN (SELECT id FROM projekt WHERE användar_id = auth.uid())
  );

DROP TRIGGER IF EXISTS rekommendation_ts ON rekommendation;
CREATE TRIGGER rekommendation_ts
  BEFORE UPDATE ON rekommendation
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();

CREATE INDEX IF NOT EXISTS idx_rekommendation_projekt ON rekommendation(projekt_id);

-- Branschbenchmark (referensdata för Go/No-Go)
CREATE TABLE IF NOT EXISTS bransch_benchmark (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori              TEXT NOT NULL,
  underkategori         TEXT,
  medel_timpris         NUMERIC,
  medel_materialkostnad NUMERIC,
  medel_marginal        NUMERIC,
  region                TEXT,
  källa                 TEXT,
  gäller_från           DATE,
  gäller_till           DATE,
  skapad                TIMESTAMPTZ DEFAULT NOW()
);

-- Benchmark är läs-only för alla autentiserade användare
ALTER TABLE bransch_benchmark ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "benchmark_läs" ON bransch_benchmark;
CREATE POLICY "benchmark_läs" ON bransch_benchmark
  FOR SELECT USING (auth.role() = 'authenticated');
