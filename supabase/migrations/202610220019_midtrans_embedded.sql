-- Embedded Snap sessions and same-order recovery after an interrupted creation attempt.
BEGIN;
ALTER TABLE public.tb_t_midtrans ADD COLUMN snap_token text, ADD COLUMN attempt_id uuid;

CREATE OR REPLACE FUNCTION public.tanj_midtrans_prepare(oid text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.tb_t_order; g public.tb_t_midtrans; i jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 SELECT * INTO o FROM public.tb_t_order WHERE id=oid FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR o.account_id<>auth.uid() THEN RAISE EXCEPTION 'Pesanan tidak ditemukan.'; END IF;
 IF o.data#>>'{payment,provider}' IS DISTINCT FROM 'midtrans' OR o.data->>'status'<>'WAITING_PAYMENT'
 THEN RAISE EXCEPTION 'Pesanan tidak dapat dibayar melalui Midtrans.'; END IF;
 IF (o.data->>'deadline')::bigint <= extract(epoch from now())*1000 THEN RAISE EXCEPTION 'Batas pembayaran telah lewat. Hubungi admin.'; END IF;
 INSERT INTO public.tb_t_midtrans(order_id) VALUES(oid) ON CONFLICT DO NOTHING;
 SELECT * INTO g FROM public.tb_t_midtrans WHERE order_id=oid FOR UPDATE;
 IF g.redirect_url IS NOT NULL THEN RETURN jsonb_build_object('redirect_url',g.redirect_url,'snap_token',g.snap_token); END IF;
 IF g.state='creating' THEN
  IF g.lease_until>now() THEN RAISE EXCEPTION 'Pembayaran sedang disiapkan. Coba lagi sebentar.'; END IF;
  -- Reuse the same provider order ID after the lease. Snap invalidates unused tokens
  -- and refuses to recreate an order that has already entered payment/settlement.
  NULL;
 END IF;
 IF NOT g.stock_reserved THEN
  FOR i IN SELECT value FROM jsonb_array_elements(o.data->'items') LOOP
   UPDATE public.tb_m_product SET stock=stock-(i->>'qty')::int
    WHERE id=i->>'id' AND active AND stock>=(i->>'qty')::int;
   IF NOT FOUND THEN RAISE EXCEPTION '% sudah diorder', coalesce(i->>'name',i->>'id'); END IF;
  END LOOP;
 END IF;
 UPDATE public.tb_t_midtrans SET stock_reserved=true,state='creating',attempt_id=gen_random_uuid(),lease_until=now()+interval '1 minute',updated_at=now() WHERE order_id=oid;
 RETURN jsonb_build_object('order',o.data,'attemptId',(SELECT attempt_id FROM public.tb_t_midtrans WHERE order_id=oid));
END; $$;

ALTER FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) RENAME TO tanj_midtrans_gateway_before_embed;
REVOKE ALL ON FUNCTION public.tanj_midtrans_gateway_before_embed(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_midtrans_gateway(oid text, operation text, details jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 IF operation IN ('redirect','creation_rejected') AND details ? 'attemptId' AND
 (details->>'attemptId') IS DISTINCT FROM (SELECT attempt_id::text FROM public.tb_t_midtrans WHERE order_id=oid)
 THEN RAISE EXCEPTION 'Percobaan pembayaran sudah berubah. Muat ulang pembayaran.'; END IF;
 IF operation='redirect' AND details ? 'token' AND details->>'token' IS NOT NULL
 AND details->>'token' !~ '^[a-fA-F0-9-]{36}$' THEN RAISE EXCEPTION 'Token pembayaran tidak valid.'; END IF;
 result := public.tanj_midtrans_gateway_before_embed(oid,operation,details);
 IF operation='redirect' THEN
  UPDATE public.tb_t_midtrans SET snap_token=details->>'token' WHERE order_id=oid;
 END IF;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) TO service_role;
COMMIT;
