-- Fix the confirmed live error: UPDATE requires a WHERE clause.
-- Compatible with Supabase safe-update protection; keeps it enabled.
-- Installs the publication fix without changing any existing drafts or orders.
BEGIN;

CREATE OR REPLACE FUNCTION public.tanj_cms_publish (expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  c public.tb_m_cms;
  p jsonb;
BEGIN
  IF NOT public.tanj_is_admin() THEN
    RAISE EXCEPTION 'Akses admin diperlukan.';
  END IF;
  PERFORM pg_advisory_xact_lock(818263);
  SELECT
    * INTO c
  FROM
    public.tb_m_cms
  WHERE
    id
  FOR UPDATE;
  IF c.revision IS DISTINCT FROM expected_revision THEN
    RAISE EXCEPTION 'Draf berubah. Muat ulang CMS.';
  END IF;
  UPDATE public.tb_m_product
  SET
    active = FALSE
  WHERE active IS DISTINCT FROM FALSE;
  FOR p IN SELECT value FROM jsonb_array_elements(c.draft -> 'products') LOOP
    UPDATE public.tb_m_product
    SET
      name = p ->> 'name',
      color = p ->> 'colorName',
      price = (p ->> 'price')::int,
      active = p ->> 'status' = 'published'
    WHERE
      id = p ->> 'id';
  END LOOP;
  -- Publication never resets live stock reserved by orders.
  UPDATE public.tb_m_cms
  SET
    published = draft,
    revision = revision + 1
  WHERE
    id;
  -- Explicitly sync published hijab prices; preserve stock already reserved by orders.
  INSERT INTO
    public.tb_m_product (id, name, color, price, stock, active)
  SELECT
    h ->> 'id',
    h ->> 'name',
    h ->> 'color',
    (h ->> 'price')::int,
    (h ->> 'stock')::int,
    coalesce(h ->> 'status', 'published') = 'published'
  FROM
    jsonb_array_elements(c.draft -> 'hijabs') h
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    color = EXCLUDED.color,
    price = EXCLUDED.price,
    active = EXCLUDED.active;
  UPDATE public.tb_m_payment_settings
  SET
    data = jsonb_set(
      data,
      '{hours}',
      coalesce(c.draft #> '{settings,paymentHours}', '24')
    )
  WHERE
    id;
  RETURN public.tanj_cms_admin ();
END;
$$;

REVOKE ALL ON FUNCTION public.tanj_cms_publish (integer)
FROM
  PUBLIC,
  anon;

GRANT
EXECUTE ON FUNCTION public.tanj_cms_publish (integer) TO authenticated;

COMMIT;
