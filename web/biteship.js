import { cloudClient } from './supabase-customer.js?v=cms-entry-20261115';
import { supabaseConfig } from './supabase-config.js?v=cms-entry-20261115';
import { cachedShippingQuote, saveShippingQuote } from './shipping-quote-cache.js?v=cms-entry-20261115';
const useEdge =
  supabaseConfig.enabled &&
  window.TANJ_CONFIG?.mode !== 'api' &&
  !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const base = useEdge ? supabaseConfig.url + '/functions/v1/shipping' : '/api/shipping';
const publicHeaders = useEdge ? { apikey: supabaseConfig.publishableKey } : {};
let configuration;
const pendingRates = new Map();
export async function shippingConfiguration() {
  if (!supabaseConfig.enabled && window.TANJ_CONFIG?.mode !== 'api')
    return { enabled: false, orderReady: false };
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
  const owner = data.session.user.id;
  const cached = cachedShippingQuote(owner, address, lines);
  if (cached) return cached.quote;
  const requestKey = JSON.stringify([
    owner,
    address.zip,
    address.provinceId,
    address.cityId,
    address.districtId,
    lines.map(({ id, qty }) => ({ id, qty })).sort((a, b) => a.id.localeCompare(b.id)),
  ]);
  if (pendingRates.has(requestKey)) return pendingRates.get(requestKey);
  const pending = fetchRates();
  pendingRates.set(requestKey, pending);
  try {
    return await pending;
  } finally {
    pendingRates.delete(requestKey);
  }
  async function fetchRates() {
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
    result.options = (result.options || []).filter((option) =>
      ['jne', 'jnt'].includes(option.courier),
    );
    saveShippingQuote(owner, address, lines, result);
    return result;
  }
}
