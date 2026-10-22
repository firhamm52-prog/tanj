-- New orders: two-hour payment window; only JNE/J&T shipping quotes.
-- Existing orders keep their amounts, deadlines and reservations.
BEGIN;
UPDATE public.tb_m_payment_settings SET data=jsonb_set(data,'{hours}','2') WHERE id;
UPDATE public.tb_m_cms SET
 draft=jsonb_set(draft,'{settings,paymentHours}','2'),
 published=jsonb_set(published,'{settings,paymentHours}','2'),
 revision=revision+1 WHERE id;

ALTER FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) RENAME TO tanj_create_order_before_courier_limits;
REVOKE ALL ON FUNCTION public.tanj_create_order_before_courier_limits(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_create_order(request_id uuid, customer jsonb, lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login terlebih dahulu.'; END IF;
 PERFORM pg_advisory_xact_lock(818263);
 SELECT data INTO d FROM public.tb_t_order
 WHERE id='TANJ-'||upper(request_id::text) AND account_id=auth.uid();
 IF FOUND THEN RETURN d; END IF;
 IF coalesce(customer->>'shippingMethod','') !~ '^biteship:(jne|jnt):[A-Za-z0-9_-]+$' THEN
  RAISE EXCEPTION 'Pilih pengiriman JNE atau J&T. Cek ongkir kembali.';
 END IF;
 RETURN public.tanj_create_order_before_courier_limits(request_id,customer,lines);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) TO authenticated;
COMMIT;
