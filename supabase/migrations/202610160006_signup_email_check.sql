-- Run after 005. Returns only whether a signup email is already in Auth.
BEGIN;

CREATE FUNCTION public.tanj_signup_email_exists (candidate_email text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET
  search_path = '' AS $$
SELECT
  EXISTS (
    SELECT
      1
    FROM
      auth.users
    WHERE
      lower(email) = lower(trim(candidate_email))
      AND char_length(trim(candidate_email)) BETWEEN 3 AND 254
  );
$$;

REVOKE ALL ON function public.tanj_signup_email_exists (text)
FROM
  public;

GRANT
EXECUTE ON function public.tanj_signup_email_exists (text) TO anon,
authenticated;

COMMIT;
