-- Shared TANJ CMS. Run after 006. Keeps existing accounts, orders and QRIS.
BEGIN;

CREATE TABLE public.tb_m_cms (
  id boolean PRIMARY KEY DEFAULT TRUE CHECK (id),
  draft jsonb NOT NULL,
  published jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1
);

ALTER TABLE public.tb_m_cms enable ROW level SECURITY;

REVOKE ALL ON public.tb_m_cms
FROM
  anon,
  authenticated;

INSERT INTO
  public.tb_m_cms (id, draft, published)
VALUES
  (
    TRUE,
    $cms_seed$
{
  "settings": {
    "lookbookTitle": "Must be have combination.",
    "storyTitle": "Grace in\nevery detail.",
    "storyText": "Siluet yang mengalir, warna yang menenangkan. Temani setiap langkah dengan anggun, dalam caramu sendiri.",
    "instagram": "https://www.instagram.com/tanjofficial/",
    "tiktok": "https://www.tiktok.com/@tanj.co.id",
    "whatsapp": "6281363661703",
    "email": "tanj.indonesia@gmail.com",
    "showStock": true,
    "showSold": true,
    "maxQty": 99,
    "qrisWidth": 180,
    "recommendations": 2,
    "paymentHours": 24,
    "storyTheme": "ivory",
    "headingFont": "times"
  },
  "collections": [
    {
      "id": "base-0",
      "name": "Embroidered Outer",
      "description": "Detail bordir untuk hari yang istimewa."
    },
    {
      "id": "base-1",
      "name": "Everyday Drape Outer",
      "description": "Lapisan ringan untuk setiap hari."
    },
    {
      "id": "base-2",
      "name": "Flow Dress",
      "description": "Siluet sederhana yang bergerak bersamamu."
    },
    {
      "id": "base-3",
      "name": "Flow Dress Belted",
      "description": "Potongan anggun dengan detail ikat pinggang."
    }
  ],
  "products": [
    {
      "id": "base-0-0",
      "collectionId": "base-0",
      "name": "TANJ Sand",
      "colorName": "Cream",
      "color": "#eee6d7",
      "model": "assets/campaign-beige.webp",
      "product": "assets/look-2.webp",
      "price": 687000,
      "sold": 0,
      "stock": 12,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-0-1",
      "collectionId": "base-0",
      "name": "TANJ Noir",
      "colorName": "Hitam",
      "color": "#292527",
      "model": "assets/campaign-black.webp",
      "product": "assets/look-3.webp",
      "price": 687000,
      "sold": 0,
      "stock": 15,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-0-2",
      "collectionId": "base-0",
      "name": "TANJ Cocoa",
      "colorName": "Cokelat",
      "color": "#735247",
      "model": "assets/campaign-brown.webp",
      "product": "assets/embroidered-cocoa.webp",
      "price": 687000,
      "sold": 0,
      "stock": 18,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-1-0",
      "collectionId": "base-1",
      "name": "Cocoa",
      "colorName": "Cokelat",
      "color": "#735247",
      "model": "assets/drape-v3-cocoa-model.webp",
      "product": "assets/drape-v2-cocoa-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 21,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-1-1",
      "collectionId": "base-1",
      "name": "Black",
      "colorName": "Hitam",
      "color": "#292527",
      "model": "assets/drape-v3-black-model.webp",
      "product": "assets/drape-v2-black-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 24,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-1-2",
      "collectionId": "base-1",
      "name": "Ivory",
      "colorName": "Ivory",
      "color": "#eee6d7",
      "model": "assets/drape-v3-ivory-model.webp",
      "product": "assets/drape-v2-ivory-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 27,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-2-0",
      "collectionId": "base-2",
      "name": "Cream",
      "colorName": "Cream",
      "color": "#eee6d7",
      "model": "assets/flow-v3-cream-model.webp",
      "product": "assets/flow-v3-cream-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 30,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-2-1",
      "collectionId": "base-2",
      "name": "Black",
      "colorName": "Hitam",
      "color": "#292527",
      "model": "assets/flow-v3-black-model.webp",
      "product": "assets/flow-v3-black-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 33,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-2-2",
      "collectionId": "base-2",
      "name": "Ash",
      "colorName": "Abu-abu",
      "color": "#837c7d",
      "model": "assets/flow-v3-ash-model.webp",
      "product": "assets/flow-v3-ash-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 0,
      "inStock": false,
      "status": "published"
    },
    {
      "id": "base-3-0",
      "collectionId": "base-3",
      "name": "Cream",
      "colorName": "Cream",
      "color": "#eee6d7",
      "model": "assets/flow-belted-cream-model.webp",
      "product": "assets/flow-belted-cream-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 39,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-3-1",
      "collectionId": "base-3",
      "name": "Black",
      "colorName": "Hitam",
      "color": "#292527",
      "model": "assets/flow-belted-black-model.webp",
      "product": "assets/flow-belted-black-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 42,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-3-2",
      "collectionId": "base-3",
      "name": "Ash",
      "colorName": "Abu-abu",
      "color": "#837c7d",
      "model": "assets/flow-belted-ash-model.webp",
      "product": "assets/flow-belted-ash-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 45,
      "inStock": true,
      "status": "published"
    }
  ],
  "hijabs": [
    {
      "id": "hijab-selcuk-brown",
      "collection": "selcuk",
      "color": "brown",
      "name": "Selcuk Brown",
      "price": 249000,
      "stock": 18,
      "inStock": true,
      "image": "assets/hijab-selcuk-brown.webp"
    },
    {
      "id": "hijab-selcuk-gray",
      "collection": "selcuk",
      "color": "gray",
      "name": "Selcuk Gray",
      "price": 249000,
      "stock": 19,
      "inStock": true,
      "image": "assets/hijab-selcuk-gray.webp"
    },
    {
      "id": "hijab-georgia-white",
      "collection": "georgia",
      "color": "white",
      "name": "Georgia White",
      "price": 195000,
      "stock": 20,
      "inStock": true,
      "image": "assets/hijab-georgia-white.webp"
    },
    {
      "id": "hijab-georgia-nude",
      "collection": "georgia",
      "color": "nude",
      "name": "Georgia Nude",
      "price": 195000,
      "stock": 21,
      "inStock": true,
      "image": "assets/hijab-georgia-nude.webp"
    },
    {
      "id": "hijab-georgia-black",
      "collection": "georgia",
      "color": "black",
      "name": "Georgia Black",
      "price": 195000,
      "stock": 22,
      "inStock": true,
      "image": "assets/hijab-georgia-black.webp"
    },
    {
      "id": "hijab-georgia-cream",
      "collection": "georgia",
      "color": "cream",
      "name": "Georgia Cream",
      "price": 195000,
      "stock": 23,
      "inStock": true,
      "image": "assets/hijab-georgia-cream-poster.webp"
    }
  ],
  "hero": {
    "media": "assets/noireaterial-desert-three-models-v3.mp4"
  },
  "banner": {
    "enabled": false,
    "title": "The everyday edit",
    "subtitle": "Siluet yang menemani setiap langkah.",
    "mediaType": "image",
    "media": "assets/campaign-beige.webp"
  },
  "slides": [
    {
      "id": "slide-1",
      "caption": "Hijab Selcuk Brown TANJ",
      "mediaType": "image",
      "media": "assets/hijab-selcuk-brown.webp"
    },
    {
      "id": "slide-2",
      "caption": "Hijab Selcuk Gray TANJ",
      "mediaType": "image",
      "media": "assets/hijab-selcuk-gray.webp"
    },
    {
      "id": "slide-3",
      "caption": "Hijab Georgia White TANJ",
      "mediaType": "image",
      "media": "assets/hijab-georgia-white.webp"
    },
    {
      "id": "slide-4",
      "caption": "Hijab Georgia Nude TANJ",
      "mediaType": "image",
      "media": "assets/hijab-georgia-nude.webp"
    },
    {
      "id": "slide-5",
      "caption": "Hijab Georgia Black TANJ",
      "mediaType": "image",
      "media": "assets/hijab-georgia-black.webp"
    },
    {
      "id": "slide-6",
      "caption": "Hijab Georgia Cream TANJ",
      "mediaType": "video",
      "media": "assets/hijab-georgia-cream.mp4"
    }
  ]
}
$cms_seed$::jsonb,
    $cms_seed$
{
  "settings": {
    "lookbookTitle": "Must be have combination.",
    "storyTitle": "Grace in\nevery detail.",
    "storyText": "Siluet yang mengalir, warna yang menenangkan. Temani setiap langkah dengan anggun, dalam caramu sendiri.",
    "instagram": "https://www.instagram.com/tanjofficial/",
    "tiktok": "https://www.tiktok.com/@tanj.co.id",
    "whatsapp": "6281363661703",
    "email": "tanj.indonesia@gmail.com",
    "showStock": true,
    "showSold": true,
    "maxQty": 99,
    "qrisWidth": 180,
    "recommendations": 2,
    "paymentHours": 24,
    "storyTheme": "ivory",
    "headingFont": "times"
  },
  "collections": [
    {
      "id": "base-0",
      "name": "Embroidered Outer",
      "description": "Detail bordir untuk hari yang istimewa."
    },
    {
      "id": "base-1",
      "name": "Everyday Drape Outer",
      "description": "Lapisan ringan untuk setiap hari."
    },
    {
      "id": "base-2",
      "name": "Flow Dress",
      "description": "Siluet sederhana yang bergerak bersamamu."
    },
    {
      "id": "base-3",
      "name": "Flow Dress Belted",
      "description": "Potongan anggun dengan detail ikat pinggang."
    }
  ],
  "products": [
    {
      "id": "base-0-0",
      "collectionId": "base-0",
      "name": "TANJ Sand",
      "colorName": "Cream",
      "color": "#eee6d7",
      "model": "assets/campaign-beige.webp",
      "product": "assets/look-2.webp",
      "price": 687000,
      "sold": 0,
      "stock": 12,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-0-1",
      "collectionId": "base-0",
      "name": "TANJ Noir",
      "colorName": "Hitam",
      "color": "#292527",
      "model": "assets/campaign-black.webp",
      "product": "assets/look-3.webp",
      "price": 687000,
      "sold": 0,
      "stock": 15,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-0-2",
      "collectionId": "base-0",
      "name": "TANJ Cocoa",
      "colorName": "Cokelat",
      "color": "#735247",
      "model": "assets/campaign-brown.webp",
      "product": "assets/embroidered-cocoa.webp",
      "price": 687000,
      "sold": 0,
      "stock": 18,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-1-0",
      "collectionId": "base-1",
      "name": "Cocoa",
      "colorName": "Cokelat",
      "color": "#735247",
      "model": "assets/drape-v3-cocoa-model.webp",
      "product": "assets/drape-v2-cocoa-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 21,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-1-1",
      "collectionId": "base-1",
      "name": "Black",
      "colorName": "Hitam",
      "color": "#292527",
      "model": "assets/drape-v3-black-model.webp",
      "product": "assets/drape-v2-black-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 24,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-1-2",
      "collectionId": "base-1",
      "name": "Ivory",
      "colorName": "Ivory",
      "color": "#eee6d7",
      "model": "assets/drape-v3-ivory-model.webp",
      "product": "assets/drape-v2-ivory-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 27,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-2-0",
      "collectionId": "base-2",
      "name": "Cream",
      "colorName": "Cream",
      "color": "#eee6d7",
      "model": "assets/flow-v3-cream-model.webp",
      "product": "assets/flow-v3-cream-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 30,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-2-1",
      "collectionId": "base-2",
      "name": "Black",
      "colorName": "Hitam",
      "color": "#292527",
      "model": "assets/flow-v3-black-model.webp",
      "product": "assets/flow-v3-black-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 33,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-2-2",
      "collectionId": "base-2",
      "name": "Ash",
      "colorName": "Abu-abu",
      "color": "#837c7d",
      "model": "assets/flow-v3-ash-model.webp",
      "product": "assets/flow-v3-ash-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 0,
      "inStock": false,
      "status": "published"
    },
    {
      "id": "base-3-0",
      "collectionId": "base-3",
      "name": "Cream",
      "colorName": "Cream",
      "color": "#eee6d7",
      "model": "assets/flow-belted-cream-model.webp",
      "product": "assets/flow-belted-cream-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 39,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-3-1",
      "collectionId": "base-3",
      "name": "Black",
      "colorName": "Hitam",
      "color": "#292527",
      "model": "assets/flow-belted-black-model.webp",
      "product": "assets/flow-belted-black-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 42,
      "inStock": true,
      "status": "published"
    },
    {
      "id": "base-3-2",
      "collectionId": "base-3",
      "name": "Ash",
      "colorName": "Abu-abu",
      "color": "#837c7d",
      "model": "assets/flow-belted-ash-model.webp",
      "product": "assets/flow-belted-ash-product.webp",
      "price": 687000,
      "sold": 0,
      "stock": 45,
      "inStock": true,
      "status": "published"
    }
  ],
  "hijabs": [
    {
      "id": "hijab-selcuk-brown",
      "collection": "selcuk",
      "color": "brown",
      "name": "Selcuk Brown",
      "price": 249000,
      "stock": 18,
      "inStock": true,
      "image": "assets/hijab-selcuk-brown.webp"
    },
    {
      "id": "hijab-selcuk-gray",
      "collection": "selcuk",
      "color": "gray",
      "name": "Selcuk Gray",
      "price": 249000,
      "stock": 19,
      "inStock": true,
      "image": "assets/hijab-selcuk-gray.webp"
    },
    {
      "id": "hijab-georgia-white",
      "collection": "georgia",
      "color": "white",
      "name": "Georgia White",
      "price": 195000,
      "stock": 20,
      "inStock": true,
      "image": "assets/hijab-georgia-white.webp"
    },
    {
      "id": "hijab-georgia-nude",
      "collection": "georgia",
      "color": "nude",
      "name": "Georgia Nude",
      "price": 195000,
      "stock": 21,
      "inStock": true,
      "image": "assets/hijab-georgia-nude.webp"
    },
    {
      "id": "hijab-georgia-black",
      "collection": "georgia",
      "color": "black",
      "name": "Georgia Black",
      "price": 195000,
      "stock": 22,
      "inStock": true,
      "image": "assets/hijab-georgia-black.webp"
    },
    {
      "id": "hijab-georgia-cream",
      "collection": "georgia",
      "color": "cream",
      "name": "Georgia Cream",
      "price": 195000,
      "stock": 23,
      "inStock": true,
      "image": "assets/hijab-georgia-cream-poster.webp"
    }
  ],
  "hero": {
    "media": "assets/noireaterial-desert-three-models-v3.mp4"
  },
  "banner": {
    "enabled": false,
    "title": "The everyday edit",
    "subtitle": "Siluet yang menemani setiap langkah.",
    "mediaType": "image",
    "media": "assets/campaign-beige.webp"
  },
  "slides": [
    {
      "id": "slide-1",
      "caption": "Hijab Selcuk Brown TANJ",
      "mediaType": "image",
      "media": "assets/hijab-selcuk-brown.webp"
    },
    {
      "id": "slide-2",
      "caption": "Hijab Selcuk Gray TANJ",
      "mediaType": "image",
      "media": "assets/hijab-selcuk-gray.webp"
    },
    {
      "id": "slide-3",
      "caption": "Hijab Georgia White TANJ",
      "mediaType": "image",
      "media": "assets/hijab-georgia-white.webp"
    },
    {
      "id": "slide-4",
      "caption": "Hijab Georgia Nude TANJ",
      "mediaType": "image",
      "media": "assets/hijab-georgia-nude.webp"
    },
    {
      "id": "slide-5",
      "caption": "Hijab Georgia Black TANJ",
      "mediaType": "image",
      "media": "assets/hijab-georgia-black.webp"
    },
    {
      "id": "slide-6",
      "caption": "Hijab Georgia Cream TANJ",
      "mediaType": "video",
      "media": "assets/hijab-georgia-cream.mp4"
    }
  ]
}
$cms_seed$::jsonb
  );

