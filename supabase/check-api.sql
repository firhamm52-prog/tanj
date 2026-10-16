-- Read-only diagnostics; this does not change grants or expose customer data.
SELECT
  current_database() AS database_name,
  to_regclass('public.tb_m_account') AS account_table,
  to_regclass('public.tb_m_product') AS product_table,
  to_regclass('public.tb_m_payment_settings') AS settings_table,
  to_regclass('public.tb_t_order') AS order_table,
  has_schema_privilege('anon', 'public', 'USAGE') AS anon_schema_usage;

SELECT
  table_name,
  grantee,
  privilege_type
FROM
  information_schema.role_table_grants
WHERE
  table_schema = 'public'
  AND table_name IN (
    'tb_m_product',
    'tb_m_payment_settings',
    'tb_t_order'
  )
  AND grantee IN ('anon', 'authenticated')
ORDER BY
  table_name,
  grantee,
  privilege_type;
