-- Shared TANJ CMS. Run after 006. Keeps existing accounts, orders and QRIS.
begin;
create table public.tb_m_cms(id boolean primary key default true check(id),draft jsonb not null,published jsonb not null,revision integer not null default 1);
alter table public.tb_m_cms enable row level security;
revoke all on public.tb_m_cms from anon,authenticated;
insert into public.tb_m_cms(id,draft,published) values(true,'{"settings":{"lookbookTitle":"Must be have combination.","storyTitle":"Grace in\nevery detail.","storyText":"Siluet yang mengalir, warna yang menenangkan. Temani setiap langkah dengan anggun, dalam caramu sendiri.","instagram":"https://www.instagram.com/tanjofficial/","tiktok":"https://www.tiktok.com/@tanj.co.id","whatsapp":"6281363661703","email":"tanj.indonesia@gmail.com","showStock":true,"showSold":true,"maxQty":99,"qrisWidth":180,"recommendations":2,"paymentHours":24,"storyTheme":"ivory","headingFont":"times"},"collections":[{"id":"base-0","name":"Embroidered Outer","description":"Detail bordir untuk hari yang istimewa."},{"id":"base-1","name":"Everyday Drape Outer","description":"Lapisan ringan untuk setiap hari."},{"id":"base-2","name":"Flow Dress","description":"Siluet sederhana yang bergerak bersamamu."},{"id":"base-3","name":"Flow Dress Belted","description":"Potongan anggun dengan detail ikat pinggang."}],"products":[{"id":"base-0-0","collectionId":"base-0","name":"TANJ Sand","colorName":"Cream","color":"#eee6d7","model":"assets/campaign-beige.webp","product":"assets/look-2.webp","price":687000,"sold":0,"stock":12,"inStock":true,"status":"published"},{"id":"base-0-1","collectionId":"base-0","name":"TANJ Noir","colorName":"Hitam","color":"#292527","model":"assets/campaign-black.webp","product":"assets/look-3.webp","price":687000,"sold":0,"stock":15,"inStock":true,"status":"published"},{"id":"base-0-2","collectionId":"base-0","name":"TANJ Cocoa","colorName":"Cokelat","color":"#735247","model":"assets/campaign-brown.webp","product":"assets/embroidered-cocoa.webp","price":687000,"sold":0,"stock":18,"inStock":true,"status":"published"},{"id":"base-1-0","collectionId":"base-1","name":"Cocoa","colorName":"Cokelat","color":"#735247","model":"assets/drape-v3-cocoa-model.webp","product":"assets/drape-v2-cocoa-product.webp","price":687000,"sold":0,"stock":21,"inStock":true,"status":"published"},{"id":"base-1-1","collectionId":"base-1","name":"Black","colorName":"Hitam","color":"#292527","model":"assets/drape-v3-black-model.webp","product":"assets/drape-v2-black-product.webp","price":687000,"sold":0,"stock":24,"inStock":true,"status":"published"},{"id":"base-1-2","collectionId":"base-1","name":"Ivory","colorName":"Ivory","color":"#eee6d7","model":"assets/drape-v3-ivory-model.webp","product":"assets/drape-v2-ivory-product.webp","price":687000,"sold":0,"stock":27,"inStock":true,"status":"published"},{"id":"base-2-0","collectionId":"base-2","name":"Cream","colorName":"Cream","color":"#eee6d7","model":"assets/flow-v3-cream-model.webp","product":"assets/flow-v3-cream-product.webp","price":687000,"sold":0,"stock":30,"inStock":true,"status":"published"},{"id":"base-2-1","collectionId":"base-2","name":"Black","colorName":"Hitam","color":"#292527","model":"assets/flow-v3-black-model.webp","product":"assets/flow-v3-black-product.webp","price":687000,"sold":0,"stock":33,"inStock":true,"status":"published"},{"id":"base-2-2","collectionId":"base-2","name":"Ash","colorName":"Abu-abu","color":"#837c7d","model":"assets/flow-v3-ash-model.webp","product":"assets/flow-v3-ash-product.webp","price":687000,"sold":0,"stock":0,"inStock":false,"status":"published"},{"id":"base-3-0","collectionId":"base-3","name":"Cream","colorName":"Cream","color":"#eee6d7","model":"assets/flow-belted-cream-model.webp","product":"assets/flow-belted-cream-product.webp","price":687000,"sold":0,"stock":39,"inStock":true,"status":"published"},{"id":"base-3-1","collectionId":"base-3","name":"Black","colorName":"Hitam","color":"#292527","model":"assets/flow-belted-black-model.webp","product":"assets/flow-belted-black-product.webp","price":687000,"sold":0,"stock":42,"inStock":true,"status":"published"},{"id":"base-3-2","collectionId":"base-3","name":"Ash","colorName":"Abu-abu","color":"#837c7d","model":"assets/flow-belted-ash-model.webp","product":"assets/flow-belted-ash-product.webp","price":687000,"sold":0,"stock":45,"inStock":true,"status":"published"}],"hijabs":[{"id":"hijab-selcuk-brown","collection":"selcuk","color":"brown","name":"Selcuk Brown","price":249000,"stock":18,"inStock":true,"image":"assets/hijab-selcuk-brown.webp"},{"id":"hijab-selcuk-gray","collection":"selcuk","color":"gray","name":"Selcuk Gray","price":249000,"stock":19,"inStock":true,"image":"assets/hijab-selcuk-gray.webp"},{"id":"hijab-georgia-white","collection":"georgia","color":"white","name":"Georgia White","price":195000,"stock":20,"inStock":true,"image":"assets/hijab-georgia-white.webp"},{"id":"hijab-georgia-nude","collection":"georgia","color":"nude","name":"Georgia Nude","price":195000,"stock":21,"inStock":true,"image":"assets/hijab-georgia-nude.webp"},{"id":"hijab-georgia-black","collection":"georgia","color":"black","name":"Georgia Black","price":195000,"stock":22,"inStock":true,"image":"assets/hijab-georgia-black.webp"},{"id":"hijab-georgia-cream","collection":"georgia","color":"cream","name":"Georgia Cream","price":195000,"stock":23,"inStock":true,"image":"assets/hijab-georgia-cream-poster.webp"}],"hero":{"media":"assets/noireaterial-desert-three-models-v3.mp4"},"banner":{"enabled":false,"title":"The everyday edit","subtitle":"Siluet yang menemani setiap langkah.","mediaType":"image","media":"assets/campaign-beige.webp"},"slides":[{"id":"slide-1","caption":"Hijab Selcuk Brown TANJ","mediaType":"image","media":"assets/hijab-selcuk-brown.webp"},{"id":"slide-2","caption":"Hijab Selcuk Gray TANJ","mediaType":"image","media":"assets/hijab-selcuk-gray.webp"},{"id":"slide-3","caption":"Hijab Georgia White TANJ","mediaType":"image","media":"assets/hijab-georgia-white.webp"},{"id":"slide-4","caption":"Hijab Georgia Nude TANJ","mediaType":"image","media":"assets/hijab-georgia-nude.webp"},{"id":"slide-5","caption":"Hijab Georgia Black TANJ","mediaType":"image","media":"assets/hijab-georgia-black.webp"},{"id":"slide-6","caption":"Hijab Georgia Cream TANJ","mediaType":"video","media":"assets/hijab-georgia-cream.mp4"}]}'::jsonb,'{"settings":{"lookbookTitle":"Must be have combination.","storyTitle":"Grace in\nevery detail.","storyText":"Siluet yang mengalir, warna yang menenangkan. Temani setiap langkah dengan anggun, dalam caramu sendiri.","instagram":"https://www.instagram.com/tanjofficial/","tiktok":"https://www.tiktok.com/@tanj.co.id","whatsapp":"6281363661703","email":"tanj.indonesia@gmail.com","showStock":true,"showSold":true,"maxQty":99,"qrisWidth":180,"recommendations":2,"paymentHours":24,"storyTheme":"ivory","headingFont":"times"},"collections":[{"id":"base-0","name":"Embroidered Outer","description":"Detail bordir untuk hari yang istimewa."},{"id":"base-1","name":"Everyday Drape Outer","description":"Lapisan ringan untuk setiap hari."},{"id":"base-2","name":"Flow Dress","description":"Siluet sederhana yang bergerak bersamamu."},{"id":"base-3","name":"Flow Dress Belted","description":"Potongan anggun dengan detail ikat pinggang."}],"products":[{"id":"base-0-0","collectionId":"base-0","name":"TANJ Sand","colorName":"Cream","color":"#eee6d7","model":"assets/campaign-beige.webp","product":"assets/look-2.webp","price":687000,"sold":0,"stock":12,"inStock":true,"status":"published"},{"id":"base-0-1","collectionId":"base-0","name":"TANJ Noir","colorName":"Hitam","color":"#292527","model":"assets/campaign-black.webp","product":"assets/look-3.webp","price":687000,"sold":0,"stock":15,"inStock":true,"status":"published"},{"id":"base-0-2","collectionId":"base-0","name":"TANJ Cocoa","colorName":"Cokelat","color":"#735247","model":"assets/campaign-brown.webp","product":"assets/embroidered-cocoa.webp","price":687000,"sold":0,"stock":18,"inStock":true,"status":"published"},{"id":"base-1-0","collectionId":"base-1","name":"Cocoa","colorName":"Cokelat","color":"#735247","model":"assets/drape-v3-cocoa-model.webp","product":"assets/drape-v2-cocoa-product.webp","price":687000,"sold":0,"stock":21,"inStock":true,"status":"published"},{"id":"base-1-1","collectionId":"base-1","name":"Black","colorName":"Hitam","color":"#292527","model":"assets/drape-v3-black-model.webp","product":"assets/drape-v2-black-product.webp","price":687000,"sold":0,"stock":24,"inStock":true,"status":"published"},{"id":"base-1-2","collectionId":"base-1","name":"Ivory","colorName":"Ivory","color":"#eee6d7","model":"assets/drape-v3-ivory-model.webp","product":"assets/drape-v2-ivory-product.webp","price":687000,"sold":0,"stock":27,"inStock":true,"status":"published"},{"id":"base-2-0","collectionId":"base-2","name":"Cream","colorName":"Cream","color":"#eee6d7","model":"assets/flow-v3-cream-model.webp","product":"assets/flow-v3-cream-product.webp","price":687000,"sold":0,"stock":30,"inStock":true,"status":"published"},{"id":"base-2-1","collectionId":"base-2","name":"Black","colorName":"Hitam","color":"#292527","model":"assets/flow-v3-black-model.webp","product":"assets/flow-v3-black-product.webp","price":687000,"sold":0,"stock":33,"inStock":true,"status":"published"},{"id":"base-2-2","collectionId":"base-2","name":"Ash","colorName":"Abu-abu","color":"#837c7d","model":"assets/flow-v3-ash-model.webp","product":"assets/flow-v3-ash-product.webp","price":687000,"sold":0,"stock":0,"inStock":false,"status":"published"},{"id":"base-3-0","collectionId":"base-3","name":"Cream","colorName":"Cream","color":"#eee6d7","model":"assets/flow-belted-cream-model.webp","product":"assets/flow-belted-cream-product.webp","price":687000,"sold":0,"stock":39,"inStock":true,"status":"published"},{"id":"base-3-1","collectionId":"base-3","name":"Black","colorName":"Hitam","color":"#292527","model":"assets/flow-belted-black-model.webp","product":"assets/flow-belted-black-product.webp","price":687000,"sold":0,"stock":42,"inStock":true,"status":"published"},{"id":"base-3-2","collectionId":"base-3","name":"Ash","colorName":"Abu-abu","color":"#837c7d","model":"assets/flow-belted-ash-model.webp","product":"assets/flow-belted-ash-product.webp","price":687000,"sold":0,"stock":45,"inStock":true,"status":"published"}],"hijabs":[{"id":"hijab-selcuk-brown","collection":"selcuk","color":"brown","name":"Selcuk Brown","price":249000,"stock":18,"inStock":true,"image":"assets/hijab-selcuk-brown.webp"},{"id":"hijab-selcuk-gray","collection":"selcuk","color":"gray","name":"Selcuk Gray","price":249000,"stock":19,"inStock":true,"image":"assets/hijab-selcuk-gray.webp"},{"id":"hijab-georgia-white","collection":"georgia","color":"white","name":"Georgia White","price":195000,"stock":20,"inStock":true,"image":"assets/hijab-georgia-white.webp"},{"id":"hijab-georgia-nude","collection":"georgia","color":"nude","name":"Georgia Nude","price":195000,"stock":21,"inStock":true,"image":"assets/hijab-georgia-nude.webp"},{"id":"hijab-georgia-black","collection":"georgia","color":"black","name":"Georgia Black","price":195000,"stock":22,"inStock":true,"image":"assets/hijab-georgia-black.webp"},{"id":"hijab-georgia-cream","collection":"georgia","color":"cream","name":"Georgia Cream","price":195000,"stock":23,"inStock":true,"image":"assets/hijab-georgia-cream-poster.webp"}],"hero":{"media":"assets/noireaterial-desert-three-models-v3.mp4"},"banner":{"enabled":false,"title":"The everyday edit","subtitle":"Siluet yang menemani setiap langkah.","mediaType":"image","media":"assets/campaign-beige.webp"},"slides":[{"id":"slide-1","caption":"Hijab Selcuk Brown TANJ","mediaType":"image","media":"assets/hijab-selcuk-brown.webp"},{"id":"slide-2","caption":"Hijab Selcuk Gray TANJ","mediaType":"image","media":"assets/hijab-selcuk-gray.webp"},{"id":"slide-3","caption":"Hijab Georgia White TANJ","mediaType":"image","media":"assets/hijab-georgia-white.webp"},{"id":"slide-4","caption":"Hijab Georgia Nude TANJ","mediaType":"image","media":"assets/hijab-georgia-nude.webp"},{"id":"slide-5","caption":"Hijab Georgia Black TANJ","mediaType":"image","media":"assets/hijab-georgia-black.webp"},{"id":"slide-6","caption":"Hijab Georgia Cream TANJ","mediaType":"video","media":"assets/hijab-georgia-cream.mp4"}]}'::jsonb);
-- Preserve any prices already adjusted in the operational catalog.
update public.tb_m_cms c set draft=jsonb_set(c.draft,'{products}',(
 select jsonb_agg(x.value||case when p.id is null then '{}'::jsonb else jsonb_build_object('price',p.price,'stock',p.stock) end order by x.ordinality)
 from jsonb_array_elements(c.draft->'products') with ordinality x(value,ordinality) left join public.tb_m_product p on p.id=x.value->>'id'));
