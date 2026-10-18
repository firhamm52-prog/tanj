import { createRates, shippingItems, shippingQuote } from './biteship.js';

export function createShippingHandler({ env, fetcher = fetch }) {
  const url = env('SUPABASE_URL');
  const serviceKey = env('TANJ_SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = env('SUPABASE_ANON_KEY') || serviceKey;
  const origins = (env('TANJ_ALLOWED_ORIGINS') || 'https://firhamm52-prog.github.io')
    .split(',')
    .map((s) => s.trim());
  const rates = createRates({
    apiKey: env('BITESHIP_API_KEY'),
    origin: env('BITESHIP_ORIGIN_POSTAL_CODE') || '13110',
    couriers: env('BITESHIP_COURIERS') || 'jne,jnt,tiki,lion',
    fetcher,
  });
  const limits = new Map();
  const fail = (status, message) => {
    throw Object.assign(Error(message), { status });
  };
  async function cloud(path, options = {}) {
    const r = await fetcher(url + path, {
      ...options,
      headers: {
        apikey: serviceKey,
        ...(serviceKey?.startsWith('eyJ') ? { Authorization: 'Bearer ' + serviceKey } : {}),
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) fail(503, 'Layanan ongkir belum siap. Hubungi admin TANJ.');
    const text = await r.text();
    return text.trim() ? JSON.parse(text) : null;
  }
  return async (request) => {
    const origin = request.headers.get('origin');
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      ...(origins.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    };
    const json = (status, value) => new Response(JSON.stringify(value), { status, headers });
    try {
      if (origin && !origins.includes(origin)) fail(403, 'Origin tidak diizinkan.');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      const path = new URL(request.url).pathname;
      if (request.method === 'GET' && path.endsWith('/config')) {
        if (!env('BITESHIP_API_KEY') || !url || !serviceKey)
          fail(503, 'Layanan ongkir belum siap. Hubungi admin TANJ.');
        return json(200, {
          enabled: true,
          orderReady: true,
          origin: env('BITESHIP_ORIGIN_POSTAL_CODE') || '13110',
        });
      }
      if (request.method !== 'POST' || !path.endsWith('/rates'))
        fail(404, 'Endpoint tidak ditemukan.');
      if (!env('BITESHIP_API_KEY') || !url || !serviceKey)
        fail(503, 'Layanan ongkir belum siap. Hubungi admin TANJ.');
      if (!request.headers.get('content-type')?.startsWith('application/json'))
        fail(415, 'Gunakan application/json.');
      const token = request.headers.get('authorization') || '';
      if (!/^Bearer \S+$/.test(token) || token.length > 8192) fail(401, 'Login untuk cek ongkir.');
      const auth = await fetcher(url + '/auth/v1/user', {
        headers: { apikey: publicKey, Authorization: token },
        signal: AbortSignal.timeout(8000),
      });
      if (!auth.ok) fail(401, 'Sesi berakhir. Login kembali.');
      const owner = (await auth.json()).id;
      if (!owner) fail(401, 'Login untuk cek ongkir.');
      const previous = limits.get(owner);
      if (previous?.until > Date.now() && previous.count >= 20)
        fail(429, 'Terlalu banyak cek ongkir. Coba lagi satu menit lagi.');
      for (const [id, limit] of limits) if (limit.until < Date.now()) limits.delete(id);
      limits.set(owner, {
        until: previous?.until > Date.now() ? previous.until : Date.now() + 60000,
        count: previous?.until > Date.now() ? previous.count + 1 : 1,
      });
      const reader = request.body?.getReader();
      let bytes = 0,
        text = '';
      const decoder = new TextDecoder();
      if (reader)
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 16384) {
            await reader.cancel();
            fail(413, 'Data terlalu besar.');
          }
          text += decoder.decode(value, { stream: true });
        }
      text += decoder.decode();
      let input;
      try {
        input = JSON.parse(text);
      } catch {
        fail(400, 'JSON tidak valid.');
      }
      const d = input?.destination;
      if (
        !d ||
        !/^\d{5}$/.test(String(d.zip)) ||
        !['provinceId', 'cityId', 'districtId'].every(
          (k) => typeof d[k] === 'string' && d[k].length > 0 && d[k].length < 40,
        )
      )
        fail(422, 'Pilih alamat pengiriman yang lengkap.');
      const destination = {
        zip: String(d.zip),
        provinceId: d.provinceId,
        cityId: d.cityId,
        districtId: d.districtId,
      };
      const catalog = await cloud('/rest/v1/rpc/tanj_cms_storefront', {
        method: 'POST',
        body: '{}',
      });
      const weight = {
        clothing: Number(env('BITESHIP_CLOTHING_WEIGHT_GRAMS') || 1000),
        hijab: Number(env('BITESHIP_HIJAB_WEIGHT_GRAMS') || 300),
      };
      if (!Object.values(weight).every((w) => Number.isInteger(w) && w > 0 && w <= 50000))
        fail(503, 'Konfigurasi berat barang belum valid.');
      const items = shippingItems(
        input.lines,
        [...catalog.products, ...(catalog.hijabs || []).map((p) => ({ ...p, isHijab: true }))],
        weight,
      );
      const candidate = shippingQuote(owner, destination, input.lines, []);
      // Stored quotes provide a five-minute cache even when Edge instances change.
      const params = new URLSearchParams({
        select: 'id,options,expires_at',
        account_id: 'eq.' + owner,
        destination: 'eq.' + JSON.stringify(destination),
        lines: 'eq.' + JSON.stringify(candidate.lines),
        expires_at: 'gt.' + new Date(Date.now() + 5 * 60000).toISOString(),
        order_id: 'is.null',
        order: 'expires_at.desc',
        limit: '1',
      });
      const cached = await cloud('/rest/v1/tb_t_shipping_quote?' + params);
      const weightGrams = items.reduce((n, i) => n + i.weight * i.quantity, 0);
      if (cached?.length)
        return json(200, {
          options: cached[0].options,
          quoteId: cached[0].id,
          expiresAt: cached[0].expires_at,
          weightGrams,
        });
      const options = await rates(destination.zip, items);
      const quote = shippingQuote(owner, destination, input.lines, options);
      if (options.length)
        await cloud('/rest/v1/tb_t_shipping_quote', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(quote),
        });
      return json(200, {
        options,
        quoteId: options.length ? quote.id : null,
        expiresAt: quote.expires_at,
        weightGrams,
      });
    } catch (error) {
      return json(error.status || 503, {
        error: error.status ? error.message : 'Layanan ongkir belum merespons. Coba lagi.',
      });
    }
  };
}
