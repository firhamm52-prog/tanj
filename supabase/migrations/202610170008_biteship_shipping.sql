-- Run after 007. From this point, new orders require a server-issued Biteship quote.
BEGIN;

CREATE TABLE public.tb_t_shipping_quote (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  destination jsonb NOT NULL,
  lines jsonb NOT NULL,
  options jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  order_id text UNIQUE
);

ALTER TABLE public.tb_t_shipping_quote ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tb_t_shipping_quote
FROM
  PUBLIC,
  anon,
  authenticated;

GRANT
SELECT
,
  INSERT,
  DELETE ON public.tb_t_shipping_quote TO service_role;

ALTER FUNCTION public.tanj_create_order (uuid, jsonb, jsonb)
RENAME TO tanj_create_order_legacy;

REVOKE ALL ON FUNCTION public.tanj_create_order_legacy (uuid, jsonb, jsonb)
FROM
  PUBLIC,
  anon,
  authenticated;

CREATE FUNCTION public.tanj_create_order (request_id uuid, customer jsonb, lines jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  owner uuid := auth.uid ();
  q public.tb_t_shipping_quote;
  option jsonb;
  normalized jsonb;
  result jsonb;
  oid text := 'TANJ-' || upper(request_id::text);
  base bigint;
  extra integer;
BEGIN
  IF owner IS NULL THEN
    RAISE EXCEPTION 'Login customer terlebih dahulu.';
  END IF;
  -- Match the existing checkout lock, including retry and stock reservation.
  PERFORM pg_advisory_xact_lock(818263);
  SELECT
    data INTO result
  FROM
    public.tb_t_order
  WHERE
    id = oid
    AND account_id = owner;
  IF FOUND THEN
    RETURN result;
  END IF;
  SELECT
    * INTO q
  FROM
    public.tb_t_shipping_quote
  WHERE
    id = (customer ->> 'shippingQuoteId')::uuid
    AND account_id = owner
  FOR UPDATE;
  IF NOT FOUND OR q.expires_at <= now() OR q.order_id IS NOT NULL THEN
    RAISE EXCEPTION 'Tarif ongkir kedaluwarsa. Pilih pengiriman kembali.';
  END IF;
  IF q.destination IS DISTINCT FROM jsonb_build_object('zip', customer ->> 'zip', 'provinceId', customer ->> 'provinceId', 'cityId', customer ->> 'cityId', 'districtId', customer ->> 'districtId') THEN
    RAISE EXCEPTION 'Alamat berubah. Cek ongkir kembali.';
  END IF;
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id',
        value ->> 'id',
        'qty',
        (value ->> 'qty')::integer
      )
      ORDER BY
        (value ->> 'id') COLLATE "C"
    ) INTO normalized
  FROM
    jsonb_array_elements(lines);
  IF normalized IS DISTINCT FROM q.lines THEN
    RAISE EXCEPTION 'Tas berubah. Cek ongkir kembali.';
  END IF;
  SELECT
    value INTO option
  FROM
    jsonb_array_elements(q.options)
  WHERE
    value ->> 'id' = customer ->> 'shippingMethod';
  IF option IS NULL OR (option ->> 'fee')::bigint < 0 THEN
    RAISE EXCEPTION 'Pilih layanan kurir yang tersedia.';
  END IF;
  -- The legacy function still validates contact, inventory and payment and reserves stock.
  result := public.tanj_create_order_legacy (
    request_id,
    customer || jsonb_build_object('shippingMethod', 'jne-regular'),
    lines
  );
  base := (result ->> 'subtotal')::bigint + (option ->> 'fee')::bigint;
  extra := (
    ((result ->> 'code')::integer - base % 1000 + 1000) % 1000
  )::integer;
  result := result || jsonb_build_object(
    'adjustment',
    extra,
    'total',
    base + extra,
    'shipping',
    (result -> 'shipping') || jsonb_build_object(
      'method',
      option ->> 'id',
      'methodName',
      (option ->> 'name') || ' ' || (option ->> 'service'),
      'fee',
      (option ->> 'fee')::bigint,
      'estimate',
      FALSE,
      'provider',
      'biteship',
      'courier',
      option ->> 'courier',
      'serviceCode',
      option ->> 'serviceCode',
      'duration',
      option ->> 'duration',
      'quoteId',
      q.id
    )
  );
  UPDATE public.tb_t_order
  SET
    data = result
  WHERE
    id = oid
    AND account_id = owner;
  UPDATE public.tb_t_shipping_quote
  SET
    order_id = oid
  WHERE
    id = q.id;
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
