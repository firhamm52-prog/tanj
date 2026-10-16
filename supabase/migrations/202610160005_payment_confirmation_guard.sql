-- Run after 004. Protects both approval RPCs, including older browser versions.
BEGIN;

CREATE FUNCTION public.tanj_guard_payment_approval () RETURNS TRIGGER LANGUAGE plpgsql
SET
  search_path = '' AS $$
BEGIN
  IF new.data ->> 'status' = 'PAID' AND old.data ->> 'status' IS DISTINCT FROM 'PAID' AND old.data ->> 'status' IS DISTINCT FROM 'CHECKING' THEN
    RAISE EXCEPTION 'Customer belum mengonfirmasi pembayaran. Tunggu status Menunggu verifikasi sebelum approve.';
  END IF;
  RETURN new;
END;
$$;

REVOKE ALL ON function public.tanj_guard_payment_approval ()
FROM
  public,
  anon,
  authenticated;

CREATE TRIGGER tanj_payment_approval_guard
BEFORE UPDATE ON public.tb_t_order FOR EACH ROW
EXECUTE FUNCTION public.tanj_guard_payment_approval ();

COMMIT;
