import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createRates, shippingItems, shippingQuote } from '../services/biteship.mjs';
import { optionalJSON } from '../services/http.mjs';
import { createShippingHandler } from '../supabase/functions/_shared/shipping-handler.js';

test('shipping cache hides discontinued couriers before returning an existing quote', async () => {
  const values = {
    SUPABASE_URL: 'https://db.test',
    SUPABASE_ANON_KEY: 'public',
    SUPABASE_SERVICE_ROLE_KEY: 'private',
    BITESHIP_API_KEY: 'shipping-key',
  };
  const handler = createShippingHandler({
    env: (key) => values[key],
    fetcher: async (url) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'buyer' });
      if (url.endsWith('/rpc/tanj_cms_storefront'))
        return Response.json({
          products: [{ id: 'dress', name: 'Dress', price: 11000, stock: 3 }],
        });
      if (url.includes('/tb_t_shipping_quote?'))
        return Response.json([
          {
            id: 'quote',
            expires_at: new Date(Date.now() + 600000).toISOString(),
            options: [
              { id: 'biteship:lion:regpack', courier: 'lion', fee: 8000 },
              { id: 'biteship:jne:reg', courier: 'jne', fee: 9000 },
            ],
          },
        ]);
      throw Error('Unexpected provider call');
    },
  });
  const response = await handler(
    new Request('https://edge.test/shipping/rates', {
      method: 'POST',
      headers: { Authorization: 'Bearer customer', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: { zip: '15115', provinceId: '36', cityId: '36.71', districtId: '36.71.07' },
        lines: [{ id: 'dress', qty: 1 }],
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(
    (await response.json()).options.map((option) => option.courier),
    ['jne'],
  );
});

test('Supabase minimal insert response can be empty with status 201', async () => {
  assert.equal(await optionalJSON(new Response('', { status: 201 })), null);
  assert.equal(await optionalJSON(new Response(null, { status: 204 })), null);
  assert.deepEqual(await optionalJSON(new Response('{"products":[]}')), { products: [] });
});

test('server chooses weight/value from catalog and rejects forged or duplicate cart lines', () => {
  const catalog = [
    { id: 'dress', name: 'Dress', price: 687000, stock: 9 },
    { id: 'hijab', name: 'Hijab', price: 195000, stock: 9, isHijab: true },
  ];
  const items = shippingItems(
    [
      { id: 'dress', qty: 2, weight: 1, price: 1 },
      { id: 'hijab', qty: 1 },
    ],
    catalog,
  );
  assert.equal(
    items.reduce((n, i) => n + i.weight * i.quantity, 0),
    2300,
  );
  assert.equal(items[0].value, 687000);
  assert.throws(() => shippingItems([{ id: 'dress', qty: 10 }], catalog));
  assert.throws(() =>
    shippingItems(
      [
        { id: 'dress', qty: 1 },
        { id: 'dress', qty: 1 },
      ],
      catalog,
    ),
  );
});

test('rates use server origin, final price, cache, and redact provider errors', async () => {
  let calls = 0;
  const rates = createRates({
    apiKey: 'test-secret',
    couriers: 'jne,jnt,tiki,lion',
    fetcher: async (url, request) => {
      calls++;
      assert.equal(url, 'https://api.biteship.com/v1/rates/couriers');
      const payload = JSON.parse(request.body);
      assert.equal(payload.origin_postal_code, 13110);
      assert.equal(payload.destination_postal_code, 15115);
      assert.equal(payload.couriers, 'jne,jnt');
      return {
        ok: true,
        json: async () => ({
          success: true,
          pricing: [
            {
              courier_code: 'jne',
              courier_service_code: 'reg',
              courier_name: 'JNE',
              courier_service_name: 'REG',
              price: 14000,
              shipping_fee: 9000,
            },
            { courier_code: 'unknown', courier_service_code: 'reg', price: 1 },
            { courier_code: 'lion', courier_service_code: 'regpack', price: 8000 },
            { courier_code: 'tiki', courier_service_code: 'reg', price: 9000 },
            { courier_code: 'jnt', courier_service_code: 'ez', price: -1 },
          ],
        }),
      };
    },
  });
  const [a, b] = await Promise.all([rates('15115', []), rates('15115', [])]);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
  assert.equal(a.length, 1);
  assert.equal(a[0].fee, 14000);
  await assert.rejects(rates('bad', []), /Kode pos/);
  const failed = createRates({
    apiKey: 'secret',
    fetcher: async () => ({ ok: false, json: async () => ({ error: 'secret' }) }),
  });
  await assert.rejects(failed('15115', []), (e) => !e.message.includes('secret'));
  const unauthorized = createRates({
    apiKey: 'secret',
    fetcher: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ success: false, code: 40101003, error: 'secret' }),
    }),
  });
  await assert.rejects(unauthorized('15115', []), /Kunci API Biteship ditolak/);
});

