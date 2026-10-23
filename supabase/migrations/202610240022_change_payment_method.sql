-- Recover an unused QRIS Snap session as VA without releasing stock or extending its deadline.
BEGIN;
CREATE FUNCTION public.tanj_midtrans_change_to_va(oid text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.tb_t_order; g public.tb_t_midtrans; d jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 SELECT * INTO o FROM public.tb_t_order WHERE id=oid FOR UPDATE;
 IF NOT FOUND OR o.data->>'status'<>'WAITING_PAYMENT'
 OR o.data#>>'{payment,provider}' IS DISTINCT FROM 'midtrans'
 OR o.data#>>'{payment,channel}' IS DISTINCT FROM 'qris'
 THEN RAISE EXCEPTION 'Metode pembayaran pesanan ini tidak dapat diubah.'; END IF;
 IF (o.data->>'deadline')::bigint <= extract(epoch FROM now())*1000
 THEN RAISE EXCEPTION 'Batas pembayaran telah lewat.'; END IF;
 SELECT * INTO g FROM public.tb_t_midtrans WHERE order_id=oid FOR UPDATE;
 IF FOUND AND g.state='creating' AND g.lease_until>now()
 THEN RAISE EXCEPTION 'Pembayaran sedang disiapkan. Coba lagi sebentar.'; END IF;
 d := jsonb_set(o.data,'{payment}',(o.data->'payment') ||
  jsonb_build_object('channel','va','name','Virtual Account','methodChanged',true));
 d := jsonb_set(d,'{version}',to_jsonb((d->>'version')::int+1));
 UPDATE public.tb_t_order SET data=d WHERE id=oid;
 -- Invalidate local references/attempts; the next same-order Snap creation revokes the unused token.
 UPDATE public.tb_t_midtrans SET redirect_url=NULL,snap_token=NULL,state='new',
  attempt_id=gen_random_uuid(),lease_until=NULL,updated_at=now() WHERE order_id=oid;
 RETURN d;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_midtrans_change_to_va(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tanj_midtrans_change_to_va(text) TO service_role;
COMMIT;
