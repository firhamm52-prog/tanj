-- Public product photos; uploads require a signed-in TANJ admin.
BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('cms-media','cms-media',true,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=EXCLUDED.file_size_limit,
 allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE POLICY tanj_cms_upload_images ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
 bucket_id='cms-media' AND public.tanj_is_admin()
 AND name ~ '^products/[a-f0-9-]{36}\.(jpg|png|webp)$'
);
COMMIT;
