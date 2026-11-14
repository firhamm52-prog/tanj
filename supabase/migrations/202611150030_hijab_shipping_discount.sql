-- Run once after 029. No old order or carrier quote is repriced.
BEGIN;
CREATE FUNCTION public.tanj_shipping_discount(original_fee bigint,settings jsonb,clothing_qty integer)
RETURNS bigint LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
  IF coalesce(settings->>'shippingDiscountHijabEnabled','true')='false' AND coalesce(clothing_qty,0)=0 THEN RETURN 0; END IF;
  RETURN public.tanj_shipping_discount(original_fee,settings);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_shipping_discount(bigint,jsonb,integer) FROM PUBLIC,anon,authenticated;
DO $$ DECLARE definition text;
  previous text := 'public.tanj_shipping_discount(original_fee, (SELECT published->''settings'' FROM public.tb_m_cms WHERE id))';
BEGIN
  definition:=pg_get_functiondef('public.tanj_create_order_before_midtrans(uuid,jsonb,jsonb)'::regprocedure);
  IF position(previous IN definition)=0 THEN RAISE EXCEPTION 'Migrasi 028 belum sesuai. Tidak ada perubahan disimpan.'; END IF;
  EXECUTE replace(definition,previous,
    'public.tanj_shipping_discount(original_fee, (SELECT published->''settings'' FROM public.tb_m_cms WHERE id), clothing_qty)');
END $$;
ALTER FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) RENAME TO tanj_cms_save_before_hijab_shipping;
REVOKE ALL ON FUNCTION public.tanj_cms_save_before_hijab_shipping(text,text,jsonb,integer,integer) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tanj_cms_save(kind text,content_id text,item jsonb,expected_revision integer,expected_stock integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.tanj_is_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan.'; END IF;
  IF kind='settings' THEN
    item:=jsonb_build_object('shippingDiscountHijabEnabled',coalesce(
      (SELECT draft#>'{settings,shippingDiscountHijabEnabled}' FROM public.tb_m_cms WHERE id),'false'::jsonb)) || item;
    IF jsonb_typeof(item->'shippingDiscountHijabEnabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Pengaturan ongkir hijab tidak valid.'; END IF;
  END IF;
  RETURN public.tanj_cms_save_before_hijab_shipping(kind,content_id,item,expected_revision,expected_stock);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) TO authenticated;
UPDATE public.tb_m_cms SET
  draft=jsonb_set(draft,'{settings}',coalesce(draft->'settings','{}'::jsonb)||'{"shippingDiscountHijabEnabled":false}'::jsonb),
  published=jsonb_set(published,'{settings}',coalesce(published->'settings','{}'::jsonb)||'{"shippingDiscountHijabEnabled":false}'::jsonb),
  revision=revision+1;
COMMIT;
