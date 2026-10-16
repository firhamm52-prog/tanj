-- Run after 202610160001_accounts.sql and before activating shared payments.
begin;
create table public.tb_m_admin(account_id uuid primary key references auth.users(id) on delete cascade);
alter table public.tb_m_admin enable row level security;
revoke all on public.tb_m_admin from anon,authenticated;
create function public.tanj_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tb_m_admin where account_id=auth.uid());
$$;
revoke all on function public.tanj_is_admin() from public;
grant execute on function public.tanj_is_admin() to authenticated;
create table public.tb_m_product(id text primary key, name text not null, color text not null, price integer not null check(price>0),stock integer not null check(stock>=0),active boolean not null default true);
create table public.tb_m_shipping(id text primary key,province_id text not null,province text not null,city text not null,fee integer not null check(fee>=0));
create table public.tb_m_payment_settings(id boolean primary key default true check(id),data jsonb not null);
insert into public.tb_m_payment_settings values(true,'{"hours":24,"admin":"Admin TANJ"}');
create table public.tb_t_order(id text primary key,account_id uuid not null references auth.users(id),data jsonb not null,created_at timestamptz not null default now());
create index tb_t_order_account on public.tb_t_order(account_id);
alter table public.tb_m_product enable row level security;
alter table public.tb_m_shipping enable row level security;
alter table public.tb_m_payment_settings enable row level security;
alter table public.tb_t_order enable row level security;
revoke all on public.tb_m_product,public.tb_m_shipping,public.tb_m_payment_settings,public.tb_t_order from anon,authenticated;
grant select on public.tb_m_product,public.tb_m_shipping,public.tb_m_payment_settings to anon,authenticated;
grant select on public.tb_t_order to authenticated;
create policy product_read on public.tb_m_product for select using(true);
create policy shipping_read on public.tb_m_shipping for select using(true);
create policy settings_read on public.tb_m_payment_settings for select using(true);
create policy order_read on public.tb_t_order for select to authenticated using(account_id=(select auth.uid()) or (select public.tanj_is_admin()));
create function public.tanj_create_order(request_id uuid,customer jsonb,lines jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); result jsonb; line jsonb; p public.tb_m_product; s public.tb_m_shipping;
 items jsonb:='[]'; settings jsonb; subtotal bigint:=0; base bigint; code integer; adjustment integer;
 stamp bigint:=(extract(epoch from now())*1000)::bigint; email text; qty integer; courier text:=customer->>'shippingMethod';oid text:='TANJ-'||upper(request_id::text);
begin
 if owner is null then raise exception 'Login customer terlebih dahulu.';end if;
 perform pg_advisory_xact_lock(818263);
 select data into result from public.tb_t_order where id=oid and account_id=owner;
 if found then return result;end if;
 if jsonb_typeof(lines)<>'array' or jsonb_array_length(lines) not between 1 and 40 then raise exception 'Tas tidak valid.';end if;
 if length(trim(coalesce(customer->>'name',''))) not between 1 and 80 or length(trim(coalesce(customer->>'address',''))) not between 1 and 500 or length(coalesce(customer->>'phone','')) not between 8 and 20 then raise exception 'Alamat atau kontak belum valid.';end if;
 if customer->>'paymentMethod' is distinct from 'qris-manual' then raise exception 'Gunakan QRIS manual.';end if;
 if courier is null or courier not in ('jt-regular','jne-regular','lion-regpack') then raise exception 'Kurir tidak valid.';end if;
 if coalesce(customer->>'zip','') !~ '^[0-9]{5}$' then raise exception 'Kode pos belum valid.';end if;
 select * into s from public.tb_m_shipping where id=customer->>'cityId' and province_id=customer->>'provinceId';
 if not found then raise exception 'Kota pengiriman tidak tersedia.';end if;
 for line in select value from jsonb_array_elements(lines) loop
  if exists(select 1 from jsonb_array_elements(items) i where i->>'id'=line->>'id') then raise exception 'Produk duplikat.';end if;
  qty:=(line->>'qty')::integer;if qty not between 1 and 99 then raise exception 'Jumlah tidak valid.';end if;
  select * into p from public.tb_m_product where id=line->>'id' and active for update;
  if not found or p.stock<qty then raise exception 'Stok produk tidak cukup atau produk belum aktif di database.';end if;
  update public.tb_m_product set stock=stock-qty where id=p.id;
  items:=items||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'color',p.color,'price',p.price,'qty',qty));subtotal:=subtotal+p.price::bigint*qty;
 end loop;
 select data into settings from public.tb_m_payment_settings where id;
 base:=subtotal+s.fee;
 select n into code from generate_series(1,999) n where not exists(select 1 from public.tb_t_order o where o.data->>'status' not in ('PAID','CANCELLED') and (o.data->>'code')::int=n) order by random() limit 1;
 if code is null then raise exception 'Antrean pembayaran penuh.';end if;
 adjustment:=(code-base%1000+1000)%1000;
 select u.email into email from auth.users u where u.id=owner;
 customer:=jsonb_build_object('name',trim(customer->>'name'),'phone',customer->>'phone','email',email,'address',trim(customer->>'address'),'provinceId',s.province_id,'province',s.province,'cityId',s.id,'city',s.city,'districtId',left(customer->>'districtId',30),'district',left(customer->>'district',100),'zip',customer->>'zip','note',left(customer->>'note',300));
 result:=jsonb_build_object('id',oid,'customerId',owner,'customer',customer,'items',items,'payment',jsonb_build_object('id','qris-manual','name','QRIS manual'),'shipping',jsonb_build_object('id',s.id,'provinceId',s.province_id,'province',s.province,'city',s.city,'name','Ongkir ke '||s.city,'fee',s.fee,'method',customer->>'shippingMethod','methodName','Reguler','estimate',true),'subtotal',subtotal,'code',code,'adjustment',adjustment,'total',base+adjustment,'status','WAITING_PAYMENT','createdAt',stamp,'deadline',stamp+coalesce((settings->>'hours')::int,24)*3600000::bigint,'version',1,'proofs','[]'::jsonb,'logs',jsonb_build_array(jsonb_build_object('from',null,'to','WAITING_PAYMENT','actor','Pembeli','note','Pesanan dibuat.','at',stamp)),'review',null);
 result:=jsonb_set(result,'{shipping,method}',to_jsonb(courier));
 result:=jsonb_set(result,'{shipping,methodName}',to_jsonb(case courier when 'jne-regular' then 'JNE Reguler' when 'lion-regpack' then 'Lion Parcel Reg Pack' else 'J&T Reguler' end));
 insert into public.tb_t_order(id,account_id,data) values(oid,owner,result);return result;
