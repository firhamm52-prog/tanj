-- Extend the existing video bucket to accept MOV/QuickTime. Run after SQL 026.
BEGIN;
UPDATE storage.buckets SET allowed_mime_types=ARRAY['video/mp4','video/webm','video/quicktime']
WHERE id='cms-videos';
ALTER POLICY tanj_cms_upload_videos ON storage.objects
WITH CHECK (
 bucket_id='cms-videos' AND public.tanj_is_admin()
 AND name ~ '^content/[a-f0-9-]{36}\.(mp4|webm|mov)$'
);
COMMIT;
