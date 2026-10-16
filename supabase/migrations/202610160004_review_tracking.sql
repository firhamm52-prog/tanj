-- Simplified admin decision and shared shipment tracking. Run once after 003.
begin;
create function public.tanj_decide_payment(order_id text,expected_version integer,decision text,checked boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.tb_t_order;d jsonb;target text;message text;stamp bigint:=(extract(epoch from now())*1000)::bigint;
begin
 if not public.tanj_is_admin() then raise exception 'Akses admin diperlukan.';end if;
 if decision is null or decision not in ('approve','reject') then raise exception 'Aksi tidak tersedia.';end if;
 perform pg_advisory_xact_lock(818263);
 select * into o from public.tb_t_order where id=order_id for update;
 if not found then raise exception 'Pesanan tidak ditemukan.';end if;d:=o.data;
 if (d->>'version')::int is distinct from expected_version or d->>'status' in ('PAID','CANCELLED') then raise exception 'Status pesanan sudah berubah. Muat ulang.';end if;
 if decision='approve' then
  if checked is distinct from true then raise exception 'Cocokkan dana masuk sebelum menyetujui.';end if;
  target:='PAID';message:='Pembayaran disetujui setelah pemeriksaan admin.';
  -- This is the admin decision time, not a claimed bank transaction timestamp.
  d:=jsonb_set(d,'{review}',jsonb_build_object('amount',d->'total','admin','Admin TANJ','reviewedAt',stamp));
 else target:='REJECTED';message:='Pembayaran ditolak oleh admin. Hubungi CS untuk bantuan.';end if;
 d:=d||jsonb_build_object('status',target,'version',expected_version+1,'logs',(d->'logs')||jsonb_build_array(jsonb_build_object('from',d->>'status','to',target,'actor','Admin TANJ','note',message,'at',stamp)));
 update public.tb_t_order set data=d where id=order_id;return d;
end;
$$;
create function public.tanj_save_tracking(order_id text,expected_version integer,courier text,tracking_number text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.tb_t_order;d jsonb;stamp bigint:=(extract(epoch from now())*1000)::bigint;
begin
 if not public.tanj_is_admin() then raise exception 'Akses admin diperlukan.';end if;
 courier:=trim(courier);tracking_number:=trim(tracking_number);
 if coalesce(length(courier),0) not between 1 and 80 or coalesce(tracking_number,'') !~ '^[A-Za-z0-9][A-Za-z0-9 ./_-]{0,79}$' then raise exception 'Isi kurir dan nomor resi yang valid.';end if;
 perform pg_advisory_xact_lock(818263);
 select * into o from public.tb_t_order where id=order_id for update;
 if not found then raise exception 'Pesanan tidak ditemukan.';end if;d:=o.data;
 if (d->>'version')::int is distinct from expected_version or d->>'status'<>'PAID' then raise exception 'Resi hanya dapat disimpan pada pembayaran berhasil. Muat ulang pesanan.';end if;
 d:=d||jsonb_build_object('tracking',jsonb_build_object('courier',courier,'number',tracking_number,'updatedAt',stamp),'version',expected_version+1,'logs',(d->'logs')||jsonb_build_array(jsonb_build_object('from','PAID','to','PAID','actor','Admin TANJ','note','Nomor resi diperbarui: '||courier||' / '||tracking_number,'at',stamp)));
 update public.tb_t_order set data=d where id=order_id;return d;
end;
$$;
revoke all on function public.tanj_decide_payment(text,integer,text,boolean),public.tanj_save_tracking(text,integer,text,text) from public;
grant execute on function public.tanj_decide_payment(text,integer,text,boolean),public.tanj_save_tracking(text,integer,text,text) to authenticated;
commit;