-- Preserve any prices already adjusted in the operational catalog.
UPDATE public.tb_m_cms c
SET
  draft = jsonb_set(
    c.draft,
    '{products}',
    (
      SELECT
        jsonb_agg(
          x.value || CASE
            WHEN p.id IS NULL THEN '{}'::jsonb
            ELSE jsonb_build_object('price', p.price, 'stock', p.stock)
          END
          ORDER BY
            x.ordinality
        )
      FROM
        jsonb_array_elements(c.draft -> 'products') WITH ORDINALITY x (value, ordinality)
        LEFT JOIN public.tb_m_product p ON p.id = x.value ->> 'id'
    )
  );

UPDATE public.tb_m_cms
SET
  published = draft;

CREATE FUNCTION public.tanj_cms_document (doc jsonb, include_drafts boolean) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  result jsonb := doc;
  items jsonb;
BEGIN
  SELECT
    coalesce(
      jsonb_agg(
        x.value || jsonb_build_object(
          'stock',
          coalesce(p.stock, 0),
          'inStock',
          coalesce(
            p.active
            AND p.stock > 0,
            FALSE
          )
        )
        ORDER BY
          x.ordinality
      ),
      '[]'
    ) INTO items
  FROM
    jsonb_array_elements(doc -> 'products') WITH ORDINALITY x (value, ordinality)
    LEFT JOIN public.tb_m_product p ON p.id = x.value ->> 'id'
  WHERE
    include_drafts
    OR x.value ->> 'status' = 'published';
  result := jsonb_set(result, '{products}', items);
  RETURN result;
