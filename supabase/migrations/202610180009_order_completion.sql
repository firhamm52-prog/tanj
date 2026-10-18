-- Admin-confirmed delivery completion, preserving payment history and stock.
BEGIN;

CREATE FUNCTION public.tanj_complete_order (order_id text, expected_version integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE o public.tb_t_order; d jsonb;
  stamp bigint := (extract(epoch FROM now()) * 1000)::bigint;
BEGIN
  IF NOT public.tanj_is_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan.'; END IF;
  PERFORM pg_advisory_xact_lock(818263);
  SELECT * INTO o FROM public.tb_t_order WHERE id = order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan.'; END IF;
  d := o.data;
  IF (d->>'version')::int IS DISTINCT FROM expected_version
     OR d->>'status' <> 'PAID' OR coalesce(d#>>'{tracking,number}', '') = ''
     OR d->>'completedAt' IS NOT NULL THEN
    RAISE EXCEPTION 'Pesanan harus sudah dibayar dan memiliki resi. Muat ulang pesanan.';
  END IF;
  d := d || jsonb_build_object('completedAt', stamp, 'version', expected_version + 1,
    'logs', (d->'logs') || jsonb_build_array(jsonb_build_object(
      'from','PAID','to','PAID','actor','Admin TANJ','at',stamp,
      'note','Pesanan selesai: diterima customer, dikonfirmasi admin.')));
  UPDATE public.tb_t_order SET data = d WHERE id = order_id;
  RETURN d;
END;
$$;

REVOKE ALL ON FUNCTION public.tanj_complete_order (text, integer)
FROM
  PUBLIC,
  anon;

GRANT
EXECUTE ON FUNCTION public.tanj_complete_order (text, integer) TO authenticated;

COMMIT;
