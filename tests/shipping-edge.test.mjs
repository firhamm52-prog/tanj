import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShippingHandler } from '../supabase/functions/_shared/shipping-handler.js';

const settings = {
  SUPABASE_URL: 'https://project.test',
  SUPABASE_SERVICE_ROLE_KEY: 'server-secret',
  SUPABASE_ANON_KEY: 'public',
  BITESHIP_API_KEY: 'biteship-secret',
};
const owner = '11111111-1111-4111-8111-111111111111';
const destination = { zip: '11450', provinceId: '31', cityId: '31.73', districtId: '31.73.07' };
function request(path, body, headers = {}) {
  return new Request('https://project.test/functions/v1/shipping/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Origin: 'https://firhamm52-prog.github.io',
      'Content-Type': 'application/json',
      Authorization: 'Bearer customer-token',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
test('CORS allows TANJ, denies other origins, handles preflight, requires login before rates', async () => {
  let calls = 0;
  const handler = createShippingHandler({
    env: (k) => settings[k],
    fetcher: async () => {
      calls++;
      return new Response('{}', { status: 401 });
    },
  });
  const preflight = await handler(
    new Request('https://project.test/functions/v1/shipping/rates', {
      method: 'OPTIONS',
      headers: { Origin: 'https://firhamm52-prog.github.io' },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get('access-control-allow-origin'),
    'https://firhamm52-prog.github.io',
  );
  assert.equal(
    (await handler(request('config', undefined, { Origin: 'https://evil.test' }))).status,
    403,
  );
  assert.equal((await handler(request('rates', {}, { Authorization: '' }))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await handler(request('rates', {}))).status, 401);
  const config = await (await handler(request('config'))).text();
  assert.ok(!config.includes('secret'));
});

test('Edge uses authenticated owner, server catalog and weights, saves minimal response, caches across instances', async () => {
  let stored,
    paidCalls = 0;
  const fetcher = async (url, options = {}) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: owner });
    assert.equal(
      options.headers.apikey || options.headers.Authorization,
      url.includes('api.biteship.com') ? 'biteship-secret' : 'server-secret',
    );
    if (url.endsWith('/rpc/tanj_cms_storefront'))
      return Response.json({
        products: [{ id: 'dress', name: 'Dress', price: 687000, stock: 5 }],
        hijabs: [{ id: 'scarf', name: 'Scarf', price: 195000, stock: 5 }],
      });
    if (url.includes('/tb_t_shipping_quote?')) {
      const query = new URL(url).searchParams;
      assert.equal(query.get('account_id'), 'eq.' + owner);
      assert.equal(query.get('destination'), 'eq.' + JSON.stringify(destination));
      return Response.json(
        stored ? [{ id: stored.id, options: stored.options, expires_at: stored.expires_at }] : [],
      );
    }
    if (url.includes('api.biteship.com')) {
      paidCalls++;
      const body = JSON.parse(options.body);
      assert.equal(body.origin_postal_code, 13110);
      assert.equal(body.destination_postal_code, 11450);
      assert.equal(
        body.items.reduce((n, i) => n + i.weight * i.quantity, 0),
        2300,
      );
      assert.equal(body.items[0].value, 687000);
      return Response.json({
        success: true,
        pricing: [
          {
            courier_code: 'jne',
            courier_service_code: 'reg',
            courier_name: 'JNE',
            courier_service_name: 'REG',
            price: 18000,
          },
        ],
      });
    }
    if (url.endsWith('/tb_t_shipping_quote')) {
      stored = JSON.parse(options.body);
      return new Response('', { status: 201 });
    }
    throw Error('Unexpected URL');
  };
  const payload = {
    destination,
    lines: [
      { id: 'dress', qty: 2, price: 1, weight: 1 },
      { id: 'scarf', qty: 1 },
    ],
    account_id: 'forged',
  };
  const handler = createShippingHandler({ env: (k) => settings[k], fetcher });
  const response = await handler(request('rates', payload));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.weightGrams, 2300);
  assert.equal(data.options[0].fee, 18000);
  assert.equal(data.quoteId, stored.id);
  assert.equal(stored.account_id, owner);
  assert.deepEqual(stored.lines, [
    { id: 'dress', qty: 2 },
    { id: 'scarf', qty: 1 },
  ]);
  const freshInstance = createShippingHandler({ env: (k) => settings[k], fetcher });
  const cached = await (await freshInstance(request('rates', payload))).json();
  assert.equal(cached.quoteId, data.quoteId);
  assert.equal(paidCalls, 1);
  const invalid = await handler(
    request('rates', { ...payload, lines: [{ id: 'dress', qty: 20 }] }),
  );
  assert.equal(invalid.status, 422);
  assert.equal(paidCalls, 1);
});

test('malformed and oversized input is rejected without contacting Biteship', async () => {
  const handler = createShippingHandler({
    env: (k) => settings[k],
    fetcher: async () => Response.json({ id: owner }),
  });
  const oversized = new Request('https://project.test/functions/v1/shipping/rates', {
    method: 'POST',
    headers: { Authorization: 'Bearer user', 'Content-Type': 'application/json' },
    body: 'x'.repeat(17000),
  });
  assert.equal((await handler(oversized)).status, 413);
  const malformed = new Request('https://project.test/functions/v1/shipping/rates', {
    method: 'POST',
    headers: { Authorization: 'Bearer user', 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal((await handler(malformed)).status, 400);
});