END;
$$;

CREATE FUNCTION public.tanj_cms_storefront () RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET
  search_path = '' AS $$
SELECT
  public.tanj_cms_document (published, FALSE)
FROM
  public.tb_m_cms
WHERE
  id;
$$;

CREATE FUNCTION public.tanj_cms_admin () RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  c public.tb_m_cms;
BEGIN
  IF NOT public.tanj_is_admin() THEN
    RAISE EXCEPTION 'Akses admin diperlukan.';
  END IF;
  SELECT
    * INTO c
  FROM
    public.tb_m_cms
  WHERE
    id;
  RETURN public.tanj_cms_document (c.draft, TRUE) || jsonb_build_object('revision', c.revision);
END;
$$;

CREATE FUNCTION public.tanj_cms_valid_media (value text) RETURNS boolean LANGUAGE sql IMMUTABLE
SET
  search_path = '' AS $$
SELECT
  coalesce(
    length(value) <= 2048
    AND (
      value ~ '^assets/[A-Za-z0-9_-]+\.(webp|png|jpg|jpeg|mp4|webm|ogg)$'
      OR value ~ '^https://[^/@[:space:]]+([/:][^[:space:]]*)?$'
    ),
    FALSE
  );
$$;

CREATE FUNCTION public.tanj_cms_save (
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
    -- Hijabs are sold through CS; update only their live availability until publish.
    SELECT
      coalesce(
        jsonb_agg(
          CASE
            WHEN x.value ->> 'id' = pid THEN x.value || jsonb_build_object(
              'stock',
              (item ->> 'stock')::int,
              'inStock',
              (item ->> 'stock')::int > 0
            )
            ELSE x.value
          END
          ORDER BY
            x.ordinality
        ),
        '[]'
      ) INTO entries
    FROM
      jsonb_array_elements(c.published -> 'hijabs') WITH ORDINALITY x (value, ordinality);
    UPDATE public.tb_m_cms
    SET
      published = jsonb_set(published, '{hijabs}', entries)
    WHERE
      id;
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

CREATE FUNCTION public.tanj_cms_remove (
  kind text,
  content_id text,
  expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  c public.tb_m_cms;
  entries jsonb;
BEGIN
  IF NOT public.tanj_is_admin() THEN
    RAISE EXCEPTION 'Akses admin diperlukan.';
  END IF;
  IF kind IS NULL OR kind NOT IN ('products', 'collections', 'hijabs', 'slides') THEN
    RAISE EXCEPTION 'Jenis konten tidak valid.';
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
  IF kind = 'collections' AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.draft -> 'products') x where x ->> 'collectionId' = content_id) THEN
    RAISE EXCEPTION 'Pindahkan produk dari koleksi terlebih dahulu.';
  END IF;
  SELECT
    coalesce(
      jsonb_agg(
        x.value
        ORDER BY
          x.ordinality
      ),
      '[]'
    ) INTO entries
  FROM
    jsonb_array_elements(c.draft -> kind) WITH ORDINALITY x (value, ordinality)
  WHERE
    x.value ->> 'id' <> content_id;
  UPDATE public.tb_m_cms
  SET
    draft = jsonb_set(draft, ARRAY[kind], entries),
    revision = revision + 1
  WHERE
    id;
  RETURN public.tanj_cms_admin ();