end;
$$;
create function public.tanj_update_order(order_id text,expected_version integer,action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.tb_t_order; d jsonb; previous text; target text; note text; reference text; paid_at timestamptz; actor text:='Pembeli';stamp bigint:=(extract(epoch from now())*1000)::bigint;item jsonb;
begin
 perform pg_advisory_xact_lock(818263);
 select * into o from public.tb_t_order where id=order_id for update;
 if not found or auth.uid() is null or (o.account_id<>auth.uid() and not public.tanj_is_admin()) then raise exception 'Pesanan tidak ditemukan.';end if;
 d:=o.data;previous:=d->>'status';
 if (d->>'version')::int<>expected_version or previous in ('PAID','CANCELLED') then raise exception 'Status pesanan sudah berubah. Muat ulang.';end if;
 if action in ('approve','reject','help') then
  if not public.tanj_is_admin() then raise exception 'Akses admin diperlukan.';end if;actor:='Admin TANJ';note:=trim(coalesce(payload->>'note',''));
  if length(note) not between 1 and 300 then raise exception 'Isi catatan pemeriksaan.';end if;
  if action='approve' then
   if payload->>'checked' is distinct from 'true' or (payload->>'amount')::bigint is distinct from (d->>'total')::bigint then raise exception 'Cocokkan nominal dan dana masuk terlebih dahulu.';end if;
   reference:=trim(coalesce(payload->>'reference',''));paid_at:=(payload->>'paidAt')::timestamptz;
   if length(reference) not between 1 and 100 or paid_at is null or paid_at>now()+interval '1 minute' then raise exception 'Referensi atau waktu transaksi belum valid.';end if;
   if exists(select 1 from public.tb_t_order where id<>order_id and lower(data->'review'->>'reference')=lower(reference)) then raise exception 'Referensi transaksi sudah dipakai.';end if;
   d:=jsonb_set(d,'{review}',jsonb_build_object('amount',d->'total','reference',reference,'paidAt',extract(epoch from paid_at)*1000,'admin',actor));target:='PAID';
  elsif action='reject' then target:='REJECTED';else target:='NEEDS_HELP';end if;
 elsif action='confirm' then target:='CHECKING';note:='Pembeli menyatakan sudah bayar. Dana perlu dicocokkan admin.';
 elsif action='proof' then
  if length(coalesce(payload->>'data',''))>1450000 or coalesce(payload->>'data','') !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' then raise exception 'Bukti gambar tidak valid.';end if;
  if jsonb_array_length(d->'proofs')>=3 then raise exception 'Maksimal tiga bukti. Hubungi admin.';end if;
  d:=jsonb_set(d,'{proofs}',(d->'proofs')||jsonb_build_array(jsonb_build_object('name',left(payload->>'name',120),'data',payload->>'data','at',stamp)));target:='CHECKING';note:='Bukti opsional ditambahkan.';
 elsif action='cancel' then
  if previous<>'WAITING_PAYMENT' then raise exception 'Hubungi admin untuk membatalkan pesanan ini.';end if;target:='CANCELLED';note:='Pembeli membatalkan pesanan yang belum dibayar.';
  for item in select value from jsonb_array_elements(d->'items') loop update public.tb_m_product set stock=stock+(item->>'qty')::int where id=item->>'id';end loop;
 else raise exception 'Aksi tidak tersedia.';end if;
 d:=d||jsonb_build_object('status',target,'version',expected_version+1,'logs',(d->'logs')||jsonb_build_array(jsonb_build_object('from',previous,'to',target,'actor',actor,'note',note,'at',stamp)));
 update public.tb_t_order set data=d where id=order_id;return d;
end;
$$;
create function public.tanj_save_qris(image jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.tanj_is_admin() then raise exception 'Akses admin diperlukan.';end if;
 if image is not null and (length(coalesce(image->>'data',''))>1450000 or coalesce(image->>'data','') !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$') then raise exception 'Gambar QRIS tidak valid.';end if;
 update public.tb_m_payment_settings set data=jsonb_set(data,'{qris}',coalesce(image,'null'::jsonb)) where id;
end;
$$;
revoke all on function public.tanj_create_order(uuid,jsonb,jsonb),public.tanj_update_order(text,integer,text,jsonb),public.tanj_save_qris(jsonb) from public;
grant execute on function public.tanj_create_order(uuid,jsonb,jsonb),public.tanj_update_order(text,integer,text,jsonb),public.tanj_save_qris(jsonb) to authenticated;
commit;
