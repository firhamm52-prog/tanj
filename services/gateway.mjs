import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { config, production, root } from './config.mjs';
import { serve, service, json, body, error, optionalJSON } from './http.mjs';
import { openDatabase } from './db.mjs';
import { storefront } from '../shared/seed.js';
import { supabaseConfig } from '../web/supabase-config.js';
import { createRates, shippingItems, shippingQuote } from './biteship.mjs';
const shippingKey = process.env.BITESHIP_API_KEY?.trim();
const shippingServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const rates = createRates({
  apiKey: shippingKey,
  origin: process.env.BITESHIP_ORIGIN_POSTAL_CODE || '13110',
  couriers: process.env.BITESHIP_COURIERS || 'jne,jnt,tiki,lion',
});
const shippingLimits = new Map();
async function shippingCloud(path, options = {}, key = supabaseConfig.publishableKey) {
  const response = await fetch(supabaseConfig.url + path, {
    ...options,
    headers: {
      apikey: key,
      ...(key.startsWith('eyJ') ? { Authorization: 'Bearer ' + key } : {}),
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) error(503, 'Layanan ongkir belum siap. Hubungi admin TANJ.');
  return optionalJSON(response);
}
const db = openDatabase('publication');
const state = async () => {
  const [catalog, content] = await Promise.all([
    service(config.catalogPort, '/state'),
    service(config.contentPort, '/state'),
  ]);
  return { ...catalog, ...content };
};
const cookie = (token) =>
  `tanj_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token ? 28800 : 0}${production ? '; Secure' : ''}`;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
};
serve(
  config.port,
  async (req, res, path) => {
    if (path.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(req.method)) {
        const origin = req.headers.origin;
        if (
          req.headers['sec-fetch-site'] === 'cross-site' ||
          (origin && new URL(origin).host !== req.headers.host)
        )
          error(403, 'Origin tidak diizinkan.');
        if (!String(req.headers['content-type']).startsWith('application/json'))
          error(415, 'Gunakan application/json.');
      }
      if (path === '/api/health' && req.method === 'GET') {
        const services = await Promise.all(
          [config.authPort, config.catalogPort, config.contentPort].map((port) =>
            service(port, '/health'),
          ),
        );
        return json(res, 200, { status: 'ok', services });
      }
      if (path === '/api/shipping/config' && req.method === 'GET')
        return json(res, 200, {
          enabled: Boolean(shippingKey),
          orderReady: Boolean(shippingServiceKey),
          origin: process.env.BITESHIP_ORIGIN_POSTAL_CODE || '13110',
        });
      if (path === '/api/shipping/rates' && req.method === 'POST') {
        const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
        if (!token || token.length > 8192) error(401, 'Login untuk cek ongkir.');
        const auth = await fetch(supabaseConfig.url + '/auth/v1/user', {
          headers: { apikey: supabaseConfig.publishableKey, Authorization: 'Bearer ' + token },
          signal: AbortSignal.timeout(8000),
        });
        if (!auth.ok) error(401, 'Sesi berakhir. Login kembali.');
        const owner = (await auth.json()).id;
        const previous = shippingLimits.get(owner);
        if (previous && previous.until > Date.now() && previous.count >= 20)
          error(429, 'Terlalu banyak cek ongkir. Coba lagi satu menit lagi.');
        if (shippingLimits.size > 1000)
          for (const [id, limit] of shippingLimits)
            if (limit.until < Date.now()) shippingLimits.delete(id);
        shippingLimits.set(owner, {
          until: previous?.until > Date.now() ? previous.until : Date.now() + 60000,
          count: previous?.until > Date.now() ? previous.count + 1 : 1,
        });
        const input = await body(req);
        const destination = input.destination;
        if (
          !destination ||
          !/^\d{5}$/.test(String(destination.zip)) ||
          !['provinceId', 'cityId', 'districtId'].every(
            (k) => typeof destination[k] === 'string' && destination[k].length < 40,
          )
        )
          error(422, 'Pilih alamat pengiriman yang lengkap.');
        const catalog = await shippingCloud('/rest/v1/rpc/tanj_cms_storefront', {
          method: 'POST',
          body: '{}',
        });
        const products = [
          ...catalog.products,
          ...(catalog.hijabs || []).map((p) => ({ ...p, isHijab: true })),
        ];
        const weight = {
          clothing: Number(process.env.BITESHIP_CLOTHING_WEIGHT_GRAMS || 700),
          hijab: Number(process.env.BITESHIP_HIJAB_WEIGHT_GRAMS || 300),
        };
        if (!Object.values(weight).every((w) => Number.isInteger(w) && w > 0 && w <= 50000))
          error(503, 'Konfigurasi berat barang belum valid.');
        const items = shippingItems(input.lines, products, weight);
        const options = await rates(destination.zip, items);
        const quote = shippingQuote(
          owner,
          {
            zip: String(destination.zip),
            provinceId: destination.provinceId,
            cityId: destination.cityId,
            districtId: destination.districtId,
          },
          input.lines,
          options,
        );
        if (shippingServiceKey && options.length)
          await shippingCloud(
            '/rest/v1/tb_t_shipping_quote',
            { method: 'POST', body: JSON.stringify(quote), headers: { Prefer: 'return=minimal' } },
            shippingServiceKey,
          );
        return json(res, 200, {
          options,
          quoteId: shippingServiceKey ? quote.id : null,
          expiresAt: quote.expires_at,
          weightGrams: items.reduce((n, i) => n + i.weight * i.quantity, 0),
        });
      }
      if (path === '/api/storefront' && req.method === 'GET')
        return json(
          res,
          200,
          JSON.parse(
            db.prepare('SELECT document FROM site_releases ORDER BY id DESC LIMIT 1').get()
              .document,
          ),
        );
      const token =
        String(req.headers.cookie || '')
          .split(';')
          .map((s) => s.trim())
          .find((s) => s.startsWith('tanj_session='))
          ?.slice(13) || '';
      if (path === '/api/auth/login' && req.method === 'POST') {
        const result = await service(config.authPort, '/login', {
          method: 'POST',
          headers: { 'x-client-ip': req.socket.remoteAddress || 'local' },
          body: JSON.stringify(await body(req)),
        });
        res.setHeader('Set-Cookie', cookie(result.token));
        return json(res, 200, { user: result.user });
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        await service(config.authPort, '/logout', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        res.setHeader('Set-Cookie', cookie(''));
        return json(res, 200, { ok: true });
      }
      const { user } = await service(config.authPort, '/session', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      if (path === '/api/auth/session' && req.method === 'GET') return json(res, 200, { user });
      if (path === '/api/admin/state' && req.method === 'GET') return json(res, 200, await state());
      if (path === '/api/admin/publish' && req.method === 'POST') {
        const snapshot = storefront(await state());
        const result = db
          .prepare('INSERT INTO site_releases(document,published_by) VALUES(?,?)')
          .run(JSON.stringify(snapshot), user.email);
        return json(res, 200, { ok: true, release: Number(result.lastInsertRowid) });
      }
      const match = path.match(
        /^\/api\/admin\/(products|collections|hijabs|hero|banner|slides)(\/[^/]+)?$/,
      );
      if (match) {
        const port = ['products', 'collections', 'hijabs'].includes(match[1])
          ? config.catalogPort
          : config.contentPort;
        const options = { method: req.method };
        if (['POST', 'PUT'].includes(req.method)) options.body = JSON.stringify(await body(req));
        return json(
          res,
          req.method === 'POST' ? 201 : 200,
          await service(port, `/${match[1]}${match[2] || ''}`, options),
        );
      }
      error(404, 'Endpoint tidak ditemukan.');
    }
    if (!['GET', 'HEAD'].includes(req.method)) error(405, 'Metode tidak diizinkan.');
    if (path === '/web/config.js') {
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end('window.TANJ_CONFIG={mode:"api",apiBase:"/api"};');
    }
    if (path === '/admin') {
      res.writeHead(302, { Location: '/admin/' });
      return res.end();
    }
    if (path === '/' || path === '/admin/') path += 'index.html';
    if (!(path === '/index.html' || /^\/(assets|admin|web|shared)\/[\w./-]+$/.test(path)))
      error(404, 'Halaman tidak ditemukan.');
    const file = resolve(root, `.${path}`);
    if (!file.startsWith(root + sep) || !mime[extname(file)]) error(404, 'File tidak ditemukan.');
    let info;
    try {
      info = await stat(file);
    } catch {
      error(404, 'File tidak ditemukan.');
    }
    if (!info.isFile()) error(404, 'File tidak ditemukan.');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Type', mime[extname(file)]);
    res.setHeader('Cache-Control', 'no-cache');
    const bytes = await readFile(file);
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]),
        end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
      if (start > end || start >= bytes.length) {
        res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      return res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
    }
    res.setHeader('Content-Length', bytes.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.end(req.method === 'HEAD' ? undefined : bytes);
  },
  { internal: false, host: config.host },
);
