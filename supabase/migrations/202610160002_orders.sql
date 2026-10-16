-- Run after 202610160001_accounts.sql and before activating shared payments.
BEGIN;

CREATE TABLE public.tb_m_admin (
  account_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE
);

ALTER TABLE public.tb_m_admin enable ROW level SECURITY;

REVOKE ALL ON public.tb_m_admin
FROM
  anon,
  authenticated;

CREATE FUNCTION public.tanj_is_admin () RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET
  search_path = '' AS $$
SELECT
  EXISTS (
    SELECT
      1
    FROM
      public.tb_m_admin
    WHERE
      account_id = auth.uid ()
  );
$$;

REVOKE ALL ON function public.tanj_is_admin ()
FROM
  public;

GRANT
EXECUTE ON function public.tanj_is_admin () TO authenticated;

CREATE TABLE public.tb_m_product (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  stock integer NOT NULL CHECK (stock >= 0),
  active boolean NOT NULL DEFAULT TRUE
);

CREATE TABLE public.tb_m_shipping (
  id text PRIMARY KEY,
  province_id text NOT NULL,
  province text NOT NULL,
  city text NOT NULL,
  fee integer NOT NULL CHECK (fee >= 0)
);

CREATE TABLE public.tb_m_payment_settings (
  id boolean PRIMARY KEY DEFAULT TRUE CHECK (id),
  data jsonb NOT NULL
);

INSERT INTO
  public.tb_m_payment_settings
VALUES
  (TRUE, '{"hours":24,"admin":"Admin TANJ"}');

