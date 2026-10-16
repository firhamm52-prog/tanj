-- Run only AFTER the owner registers and verifies this email through TANJ.
-- Only the project owner runs this in SQL Editor; never expose a role-change RPC.
DO $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT
    id INTO owner_id
  FROM
    auth.users
  WHERE
    lower(email) = 'tanj.indonesia@gmail.com'
    AND email_confirmed_at IS NOT NULL;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Daftar dan verifikasi akun tanj.indonesia@gmail.com terlebih dahulu.';
  END IF;
  INSERT INTO
    public.tb_m_admin (account_id)
  VALUES
    (owner_id)
  ON CONFLICT DO NOTHING;
END;
$$;
