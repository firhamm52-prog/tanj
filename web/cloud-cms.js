import { cloudClient } from './supabase-customer.js?v=improve-2';
import { freshSeed, storefront } from '../shared/seed.js';
let draft;
async function call(name, args = {}) {
  const client = await cloudClient();
  const { data, error } = await client.rpc(name, args);
  if (error)
    throw Error(
      /PGRST202|42P01/.test(error.code)
        ? 'CMS online belum siap. Jalankan migrasi 202610170007_shared_cms.sql di Supabase.'
        : error.message,
    );
  return data;
}
export async function loadCloudStorefront() {
  const client = await cloudClient();
  const { data, error } = await client.rpc('tanj_cms_storefront');
  if (!error && data?.products) return data;
  if (error && !['PGRST202', '42P01', '42883'].includes(error.code)) throw Error(error.message);
  // Safe rollout: no local-browser drafts are published before the SQL is installed.
  const initial = storefront(freshSeed());
  const { data: products, error: inventoryError } = await client.from('tb_m_product').select('*');
  if (!inventoryError && products)
    initial.products = initial.products.map((item) => {
      const p = products.find((p) => p.id === item.id);
      return p
        ? { ...item, price: p.price, stock: p.stock, inStock: p.active && p.stock > 0 }
        : item;
    });
  return initial;
}
export async function loadCloudAdmin() {
  draft = await call('tanj_cms_admin');
  return draft;
}
export async function saveCloudContent(kind, id, item) {
  if (!draft) await loadCloudAdmin();
  const expected = draft[kind]?.find?.((p) => p.id === id)?.stock ?? null;
  draft = await call('tanj_cms_save', {
    kind,
    content_id: id || null,
    item,
    expected_revision: draft.revision,
    expected_stock: expected,
  });
  return draft;
}
export async function removeCloudContent(kind, id) {
  if (!draft) await loadCloudAdmin();
  draft = await call('tanj_cms_remove', {
    kind,
    content_id: id,
    expected_revision: draft.revision,
  });
  return draft;
}
export async function publishCloudContent() {
  if (!draft) await loadCloudAdmin();
  const expectedPrices = Object.fromEntries(
    ['products', 'hijabs'].map((kind) => [
      kind,
      draft[kind].map(({ id, price, status, discountAmount = 0 }) => ({
        id,
        price: price - discountAmount,
        status,
      })),
    ]),
  );
  draft = await call('tanj_cms_publish', { expected_revision: draft.revision });
  const published = await call('tanj_cms_storefront');
  for (const kind of ['products', 'hijabs']) {
    for (const item of expectedPrices[kind]) {
      if (item.status === 'draft') continue;
      if (!published[kind]?.some((p) => p.id === item.id && p.price === item.price))
        throw Error(
          'Draf tersimpan, tetapi harga di website belum sesuai. Muat ulang CMS dan coba Publikasikan lagi.',
        );
    }
  }
  return draft;
}
