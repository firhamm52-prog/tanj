-- Run after 028. Also enable Anonymous Sign-Ins in Authentication > Providers.
-- Existing orders, internal payment IDs, prices and stock are preserved.
BEGIN;
ALTER TABLE public.tb_m_address ADD COLUMN contact_email text;
ALTER TABLE public.tb_m_address ADD CONSTRAINT tb_m_address_contact_email_valid
  CHECK (contact_email IS NULL OR (length(contact_email) <= 254 AND contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));

CREATE SEQUENCE public.tanj_order_number_seq;
REVOKE ALL ON SEQUENCE public.tanj_order_number_seq FROM PUBLIC,anon,authenticated;
SELECT setval('public.tanj_order_number_seq', greatest(1,coalesce(max(substring(data->>'orderNumber' FROM '^TANJ-([0-9]+)$')::bigint),0)+1),false)
FROM public.tb_t_order;

ALTER FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) RENAME TO tanj_create_order_before_guest;
REVOKE ALL ON FUNCTION public.tanj_create_order_before_guest(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_create_order(request_id uuid,customer jsonb,lines jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner uuid := auth.uid(); d jsonb; contact text; guest boolean; number text;
  oid text := 'TANJ-'||upper(request_id::text);
BEGIN
  IF owner IS NULL THEN RAISE EXCEPTION 'Sesi checkout diperlukan.'; END IF;
  PERFORM pg_advisory_xact_lock(818263);
  SELECT data INTO d FROM public.tb_t_order WHERE id=oid AND account_id=owner;
  IF FOUND THEN RETURN d; END IF;
  SELECT coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false),u.email
    INTO guest,contact FROM auth.users u WHERE u.id=owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesi checkout tidak valid.'; END IF;
  IF guest THEN contact := lower(trim(customer->>'email')); END IF;
  IF contact IS NULL OR length(contact)>254 OR contact !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Isi email yang valid.';
  END IF;
  IF coalesce(customer->>'phone','') !~ '^\+?[0-9 ()-]{8,20}$'
    OR length(regexp_replace(customer->>'phone','[^0-9]','','g')) NOT BETWEEN 8 AND 15 THEN
    RAISE EXCEPTION 'Isi nomor HP yang valid.';
  END IF;
  d := public.tanj_create_order_before_guest(request_id,customer,lines);
  number := nextval('public.tanj_order_number_seq')::text;
  d := jsonb_set(d,'{customer,email}',to_jsonb(contact))
    || jsonb_build_object('orderNumber','TANJ-'||lpad(number,greatest(6,length(number)),'0'));
  UPDATE public.tb_t_order SET data=d WHERE id=oid AND account_id=owner;
  RETURN d;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) TO authenticated;
CREATE FUNCTION public.tanj_checkout_capabilities() RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT '{"guestCheckout":true,"version":29}'::jsonb $$;
REVOKE ALL ON FUNCTION public.tanj_checkout_capabilities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tanj_checkout_capabilities() TO anon,authenticated;
COMMIT;
