-- Block 3 – Agent 3: Jämförelse och kompletteringsbrev

CREATE TABLE IF NOT EXISTS jämförelse (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id            UUID REFERENCES projekt(id) ON DELETE CASCADE,
  anbud_ids             UUID[] NOT NULL,
  resultat              JSONB,
  sammanfattning        TEXT,
  rekommenderat_anbud   UUID REFERENCES anbud(id),
  status                TEXT DEFAULT 'ej_startad',
  kräver_granskning     BOOLEAN DEFAULT FALSE,
  granskningsorsaker    TEXT[],
  tokens_använda        INTEGER,
  varaktighet_ms        INTEGER,
  skapad                TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jämförelse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jämförelse_egna" ON jämförelse;
CREATE POLICY "jämförelse_egna" ON jämförelse
  FOR ALL USING (
    projekt_id IN (SELECT id FROM projekt WHERE användar_id = auth.uid())
  );

DROP TRIGGER IF EXISTS jämförelse_ts ON jämförelse;
CREATE TRIGGER jämförelse_ts
  BEFORE UPDATE ON jämförelse
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();

CREATE INDEX IF NOT EXISTS idx_jämförelse_projekt ON jämförelse(projekt_id);

-- Kompletteringsbrev
CREATE TABLE IF NOT EXISTS kompletteringsbrev (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id            UUID REFERENCES projekt(id) ON DELETE CASCADE,
  anbud_id              UUID REFERENCES anbud(id) ON DELETE CASCADE,
  ämne                  TEXT NOT NULL,
  brödtext              TEXT NOT NULL,
  mottagare_epost       TEXT,
  mottagare_namn        TEXT,
  status                TEXT DEFAULT 'utkast' CHECK (status IN ('utkast', 'godkänt', 'skickat', 'besvarat')),
  skickat_datum         TIMESTAMPTZ,
  svar_datum            TIMESTAMPTZ,
  svar_text             TEXT,
  skapad                TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kompletteringsbrev ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kompletteringsbrev_egna" ON kompletteringsbrev;
CREATE POLICY "kompletteringsbrev_egna" ON kompletteringsbrev
  FOR ALL USING (
    projekt_id IN (SELECT id FROM projekt WHERE användar_id = auth.uid())
  );

DROP TRIGGER IF EXISTS kompletteringsbrev_ts ON kompletteringsbrev;
CREATE TRIGGER kompletteringsbrev_ts
  BEFORE UPDATE ON kompletteringsbrev
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();
