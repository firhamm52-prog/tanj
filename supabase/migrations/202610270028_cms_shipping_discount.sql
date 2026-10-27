-- Run after 027. Enable the merchant-approved Rp20,000 shipping subsidy for NEW orders.
-- Existing order snapshots, quoted carrier prices and product prices remain unchanged.
BEGIN;

CREATE FUNCTION public.tanj_shipping_discount(original_fee bigint, settings jsonb)
RETURNS bigint LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE maximum bigint;
BEGIN
  IF coalesce(settings->>'shippingDiscountEnabled','false') <> 'true' THEN RETURN 0; END IF;
  IF jsonb_typeof(settings->'shippingDiscountMax') IS DISTINCT FROM 'number'
    OR coalesce(settings->>'shippingDiscountMax','') !~ '^[0-9]{1,7}$' THEN
    RAISE EXCEPTION 'Batas Diskon Ongkir tidak valid.';
  END IF;
  maximum := (settings->>'shippingDiscountMax')::bigint;
  IF maximum > 1000000 THEN RAISE EXCEPTION 'Batas Diskon Ongkir maksimal Rp1.000.000.'; END IF;
  RETURN least(greatest(0,original_fee), maximum);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_shipping_discount(bigint,jsonb) FROM PUBLIC,anon,authenticated;

-- Change the authoritative shipping calculation inside the existing locked order pipeline.
DO $$ DECLARE definition text;
  previous text := 'CASE WHEN clothing_qty >= 2 THEN least(0, original_fee) ELSE 0 END';
BEGIN
  definition := pg_get_functiondef('public.tanj_create_order_before_midtrans(uuid,jsonb,jsonb)'::regprocedure);
  IF position(previous IN definition)=0 THEN
    RAISE EXCEPTION 'Perhitungan ongkir tidak sesuai. Pastikan migrasi 024 sudah dijalankan.';
  END IF;
  EXECUTE replace(definition, previous,
    'public.tanj_shipping_discount(original_fee, (SELECT published->''settings'' FROM public.tb_m_cms WHERE id))');
END $$;

ALTER FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) RENAME TO tanj_cms_save_before_shipping_discount;
REVOKE ALL ON FUNCTION public.tanj_cms_save_before_shipping_discount(text,text,jsonb,integer,integer) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tanj_cms_save(kind text,content_id text,item jsonb,expected_revision integer,expected_stock integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.tanj_is_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan.'; END IF;
  IF kind='settings' THEN
    -- Older CMS clients must preserve the current promotion instead of silently removing it.
    item := jsonb_build_object('shippingDiscountEnabled',false,'shippingDiscountMax',20000)
      || coalesce((SELECT jsonb_build_object(
        'shippingDiscountEnabled',c.draft#>'{settings,shippingDiscountEnabled}',
        'shippingDiscountMax',c.draft#>'{settings,shippingDiscountMax}') FROM public.tb_m_cms c WHERE id),'{}'::jsonb)
      || item;
    IF jsonb_typeof(item->'shippingDiscountEnabled') IS DISTINCT FROM 'boolean'
      OR jsonb_typeof(item->'shippingDiscountMax') IS DISTINCT FROM 'number'
      OR coalesce(item->>'shippingDiscountMax','') !~ '^[0-9]{1,7}$'
      OR (item->>'shippingDiscountMax')::bigint > 1000000 THEN
      RAISE EXCEPTION 'Pengaturan Diskon Ongkir tidak valid.';
    END IF;
  END IF;
  RETURN public.tanj_cms_save_before_shipping_discount(kind,content_id,item,expected_revision,expected_stock);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) TO authenticated;

-- Activate only the two promotion fields, without publishing unrelated drafts.
UPDATE public.tb_m_cms SET
  draft=jsonb_set(draft,'{settings}',coalesce(draft->'settings','{}'::jsonb)||jsonb_build_object('shippingDiscountEnabled',true,'shippingDiscountMax',20000)),
  published=jsonb_set(published,'{settings}',coalesce(published->'settings','{}'::jsonb)||jsonb_build_object('shippingDiscountEnabled',true,'shippingDiscountMax',20000)),
  revision=revision+1;
COMMIT;
