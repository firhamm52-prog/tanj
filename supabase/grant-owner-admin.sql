-- Run only AFTER the owner registers and verifies this email through TANJ.
-- Only the project owner runs this in SQL Editor; never expose a role-change RPC.
do $$
declare owner_id uuid;
begin
 select id into owner_id from auth.users
 where lower(email)='tanj.indonesia@gmail.com' and email_confirmed_at is not null;
 if owner_id is null then raise exception 'Daftar dan verifikasi akun tanj.indonesia@gmail.com terlebih dahulu.';end if;
 insert into public.tb_m_admin(account_id) values(owner_id) on conflict do nothing;
end;
$$;
