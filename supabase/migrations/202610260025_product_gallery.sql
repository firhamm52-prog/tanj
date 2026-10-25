-- Validate gallery uploads; existing products keep their model/product fallback photos.
BEGIN;
ALTER FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) RENAME TO tanj_cms_save_before_gallery;
REVOKE ALL ON FUNCTION public.tanj_cms_save_before_gallery(text,text,jsonb,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_cms_save(kind text,content_id text,item jsonb,expected_revision integer,expected_stock integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE photo jsonb;
BEGIN
 IF NOT public.tanj_is_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan.'; END IF;
 IF kind IN ('products','hijabs') AND item ? 'gallery' THEN
  IF jsonb_typeof(item->'gallery') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Galeri harus berupa daftar foto.'; END IF;
  IF jsonb_array_length(item->'gallery')>10 THEN RAISE EXCEPTION 'Galeri maksimal 10 foto.'; END IF;
  FOR photo IN SELECT value FROM jsonb_array_elements(item->'gallery') LOOP
   IF jsonb_typeof(photo) IS DISTINCT FROM 'string' OR NOT public.tanj_cms_valid_media(photo#>>'{}')
    OR (photo#>>'{}') ~* '\.(mp4|webm|ogg)([?#]|$)' THEN RAISE EXCEPTION 'URL foto galeri tidak valid.'; END IF;
  END LOOP;
 END IF;
 RETURN public.tanj_cms_save_before_gallery(kind,content_id,item,expected_revision,expected_stock);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) TO authenticated;
COMMIT;
