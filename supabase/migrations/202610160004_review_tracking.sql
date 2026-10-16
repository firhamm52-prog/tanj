-- Simplified admin decision and shared shipment tracking. Run once after 003.
BEGIN;

CREATE FUNCTION public.tanj_decide_payment (
  order_id text,
  expected_version integer,
  decision text,
  checked boolean DEFAULT FALSE
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  o public.tb_t_order;
  d jsonb;
  target text;
  message text;
  stamp bigint := (
    extract(
      epoch
      FROM
        now()
    ) * 1000
  )::bigint;
BEGIN
  IF NOT public.tanj_is_admin() THEN
    RAISE EXCEPTION 'Akses admin diperlukan.';
  END IF;
  IF decision IS NULL OR decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Aksi tidak tersedia.';
  END IF;
  PERFORM pg_advisory_xact_lock(818263);
  SELECT
    * INTO o
  FROM
    public.tb_t_order
  WHERE
    id = order_id
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan.';
  END IF;
  d := o.data;
  IF (d ->> 'version')::int IS DISTINCT FROM expected_version OR d ->> 'status' IN ('PAID', 'CANCELLED') THEN
    RAISE EXCEPTION 'Status pesanan sudah berubah. Muat ulang.';
  END IF;
  IF decision = 'approve' THEN
    IF checked IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'Cocokkan dana masuk sebelum menyetujui.';
    END IF;
    target := 'PAID';
    message := 'Pembayaran disetujui setelah pemeriksaan admin.';
    -- This is the admin decision time, not a claimed bank transaction timestamp.
    d := jsonb_set(
      d,
      '{review}',
      jsonb_build_object(
        'amount',
        d -> 'total',
        'admin',
        'Admin TANJ',
        'reviewedAt',
        stamp
      )
    );
  ELSE
    target := 'REJECTED';
    message := 'Pembayaran ditolak oleh admin. Hubungi CS untuk bantuan.';
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
        d ->> 'status',
        'to',
        target,
        'actor',
        'Admin TANJ',
        'note',
        message,
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

CREATE FUNCTION public.tanj_save_tracking (
  order_id text,
  expected_version integer,
  courier text,
  tracking_number text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  o public.tb_t_order;
  d jsonb;
  stamp bigint := (
    extract(
      epoch
      FROM
        now()
    ) * 1000
  )::bigint;
BEGIN
  IF NOT public.tanj_is_admin() THEN
    RAISE EXCEPTION 'Akses admin diperlukan.';
  END IF;
  courier := trim(courier);
  tracking_number := trim(tracking_number);
  IF coalesce(length(courier), 0) NOT between 1 AND 80 OR coalesce(tracking_number, '') !~ '^[A-Za-z0-9][A-Za-z0-9 ./_-]{0,79}$' THEN
    RAISE EXCEPTION 'Isi kurir dan nomor resi yang valid.';
  END IF;
  PERFORM pg_advisory_xact_lock(818263);
  SELECT
    * INTO o
  FROM
    public.tb_t_order
  WHERE
    id = order_id
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan.';
  END IF;
  d := o.data;
  IF (d ->> 'version')::int IS DISTINCT FROM expected_version OR d ->> 'status' <> 'PAID' THEN
    RAISE EXCEPTION 'Resi hanya dapat disimpan pada pembayaran berhasil. Muat ulang pesanan.';
  END IF;
  d := d || jsonb_build_object(
    'tracking',
    jsonb_build_object(
      'courier',
      courier,
      'number',
      tracking_number,
      'updatedAt',
      stamp
    ),
    'version',
    expected_version + 1,
    'logs',
    (d -> 'logs') || jsonb_build_array(
      jsonb_build_object(
        'from',
        'PAID',
        'to',
        'PAID',
        'actor',
        'Admin TANJ',
        'note',
        'Nomor resi diperbarui: ' || courier || ' / ' || tracking_number,
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

REVOKE ALL ON function public.tanj_decide_payment (text, integer, text, boolean),
public.tanj_save_tracking (text, integer, text, text)
FROM
  public;

GRANT
EXECUTE ON function public.tanj_decide_payment (text, integer, text, boolean),
public.tanj_save_tracking (text, integer, text, text) TO authenticated;

COMMIT;
