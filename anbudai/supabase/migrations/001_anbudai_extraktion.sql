-- Block 1 – Anbud och extraktionslogg

CREATE TABLE IF NOT EXISTS anbud (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id            UUID REFERENCES projekt(id) ON DELETE CASCADE,
  filnamn               TEXT NOT NULL,
  filtyp                TEXT,
  filstorlek            INTEGER,
  storage_path          TEXT,
  rå_text               TEXT,
  extraherad_data       JSONB,
  extraktion_status     TEXT DEFAULT 'väntar',
  konfidensvärden       JSONB,
  kund_typ              TEXT CHECK (kund_typ IN ('konsument', 'naringsidkare', 'brf')),
  rot_tillämpligt       BOOLEAN DEFAULT false,
  gron_teknik_tillämpligt BOOLEAN DEFAULT false,
  gron_teknik_typ       TEXT,
  foreslaget_avtalsvillkor TEXT,
  skapad                TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE anbud ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anbud_egna" ON anbud;
CREATE POLICY "anbud_egna" ON anbud
  FOR ALL USING (
    projekt_id IN (SELECT id FROM projekt WHERE användar_id = auth.uid())
  );

DROP TRIGGER IF EXISTS anbud_ts ON anbud;
CREATE TRIGGER anbud_ts
  BEFORE UPDATE ON anbud
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();

CREATE INDEX IF NOT EXISTS idx_anbud_projekt ON anbud(projekt_id);

-- Extraktionslogg för felsökning
CREATE TABLE IF NOT EXISTS extraktion_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbud_id          UUID REFERENCES anbud(id) ON DELETE CASCADE,
  steg              TEXT NOT NULL,
  status            TEXT DEFAULT 'startad',
  meddelande        TEXT,
  tokens_använda    INTEGER,
  varaktighet_ms    INTEGER,
  skapad            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE extraktion_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "extraktion_log_egna" ON extraktion_log;
CREATE POLICY "extraktion_log_egna" ON extraktion_log
  FOR ALL USING (
    anbud_id IN (
      SELECT a.id FROM anbud a
      JOIN projekt p ON a.projekt_id = p.id
      WHERE p.användar_id = auth.uid()
    )
  );
