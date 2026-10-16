import {
  cloudEnabled,
  cloudReady,
  cloudClient,
  cloudSession,
} from './supabase-customer.js?v=improve-2';
export { cloudEnabled };
let state = { version: 1, orders: [], settings: { hours: 24, admin: 'Admin TANJ' } },
  generation = 0;
export const cloudPayments = () => state;
function check(error) {
  if (error)
    throw Error(
      error.code === 'PGRST202' || error.code === '42P01'
        ? 'Database pesanan belum siap. Admin perlu menjalankan migrasi pesanan Supabase.'
        : error.message,
    );
}
export async function refreshPayments() {
  await cloudReady;
  const generationAtStart = ++generation,
    id = cloudSession()?.id,
    client = await cloudClient();
  const { data: settings, error: settingsError } = await client
    .from('tb_m_payment_settings')
    .select('data')
    .eq('id', true)
    .single();
  check(settingsError);
  let orders = [];
  if (id) {
    const { data, error } = await client.from('tb_t_order').select('data').order('created_at');
    check(error);
    orders = data.map((row) => row.data);
  }
  if (generationAtStart === generation && id === cloudSession()?.id) {
    const next = { version: 1, orders, settings: settings.data };
    if (JSON.stringify(next) !== JSON.stringify(state)) {
      state = next;
      window.dispatchEvent(new Event('tanj-payments-change'));
    }
  }
  return state;
}
export async function paymentRPC(name, args) {
  const client = await cloudClient();
  const { data, error } = await client.rpc(name, args);
  check(error);
  if (data?.id) {
    state = { ...state, orders: [...state.orders.filter((o) => o.id !== data.id), data] };
    window.dispatchEvent(new Event('tanj-payments-change'));
  }
  await refreshPayments().catch(() => {});
  return data;
}
export async function createCloudPayment(customer, lines) {
  const owner = cloudSession();
  if (!owner) throw Error('Login terlebih dahulu.');
  const key = 'tanj-cloud-order-request-' + owner.id,
    signature = JSON.stringify({ customer, lines });
  let saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch {}
  if (saved?.signature !== signature) {
    saved = { signature, id: crypto.randomUUID() };
    sessionStorage.setItem(key, JSON.stringify(saved));
  }
  const order = await paymentRPC('tanj_create_order', { request_id: saved.id, customer, lines });
  sessionStorage.removeItem(key);
  return order;
}
if (cloudEnabled) {
  window.addEventListener('tanj-customer-change', () => {
    generation++;
    state = { ...state, orders: [] };
    window.dispatchEvent(new Event('tanj-payments-change'));
    refreshPayments().catch(() => {});
  });
  window.addEventListener('focus', () => refreshPayments().catch(() => {}));
  setInterval(() => {
    if (document.visibilityState === 'visible' && cloudSession()) refreshPayments().catch(() => {});
  }, 15000);
}