test('database trusts only stored quotes, binds address/cart/owner, preserves totals and retries', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
    await (await import('./storage-fixture.mjs')).storageFixture(db);
    for (const f of (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort())
      await db.exec(await readFile('supabase/migrations/' + f, 'utf8'));
    await db.exec('set role service_role');
    const published = (await db.query('select public.tanj_cms_storefront() as data')).rows[0].data;
    assert.ok(published.products.length > 0);
    await assert.rejects(db.query('select public.tanj_cms_admin()'), /permission denied/);
    await db.exec('reset role');
    const buyer = '11111111-1111-4111-8111-111111111111',
      other = '22222222-2222-4222-8222-222222222222';
    await db.query(
      "insert into auth.users(id,email) values($1,'buyer@example.com'),($2,'other@example.com')",
      [buyer, other],
    );
    const destination = { provinceId: '36', cityId: '36.71', districtId: '36.71.07', zip: '15115' };
    const lines = [{ id: 'base-0-0', qty: 1 }];
    const option = {
      id: 'biteship:jne:reg',
      name: 'JNE',
      service: 'REG',
      courier: 'jne',
      serviceCode: 'reg',
      fee: 14000,
    };
    const quote = shippingQuote(buyer, destination, lines, [option]);
    await db.query(
      'insert into public.tb_t_shipping_quote(id,account_id,destination,lines,options,expires_at) values($1,$2,$3,$4,$5,$6)',
      [quote.id, buyer, destination, quote.lines, quote.options, quote.expires_at],
    );
    const as = async (id) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec('set role authenticated');
    };
    const customer = {
      ...destination,
      name: 'Buyer',
      phone: '081200000000',
      address: 'Jalan test',
      paymentMethod: 'qris-manual',
      shippingMethod: option.id,
      shippingQuoteId: quote.id,
      shippingFee: 1,
    };
    const request = '44444444-4444-4444-8444-444444444444';
    const create = (c = customer, l = lines) =>
      db.query('select public.tanj_create_order($1,$2,$3) as data', [request, c, l]);
    await as(other);
    await assert.rejects(create(), /ongkir/);
    await as(buyer);
    await assert.rejects(db.query('select * from public.tb_t_shipping_quote'), /permission denied/);
    await assert.rejects(
      db.query('select public.tanj_create_order_legacy($1,$2,$3)', [request, customer, lines]),
      /permission denied/,
    );
    await assert.rejects(create({ ...customer, zip: '15116' }), /Alamat berubah/);
    await assert.rejects(create(customer, [{ id: 'base-0-0', qty: 2 }]), /Tas berubah/);
    await assert.rejects(create({ ...customer, shippingMethod: 'biteship:jnt:ez' }), /kurir/);
    const order = (await create()).rows[0].data;
    assert.equal(order.shipping.fee, 14000);
    assert.equal(order.shipping.method, option.id);
    assert.equal(order.shipping.provider, 'biteship');
    assert.equal(order.total, order.subtotal + 14000 + order.adjustment);
    assert.equal(order.total % 1000, order.code);
    assert.deepEqual((await create()).rows[0].data, order);
    await assert.rejects(
      db.query('select public.tanj_create_order($1,$2,$3)', [
        '55555555-5555-4555-8555-555555555555',
        customer,
        lines,
      ]),
      /kedaluwarsa/,
    );
    await db.exec('reset role');
    assert.equal(
      (await db.query("select stock from public.tb_m_product where id='base-0-0'")).rows[0].stock,
      11,
    );
    const expired = shippingQuote(buyer, destination, lines, [option]);
    await db.query(
      "insert into public.tb_t_shipping_quote(id,account_id,destination,lines,options,expires_at) values($1,$2,$3,$4,$5,now()-interval '1 minute')",
      [expired.id, buyer, destination, expired.lines, expired.options],
    );
    await as(buyer);
    await assert.rejects(
      db.query('select public.tanj_create_order($1,$2,$3)', [
        '66666666-6666-4666-8666-666666666666',
        { ...customer, shippingQuoteId: expired.id },
        lines,
      ]),
      /kedaluwarsa/,
    );
    for (const [cart, fee, expected] of [
      [[{ id: 'base-0-0', qty: 2 }], 35000, 20000],
      [[{ id: 'base-0-0', qty: 2 }], 15000, 15000],
      [
        [
          { id: 'base-0-0', qty: 1 },
          { id: 'hijab-selcuk-brown', qty: 2 },
        ],
        35000,
        0,
      ],
      [[{ id: 'hijab-selcuk-brown', qty: 2 }], 35000, 0],
      [
        [
          { id: 'base-0-0', qty: 2 },
          { id: 'hijab-selcuk-brown', qty: 1 },
        ],
        35000,
        20000,
      ],
    ]) {
      await db.exec('reset role');
      const promoQuote = shippingQuote(buyer, destination, cart, [{ ...option, fee }]);
      await db.query(
        'insert into public.tb_t_shipping_quote(id,account_id,destination,lines,options,expires_at) values($1,$2,$3,$4,$5,$6)',
        [
          promoQuote.id,
          buyer,
          destination,
          promoQuote.lines,
          promoQuote.options,
          promoQuote.expires_at,
        ],
      );
      await as(buyer);
      const req = crypto.randomUUID();
      const args = [
        req,
        { ...customer, shippingQuoteId: promoQuote.id, shippingSubsidy: 999999 },
        cart,
      ];
      const discounted = (await db.query('select public.tanj_create_order($1,$2,$3) as data', args))
        .rows[0].data;
      assert.equal(discounted.shipping.originalFee, fee);
      assert.equal(discounted.shipping.subsidy, expected);
      assert.equal(discounted.shipping.fee, fee - expected);
      assert.equal(discounted.total, discounted.subtotal + fee - expected + discounted.adjustment);
      assert.equal(discounted.total % 1000, discounted.code);
      assert.deepEqual(
        (await db.query('select public.tanj_create_order($1,$2,$3) as data', args)).rows[0].data,
        discounted,
      );
    }
  } finally {
    await db.close();
  }
});
