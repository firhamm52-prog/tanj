-- Unify hijab CMS inventory with checkout; publishing never resets live stock.
BEGIN;

CREATE OR REPLACE FUNCTION public.tanj_cms_save (
  kind text,
  content_id text,
  item jsonb,
  expected_revision integer,
  expected_stock integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  c public.tb_m_cms;
  doc jsonb;
  entry jsonb;
  entries jsonb;
  pid text := coalesce(nullif(content_id, ''), gen_random_uuid()::text);
  old_stock integer;
  present boolean;
  key text;
BEGIN
  IF NOT public.tanj_is_admin() THEN
    RAISE EXCEPTION 'Akses admin diperlukan.';
  END IF;
  IF kind IS NULL OR kind NOT IN ('products', 'collections', 'hijabs', 'hero', 'banner', 'slides', 'settings') OR jsonb_typeof(item) IS DISTINCT FROM 'object' OR length(item::text) > 15000 THEN
    RAISE EXCEPTION 'Konten tidak valid.';
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
    RAISE EXCEPTION 'Draf berubah. Muat ulang CMS sebelum menyimpan.';
  END IF;
  doc := c.draft;
  IF kind IN ('products', 'hijabs', 'collections') AND coalesce(length(trim(item ->> 'name')), 0) NOT between 1 AND 160 THEN
    RAISE EXCEPTION 'Nama wajib diisi.';
  END IF;
  IF kind IN ('products', 'hijabs') THEN
    IF jsonb_typeof(item -> 'stock') IS DISTINCT FROM 'number' OR (item ->> 'stock') !~ '^[0-9]+$' OR (item ->> 'stock')::bigint > 1000000 OR jsonb_typeof(item -> 'price') IS DISTINCT FROM 'number' OR (item ->> 'price') !~ '^[0-9]+$' OR (item ->> 'price')::bigint NOT between 1 AND 1000000000 THEN
      RAISE EXCEPTION 'Harga atau stok tidak valid.';
    END IF;
  END IF;
  IF kind = 'products' THEN
    IF item ->> 'status' IS NULL OR item ->> 'status' NOT IN ('draft', 'published') OR coalesce(item ->> 'color', '') !~ '^#[A-Fa-f0-9]{6}$' OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(doc -> 'collections') x where x ->> 'id' = item ->> 'collectionId') THEN
      RAISE EXCEPTION 'Koleksi, warna atau status tidak valid.';
    END IF;
    IF NOT public.tanj_cms_valid_media(item ->> 'model') OR NOT public.tanj_cms_valid_media(item ->> 'product') THEN
      RAISE EXCEPTION 'URL gambar tidak valid.';
    END IF;
    SELECT
      stock INTO old_stock
    FROM
      public.tb_m_product
    WHERE
      id = pid
    FOR UPDATE;
    present := found;
    IF present AND old_stock IS DISTINCT FROM expected_stock THEN
      RAISE EXCEPTION 'Stok berubah karena pesanan atau admin lain. Muat ulang CMS.';
    END IF;
    IF present THEN
      UPDATE public.tb_m_product
      SET
        stock = (item ->> 'stock')::int
      WHERE
        id = pid;
    ELSE
      INSERT INTO
        public.tb_m_product
      VALUES
        (
          pid,
          item ->> 'name',
          coalesce(item ->> 'colorName', ''),
          (item ->> 'price')::int,
          (item ->> 'stock')::int,
          FALSE
        );
    END IF;
  ELSIF kind = 'hijabs' THEN
    IF NOT public.tanj_cms_valid_media(item ->> 'image') THEN
      RAISE EXCEPTION 'URL gambar tidak valid.';
    END IF;
    SELECT
      stock INTO old_stock
    FROM
      public.tb_m_product
    WHERE
      id = pid
    FOR UPDATE;
    present := found;
    IF present AND old_stock IS DISTINCT FROM expected_stock THEN
      RAISE EXCEPTION 'Stok berubah karena pesanan atau admin lain. Muat ulang CMS.';
    END IF;
    IF present THEN
      UPDATE public.tb_m_product
      SET
        stock = (item ->> 'stock')::int
      WHERE
        id = pid;
    ELSE
      INSERT INTO
        public.tb_m_product
      VALUES
        (
          pid,
          item ->> 'name',
          coalesce(item ->> 'color', ''),
          (item ->> 'price')::int,
          (item ->> 'stock')::int,
          FALSE
        );
    END IF;
  ELSIF kind IN ('hero', 'banner', 'slides') THEN
    IF NOT public.tanj_cms_valid_media(item ->> 'media') THEN
      RAISE EXCEPTION 'URL media tidak valid.';
    END IF;
  ELSIF kind = 'settings' THEN
    FOREACH key IN ARRAY ARRAY ['lookbookTitle', 'storyTitle', 'storyText'] LOOP
      IF jsonb_typeof(item -> key) IS DISTINCT FROM 'string' OR coalesce(length(trim(item ->> key)), 0) NOT between 1 AND 1000 THEN
        RAISE EXCEPTION 'Teks website tidak valid.';
      END IF;
    END LOOP;
    FOREACH key IN ARRAY ARRAY ['showStock', 'showSold'] LOOP
      IF jsonb_typeof(item -> key) IS DISTINCT FROM 'boolean' THEN
        RAISE EXCEPTION 'Pengaturan tampilan tidak valid.';
      END IF;
    END LOOP;
    IF coalesce(item ->> 'maxQty', '') !~ '^[0-9]+$' OR (item ->> 'maxQty')::int NOT between 1 AND 99 OR coalesce(item ->> 'paymentHours', '') !~ '^[0-9]+$' OR (item ->> 'paymentHours')::int NOT between 1 AND 72 OR coalesce(item ->> 'qrisWidth', '') !~ '^[0-9]+$' OR (item ->> 'qrisWidth')::int NOT between 120 AND 600 OR coalesce(item ->> 'recommendations', '') !~ '^[0-9]+$' OR (item ->> 'recommendations')::int NOT between 0 AND 4 THEN
      RAISE EXCEPTION 'Batas pengaturan tidak valid.';
    END IF;
    IF coalesce(item ->> 'instagram', '') !~ '^https://(www\.)?instagram\.com/' OR coalesce(item ->> 'tiktok', '') !~ '^https://(www\.)?tiktok\.com/' OR coalesce(item ->> 'whatsapp', '') !~ '^[0-9]{7,15}$' OR coalesce(item ->> 'email', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
      RAISE EXCEPTION 'Kontak tidak valid.';
    END IF;
    IF coalesce(item ->> 'storyTheme', '') NOT IN ('ivory', 'cocoa') OR coalesce(item ->> 'headingFont', '') NOT IN ('times', 'sans') THEN
      RAISE EXCEPTION 'Tema tidak valid.';
    END IF;
  END IF;
  IF kind IN ('hero', 'banner', 'settings') THEN
    doc := jsonb_set(doc, ARRAY[kind], item);
  ELSE
    IF nullif(content_id, '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(doc -> kind) x where x ->> 'id' = content_id) THEN
      RAISE EXCEPTION 'Konten tidak ditemukan.';
    END IF;
    IF jsonb_array_length(doc -> kind) >= 250 AND nullif(content_id, '') IS NULL THEN
      RAISE EXCEPTION 'Batas konten tercapai.';
    END IF;
    entry := item || jsonb_build_object('id', pid);
    SELECT
      coalesce(
        jsonb_agg(
          CASE
            WHEN x.value ->> 'id' = pid THEN entry
            ELSE x.value
          END
          ORDER BY
            x.ordinality
        ),
        '[]'
      ) INTO entries
    FROM
      jsonb_array_elements(doc -> kind) WITH ORDINALITY x (value, ordinality);
    IF nullif(content_id, '') IS NULL THEN
      entries := entries || jsonb_build_array(entry);
    END IF;
    doc := jsonb_set(doc, ARRAY[kind], entries);
  END IF;
  UPDATE public.tb_m_cms
  SET
    draft = doc,
    revision = revision + 1
  WHERE
    id;
  RETURN public.tanj_cms_admin ();
END;
$$;

CREATE OR REPLACE FUNCTION public.tanj_sync_hijab_checkout () RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE h jsonb;
BEGIN
  -- Publishing clothes disables the product table; restore only published hijabs.
  UPDATE public.tb_m_product SET active = false
  WHERE id IN (SELECT value->>'id' FROM jsonb_array_elements(OLD.published->'hijabs'));
  FOR h IN SELECT value FROM jsonb_array_elements(NEW.published->'hijabs') LOOP
    INSERT INTO public.tb_m_product (id, name, color, price, stock, active)
    VALUES (h->>'id', h->>'name', h->>'color', (h->>'price')::int, (h->>'stock')::int,
            coalesce(h->>'status', 'published') <> 'draft')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, color = EXCLUDED.color, price = EXCLUDED.price,
      active = EXCLUDED.active;
    -- Existing live inventory is owned by CMS stock saves and checkout, never by document triggers.
  END LOOP;
  RETURN NEW;
END;
$$;

COMMIT;
