-- Ta bort gammal constraint och lägg till utökad
ALTER TABLE anbud DROP CONSTRAINT IF EXISTS "anbud_inläsningsmetod_check";
ALTER TABLE anbud ADD CONSTRAINT "anbud_inläsningsmetod_check"
  CHECK (inläsningsmetod IN ('pdf-parse', 'mammoth', 'xlsx', 'manuell', 'claude-direkt', 'text-extract', 'claude-pdf'));
