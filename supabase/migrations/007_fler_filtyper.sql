-- Block 7 – Utöka tillåtna filtyper i storage bucket

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/xml',
  'application/xml',
  'text/plain',
  'text/csv',
  'text/html',
  'message/rfc822',
  'application/vnd.ms-outlook',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/octet-stream'
]
WHERE id = 'anbudsdokument';
