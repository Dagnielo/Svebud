-- Block 5 – Agent 5: Uppföljning (state machine + cron)

CREATE TABLE IF NOT EXISTS uppföljning (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id            UUID REFERENCES projekt(id) ON DELETE CASCADE,
  anbud_id              UUID REFERENCES anbud(id) ON DELETE CASCADE,
  state                 TEXT DEFAULT 'anbud_skickat'
                        CHECK (state IN (
                          'anbud_skickat',
                          'påminnelse_1_schemalagd',
                          'påminnelse_1_skickad',
                          'påminnelse_2_schemalagd',
                          'påminnelse_2_skickad',
                          'svar_mottaget',
                          'vunnet',
                          'förlorat',
                          'avbrutet'
                        )),
  sista_anbudsdag       DATE,
  nästa_åtgärd          TIMESTAMPTZ,
  nästa_åtgärd_typ      TEXT,
  påminnelse_1_skickad  TIMESTAMPTZ,
  påminnelse_2_skickad  TIMESTAMPTZ,
  svar_datum            TIMESTAMPTZ,
  svar_text             TEXT,
  utfall                TEXT CHECK (utfall IN ('vunnet', 'förlorat', 'inget_svar')),
  utfall_kommentar      TEXT,
  skapad                TIMESTAMPTZ DEFAULT NOW(),
  uppdaterad            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE uppföljning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uppföljning_egna" ON uppföljning;
CREATE POLICY "uppföljning_egna" ON uppföljning
  FOR ALL USING (
    projekt_id IN (SELECT id FROM projekt WHERE användar_id = auth.uid())
  );

DROP TRIGGER IF EXISTS uppföljning_ts ON uppföljning;
CREATE TRIGGER uppföljning_ts
  BEFORE UPDATE ON uppföljning
  FOR EACH ROW EXECUTE FUNCTION uppdatera_timestamp();

CREATE INDEX IF NOT EXISTS idx_uppföljning_projekt ON uppföljning(projekt_id);
CREATE INDEX IF NOT EXISTS idx_uppföljning_nästa ON uppföljning(nästa_åtgärd)
  WHERE state NOT IN ('vunnet', 'förlorat', 'avbrutet');

-- Uppföljningslogg (varje skickad påminnelse/åtgärd)
CREATE TABLE IF NOT EXISTS uppföljning_logg (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uppföljning_id        UUID REFERENCES uppföljning(id) ON DELETE CASCADE,
  händelse              TEXT NOT NULL,
  detaljer              JSONB,
  epost_skickad_till    TEXT,
  skapad                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE uppföljning_logg ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uppföljning_logg_egna" ON uppföljning_logg;
CREATE POLICY "uppföljning_logg_egna" ON uppföljning_logg
  FOR ALL USING (
    uppföljning_id IN (
      SELECT u.id FROM uppföljning u
      JOIN projekt p ON u.projekt_id = p.id
      WHERE p.användar_id = auth.uid()
    )
  );