CREATE TABLE public.tb_t_order (
  id text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES auth.users (id),
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tb_t_order_account ON public.tb_t_order (account_id);

ALTER TABLE public.tb_m_product enable ROW level SECURITY;

ALTER TABLE public.tb_m_shipping enable ROW level SECURITY;

ALTER TABLE public.tb_m_payment_settings enable ROW level SECURITY;

ALTER TABLE public.tb_t_order enable ROW level SECURITY;

REVOKE ALL ON public.tb_m_product,
public.tb_m_shipping,
public.tb_m_payment_settings,
public.tb_t_order
FROM
  anon,
  authenticated;

GRANT
SELECT
  ON public.tb_m_product,
  public.tb_m_shipping,
  public.tb_m_payment_settings TO anon,
  authenticated;

GRANT
SELECT
  ON public.tb_t_order TO authenticated;

CREATE POLICY product_read ON public.tb_m_product FOR
SELECT
  USING (TRUE);

CREATE POLICY shipping_read ON public.tb_m_shipping FOR
SELECT
  USING (TRUE);

CREATE POLICY settings_read ON public.tb_m_payment_settings FOR
SELECT
  USING (TRUE);

CREATE POLICY order_read ON public.tb_t_order FOR
SELECT
  TO authenticated USING (
    account_id = (
      SELECT
        auth.uid ()
    )
    OR (
      SELECT
        public.tanj_is_admin ()
    )
  );

CREATE FUNCTION public.tanj_create_order (request_id uuid, customer jsonb, lines jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  owner uuid := auth.uid ();
  result jsonb;
  line jsonb;
  p public.tb_m_product;
  s public.tb_m_shipping;
  items jsonb := '[]';
  settings jsonb;
  subtotal bigint := 0;
  base bigint;
  code integer;
  adjustment integer;
  stamp bigint := (
    extract(
      epoch
      FROM
        now()
    ) * 1000
  )::bigint;
  email text;
  qty integer;
  courier text := customer ->> 'shippingMethod';
  oid text := 'TANJ-' || upper(request_id::text);
BEGIN
  IF owner IS NULL THEN
    RAISE EXCEPTION 'Login customer terlebih dahulu.';
  END IF;
  PERFORM pg_advisory_xact_lock(818263);
  SELECT
    data INTO result
  FROM
    public.tb_t_order
  WHERE
    id = oid
    AND account_id = owner;
  IF found THEN
    RETURN result;
  END IF;
  IF jsonb_typeof(lines) <> 'array' OR jsonb_array_length(lines) NOT between 1 AND 40 THEN
    RAISE EXCEPTION 'Tas tidak valid.';
  END IF;
  IF length(trim(coalesce(customer ->> 'name', ''))) NOT between 1 AND 80 OR length(trim(coalesce(customer ->> 'address', ''))) NOT between 1 AND 500 OR length(coalesce(customer ->> 'phone', '')) NOT between 8 AND 20 THEN
    RAISE EXCEPTION 'Alamat atau kontak belum valid.';
  END IF;
  IF customer ->> 'paymentMethod' IS DISTINCT FROM 'qris-manual' THEN
    RAISE EXCEPTION 'Gunakan QRIS manual.';
  END IF;
  IF courier IS NULL OR courier NOT IN ('jt-regular', 'jne-regular', 'lion-regpack') THEN
    RAISE EXCEPTION 'Kurir tidak valid.';
  END IF;
  IF coalesce(customer ->> 'zip', '') !~ '^[0-9]{5}$' THEN
    RAISE EXCEPTION 'Kode pos belum valid.';
  END IF;
  SELECT
    * INTO s
  FROM
    public.tb_m_shipping
  WHERE
    id = customer ->> 'cityId'
    AND province_id = customer ->> 'provinceId';
  IF NOT found THEN
    RAISE EXCEPTION 'Kota pengiriman tidak tersedia.';
  END IF;
  FOR line IN SELECT value FROM jsonb_array_elements(lines) LOOP
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(items) i where i ->> 'id' = line ->> 'id') THEN
      RAISE EXCEPTION 'Produk duplikat.';
    END IF;
    qty := (line ->> 'qty')::integer;
    IF qty NOT between 1 AND 99 THEN
      RAISE EXCEPTION 'Jumlah tidak valid.';
    END IF;
    SELECT
      * INTO p
    FROM
      public.tb_m_product
    WHERE
      id = line ->> 'id'
      AND active
    FOR UPDATE;
    IF NOT found OR p.stock < qty THEN
      RAISE EXCEPTION 'Stok produk tidak cukup atau produk belum aktif di database.';
    END IF;
    UPDATE public.tb_m_product
    SET
      stock = stock - qty
    WHERE
      id = p.id;
    items := items || jsonb_build_array(
      jsonb_build_object(
        'id',
        p.id,
        'name',
        p.name,
        'color',
        p.color,
        'price',
        p.price,
        'qty',
        qty
      )
    );
    subtotal := subtotal + p.price::bigint * qty;
  END LOOP;
  SELECT
    data INTO settings
  FROM
    public.tb_m_payment_settings
  WHERE
    id;
  base := subtotal + s.fee;
  SELECT
    n INTO code
  FROM
    generate_series(1, 999) n
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        public.tb_t_order o
      WHERE
        o.data ->> 'status' NOT IN ('PAID', 'CANCELLED')
        AND (o.data ->> 'code')::int = n
    )
  ORDER BY
    random()
  LIMIT
    1;
  IF code IS NULL THEN
    RAISE EXCEPTION 'Antrean pembayaran penuh.';
  END IF;
  adjustment := (code - base % 1000 + 1000) % 1000;
  SELECT
    u.email INTO email
  FROM
    auth.users u
  WHERE
    u.id = owner;
  customer := jsonb_build_object(
    'name',
    trim(customer ->> 'name'),
    'phone',
    customer ->> 'phone',
    'email',
    email,
    'address',
    trim(customer ->> 'address'),
    'provinceId',
    s.province_id,
    'province',
    s.province,
    'cityId',
    s.id,
    'city',
    s.city,
    'districtId',
    left(customer ->> 'districtId', 30),
    'district',
    left(customer ->> 'district', 100),
    'zip',
    customer ->> 'zip',
    'note',
    left(customer ->> 'note', 300)
  );
  result := jsonb_build_object(
    'id',
    oid,
    'customerId',
    owner,
    'customer',
    customer,
    'items',
    items,
    'payment',
    jsonb_build_object('id', 'qris-manual', 'name', 'QRIS manual'),
    'shipping',
    jsonb_build_object(
      'id',
      s.id,
      'provinceId',
      s.province_id,
      'province',
      s.province,
      'city',
      s.city,
      'name',
      'Ongkir ke ' || s.city,
      'fee',
      s.fee,
      'method',
      customer ->> 'shippingMethod',
      'methodName',
      'Reguler',
      'estimate',
      TRUE
    ),
    'subtotal',
    subtotal,
    'code',
    code,
    'adjustment',
    adjustment,
    'total',
    base + adjustment,
    'status',
    'WAITING_PAYMENT',
    'createdAt',
    stamp,
    'deadline',
    stamp + coalesce((settings ->> 'hours')::int, 24) * 3600000::bigint,
    'version',
    1,
    'proofs',
    '[]'::jsonb,
    'logs',
    jsonb_build_array(
      jsonb_build_object(
        'from',
        NULL,
        'to',
        'WAITING_PAYMENT',
        'actor',
        'Pembeli',
        'note',
        'Pesanan dibuat.',
        'at',
        stamp
      )
    ),
    'review',
    NULL
  );
  result := jsonb_set(result, '{shipping,method}', to_jsonb(courier));
  result := jsonb_set(
    result,
    '{shipping,methodName}',
    to_jsonb(
      CASE courier
        WHEN 'jne-regular' THEN 'JNE Reguler'
        WHEN 'lion-regpack' THEN 'Lion Parcel Reg Pack'
        ELSE 'J&T Reguler'
      END
    )
  );
  INSERT INTO
    public.tb_t_order (id, account_id, data)
  VALUES
    (oid, owner, result);
  RETURN result;
