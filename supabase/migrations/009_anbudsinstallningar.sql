-- Anbudsinställningar: elfirmans standardvillkor för anbud
-- Ställs in EN GÅNG i profilen, används automatiskt i alla framtida anbud
ALTER TABLE profiler
ADD COLUMN IF NOT EXISTS anbudsinstallningar JSONB DEFAULT '{}';

-- Struktur:
-- {
--   "betalningsvillkor": "30 dagar netto",
--   "garanti": "2 år på utfört arbete, tillverkarens garanti på material",
--   "forbehall": ["Giltigt 30 dagar", "..."],
--   "ingar_ej": ["Målning/tapetsering", "..."],
--   "forutsattningar": ["Normal arbetstid 07-16", "..."],
--   "giltighetstid": "30 dagar",
--   "fragor_till_kund": ["Finns ritningar?", "..."],
--   "ovriga_instruktioner": "Vi skriver formellt..."
-- }