END;
$$;

CREATE FUNCTION public.tanj_cms_publish (expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
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
    active = FALSE;
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

CREATE FUNCTION public.tanj_cms_order_limit () RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
DECLARE
  maximum integer;
BEGIN
  SELECT
    coalesce((published #>> '{settings,maxQty}')::int, 99) INTO maximum
  FROM
    public.tb_m_cms
  WHERE
    id;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(new.data -> 'items') x where(x ->> 'qty')::int > maximum) THEN
    RAISE EXCEPTION 'Qty melebihi batas per produk yang ditentukan TANJ.';
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER tanj_cms_order_limit
BEFORE INSERT ON public.tb_t_order FOR EACH ROW
EXECUTE FUNCTION public.tanj_cms_order_limit ();

REVOKE ALL ON function public.tanj_cms_document (jsonb, boolean),
public.tanj_cms_valid_media (text),
public.tanj_cms_order_limit ()
FROM
  public,
  anon,
  authenticated;

REVOKE ALL ON function public.tanj_cms_storefront (),
public.tanj_cms_admin (),
public.tanj_cms_save (text, text, jsonb, integer, integer),
public.tanj_cms_remove (text, text, integer),
public.tanj_cms_publish (integer)
FROM
  public;

GRANT
EXECUTE ON function public.tanj_cms_storefront () TO anon,
authenticated;

GRANT
EXECUTE ON function public.tanj_cms_admin (),
public.tanj_cms_save (text, text, jsonb, integer, integer),
public.tanj_cms_remove (text, text, integer),
public.tanj_cms_publish (integer) TO authenticated;

COMMIT;
