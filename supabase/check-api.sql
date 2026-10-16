-- Read-only diagnostics; this does not change grants or expose customer data.
select current_database() as database_name,
       to_regclass('public.tb_m_account') as account_table,
       to_regclass('public.tb_m_product') as product_table,
       to_regclass('public.tb_m_payment_settings') as settings_table,
       to_regclass('public.tb_t_order') as order_table,
       has_schema_privilege('anon','public','USAGE') as anon_schema_usage;
select table_name,grantee,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in
 ('tb_m_product','tb_m_payment_settings','tb_t_order')
and grantee in ('anon','authenticated') order by table_name,grantee,privilege_type;
