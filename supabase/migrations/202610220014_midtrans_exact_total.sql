-- Midtrans new orders: charge the exact product + net shipping amount.
-- Existing orders and already-created payment amounts are never repriced.
BEGIN;
CREATE OR REPLACE FUNCTION public.tanj_create_order(request_id uuid, customer jsonb, lines jsonb)
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
  d := d || jsonb_build_object('adjustment',0,'code',0,'total',(d->>'subtotal')::bigint + (d#>>'{shipping,fee}')::bigint);
  UPDATE public.tb_t_order SET data=d WHERE id=oid;
 ELSE
  d := public.tanj_create_order_before_midtrans(request_id,customer,lines);
 END IF;
 RETURN d;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) TO authenticated;

COMMIT;
