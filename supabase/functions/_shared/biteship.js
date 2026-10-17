export function shippingItems(lines, catalog, { clothing = 700, hijab = 300 } = {}) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 40)
    throw Object.assign(Error('Tas belanja tidak valid.'), { status: 422 });
  const seen = new Set();
  return lines.map((line) => {
    const p = catalog.find((p) => p.id === line.id);
    if (
      !p ||
      seen.has(p.id) ||
      p.status === 'draft' ||
      p.inStock === false ||
      !Number.isInteger(line.qty) ||
      line.qty < 1 ||
      line.qty > 99 ||
      p.stock < line.qty
    )
      throw Object.assign(Error('Produk atau stok berubah. Periksa tas belanja.'), { status: 422 });
    seen.add(p.id);
    return {
      name: p.name,
      sku: p.id,
      category: 'fashion',
      value: p.price,
      quantity: line.qty,
      weight: p.isHijab ? hijab : clothing,
    };
  });
}

export function createRates({
  apiKey,
  origin = '13110',
  couriers = 'jne,jnt,tiki,lion',
  fetcher = fetch,
}) {
  const cache = new Map();
  return async (postalCode, items) => {
    if (!apiKey)
      throw Object.assign(Error('API key Biteship belum diisi di server.'), { status: 503 });
    if (!/^\d{5}$/.test(String(postalCode)) || !/^\d{5}$/.test(String(origin)))
      throw Object.assign(Error('Kode pos harus 5 angka.'), { status: 422 });
    const key = JSON.stringify([postalCode, items]);
    const previous = cache.get(key);
    if (previous?.expires > Date.now()) return previous.promise;
    const promise = (async () => {
      let response, data;
      try {
        response = await fetcher('https://api.biteship.com/v1/rates/couriers', {
          method: 'POST',
          headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin_postal_code: Number(origin),
            destination_postal_code: Number(postalCode),
            couriers,
            items,
          }),
          signal: AbortSignal.timeout(12000),
        });
        data = await response.json();
      } catch {
        throw Object.assign(Error('Biteship belum merespons. Coba cek ongkir lagi.'), {
          status: 503,
        });
      }
      if ([401, 403].includes(response.status))
        throw Object.assign(
          Error('Kunci API Biteship ditolak. Admin perlu memperbarui kunci API pengiriman.'),
          { status: 503 },
        );
      if (!response.ok || !data.success || !Array.isArray(data.pricing))
        throw Object.assign(
          Error(
            'Tarif Biteship belum tersedia. Periksa aktivasi API, saldo, dan kurir di dashboard.',
          ),
          { status: 503 },
        );
      return data.pricing
        .filter(
          (p) =>
            couriers.split(',').includes(p.courier_code) &&
            /^[\w-]+$/.test(p.courier_service_code) &&
            Number.isSafeInteger(p.price) &&
            p.price >= 0 &&
            (!p.currency || p.currency === 'IDR'),
        )
        .map((p) => ({
          id: `biteship:${p.courier_code}:${p.courier_service_code}`,
          name: p.courier_name,
          service: p.courier_service_name,
          courier: p.courier_code,
          serviceCode: p.courier_service_code,
          fee: p.price,
          duration: p.duration || '',
          provider: 'biteship',
        }))
        .sort((a, b) => a.fee - b.fee);
    })();
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(key, { expires: Date.now() + 5 * 60000, promise });
    try {
      return await promise;
    } catch (e) {
      cache.delete(key);
      throw e;
    }
  };
}

export function shippingQuote(owner, destination, lines, options) {
  return {
    id: crypto.randomUUID(),
    account_id: owner,
    destination,
    lines: lines
      .map(({ id, qty }) => ({ id, qty }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    options,
    expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
  };
}
