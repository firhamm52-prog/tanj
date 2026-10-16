-- Run after 005. Returns only whether a signup email is already in Auth.
begin;
create function public.tanj_signup_email_exists(candidate_email text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users
 where lower(email)=lower(trim(candidate_email))
 and char_length(trim(candidate_email)) between 3 and 254);
$$;
revoke all on function public.tanj_signup_email_exists(text) from public;
grant execute on function public.tanj_signup_email_exists(text) to anon,authenticated;
commit;
