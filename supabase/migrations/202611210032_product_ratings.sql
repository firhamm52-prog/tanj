-- Run once in Supabase SQL Editor. Real visitor ratings; not verified-purchase reviews.
BEGIN;
CREATE TABLE public.tb_t_product_rating (
 product_id text NOT NULL REFERENCES public.tb_m_product(id) ON DELETE CASCADE,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (product_id, account_id)
);
ALTER TABLE public.tb_t_product_rating ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tb_t_product_rating FROM anon, authenticated;
CREATE FUNCTION public.tanj_product_rating(pid text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('count',count(*),'average',coalesce(round(avg(stars),1),0),
 'mine',max(stars) FILTER (WHERE account_id=auth.uid()))
 FROM public.tb_t_product_rating WHERE product_id=pid;
$$;
REVOKE ALL ON FUNCTION public.tanj_product_rating(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tanj_product_rating(text) TO anon,authenticated;
CREATE FUNCTION public.tanj_rate_product(pid text, score integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesi diperlukan.'; END IF;
 IF score IS NULL OR score NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Pilih 1 sampai 5 bintang.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.tb_m_product WHERE id=pid AND active) THEN RAISE EXCEPTION 'Produk tidak tersedia.'; END IF;
 INSERT INTO public.tb_t_product_rating(product_id,account_id,stars) VALUES(pid,auth.uid(),score)
 ON CONFLICT(product_id,account_id) DO UPDATE SET stars=excluded.stars,updated_at=now();
 RETURN public.tanj_product_rating(pid);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_rate_product(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_rate_product(text,integer) TO authenticated;
COMMIT;
