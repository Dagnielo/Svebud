-- Block 6 – Utökad företagsprofil för kravmatchning

ALTER TABLE profiler
ADD COLUMN IF NOT EXISTS telefon TEXT,
ADD COLUMN IF NOT EXISTS org_nr TEXT,
ADD COLUMN IF NOT EXISTS adress TEXT,
ADD COLUMN IF NOT EXISTS postnr TEXT,
ADD COLUMN IF NOT EXISTS ort TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS antal_montorer INTEGER,
ADD COLUMN IF NOT EXISTS omsattning_msek NUMERIC,
ADD COLUMN IF NOT EXISTS timpris_standard INTEGER,
ADD COLUMN IF NOT EXISTS timpris_jour INTEGER,
ADD COLUMN IF NOT EXISTS timpris_ob INTEGER,
ADD COLUMN IF NOT EXISTS onboarding_klar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certifikat JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS erfarenhet TEXT[] DEFAULT '{}';

-- Certifikat JSONB-struktur:
-- [
--   { "namn": "Auktorisation AL", "uppfyllt": true, "giltig_till": "2026-12-31" },
--   { "namn": "SSG Entre", "uppfyllt": true },
--   { "namn": "ID06", "uppfyllt": true },
--   ...
-- ]

-- Pipeline-status på projekt
ALTER TABLE projekt
ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'inkorg'
  CHECK (pipeline_status IN ('inkorg', 'under_arbete', 'inskickat', 'tilldelning')),
ADD COLUMN IF NOT EXISTS tilldelning_status TEXT
  CHECK (tilldelning_status IN ('vantar', 'vunnet', 'forlorat')),
ADD COLUMN IF NOT EXISTS anbudsutkast TEXT,
ADD COLUMN IF NOT EXISTS anbudsutkast_redigerat TEXT,
ADD COLUMN IF NOT EXISTS bilagor JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS skickat_datum TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tilldelning_datum TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kravmatchning JSONB;
