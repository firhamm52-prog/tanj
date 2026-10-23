-- Product discounts are published atomically with authoritative checkout prices.
BEGIN;
-- Disable the old automatic two-clothing-item shipping subsidy for new orders.
DO $$ DECLARE definition text; BEGIN
 definition := pg_get_functiondef('public.tanj_create_order_before_midtrans(uuid,jsonb,jsonb)'::regprocedure);
 IF position('least(20000, original_fee)' in definition)=0 THEN
  RAISE EXCEPTION 'Fungsi diskon ongkir lama tidak sesuai. Migrasi dihentikan.';
 END IF;
 EXECUTE replace(definition,'least(20000, original_fee)','least(0, original_fee)');
END $$;
ALTER FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) RENAME TO tanj_cms_save_before_discounts;
REVOKE ALL ON FUNCTION public.tanj_cms_save_before_discounts(text,text,jsonb,integer,integer) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tanj_cms_save(kind text,content_id text,item jsonb,expected_revision integer,expected_stock integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.tanj_is_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan.'; END IF;
 IF kind IN ('products','hijabs') AND item ? 'discountAmount' THEN
  IF jsonb_typeof(item->'discountAmount') IS DISTINCT FROM 'number'
    OR (item->>'discountAmount') !~ '^[0-9]{1,10}$'
    OR (item->>'price') !~ '^[0-9]{1,10}$' THEN
   RAISE EXCEPTION 'Diskon produk tidak valid.';
  END IF;
  IF (item->>'discountAmount')::bigint >= (item->>'price')::bigint THEN
   RAISE EXCEPTION 'Diskon produk harus lebih kecil dari harga asli.';
  END IF;
 END IF;
 RETURN public.tanj_cms_save_before_discounts(kind,content_id,item,expected_revision,expected_stock);
END; $$;
REVOKE ALL ON FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_cms_save(text,text,jsonb,integer,integer) TO authenticated;

ALTER FUNCTION public.tanj_cms_document(jsonb,boolean) RENAME TO tanj_cms_document_before_discounts;
REVOKE ALL ON FUNCTION public.tanj_cms_document_before_discounts(jsonb,boolean) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tanj_cms_document(doc jsonb,include_drafts boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; kind text; items jsonb;
BEGIN
 result := public.tanj_cms_document_before_discounts(doc,include_drafts);
 IF include_drafts THEN RETURN result; END IF;
 FOREACH kind IN ARRAY ARRAY['products','hijabs'] LOOP
  SELECT coalesce(jsonb_agg(x || jsonb_build_object('originalPrice',(x->>'price')::int,
    'price',(x->>'price')::int-coalesce((x->>'discountAmount')::int,0)) ORDER BY n),'[]') INTO items
  FROM jsonb_array_elements(result->kind) WITH ORDINALITY a(x,n);
  result := jsonb_set(result,ARRAY[kind],items);
 END LOOP;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_cms_document(jsonb,boolean) FROM PUBLIC,anon,authenticated;

ALTER FUNCTION public.tanj_cms_publish(integer) RENAME TO tanj_cms_publish_before_discounts;
REVOKE ALL ON FUNCTION public.tanj_cms_publish_before_discounts(integer) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tanj_cms_publish(expected_revision integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; item jsonb;
BEGIN
 IF NOT public.tanj_is_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan.'; END IF;
 PERFORM pg_advisory_xact_lock(818263);
 FOR item IN SELECT value FROM public.tb_m_cms c,
  LATERAL jsonb_array_elements((c.draft->'products')||(c.draft->'hijabs')) LOOP
  IF coalesce((item->>'discountAmount')::bigint,0)<0 OR coalesce((item->>'discountAmount')::bigint,0)>=(item->>'price')::bigint
  THEN RAISE EXCEPTION 'Diskon produk harus lebih kecil dari harga asli.'; END IF;
 END LOOP;
 result := public.tanj_cms_publish_before_discounts(expected_revision);
 UPDATE public.tb_m_product p SET price=(x->>'price')::int-coalesce((x->>'discountAmount')::int,0)
 FROM public.tb_m_cms c,LATERAL jsonb_array_elements((c.published->'products')||(c.published->'hijabs')) x
 WHERE p.id=x->>'id';
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_cms_publish(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_cms_publish(integer) TO authenticated;

ALTER FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) RENAME TO tanj_create_order_before_discounts;
REVOKE ALL ON FUNCTION public.tanj_create_order_before_discounts(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.tanj_create_order(request_id uuid,customer jsonb,lines jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; items jsonb; discount bigint; oid text:='TANJ-'||upper(request_id::text);
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login terlebih dahulu.'; END IF;
 PERFORM pg_advisory_xact_lock(818263);
 SELECT data INTO d FROM public.tb_t_order WHERE id=oid AND account_id=auth.uid();
 IF FOUND THEN RETURN d; END IF;
 d:=public.tanj_create_order_before_discounts(request_id,customer,lines);
 SELECT jsonb_agg(i || jsonb_build_object('originalPrice',coalesce((p->>'price')::int,(i->>'price')::int)) ORDER BY n),
  coalesce(sum(greatest(0,coalesce((p->>'price')::int,(i->>'price')::int)-(i->>'price')::int)*(i->>'qty')::int),0)
 INTO items,discount FROM jsonb_array_elements(d->'items') WITH ORDINALITY a(i,n)
 LEFT JOIN LATERAL (SELECT x AS p FROM public.tb_m_cms c,
  LATERAL jsonb_array_elements((c.published->'products')||(c.published->'hijabs')) x WHERE x->>'id'=i->>'id' LIMIT 1) b ON true;
 d:=d||jsonb_build_object('items',items,'productDiscount',discount,'originalSubtotal',(d->>'subtotal')::bigint+discount);
 UPDATE public.tb_t_order SET data=d WHERE id=oid;
 RETURN d;
END; $$;
REVOKE ALL ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tanj_create_order(uuid,jsonb,jsonb) TO authenticated;
COMMIT;
