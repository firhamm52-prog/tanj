import { seed, DEFAULT_PRODUCT_PRICE } from '../shared/seed.js';
import { shippingMaster } from '../web/shipping-master.js';
import { writeFile } from 'node:fs/promises';
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const products = seed.products.map(
  (p) =>
    `(${quote(p.id)},${quote(p.name)},${quote(p.colorName)},${DEFAULT_PRODUCT_PRICE},${p.stock},${p.inStock})`,
);
const cities = shippingMaster.cities.map(
  (c) =>
    `(${quote(c.id)},${quote(c.provinceId)},${quote(shippingMaster.provinces.find((p) => p.id === c.provinceId).name)},${quote(c.name)},${c.fee})`,
);
await writeFile(
  'supabase/migrations/202610160003_catalog.sql',
  `-- Initial catalog and estimated shipping master. Run once after orders migration.\nbegin;\ninsert into public.tb_m_product values\n${products.join(',\n')};\ninsert into public.tb_m_shipping values\n${cities.join(',\n')};\ncommit;\n`,
);
