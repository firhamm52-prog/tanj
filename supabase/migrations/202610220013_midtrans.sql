-- Midtrans Snap: server-owned amount, private gateway state, verified settlement.
BEGIN;
ALTER FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) RENAME TO tanj_create_order_before_midtrans;
REVOKE ALL ON FUNCTION public.tanj_create_order_before_midtrans(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tanj_create_order(request_id uuid, customer jsonb, lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; oid text := 'TANJ-'||upper(request_id::text);
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login terlebih dahulu.'; END IF;
 PERFORM pg_advisory_xact_lock(818263);
 SELECT data INTO d FROM public.tb_t_order WHERE id=oid AND account_id=auth.uid();
 IF FOUND THEN RETURN d; END IF;
 IF customer->>'paymentMethod' = 'midtrans' THEN
  d := public.tanj_create_order_before_midtrans(request_id,jsonb_set(customer,'{paymentMethod}','"qris-manual"'),lines);
  d := d || jsonb_build_object('payment',jsonb_build_object('id','midtrans','name','Midtrans','provider','midtrans'));
  UPDATE public.tb_t_order SET data=d WHERE id=oid;
 ELSE
  d := public.tanj_create_order_before_midtrans(request_id,customer,lines);
 END IF;
 RETURN d;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) TO authenticated;

CREATE TABLE public.tb_t_midtrans (
 order_id text PRIMARY KEY REFERENCES public.tb_t_order(id),
 state text NOT NULL DEFAULT 'new', redirect_url text, lease_until timestamptz,
 verified_status text, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tb_t_midtrans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tb_t_midtrans FROM PUBLIC,anon,authenticated,service_role;

-- Invoked with the actual customer's JWT by the edge function.
CREATE FUNCTION public.tanj_midtrans_prepare(oid text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.tb_t_order; g public.tb_t_midtrans;
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
 IF g.lease_until>now() THEN RAISE EXCEPTION 'Pembayaran sedang disiapkan. Coba lagi sebentar.'; END IF;
 UPDATE public.tb_t_midtrans SET state='creating',lease_until=now()+interval '1 minute',updated_at=now() WHERE order_id=oid;
 RETURN jsonb_build_object('order',o.data);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_midtrans_prepare(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_midtrans_prepare(text) TO authenticated;

CREATE FUNCTION public.tanj_midtrans_gateway(oid text, operation text, details jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.tb_t_order; d jsonb; st text; stamp bigint := (extract(epoch from now())*1000)::bigint; i jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 SELECT * INTO o FROM public.tb_t_order WHERE id=oid FOR UPDATE;
 IF NOT FOUND OR o.data#>>'{payment,provider}' IS DISTINCT FROM 'midtrans'
 OR NOT EXISTS(SELECT 1 FROM public.tb_t_midtrans WHERE order_id=oid) THEN RAISE EXCEPTION 'Pesanan Midtrans tidak ditemukan.'; END IF;
 d:=o.data;
 IF operation='redirect' THEN
  IF details->>'url' !~ '^https://app(\.sandbox)?\.midtrans\.com/snap/' THEN RAISE EXCEPTION 'URL pembayaran tidak valid.'; END IF;
  UPDATE public.tb_t_midtrans SET redirect_url=details->>'url',state='pending',lease_until=NULL,updated_at=now() WHERE order_id=oid;
 ELSIF operation='status' THEN
  IF details->>'order_id' IS DISTINCT FROM oid OR (details->>'gross_amount')::numeric IS DISTINCT FROM (d->>'total')::numeric
    OR coalesce(details->>'currency','IDR')<>'IDR' THEN RAISE EXCEPTION 'Nominal pembayaran tidak cocok.'; END IF;
  st:=details->>'transaction_status';
  IF d->>'status' IN ('PAID','CANCELLED') THEN RETURN jsonb_build_object('status',d->>'status'); END IF;
  IF st='settlement' OR (st='capture' AND details->>'fraud_status'='accept') THEN
   d:= d || jsonb_build_object('status','PAID','version',(d->>'version')::int+1,
    'gatewayVerified',true,'review',jsonb_build_object('reference',details->>'transaction_id','amount',d->'total','admin','Midtrans','paidAt',stamp),
    'logs',coalesce(d->'logs','[]')||jsonb_build_array(jsonb_build_object('from',d->>'status','to','PAID','actor','Midtrans','at',stamp,'note','Pembayaran diverifikasi melalui API Midtrans.')));
  ELSIF st IN ('expire','cancel','deny','failure') THEN
   FOR i IN SELECT value FROM jsonb_array_elements(d->'items') LOOP
    UPDATE public.tb_m_product SET stock=stock+(i->>'qty')::int WHERE id=i->>'id';
   END LOOP;
   d:=d||jsonb_build_object('status','CANCELLED','version',(d->>'version')::int+1,
    'logs',coalesce(d->'logs','[]')||jsonb_build_array(jsonb_build_object('from',d->>'status','to','CANCELLED','actor','Midtrans','at',stamp,'note','Pembayaran berakhir di Midtrans; stok dikembalikan.')));
  END IF;
  UPDATE public.tb_t_order SET data=d WHERE id=oid;
  UPDATE public.tb_t_midtrans SET verified_status=st,updated_at=now() WHERE order_id=oid;
 ELSE RAISE EXCEPTION 'Operasi tidak valid.';
 END IF;
 RETURN jsonb_build_object('status',d->>'status');
END; $$;
REVOKE ALL ON FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.tanj_guard_payment_approval() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.data->>'status'='PAID' AND OLD.data->>'status' IS DISTINCT FROM 'PAID'
 AND OLD.data->>'status' IS DISTINCT FROM 'CHECKING'
 AND NOT coalesce((NEW.data#>>'{payment,provider}'='midtrans' AND NEW.data->>'gatewayVerified'='true'),false) THEN
  RAISE EXCEPTION 'Customer belum mengonfirmasi pembayaran.';
 END IF;
 RETURN NEW;
END; $$;

-- Legacy clients cannot manually approve, cancel, or upload proof for gateway orders.
ALTER FUNCTION public.tanj_update_order(text,integer,text,jsonb) RENAME TO tanj_update_order_before_midtrans;
REVOKE ALL ON FUNCTION public.tanj_update_order_before_midtrans(text,integer,text,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tanj_update_order(order_id text,expected_version integer,action text,payload jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 IF EXISTS(SELECT 1 FROM public.tb_t_order o WHERE o.id=order_id AND o.data#>>'{payment,provider}'='midtrans') THEN RAISE EXCEPTION 'Pembayaran ini diverifikasi otomatis oleh Midtrans.'; END IF;
 RETURN public.tanj_update_order_before_midtrans(order_id,expected_version,action,payload);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_update_order(text,integer,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_update_order(text,integer,text,jsonb) TO authenticated;
ALTER FUNCTION public.tanj_decide_payment(text,integer,text,boolean) RENAME TO tanj_decide_payment_before_midtrans;
REVOKE ALL ON FUNCTION public.tanj_decide_payment_before_midtrans(text,integer,text,boolean) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tanj_decide_payment(order_id text,expected_version integer,decision text,checked boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 IF EXISTS(SELECT 1 FROM public.tb_t_order o WHERE o.id=order_id AND o.data#>>'{payment,provider}'='midtrans') THEN RAISE EXCEPTION 'Pembayaran ini diverifikasi otomatis oleh Midtrans.'; END IF;
 RETURN public.tanj_decide_payment_before_midtrans(order_id,expected_version,decision,checked);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_decide_payment(text,integer,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_decide_payment(text,integer,text,boolean) TO authenticated;
COMMIT;
