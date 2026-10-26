-- Website videos use their own bucket; product image uploads retain the 5 MB limit.
BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('cms-videos','cms-videos',true,52428800,ARRAY['video/mp4','video/webm'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=EXCLUDED.file_size_limit,
 allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY tanj_cms_upload_videos ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
 bucket_id='cms-videos' AND public.tanj_is_admin()
 AND name ~ '^content/[a-f0-9-]{36}\.(mp4|webm)$'
);
COMMIT;
