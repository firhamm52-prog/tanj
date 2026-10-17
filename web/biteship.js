import { cloudClient } from './supabase-customer.js?v=improve-2';
import { supabaseConfig } from './supabase-config.js?v=improve-2';
const useEdge =
  supabaseConfig.enabled &&
  window.TANJ_CONFIG?.mode !== 'api' &&
  !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const base = useEdge ? supabaseConfig.url + '/functions/v1/shipping' : '/api/shipping';
const publicHeaders = useEdge ? { apikey: supabaseConfig.publishableKey } : {};
let configuration;
export async function shippingConfiguration() {
  if (!configuration)
    configuration = fetch(base + '/config', {
      headers: publicHeaders,
      signal: AbortSignal.timeout(12000),
    })
      .then(async (r) => (r.ok ? r.json() : { enabled: useEdge, orderReady: false }))
      .catch(() => ({ enabled: useEdge, orderReady: false }));
  return configuration;
}
export async function shippingRates(address, lines) {
  const client = await cloudClient();
  const { data } = await client.auth.getSession();
  if (!data.session) throw Error('Login untuk cek ongkir.');
  const r = await fetch(base + '/rates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...publicHeaders,
      Authorization: 'Bearer ' + data.session.access_token,
    },
    body: JSON.stringify({
      destination: {
        zip: address.zip,
        provinceId: address.provinceId,
        cityId: address.cityId,
        districtId: address.districtId,
      },
      lines,
    }),
    signal: AbortSignal.timeout(25000),
  });
  const result = await r
    .json()
    .catch(() => ({ error: 'Layanan ongkir belum siap. Hubungi admin TANJ.' }));
  if (!r.ok) throw Error(result.error || 'Ongkir belum tersedia.');
  return result;
}