update public.tb_m_cms set published=draft;
create function public.tanj_cms_document(doc jsonb,include_drafts boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb:=doc;items jsonb;
begin
 select coalesce(jsonb_agg(x.value||jsonb_build_object('stock',coalesce(p.stock,0),'inStock',coalesce(p.active and p.stock>0,false)) order by x.ordinality),'[]') into items
 from jsonb_array_elements(doc->'products') with ordinality x(value,ordinality)
 left join public.tb_m_product p on p.id=x.value->>'id'
 where include_drafts or x.value->>'status'='published';
 result:=jsonb_set(result,'{products}',items);return result;
end;
$$;
create function public.tanj_cms_storefront() returns jsonb
language sql stable security definer set search_path='' as $$
 select public.tanj_cms_document(published,false) from public.tb_m_cms where id;
$$;
create function public.tanj_cms_admin() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.tb_m_cms;
begin
 if not public.tanj_is_admin() then raise exception 'Akses admin diperlukan.';end if;
 select * into c from public.tb_m_cms where id;
 return public.tanj_cms_document(c.draft,true)||jsonb_build_object('revision',c.revision);
end;
$$;
create function public.tanj_cms_valid_media(value text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(value)<=2048 and (value ~ '^assets/[A-Za-z0-9_-]+\.(webp|png|jpg|jpeg|mp4|webm|ogg)$' or value ~ '^https://[^/@[:space:]]+([/:][^[:space:]]*)?$'),false);
$$;
create function public.tanj_cms_save(kind text,content_id text,item jsonb,expected_revision integer,expected_stock integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.tb_m_cms;doc jsonb;entry jsonb;entries jsonb;pid text:=coalesce(nullif(content_id,''),gen_random_uuid()::text);old_stock integer;present boolean;key text;
begin
 if not public.tanj_is_admin() then raise exception 'Akses admin diperlukan.';end if;
 if kind is null or kind not in ('products','collections','hijabs','hero','banner','slides','settings') or jsonb_typeof(item) is distinct from 'object' or length(item::text)>15000 then raise exception 'Konten tidak valid.';end if;
 perform pg_advisory_xact_lock(818263);select * into c from public.tb_m_cms where id for update;
 if c.revision is distinct from expected_revision then raise exception 'Draf berubah. Muat ulang CMS sebelum menyimpan.';end if;doc:=c.draft;
 if kind in ('products','hijabs','collections') and coalesce(length(trim(item->>'name')),0) not between 1 and 160 then raise exception 'Nama wajib diisi.';end if;
 if kind in ('products','hijabs') then
  if jsonb_typeof(item->'stock') is distinct from 'number' or (item->>'stock') !~ '^[0-9]+$' or (item->>'stock')::bigint>1000000 or jsonb_typeof(item->'price') is distinct from 'number' or (item->>'price') !~ '^[0-9]+$' or (item->>'price')::bigint not between 1 and 1000000000 then raise exception 'Harga atau stok tidak valid.';end if;
 end if;
 if kind='products' then
  if item->>'status' is null or item->>'status' not in ('draft','published') or coalesce(item->>'color','') !~ '^#[A-Fa-f0-9]{6}$' or not exists(select 1 from jsonb_array_elements(doc->'collections') x where x->>'id'=item->>'collectionId') then raise exception 'Koleksi, warna atau status tidak valid.';end if;
  if not public.tanj_cms_valid_media(item->>'model') or not public.tanj_cms_valid_media(item->>'product') then raise exception 'URL gambar tidak valid.';end if;
  select stock into old_stock from public.tb_m_product where id=pid for update;present:=found;
  if present and old_stock is distinct from expected_stock then raise exception 'Stok berubah karena pesanan atau admin lain. Muat ulang CMS.';end if;
  if present then update public.tb_m_product set stock=(item->>'stock')::int where id=pid;
  else insert into public.tb_m_product values(pid,item->>'name',coalesce(item->>'colorName',''),(item->>'price')::int,(item->>'stock')::int,false);end if;
 elsif kind='hijabs' then
  if not public.tanj_cms_valid_media(item->>'image') then raise exception 'URL gambar tidak valid.';end if;
  -- Hijabs are sold through CS; update only their live availability until publish.
  select coalesce(jsonb_agg(case when x.value->>'id'=pid then x.value||jsonb_build_object('stock',(item->>'stock')::int,'inStock',(item->>'stock')::int>0) else x.value end order by x.ordinality),'[]') into entries from jsonb_array_elements(c.published->'hijabs') with ordinality x(value,ordinality);
  update public.tb_m_cms set published=jsonb_set(published,'{hijabs}',entries) where id;
 elsif kind in ('hero','banner','slides') then
  if not public.tanj_cms_valid_media(item->>'media') then raise exception 'URL media tidak valid.';end if;
 elsif kind='settings' then
  foreach key in array array['lookbookTitle','storyTitle','storyText'] loop if jsonb_typeof(item->key) is distinct from 'string' or coalesce(length(trim(item->>key)),0) not between 1 and 1000 then raise exception 'Teks website tidak valid.';end if;end loop;
  foreach key in array array['showStock','showSold'] loop if jsonb_typeof(item->key) is distinct from 'boolean' then raise exception 'Pengaturan tampilan tidak valid.';end if;end loop;
  if coalesce(item->>'maxQty','') !~ '^[0-9]+$' or (item->>'maxQty')::int not between 1 and 99 or coalesce(item->>'paymentHours','') !~ '^[0-9]+$' or (item->>'paymentHours')::int not between 1 and 72 or coalesce(item->>'qrisWidth','') !~ '^[0-9]+$' or (item->>'qrisWidth')::int not between 120 and 600 or coalesce(item->>'recommendations','') !~ '^[0-9]+$' or (item->>'recommendations')::int not between 0 and 4 then raise exception 'Batas pengaturan tidak valid.';end if;
  if coalesce(item->>'instagram','') !~ '^https://(www\.)?instagram\.com/' or coalesce(item->>'tiktok','') !~ '^https://(www\.)?tiktok\.com/' or coalesce(item->>'whatsapp','') !~ '^[0-9]{7,15}$' or coalesce(item->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Kontak tidak valid.';end if;
  if coalesce(item->>'storyTheme','') not in ('ivory','cocoa') or coalesce(item->>'headingFont','') not in ('times','sans') then raise exception 'Tema tidak valid.';end if;
 end if;
 if kind in ('hero','banner','settings') then doc:=jsonb_set(doc,array[kind],item);
 else
  if nullif(content_id,'') is not null and not exists(select 1 from jsonb_array_elements(doc->kind) x where x->>'id'=content_id) then raise exception 'Konten tidak ditemukan.';end if;
  if jsonb_array_length(doc->kind)>=250 and nullif(content_id,'') is null then raise exception 'Batas konten tercapai.';end if;
  entry:=item||jsonb_build_object('id',pid);
  select coalesce(jsonb_agg(case when x.value->>'id'=pid then entry else x.value end order by x.ordinality),'[]') into entries from jsonb_array_elements(doc->kind) with ordinality x(value,ordinality);
  if nullif(content_id,'') is null then entries:=entries||jsonb_build_array(entry);end if;
  doc:=jsonb_set(doc,array[kind],entries);
 end if;
 update public.tb_m_cms set draft=doc,revision=revision+1 where id;
 return public.tanj_cms_admin();
end;
$$;
create function public.tanj_cms_remove(kind text,content_id text,expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.tb_m_cms;entries jsonb;
begin
 if not public.tanj_is_admin() then raise exception 'Akses admin diperlukan.';end if;
 if kind is null or kind not in ('products','collections','hijabs','slides') then raise exception 'Jenis konten tidak valid.';end if;
 perform pg_advisory_xact_lock(818263);select * into c from public.tb_m_cms where id for update;
 if c.revision is distinct from expected_revision then raise exception 'Draf berubah. Muat ulang CMS.';end if;
 if kind='collections' and exists(select 1 from jsonb_array_elements(c.draft->'products') x where x->>'collectionId'=content_id) then raise exception 'Pindahkan produk dari koleksi terlebih dahulu.';end if;
 select coalesce(jsonb_agg(x.value order by x.ordinality),'[]') into entries from jsonb_array_elements(c.draft->kind) with ordinality x(value,ordinality) where x.value->>'id'<>content_id;
 update public.tb_m_cms set draft=jsonb_set(draft,array[kind],entries),revision=revision+1 where id;return public.tanj_cms_admin();
end;
$$;
create function public.tanj_cms_publish(expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.tb_m_cms;p jsonb;
begin
 if not public.tanj_is_admin() then raise exception 'Akses admin diperlukan.';end if;
 perform pg_advisory_xact_lock(818263);select * into c from public.tb_m_cms where id for update;
 if c.revision is distinct from expected_revision then raise exception 'Draf berubah. Muat ulang CMS.';end if;
 update public.tb_m_product set active=false;
 for p in select value from jsonb_array_elements(c.draft->'products') loop
  update public.tb_m_product set name=p->>'name',color=p->>'colorName',price=(p->>'price')::int,active=p->>'status'='published' where id=p->>'id';
 end loop;
 -- Publication never resets live stock reserved by orders.
 update public.tb_m_cms set published=draft,revision=revision+1 where id;
 update public.tb_m_payment_settings set data=jsonb_set(data,'{hours}',coalesce(c.draft#>'{settings,paymentHours}','24')) where id;
 return public.tanj_cms_admin();
end;
$$;
create function public.tanj_cms_order_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare maximum integer;
begin
 select coalesce((published#>>'{settings,maxQty}')::int,99) into maximum from public.tb_m_cms where id;
 if exists(select 1 from jsonb_array_elements(new.data->'items') x where (x->>'qty')::int>maximum) then raise exception 'Qty melebihi batas per produk yang ditentukan TANJ.';end if;return new;
end;
$$;
create trigger tanj_cms_order_limit before insert on public.tb_t_order for each row execute function public.tanj_cms_order_limit();
revoke all on function public.tanj_cms_document(jsonb,boolean),public.tanj_cms_valid_media(text),public.tanj_cms_order_limit() from public,anon,authenticated;
revoke all on function public.tanj_cms_storefront(),public.tanj_cms_admin(),public.tanj_cms_save(text,text,jsonb,integer,integer),public.tanj_cms_remove(text,text,integer),public.tanj_cms_publish(integer) from public;
grant execute on function public.tanj_cms_storefront() to anon,authenticated;
grant execute on function public.tanj_cms_admin(),public.tanj_cms_save(text,text,jsonb,integer,integer),public.tanj_cms_remove(text,text,integer),public.tanj_cms_publish(integer) to authenticated;
commit;
