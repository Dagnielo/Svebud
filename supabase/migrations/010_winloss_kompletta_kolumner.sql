-- Migration 010 — Win/Loss UI: kompletta kolumner + stavningsfix + backfill
-- Körs manuellt via Supabase Dashboard SQL Editor (per CLAUDE.md)

-- 1) Drop befintlig CHECK constraint på tilldelning_status (har 'forlorat' utan ö från migration 006)
ALTER TABLE projekt DROP CONSTRAINT IF EXISTS projekt_tilldelning_status_check;

-- 2) Migrera ev. befintliga 'forlorat'-rader till 'förlorat' (med ö, matchar uppföljning.utfall)
UPDATE projekt SET tilldelning_status = 'förlorat'
  WHERE tilldelning_status = 'forlorat';

-- 3) Lägg till ny CHECK constraint med korrekt stavning (idempotent — drop igen om finns)
ALTER TABLE projekt DROP CONSTRAINT IF EXISTS projekt_tilldelning_status_check;
ALTER TABLE projekt
  ADD CONSTRAINT projekt_tilldelning_status_check
    CHECK (tilldelning_status IS NULL
        OR tilldelning_status IN ('vantar', 'vunnet', 'förlorat'));

-- 4) Lägg till saknade kolumner
ALTER TABLE projekt
  ADD COLUMN IF NOT EXISTS tilldelning_notering TEXT,
  ADD COLUMN IF NOT EXISTS vinnande_pris INTEGER;

-- 5) Backfill från uppföljning.utfall till projekt.tilldelning_status
--    (bara där projekt ännu inte har egen tilldelning_status satt)
--    Skippar 'inget_svar' eftersom det inte är ett utfall
-- ANTAGANDE: 1 uppföljnings-rad per projekt. Om det ändras: lägg till ORDER BY + LIMIT 1 i subquery.
UPDATE projekt p
SET tilldelning_status = u.utfall,
    tilldelning_datum    = COALESCE(p.tilldelning_datum, u.svar_datum),
    tilldelning_notering = COALESCE(p.tilldelning_notering, u.utfall_kommentar),
    pipeline_status      = 'tilldelning'
FROM uppföljning u
WHERE u.projekt_id = p.id
  AND u.utfall IN ('vunnet', 'förlorat')
  AND p.tilldelning_status IS NULL;
