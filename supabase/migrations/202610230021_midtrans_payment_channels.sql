-- Persist the selected automatic payment channel before creating a Snap session.
BEGIN;
ALTER FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) RENAME TO tanj_create_order_before_payment_channels;
REVOKE ALL ON FUNCTION public.tanj_create_order_before_payment_channels(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_create_order(request_id uuid, customer jsonb, lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; channel text; oid text := 'TANJ-'||upper(request_id::text);
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login terlebih dahulu.'; END IF;
 PERFORM pg_advisory_xact_lock(818263);
 SELECT data INTO d FROM public.tb_t_order WHERE id=oid AND account_id=auth.uid();
 IF FOUND THEN RETURN d; END IF;
 channel := coalesce(customer->>'paymentChannel','both');
 IF customer->>'paymentMethod'='midtrans' AND channel NOT IN ('va','qris','both') THEN
  RAISE EXCEPTION 'Pilih Virtual Account atau QRIS.';
 END IF;
 d := public.tanj_create_order_before_payment_channels(request_id,customer,lines);
 IF d#>>'{payment,provider}'='midtrans' THEN
  d := jsonb_set(d,'{payment}',(d->'payment') || jsonb_build_object('channel',channel,
   'name',CASE channel WHEN 'va' THEN 'Virtual Account' WHEN 'qris' THEN 'QRIS' ELSE 'Virtual Account & QRIS' END));
  UPDATE public.tb_t_order SET data=d WHERE id=oid;
 END IF;
 RETURN d;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) TO authenticated;
COMMIT;
