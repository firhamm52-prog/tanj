-- Real likes, separate from the old rating scores. Run once in Supabase SQL Editor.
BEGIN;
CREATE TABLE public.tb_t_product_like (
 product_id text NOT NULL REFERENCES public.tb_m_product(id) ON DELETE CASCADE,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(product_id,account_id)
);
ALTER TABLE public.tb_t_product_like ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tb_t_product_like FROM anon,authenticated;
CREATE FUNCTION public.tanj_product_likes(pid text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('count',count(*),'mine',coalesce(bool_or(account_id=auth.uid()),false))
 FROM public.tb_t_product_like WHERE product_id=pid;
$$;
REVOKE ALL ON FUNCTION public.tanj_product_likes(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tanj_product_likes(text) TO anon,authenticated;
CREATE FUNCTION public.tanj_like_product(pid text, selected boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesi diperlukan.'; END IF;
 IF selected IS NULL THEN RAISE EXCEPTION 'Pilihan tidak valid.'; END IF;
 IF selected THEN
  IF NOT EXISTS(SELECT 1 FROM public.tb_m_product WHERE id=pid AND active) THEN RAISE EXCEPTION 'Produk tidak tersedia.'; END IF;
  INSERT INTO public.tb_t_product_like(product_id,account_id) VALUES(pid,auth.uid()) ON CONFLICT DO NOTHING;
 ELSE
  DELETE FROM public.tb_t_product_like WHERE product_id=pid AND account_id=auth.uid();
 END IF;
 RETURN public.tanj_product_likes(pid);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_like_product(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_like_product(text,boolean) TO authenticated;
COMMIT;