END;
$$;

CREATE FUNCTION public.tanj_update_order (
  order_id text,
  expected_version integer,
  action text,
  payload jsonb DEFAULT '{}'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  o public.tb_t_order;
  d jsonb;
  previous text;
  target text;
  note text;
  reference text;
  paid_at timestamptz;
  actor text := 'Pembeli';
  stamp bigint := (
    extract(
      epoch
      FROM
        now()
    ) * 1000
  )::bigint;
  item jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(818263);
  SELECT
    * INTO o
  FROM
    public.tb_t_order
  WHERE
    id = order_id
  FOR UPDATE;
  IF NOT found OR auth.uid() IS NULL OR (o.account_id <> auth.uid() AND NOT public.tanj_is_admin()) THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan.';
  END IF;
  d := o.data;
  previous := d ->> 'status';
  IF (d ->> 'version')::int <> expected_version OR previous IN ('PAID', 'CANCELLED') THEN
    RAISE EXCEPTION 'Status pesanan sudah berubah. Muat ulang.';
  END IF;
  IF action IN ('approve', 'reject', 'help') THEN
    IF NOT public.tanj_is_admin() THEN
      RAISE EXCEPTION 'Akses admin diperlukan.';
    END IF;
    actor := 'Admin TANJ';
    note := trim(coalesce(payload ->> 'note', ''));
    IF length(note) NOT between 1 AND 300 THEN
      RAISE EXCEPTION 'Isi catatan pemeriksaan.';
    END IF;
    IF action = 'approve' THEN
      IF payload ->> 'checked' IS DISTINCT FROM 'true' OR (payload ->> 'amount')::bigint IS DISTINCT FROM (d ->> 'total')::bigint THEN
        RAISE EXCEPTION 'Cocokkan nominal dan dana masuk terlebih dahulu.';
      END IF;
      reference := trim(coalesce(payload ->> 'reference', ''));
      paid_at := (payload ->> 'paidAt')::timestamptz;
      IF length(reference) NOT between 1 AND 100 OR paid_at IS NULL OR paid_at > now() + interval '1 minute' THEN
        RAISE EXCEPTION 'Referensi atau waktu transaksi belum valid.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.tb_t_order where id <> order_id AND lower(data -> 'review' ->> 'reference') = lower(reference)) THEN
        RAISE EXCEPTION 'Referensi transaksi sudah dipakai.';
      END IF;
      d := jsonb_set(
        d,
        '{review}',
        jsonb_build_object(
          'amount',
          d -> 'total',
          'reference',
          reference,
          'paidAt',
          extract(
            epoch
            FROM
              paid_at
          ) * 1000,
          'admin',
          actor
        )
      );
      target := 'PAID';
    ELSIF action = 'reject' THEN
      target := 'REJECTED';
    ELSE
      target := 'NEEDS_HELP';
    END IF;
  ELSIF action = 'confirm' THEN
    target := 'CHECKING';
    note := 'Pembeli menyatakan sudah bayar. Dana perlu dicocokkan admin.';
  ELSIF action = 'proof' THEN
    IF length(coalesce(payload ->> 'data', '')) > 1450000 OR coalesce(payload ->> 'data', '') !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' THEN
      RAISE EXCEPTION 'Bukti gambar tidak valid.';
    END IF;
    IF jsonb_array_length(d -> 'proofs') >= 3 THEN
      RAISE EXCEPTION 'Maksimal tiga bukti. Hubungi admin.';
    END IF;
    d := jsonb_set(
      d,
      '{proofs}',
      (d -> 'proofs') || jsonb_build_array(
        jsonb_build_object(
          'name',
          left(payload ->> 'name', 120),
          'data',
          payload ->> 'data',
          'at',
          stamp
        )
      )
    );
    target := 'CHECKING';
    note := 'Bukti opsional ditambahkan.';
  ELSIF action = 'cancel' THEN
    IF previous <> 'WAITING_PAYMENT' THEN
      RAISE EXCEPTION 'Hubungi admin untuk membatalkan pesanan ini.';
    END IF;
    target := 'CANCELLED';
    note := 'Pembeli membatalkan pesanan yang belum dibayar.';
    FOR item IN SELECT value FROM jsonb_array_elements(d -> 'items') LOOP
      UPDATE public.tb_m_product
      SET
        stock = stock + (item ->> 'qty')::int
      WHERE
        id = item ->> 'id';
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Aksi tidak tersedia.';
  END IF;
  d := d || jsonb_build_object(
    'status',
    target,
    'version',
    expected_version + 1,
    'logs',
    (d -> 'logs') || jsonb_build_array(
      jsonb_build_object(
        'from',
        previous,
        'to',
        target,
        'actor',
        actor,
        'note',
        note,
        'at',
        stamp
      )
    )
  );
  UPDATE public.tb_t_order
  SET
    data = d
  WHERE
    id = order_id;
  RETURN d;
END;
$$;

CREATE FUNCTION public.tanj_save_qris (image jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
BEGIN
  IF NOT public.tanj_is_admin() THEN
    RAISE EXCEPTION 'Akses admin diperlukan.';
  END IF;
  IF image IS NOT NULL AND (length(coalesce(image ->> 'data', '')) > 1450000 OR coalesce(image ->> 'data', '') !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$') THEN
    RAISE EXCEPTION 'Gambar QRIS tidak valid.';
  END IF;
  UPDATE public.tb_m_payment_settings
  SET
    data = jsonb_set(data, '{qris}', coalesce(image, 'null'::jsonb))
  WHERE
    id;
END;
$$;

REVOKE ALL ON function public.tanj_create_order (uuid, jsonb, jsonb),
public.tanj_update_order (text, integer, text, jsonb),
public.tanj_save_qris (jsonb)
FROM
  public;

GRANT
EXECUTE ON function public.tanj_create_order (uuid, jsonb, jsonb),
public.tanj_update_order (text, integer, text, jsonb),
public.tanj_save_qris (jsonb) TO authenticated;

COMMIT;
