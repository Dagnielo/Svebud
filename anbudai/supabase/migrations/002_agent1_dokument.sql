-- Block 2 – Agent 1: Dokumenthantering och storage

-- Storage bucket-policy (RLS för anbudsdokument-bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anbudsdokument',
  'anbudsdokument',
  false,
  20971520, -- 20 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: användare kan ladda upp till sin egen mapp
DROP POLICY IF EXISTS "upload_egna_filer" ON storage.objects;
CREATE POLICY "upload_egna_filer" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'anbudsdokument' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "läs_egna_filer" ON storage.objects;
CREATE POLICY "läs_egna_filer" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'anbudsdokument' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "ta_bort_egna_filer" ON storage.objects;
CREATE POLICY "ta_bort_egna_filer" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'anbudsdokument' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Dokumentbearbetnings-status
ALTER TABLE anbud
ADD COLUMN IF NOT EXISTS bearbetning_startad TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bearbetning_klar TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS antal_sidor INTEGER,
ADD COLUMN IF NOT EXISTS inläsningsmetod TEXT CHECK (inläsningsmetod IN ('pdf-parse', 'mammoth', 'xlsx', 'manuell'));
