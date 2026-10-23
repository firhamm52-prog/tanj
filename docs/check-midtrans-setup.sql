-- Read-only: verify the reservation migration and private RPC grant.
-- Does not alter inventory, orders, or payment state.
SELECT
 EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='tb_t_midtrans' AND column_name='stock_reserved'
 ) AS migration_015_stock,
 coalesce(position('creation_rejected' IN pg_get_functiondef(
  to_regprocedure('public.tanj_midtrans_gateway(text,text,jsonb)')
 )) > 0,false) OR to_regprocedure('public.tanj_midtrans_gateway_before_reservation(text,text,jsonb)') IS NOT NULL AS migration_015_gateway,
 has_function_privilege('service_role',
  to_regprocedure('public.tanj_midtrans_gateway(text,text,jsonb)'), 'EXECUTE'
 ) AS service_role_gateway_access;
