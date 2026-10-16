-- TANJ foundation. Run in the project's SQL Editor before connecting the app.
BEGIN;

CREATE TABLE public.tb_m_account (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tb_m_address (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.tb_m_account (id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '' CHECK (char_length(label) <= 80),
  recipient text NOT NULL CHECK (char_length(recipient) BETWEEN 1 AND 80),
  phone text NOT NULL CHECK (char_length(phone) <= 20),
  address text NOT NULL CHECK (char_length(address) BETWEEN 1 AND 500),
  province_id text NOT NULL,
  city_id text NOT NULL,
  district_id text NOT NULL,
  postcode text NOT NULL CHECK (postcode ~ '^[0-9]{5}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tb_m_address_account_idx ON public.tb_m_address (account_id);

ALTER TABLE public.tb_m_account enable ROW level SECURITY;

ALTER TABLE public.tb_m_address enable ROW level SECURITY;

REVOKE ALL ON public.tb_m_account,
public.tb_m_address
FROM
  anon,
  authenticated;

GRANT
SELECT
  ON public.tb_m_account TO authenticated;

GRANT
UPDATE (full_name) ON public.tb_m_account TO authenticated;

GRANT
SELECT
,
  insert,
UPDATE,
delete ON public.tb_m_address TO authenticated;

CREATE POLICY account_read_self ON public.tb_m_account FOR
SELECT
  TO authenticated USING (
    (
      SELECT
        auth.uid ()
    ) = id
  );

CREATE POLICY account_update_self ON public.tb_m_account
FOR UPDATE
  TO authenticated USING (
    (
      SELECT
        auth.uid ()
    ) = id
  )
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) = id
  );

CREATE POLICY address_owner ON public.tb_m_address FOR ALL TO authenticated USING (
  (
    SELECT
      auth.uid ()
  ) = account_id
)
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) = account_id
  );

-- Passwords and verified email remain managed by Supabase Auth, never this table.
CREATE FUNCTION public.tanj_create_account () RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '' AS $$
BEGIN
  INSERT INTO
    public.tb_m_account (id, full_name)
  VALUES
    (
      new.id,
      left(
        coalesce(new.raw_user_meta_data ->> 'full_name', ''),
        80
      )
    );
  RETURN new;
END;
$$;

REVOKE ALL ON function public.tanj_create_account ()
FROM
  public,
  anon,
  authenticated;

CREATE TRIGGER tanj_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.tanj_create_account ();

-- Backfill Auth users created before this migration (not browser demo accounts).
INSERT INTO
  public.tb_m_account (id, full_name)
SELECT
  id,
  left(
    coalesce(raw_user_meta_data ->> 'full_name', ''),
    80
  )
FROM
  auth.users
ON CONFLICT (id) DO NOTHING;

COMMIT;
