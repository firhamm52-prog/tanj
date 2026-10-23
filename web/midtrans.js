import { cloudClient } from './supabase-customer.js?v=improve-2';
import { supabaseConfig } from './supabase-config.js?v=improve-2';
const base = supabaseConfig.url + '/functions/v1/midtrans';
let config;
export async function midtransConfiguration() {
  if (!supabaseConfig.enabled || ['localhost', '127.0.0.1'].includes(location.hostname))
    return { enabled: false };
  return (config ||= fetch(base + '/config', {
    headers: { apikey: supabaseConfig.publishableKey },
    signal: AbortSignal.timeout(8000),
  })
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .catch(() => ({ enabled: false })));
}
export async function midtransRequest(operation, orderId) {
  const client = await cloudClient();
  const { data } = await client.auth.getSession();
  if (!data.session) throw Error('Login untuk melanjutkan pembayaran.');
  const r = await fetch(base + '/' + operation, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.publishableKey,
      Authorization: 'Bearer ' + data.session.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId }),
    signal: AbortSignal.timeout(35000),
  });
  const d = await r.json();
  if (!r.ok)
    throw Object.assign(Error(d.error || 'Pembayaran belum dapat diproses.'), { status: r.status });
  return d;
}
export async function openMidtrans(orderId) {
  const { redirectUrl } = await midtransRequest('start', orderId);
  const u = new URL(redirectUrl);
  if (
    u.protocol !== 'https:' ||
    !['app.midtrans.com', 'app.sandbox.midtrans.com'].includes(u.hostname) ||
    !u.pathname.startsWith('/snap/')
  )
    throw Error('Tautan pembayaran tidak valid.');
  location.assign(u.href);
}
