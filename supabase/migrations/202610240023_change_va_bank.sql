-- Keep one TANJ order while replacing a provider bill only after confirmed cancellation.
BEGIN;
ALTER TABLE public.tb_t_midtrans
 ADD COLUMN provider_order_id text,
 ADD COLUMN retired_provider_ids text[] NOT NULL DEFAULT '{}',
 ADD COLUMN bank_switch_pending boolean NOT NULL DEFAULT false,
 ADD COLUMN bank_switch_until timestamptz,
 ADD COLUMN bank_switch_id uuid;

CREATE FUNCTION public.tanj_midtrans_context(oid text) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('providerOrderId',coalesce(
  (SELECT provider_order_id FROM public.tb_t_midtrans WHERE order_id=oid),oid));
$$;

CREATE FUNCTION public.tanj_midtrans_bank_change(oid text, operation text,
 provider_id text DEFAULT NULL, switch_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.tb_t_order; g public.tb_t_midtrans; d jsonb; pid text;
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 SELECT * INTO o FROM public.tb_t_order WHERE id=oid FOR UPDATE;
 SELECT * INTO g FROM public.tb_t_midtrans WHERE order_id=oid FOR UPDATE;
 IF o.id IS NULL OR g.order_id IS NULL OR o.data#>>'{payment,provider}' IS DISTINCT FROM 'midtrans'
 THEN RAISE EXCEPTION 'Pesanan pembayaran tidak ditemukan.'; END IF;
 pid:=coalesce(g.provider_order_id,oid);
 IF operation='abort' THEN
  IF g.bank_switch_id IS DISTINCT FROM switch_id THEN RAISE EXCEPTION 'Percobaan ganti bank sudah berubah.'; END IF;
  UPDATE public.tb_t_midtrans SET bank_switch_pending=false,bank_switch_until=NULL,bank_switch_id=NULL WHERE order_id=oid;
  RETURN jsonb_build_object('status',o.data->>'status');
 END IF;
 IF o.data->>'status'<>'WAITING_PAYMENT' OR NOT g.stock_reserved
 OR o.data#>>'{payment,channel}'='qris'
 THEN RAISE EXCEPTION 'Pesanan ini tidak dapat diganti bank.'; END IF;
 IF (o.data->>'deadline')::bigint<=extract(epoch FROM now())*1000
 THEN RAISE EXCEPTION 'Batas pembayaran telah lewat.'; END IF;
 IF operation='begin' THEN
  IF (g.bank_switch_pending AND g.bank_switch_until>now())
   OR (g.state='creating' AND g.lease_until>now())
  THEN RAISE EXCEPTION 'Pembayaran sedang diperbarui. Coba kembali dalam satu menit.'; END IF;
  UPDATE public.tb_t_midtrans SET bank_switch_pending=true,bank_switch_until=now()+interval '1 minute',
   bank_switch_id=gen_random_uuid() WHERE order_id=oid RETURNING * INTO g;
  RETURN jsonb_build_object('providerOrderId',pid,'switchId',g.bank_switch_id,'total',o.data->'total');
 ELSIF operation='complete' THEN
  IF NOT g.bank_switch_pending OR g.bank_switch_id IS DISTINCT FROM switch_id OR pid IS DISTINCT FROM provider_id
  THEN RAISE EXCEPTION 'Percobaan ganti bank sudah berubah. Muat ulang pesanan.'; END IF;
  -- 41-character TANJ ID plus an 8-hex suffix stays within Midtrans's 50-character limit.
  LOOP
   pid:=oid||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
   EXIT WHEN pid<>coalesce(g.provider_order_id,oid) AND NOT (pid=ANY(g.retired_provider_ids));
  END LOOP;
  d:=jsonb_set(o.data,'{payment}',(o.data->'payment')||jsonb_build_object(
   'channel','va','name','Virtual Account','methodChanged',true,'bankChanged',true));
  d:=d||jsonb_build_object('version',(d->>'version')::int+1,'logs',coalesce(d->'logs','[]')||
   jsonb_build_array(jsonb_build_object('from','WAITING_PAYMENT','to','WAITING_PAYMENT',
    'actor','Customer TANJ','at',(extract(epoch FROM now())*1000)::bigint,
    'note','VA lama dibatalkan melalui Midtrans; customer memilih bank kembali.')));
  UPDATE public.tb_t_order SET data=d WHERE id=oid;
  UPDATE public.tb_t_midtrans SET provider_order_id=pid,
   retired_provider_ids=array_append(retired_provider_ids,coalesce(provider_order_id,oid)),
   bank_switch_pending=false,bank_switch_until=NULL,bank_switch_id=NULL,
   redirect_url=NULL,snap_token=NULL,state='new',lease_until=NULL,attempt_id=gen_random_uuid(),updated_at=now()
   WHERE order_id=oid;
  RETURN jsonb_build_object('changed',true,'providerOrderId',pid);
 ELSE RAISE EXCEPTION 'Operasi tidak valid.';
 END IF;
END; $$;

ALTER FUNCTION public.tanj_midtrans_prepare(text) RENAME TO tanj_midtrans_prepare_before_bank_change;
REVOKE ALL ON FUNCTION public.tanj_midtrans_prepare_before_bank_change(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_midtrans_prepare(oid text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 IF EXISTS(SELECT 1 FROM public.tb_t_midtrans WHERE order_id=oid AND bank_switch_pending)
 THEN RAISE EXCEPTION 'Ganti bank belum selesai. Tekan Ganti bank kembali untuk melanjutkan.'; END IF;
 d:=public.tanj_midtrans_prepare_before_bank_change(oid);
 RETURN d||public.tanj_midtrans_context(oid);
END; $$;

ALTER FUNCTION public.tanj_midtrans_gateway(text,text,jsonb) RENAME TO tanj_midtrans_gateway_before_bank_change;
REVOKE ALL ON FUNCTION public.tanj_midtrans_gateway_before_bank_change(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_midtrans_gateway(oid text, operation text, details jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.tb_t_midtrans; d jsonb; result jsonb; pid text; st text;
BEGIN
 PERFORM pg_advisory_xact_lock(818263);
 SELECT * INTO g FROM public.tb_t_midtrans WHERE order_id=oid FOR UPDATE;
 IF operation='status' THEN
  SELECT data INTO d FROM public.tb_t_order WHERE id=oid FOR UPDATE;
  IF details->>'order_id' IS DISTINCT FROM oid OR (details->>'gross_amount')::numeric IS DISTINCT FROM (d->>'total')::numeric
   OR coalesce(details->>'currency','IDR')<>'IDR' THEN RAISE EXCEPTION 'Nominal pembayaran tidak cocok.'; END IF;
  pid:=coalesce(details->>'provider_order_id',oid); st:=details->>'transaction_status';
  IF pid IS DISTINCT FROM coalesce(g.provider_order_id,oid) AND NOT (pid=ANY(g.retired_provider_ids))
  THEN RAISE EXCEPTION 'Tagihan pembayaran tidak dikenal.'; END IF;
  IF (pid=ANY(g.retired_provider_ids) OR g.bank_switch_pending)
   AND st NOT IN ('settlement','capture')
  THEN RETURN jsonb_build_object('status',d->>'status','ignored',true); END IF;
 END IF;
 result:=public.tanj_midtrans_gateway_before_bank_change(oid,operation,details);
 IF result->>'status'='PAID' THEN
  UPDATE public.tb_t_midtrans SET bank_switch_pending=false,bank_switch_until=NULL,bank_switch_id=NULL WHERE order_id=oid;
 END IF;
 RETURN result;
END; $$;

REVOKE ALL ON FUNCTION public.tanj_midtrans_context(text),public.tanj_midtrans_bank_change(text,text,text,uuid),
 public.tanj_midtrans_prepare(text),public.tanj_midtrans_gateway(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tanj_midtrans_context(text),public.tanj_midtrans_bank_change(text,text,text,uuid),
 public.tanj_midtrans_gateway(text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.tanj_midtrans_prepare(text) TO authenticated;
COMMIT;
