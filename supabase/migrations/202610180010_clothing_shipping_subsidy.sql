-- Apply once after existing CMS, shipping and completion migrations.
-- No historical order is repriced. Carrier quotes remain at their original fee.
BEGIN;

ALTER FUNCTION public.tanj_create_order (uuid, jsonb, jsonb)
RENAME TO tanj_create_order_before_shipping_subsidy;

REVOKE ALL ON FUNCTION public.tanj_create_order_before_shipping_subsidy (uuid, jsonb, jsonb)
FROM
  PUBLIC,
  anon,
  authenticated;

CREATE FUNCTION public.tanj_create_order (request_id uuid, customer jsonb, lines jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE result jsonb; oid text := 'TANJ-' || upper(request_id::text);
  clothing_qty integer; original_fee bigint; subsidy bigint; base bigint; extra integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login customer terlebih dahulu.'; END IF;
  PERFORM pg_advisory_xact_lock(818263);
  SELECT data INTO result FROM public.tb_t_order WHERE id=oid AND account_id=auth.uid();
  IF FOUND THEN RETURN result; END IF;
  result := public.tanj_create_order_before_shipping_subsidy(request_id, customer, lines);
  -- Use only trusted, priced order items and the published clothing catalog.
  SELECT coalesce(sum((item->>'qty')::int),0) INTO clothing_qty
  FROM jsonb_array_elements(result->'items') item
  WHERE EXISTS (SELECT 1 FROM public.tb_m_cms c,
    jsonb_array_elements(c.published->'products') p WHERE p->>'id'=item->>'id');
  original_fee := (result#>>'{shipping,fee}')::bigint;
  subsidy := CASE WHEN clothing_qty >= 2 THEN least(20000, original_fee) ELSE 0 END;
  base := (result->>'subtotal')::bigint + original_fee - subsidy;
  extra := (((result->>'code')::int - base % 1000 + 1000) % 1000)::int;
  result := result || jsonb_build_object('adjustment',extra,'total',base+extra,
    'shipping',(result->'shipping') || jsonb_build_object('originalFee',original_fee,
      'subsidy',subsidy,'fee',original_fee-subsidy,'clothingQty',clothing_qty));
  UPDATE public.tb_t_order SET data=result WHERE id=oid AND account_id=auth.uid();
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.tanj_create_order (uuid, jsonb, jsonb)
FROM
  PUBLIC,
  anon;

GRANT
EXECUTE ON FUNCTION public.tanj_create_order (uuid, jsonb, jsonb) TO authenticated;

COMMIT;
