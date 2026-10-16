-- Run after 004. Protects both approval RPCs, including older browser versions.
begin;
create function public.tanj_guard_payment_approval() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.data->>'status'='PAID' and old.data->>'status' is distinct from 'PAID'
    and old.data->>'status' is distinct from 'CHECKING' then
  raise exception 'Customer belum mengonfirmasi pembayaran. Tunggu status Menunggu verifikasi sebelum approve.';
 end if;
 return new;
end;
$$;
revoke all on function public.tanj_guard_payment_approval() from public,anon,authenticated;
create trigger tanj_payment_approval_guard before update on public.tb_t_order
 for each row execute function public.tanj_guard_payment_approval();
commit;
