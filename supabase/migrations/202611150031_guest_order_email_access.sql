-- Run once after 030. Guest email links authorize ONE order, not an account.
-- Existing payments, order owners, totals and reservations are preserved.
BEGIN;
ALTER TABLE public.tb_t_order ADD COLUMN guest_access_hash bytea,
  ADD COLUMN guest_access_expires_at timestamptz;
CREATE TABLE public.tb_t_guest_order_access (
  order_id text NOT NULL REFERENCES public.tb_t_order(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(order_id,account_id)
);
ALTER TABLE public.tb_t_guest_order_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tb_t_guest_order_access FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.tanj_guest_order_access(oid text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.tb_t_guest_order_access a
   JOIN public.tb_t_order o ON o.id=a.order_id
   WHERE a.order_id=oid AND a.account_id=auth.uid()
     AND a.expires_at>now() AND o.guest_access_expires_at>now() AND o.guest_access_hash IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION public.tanj_guest_order_access(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_guest_order_access(text) TO authenticated;
CREATE POLICY guest_order_link_read ON public.tb_t_order FOR SELECT TO authenticated
  USING (public.tanj_guest_order_access(id));

CREATE FUNCTION public.tanj_issue_guest_order_link(oid text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.tb_t_order; token text; expires timestamptz;
BEGIN
 SELECT * INTO o FROM public.tb_t_order WHERE id=oid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=o.account_id
   AND coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false)) THEN RETURN o.data; END IF;
 IF o.guest_access_hash IS NOT NULL AND o.guest_access_expires_at>now() THEN RETURN o.data; END IF;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 expires:=now()+interval '90 days';
 UPDATE public.tb_t_order SET guest_access_hash=sha256(convert_to(token,'UTF8')),
   guest_access_expires_at=expires,
   data=data||jsonb_build_object('guestAccessToken',token,'guestAccessExpiresAt',expires)
 WHERE id=oid RETURNING data INTO o.data;
 DELETE FROM public.tb_t_guest_order_access WHERE order_id=oid;
 RETURN o.data;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_issue_guest_order_link(text) FROM PUBLIC,anon,authenticated,service_role;

ALTER FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) RENAME TO tanj_create_order_before_guest_link;
REVOKE ALL ON FUNCTION public.tanj_create_order_before_guest_link(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_create_order(request_id uuid,customer jsonb,lines jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb;
BEGIN
 d:=public.tanj_create_order_before_guest_link(request_id,customer,lines);
 RETURN public.tanj_issue_guest_order_link(d->>'id');
END; $$;
REVOKE ALL ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) TO authenticated;

CREATE FUNCTION public.tanj_redeem_guest_order_link(oid text,access_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; expires timestamptz; viewer uuid:=auth.uid();
BEGIN
 IF viewer IS NULL OR coalesce(access_token,'') !~ '^[a-f0-9]{64}$' THEN
   RAISE EXCEPTION 'Tautan pesanan tidak valid atau kedaluwarsa.';
 END IF;
 SELECT data,guest_access_expires_at INTO d,expires FROM public.tb_t_order
 WHERE id=oid AND guest_access_hash=sha256(convert_to(access_token,'UTF8'))
   AND guest_access_expires_at>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'Tautan pesanan tidak valid atau kedaluwarsa.'; END IF;
 INSERT INTO public.tb_t_guest_order_access(order_id,account_id,expires_at)
   VALUES(oid,viewer,expires) ON CONFLICT(order_id,account_id) DO UPDATE SET expires_at=EXCLUDED.expires_at;
 RETURN d;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_redeem_guest_order_link(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_redeem_guest_order_link(text,text) TO authenticated;

-- Extend buyer authorization only; provider verification and admin guards stay intact.
DO $$ DECLARE definition text; previous text;
BEGIN
 definition:=pg_get_functiondef('public.tanj_midtrans_prepare_before_bank_change(text)'::regprocedure);
 previous:='o.account_id<>auth.uid()';
 IF position(previous IN definition)=0 THEN RAISE EXCEPTION 'Pemeriksaan akses Midtrans tidak sesuai. Tidak ada perubahan disimpan.'; END IF;
 EXECUTE replace(definition,previous,'(o.account_id<>auth.uid() AND NOT public.tanj_guest_order_access(o.id))');
 definition:=pg_get_functiondef('public.tanj_update_order_before_midtrans(text,integer,text,jsonb)'::regprocedure);
 previous:='o.account_id <> auth.uid() AND NOT public.tanj_is_admin()';
 IF position(previous IN definition)=0 THEN RAISE EXCEPTION 'Pemeriksaan akses pesanan tidak sesuai. Tidak ada perubahan disimpan.'; END IF;
 EXECUTE replace(definition,previous,previous||' AND NOT public.tanj_guest_order_access(o.id)');
END $$;

-- Make existing guest orders eligible for a NEW email link. Already-delivered emails cannot change.
DO $$ DECLARE oid text;
BEGIN
 FOR oid IN SELECT o.id FROM public.tb_t_order o JOIN auth.users u ON u.id=o.account_id
   WHERE coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false)
 LOOP PERFORM public.tanj_issue_guest_order_link(oid); END LOOP;
END $$;
COMMIT;
