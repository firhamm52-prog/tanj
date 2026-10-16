-- TANJ foundation. Run in the project's SQL Editor before connecting the app.
begin;
create table public.tb_m_account (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check (char_length(full_name)<=80),
 created_at timestamptz not null default now()
);
create table public.tb_m_address (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.tb_m_account(id) on delete cascade,
 label text not null default '' check (char_length(label)<=80),
 recipient text not null check (char_length(recipient) between 1 and 80),
 phone text not null check (char_length(phone)<=20),
 address text not null check (char_length(address) between 1 and 500),
 province_id text not null, city_id text not null, district_id text not null,
 postcode text not null check (postcode ~ '^[0-9]{5}$'),
 created_at timestamptz not null default now()
);
create index tb_m_address_account_idx on public.tb_m_address(account_id);
alter table public.tb_m_account enable row level security;
alter table public.tb_m_address enable row level security;
revoke all on public.tb_m_account, public.tb_m_address from anon, authenticated;
grant select on public.tb_m_account to authenticated;
grant update(full_name) on public.tb_m_account to authenticated;
grant select, insert, update, delete on public.tb_m_address to authenticated;
create policy account_read_self on public.tb_m_account for select to authenticated
 using ((select auth.uid())=id);
create policy account_update_self on public.tb_m_account for update to authenticated
 using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy address_owner on public.tb_m_address for all to authenticated
 using ((select auth.uid())=account_id) with check ((select auth.uid())=account_id);
-- Passwords and verified email remain managed by Supabase Auth, never this table.
create function public.tanj_create_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.tb_m_account(id,full_name)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),80));
 return new;
end;
$$;
revoke all on function public.tanj_create_account() from public, anon, authenticated;
create trigger tanj_auth_user_created after insert on auth.users
 for each row execute function public.tanj_create_account();
-- Backfill Auth users created before this migration (not browser demo accounts).
insert into public.tb_m_account(id,full_name)
 select id,left(coalesce(raw_user_meta_data->>'full_name',''),80) from auth.users
 on conflict(id) do nothing;
commit;
