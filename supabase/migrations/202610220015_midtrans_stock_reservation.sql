-- New Midtrans orders reserve inventory only when payment preparation begins.
-- Legacy orders retain their existing reservations and amounts.
BEGIN;
ALTER TABLE public.tb_t_midtrans ADD COLUMN stock_reserved boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.tanj_create_order(request_id uuid, customer jsonb, lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; i jsonb; oid text := 'TANJ-'||upper(request_id::text);
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login terlebih dahulu.'; END IF;
 PERFORM pg_advisory_xact_lock(818263);
 SELECT data INTO d FROM public.tb_t_order WHERE id=oid AND account_id=auth.uid();
 IF FOUND THEN RETURN d; END IF;
 IF customer->>'paymentMethod' = 'midtrans' THEN
  d := public.tanj_create_order_before_midtrans(request_id,jsonb_set(customer,'{paymentMethod}','"qris-manual"'),lines);
  -- The trusted legacy checkout validates prices, shipping and quantities, and reserves stock.
  -- Undo that reservation in this same transaction; no other checkout sees the temporary debit.
  FOR i IN SELECT value FROM jsonb_array_elements(d->'items') LOOP
   UPDATE public.tb_m_product SET stock=stock+(i->>'qty')::int WHERE id=i->>'id';
  END LOOP;
  d := d || jsonb_build_object('payment',jsonb_build_object('id','midtrans','name','Midtrans','provider','midtrans'),
    'adjustment',0,'code',0,'total',(d->>'subtotal')::bigint + (d#>>'{shipping,fee}')::bigint);
  UPDATE public.tb_t_order SET data=d WHERE id=oid;
  INSERT INTO public.tb_t_midtrans(order_id,stock_reserved) VALUES(oid,false);
 ELSE
  d := public.tanj_create_order_before_midtrans(request_id,customer,lines);
 END IF;
 RETURN d;
END; $$;

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
 IF g.redirect_url IS NOT NULL THEN RETURN jsonb_build_object('redirect_url',g.redirect_url); END IF;
 IF g.state='creating' THEN
  IF g.lease_until>now() THEN RAISE EXCEPTION 'Pembayaran sedang disiapkan. Coba lagi sebentar.'; END IF;
  RAISE EXCEPTION 'Status pembuatan pembayaran belum pasti. Hubungi admin dengan nomor pesanan.';
 END IF;
 IF NOT g.stock_reserved THEN
  FOR i IN SELECT value FROM jsonb_array_elements(o.data->'items') LOOP
   UPDATE public.tb_m_product SET stock=stock-(i->>'qty')::int
    WHERE id=i->>'id' AND active AND stock>=(i->>'qty')::int;
   IF NOT FOUND THEN RAISE EXCEPTION '% sudah diorder', coalesce(i->>'name',i->>'id'); END IF;
  END LOOP;
 END IF;
 UPDATE public.tb_t_midtrans SET stock_reserved=true,state='creating',lease_until=now()+interval '1 minute',updated_at=now() WHERE order_id=oid;
 RETURN jsonb_build_object('order',o.data);
END; $$;

ALTER FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) RENAME TO tanj_midtrans_gateway_before_reservation;
REVOKE ALL ON FUNCTION public.tanj_midtrans_gateway_before_reservation(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_midtrans_gateway(oid text, operation text, details jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.tb_t_order; g public.tb_t_midtrans; i jsonb; result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 SELECT * INTO o FROM public.tb_t_order WHERE id=oid FOR UPDATE;
 SELECT * INTO g FROM public.tb_t_midtrans WHERE order_id=oid FOR UPDATE;
 IF o.id IS NULL OR g.order_id IS NULL OR o.data#>>'{payment,provider}' IS DISTINCT FROM 'midtrans'
 THEN RAISE EXCEPTION 'Pesanan Midtrans tidak ditemukan.'; END IF;
 IF operation='creation_rejected' THEN
  -- Called only for a definitive provider rejection, never a timeout or uncertain result.
  IF g.state='creating' AND g.redirect_url IS NULL AND o.data->>'status'='WAITING_PAYMENT' THEN
   IF g.stock_reserved THEN
    FOR i IN SELECT value FROM jsonb_array_elements(o.data->'items') LOOP
     UPDATE public.tb_m_product SET stock=stock+(i->>'qty')::int WHERE id=i->>'id';
    END LOOP;
   END IF;
   UPDATE public.tb_t_midtrans SET stock_reserved=false,state='new',lease_until=NULL,updated_at=now() WHERE order_id=oid;
  END IF;
  RETURN jsonb_build_object('status',o.data->>'status');
 END IF;
 IF operation='redirect' AND (NOT g.stock_reserved OR o.data->>'status'<>'WAITING_PAYMENT') THEN
  RAISE EXCEPTION 'Reservasi pembayaran tidak aktif.';
 END IF;
 IF operation='status' AND o.data->>'status' NOT IN ('PAID','CANCELLED') THEN
  IF details->>'transaction_status' IN ('settlement','capture') AND NOT g.stock_reserved THEN
   RAISE EXCEPTION 'Pembayaran tanpa reservasi stok. Hubungi admin.';
  END IF;
  -- Legacy terminal handling restores inventory; skip it when nothing was reserved.
  IF details->>'transaction_status' IN ('expire','cancel','deny','failure') AND NOT g.stock_reserved THEN
   -- Nothing was sent to Midtrans for these orders; do not accept a terminal mutation.
   RETURN jsonb_build_object('status',o.data->>'status');
  END IF;
 END IF;
 result := public.tanj_midtrans_gateway_before_reservation(oid,operation,details);
 IF operation='status' AND result->>'status' IN ('PAID','CANCELLED') THEN
  UPDATE public.tb_t_midtrans SET stock_reserved=false WHERE order_id=oid;
 END IF;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) TO service_role;
COMMIT;
