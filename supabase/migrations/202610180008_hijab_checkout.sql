-- Make published hijabs orderable through the existing trusted checkout.
BEGIN;

INSERT INTO
  public.tb_m_product (id, name, color, price, stock, active)
SELECT
  h ->> 'id',
  h ->> 'name',
  h ->> 'color',
  (h ->> 'price')::int,
  (h ->> 'stock')::int,
  coalesce(h ->> 'status', 'published') <> 'draft'
FROM
  public.tb_m_cms c,
  jsonb_array_elements(c.published -> 'hijabs') h
ON CONFLICT (id) DO NOTHING;

CREATE FUNCTION public.tanj_sync_hijab_checkout () RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE h jsonb; d jsonb; previous jsonb;
BEGIN
  -- Publishing clothes disables the product table; restore only published hijabs.
  UPDATE public.tb_m_product SET active = false
  WHERE id IN (SELECT value->>'id' FROM jsonb_array_elements(OLD.published->'hijabs'));
  FOR h IN SELECT value FROM jsonb_array_elements(NEW.published->'hijabs') LOOP
    SELECT value INTO d FROM jsonb_array_elements(NEW.draft->'hijabs') WHERE value->>'id' = h->>'id';
    SELECT value INTO previous FROM jsonb_array_elements(OLD.draft->'hijabs') WHERE value->>'id' = h->>'id';
    INSERT INTO public.tb_m_product (id, name, color, price, stock, active)
    VALUES (h->>'id', h->>'name', h->>'color', (h->>'price')::int, (h->>'stock')::int,
            coalesce(h->>'status', 'published') <> 'draft')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, color = EXCLUDED.color, price = EXCLUDED.price,
      active = EXCLUDED.active,
      stock = CASE WHEN d->'stock' IS DISTINCT FROM previous->'stock'
                   THEN (d->>'stock')::int ELSE public.tb_m_product.stock END;
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tanj_sync_hijab_checkout ()
FROM
  PUBLIC;

CREATE TRIGGER tanj_sync_hijab_checkout
AFTER UPDATE OF draft,
published ON public.tb_m_cms FOR EACH ROW
EXECUTE FUNCTION public.tanj_sync_hijab_checkout ();

CREATE OR REPLACE FUNCTION public.tanj_cms_document (doc jsonb, include_drafts boolean) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE result jsonb := doc; items jsonb; kind text;
BEGIN
  FOREACH kind IN ARRAY ARRAY['products','hijabs'] LOOP
    SELECT coalesce(jsonb_agg(x.value || jsonb_build_object(
      'stock', coalesce(p.stock,0), 'inStock', coalesce(p.active AND p.stock > 0,false))
      ORDER BY x.ordinality), '[]'::jsonb) INTO items
    FROM jsonb_array_elements(doc->kind) WITH ORDINALITY x(value,ordinality)
    LEFT JOIN public.tb_m_product p ON p.id = x.value->>'id'
    WHERE include_drafts OR coalesce(x.value->>'status','published') = 'published';
    result := jsonb_set(result, ARRAY[kind], items);
  END LOOP;
  RETURN result;
END;
$$;

COMMIT;
