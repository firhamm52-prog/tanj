import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { storageFixture } from './storage-fixture.mjs';
import { createMidtransHandler } from '../supabase/functions/_shared/midtrans-handler.js';
const oid = 'TANJ-44444444-4444-4444-8444-444444444444';
const buyer = '11111111-1111-4111-8111-111111111111';
test('private gateway transitions verify amounts and release stock once', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
      create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
    await storageFixture(db);
    for (const f of (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort())
      await db.exec(await readFile('supabase/migrations/' + f, 'utf8'));
    const setup = (await db.query(await readFile('docs/check-midtrans-setup.sql', 'utf8'))).rows[0];
    assert.deepEqual(Object.values(setup), [true, true, true]);
    await db.query("insert into auth.users(id,email) values($1,'buyer@example.com')", [buyer]);
    const as = async (role, owner = buyer) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
      await db.exec('set role ' + role);
    };
    const stock = (await db.query("select stock from public.tb_m_product where id='base-0-0'"))
      .rows[0].stock;
    const qid = crypto.randomUUID();
    await db.exec("update public.tb_m_product set stock=1 where id='base-0-1'");
    const destination = { provinceId: '36', cityId: '36.71', districtId: '36.71.07', zip: '15115' };
    const option = {
      id: 'biteship:jne:reg',
      name: 'JNE',
      service: 'REG',
      courier: 'jne',
      serviceCode: 'reg',
      fee: 14000,
    };
    await db.query(
      "insert into public.tb_t_shipping_quote(id,account_id,destination,lines,options,expires_at) values($1,$2,$3,$4,$5,now()+interval '10 minutes')",
      [qid, buyer, destination, [{ id: 'base-0-1', qty: 1 }], [option]],
    );
    await as('authenticated');
    const checkoutArgs = [
      '66666666-6666-4666-8666-666666666666',
      {
        ...destination,
        name: 'Buyer',
        address: 'Jalan Test',
        phone: '081200000000',
        paymentMethod: 'midtrans',
        shippingMethod: option.id,
        shippingQuoteId: qid,
        total: 1,
      },
      [{ id: 'base-0-1', qty: 1 }],
    ];
    const actual = (await db.query('select public.tanj_create_order($1,$2,$3) d', checkoutArgs))
      .rows[0].d;
    assert.equal(actual.payment.provider, 'midtrans');
    assert.equal(actual.total, actual.subtotal + actual.shipping.fee);
    assert.equal(actual.adjustment, 0);
    assert.equal(actual.code, 0);
    assert.deepEqual(
      (await db.query('select public.tanj_create_order($1,$2,$3) d', checkoutArgs)).rows[0].d,
      actual,
    );
    await assert.rejects(
      db.query('select public.tanj_decide_payment($1,$2,$3,$4)', [
        actual.id,
        actual.version,
        'approve',
        true,
      ]),
      /Midtrans/,
    );
    await db.exec('reset role');
    const available = async () =>
      (await db.query("select stock from public.tb_m_product where id='base-0-1'")).rows[0].stock;
    assert.equal(await available(), 1, 'creating an order does not reserve inventory');
    const otherBuyer = '22222222-2222-4222-8222-222222222222';
    const otherQuote = crypto.randomUUID();
    await db.query("insert into auth.users(id,email) values($1,'other@example.com')", [otherBuyer]);
    await db.query(
      "insert into public.tb_t_shipping_quote(id,account_id,destination,lines,options,expires_at) values($1,$2,$3,$4,$5,now()+interval '10 minutes')",
      [otherQuote, otherBuyer, destination, [{ id: 'base-0-1', qty: 1 }], [option]],
    );
    await as('authenticated', otherBuyer);
    const otherOrder = (
      await db.query('select public.tanj_create_order($1,$2,$3) d', [
        crypto.randomUUID(),
        { ...checkoutArgs[1], shippingQuoteId: otherQuote },
        checkoutArgs[2],
      ])
    ).rows[0].d;
    await as('authenticated');
    await db.query('select public.tanj_midtrans_prepare($1)', [actual.id]);
    await as('authenticated', otherBuyer);
    await assert.rejects(
      db.query('select public.tanj_midtrans_prepare($1)', [otherOrder.id]),
      /sudah diorder/,
    );
    await db.exec('reset role');
    assert.equal(await available(), 0, 'only the first payment preparation reserves the last item');
    await as('service_role');
    for (let n = 0; n < 2; n++)
      await db.query('select public.tanj_midtrans_gateway($1,$2)', [
        actual.id,
        'creation_rejected',
      ]);
    await db.exec('reset role');
    assert.equal(await available(), 1, 'definitive rejection releases exactly once');
    // A later unavailable item must roll back earlier debits in the same preparation.
    await db.query("update public.tb_t_order set data=jsonb_set(data,'{items}',$2) where id=$1", [
      otherOrder.id,
      JSON.stringify([...otherOrder.items, { id: 'missing-product', name: 'Other item', qty: 1 }]),
    ]);
    await as('authenticated', otherBuyer);
    await assert.rejects(
      db.query('select public.tanj_midtrans_prepare($1)', [otherOrder.id]),
      /Other item sudah diorder/,
    );
    await db.exec('reset role');
    assert.equal(await available(), 1, 'partial reservation rolls back');
    await db.query('update public.tb_t_order set data=$2 where id=$1', [otherOrder.id, otherOrder]);
    await as('authenticated', otherBuyer);
    await db.query('select public.tanj_midtrans_prepare($1)', [otherOrder.id]);
    await as('service_role');
    await db.query('select public.tanj_midtrans_gateway($1,$2,$3)', [
      otherOrder.id,
      'redirect',
      {
        url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/other',
      },
    ]);
    await db.query('select public.tanj_midtrans_gateway($1,$2)', [
      otherOrder.id,
      'creation_rejected',
    ]);
    await db.exec('reset role');
    assert.equal(await available(), 0, 'late rejection cannot release an active bill');
    await as('service_role');
    for (let n = 0; n < 2; n++)
      await db.query('select public.tanj_midtrans_gateway($1,$2,$3)', [
        otherOrder.id,
        'status',
        {
          order_id: otherOrder.id,
          gross_amount: otherOrder.total,
          transaction_status: 'expire',
        },
      ]);
    await db.exec('reset role');
    assert.equal(await available(), 1, 'expiry releases the payment reservation exactly once');
    await as('authenticated');
    await db.query('select public.tanj_midtrans_prepare($1)', [actual.id]);
    await as('service_role');
    for (const status of ['settlement', 'settlement', 'expire'])
      await db.query('select public.tanj_midtrans_gateway($1,$2,$3)', [
        actual.id,
        'status',
        {
          order_id: actual.id,
          gross_amount: actual.total,
          transaction_status: status,
        },
      ]);
    await db.exec('reset role');
    assert.equal(
      await available(),
      0,
      'settlement does not debit again or allow late expiry to release',
    );
    const o = {
      id: oid,
      version: 1,
      status: 'WAITING_PAYMENT',
      total: 123456,
      deadline: Date.now() + 3600000,
      payment: { provider: 'midtrans' },
      items: [{ id: 'base-0-0', qty: 1 }],
      logs: [],
    };
    await db.query('insert into public.tb_t_order(id,account_id,data) values($1,$2,$3)', [
      oid,
      buyer,
      o,
    ]);
    await as('authenticated');
    const existing = (
      await db.query('select public.tanj_create_order($1,$2,$3) d', [
        oid.slice(5).toLowerCase(),
        { paymentMethod: 'midtrans' },
        [],
      ])
    ).rows[0].d;
    assert.deepEqual(existing, o);
    await assert.rejects(
      db.query('select public.tanj_midtrans_gateway($1,$2,$3)', [oid, 'status', {}]),
      /permission denied/,
    );
    await assert.rejects(
      db.query('select public.tanj_update_order($1,$2,$3,$4)', [oid, 1, 'cancel', {}]),
      /Midtrans/,
    );
    const p = (await db.query('select public.tanj_midtrans_prepare($1) d', [oid])).rows[0].d;
    assert.equal(p.order.total, 123456);
    await assert.rejects(
      db.query('select public.tanj_midtrans_prepare($1)', [oid]),
      /sedang disiapkan/,
    );
    await db.exec('reset role');
    await db.query(
      "update public.tb_t_midtrans set lease_until=now()-interval '1 minute' where order_id=$1",
      [oid],
    );
    await as('authenticated');
    const recovered = (await db.query('select public.tanj_midtrans_prepare($1) d', [oid])).rows[0]
      .d;
    assert.notEqual(recovered.attemptId, p.attemptId);
    await as('service_role');
    await assert.rejects(
      db.query('select public.tanj_midtrans_gateway($1,$2,$3)', [
        oid,
        'creation_rejected',
        { attemptId: p.attemptId },
      ]),
      /sudah berubah/,
    );
    const snapToken = crypto.randomUUID();
    await db.query('select public.tanj_midtrans_gateway($1,$2,$3)', [
      oid,
      'redirect',
      {
        url: 'https://app.sandbox.midtrans.com/snap/v3/redirection/' + snapToken,
        token: snapToken,
        attemptId: recovered.attemptId,
      },
    ]);
    await as('authenticated');
    const reused = (await db.query('select public.tanj_midtrans_prepare($1) d', [oid])).rows[0].d;
    assert.equal(reused.snap_token, snapToken);
    await as('service_role');
    const d = {
      order_id: oid,
      gross_amount: '123456.00',
      currency: 'IDR',
      transaction_status: 'settlement',
      transaction_id: 'tx1',
    };
    const update = (x) =>
      db.query('select public.tanj_midtrans_gateway($1,$2,$3)', [oid, 'status', x]);
    await assert.rejects(update({ ...d, gross_amount: '1.00' }), /Nominal/);
    await update(d);
    await update({ ...d, transaction_status: 'expire' });
    await db.exec('reset role');
    let saved = (await db.query('select data from public.tb_t_order where id=$1', [oid])).rows[0]
      .data;
    assert.equal(saved.status, 'PAID');
    assert.equal(saved.version, 2);
    assert.equal(saved.logs.length, 1);
    assert.equal(
      (await db.query("select stock from public.tb_m_product where id='base-0-0'")).rows[0].stock,
      stock,
    );
    // Independent pending fixture tests replayed expiry.
    const second = oid.replace('44444444', '55555555');
    await db.query('insert into public.tb_t_order(id,account_id,data) values($1,$2,$3)', [
      second,
      buyer,
      { ...o, id: second },
    ]);
    await db.query('insert into public.tb_t_midtrans(order_id) values($1)', [second]);
    await as('service_role');
    for (let i = 0; i < 2; i++)
      await db.query('select public.tanj_midtrans_gateway($1,$2,$3)', [
        second,
        'status',
        { ...d, order_id: second, transaction_status: 'expire' },
      ]);
    await db.exec('reset role');
    assert.equal(
      (await db.query("select stock from public.tb_m_product where id='base-0-0'")).rows[0].stock,
      stock + 1,
    );
  } finally {
    await db.close();
  }
});

test('edge rejects unsigned webhooks and uses API status rather than notification status', async () => {
  const values = {
    SUPABASE_URL: 'https://db.test',
    SUPABASE_ANON_KEY: 'public',
    SUPABASE_SERVICE_ROLE_KEY: 'private',
    MIDTRANS_SERVER_KEY: 'secret',
    MIDTRANS_ENABLED: 'true',
    MIDTRANS_IS_PRODUCTION: 'false',
  };
  let calls = 0,
    saved;
  const handler = createMidtransHandler({
    env: (k) => values[k],
    fetcher: async (url, options) => {
      calls++;
      if (url.includes('/v2/'))
        return Response.json({
          order_id: oid,
          gross_amount: '123456.00',
          transaction_status: 'settlement',
          transaction_id: 'tx',
        });
      if (url.endsWith('/tanj_midtrans_gateway')) {
        saved = JSON.parse(options.body);
        return Response.json({ status: 'PAID' });
      }
      throw Error('Unexpected URL');
    },
  });
  const request = (body) =>
    new Request('https://edge.test/midtrans/notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await handler(request({ order_id: oid, signature_key: '0'.repeat(128) }))).status,
    401,
  );
  assert.equal(calls, 0);
  assert.equal((await handler(new Request('https://edge.test/midtrans/notification'))).status, 200);
  const probe = await handler(request({ order_id: 'dashboard-test' }));
  assert.equal(probe.status, 200);
  assert.equal((await probe.json()).ignored, true);
  assert.equal(calls, 0);
  const signature_key = Buffer.from(
    await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(oid + '200' + '123456.00' + 'secret'),
    ),
  ).toString('hex');
  assert.equal(
    (
      await handler(
        request({
          order_id: oid,
          status_code: '200',
          gross_amount: '123456.00',
          signature_key,
          transaction_status: 'deny',
        }),
      )
    ).status,
    200,
  );
  assert.equal(saved.details.transaction_status, 'settlement');
});

test('edge start ignores browser totals, preserves ownership and uses trusted redirect hosts', async () => {
  const v = {
    SUPABASE_URL: 'https://db.test',
    SUPABASE_ANON_KEY: 'public',
    SUPABASE_SERVICE_ROLE_KEY: 'private',
    MIDTRANS_SERVER_KEY: 'secret',
    MIDTRANS_ENABLED: 'true',
  };
  let amount;
  let own = true;
  let outcome = 'success';
  let gatewayFailure = false;
  const operations = [];
  const handler = createMidtransHandler({
    env: (k) => v[k],
    fetcher: async (url, options) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: buyer });
      if (url.includes('/tb_t_order?')) return Response.json(own ? [{ id: oid }] : []);
      if (url.endsWith('/tanj_midtrans_prepare'))
        return Response.json({
          order: {
            total: 123456,
            deadline: Date.now() + 3600000,
            customer: { name: 'Buyer', email: 'test@example.com', phone: '081200000000' },
          },
        });
      if (url.includes('/v2/'))
        return outcome === 'duplicate_paid'
          ? Response.json({
              order_id: oid,
              gross_amount: '123456.00',
              transaction_status: 'settlement',
              currency: 'IDR',
            })
          : Response.json({ status_code: '404' }, { status: 404 });
      if (url === 'https://app.sandbox.midtrans.com/snap/v1/transactions') {
        if (outcome === 'timeout') throw new TypeError('Network timed out');
        if (outcome === 'reject')
          return Response.json({ error_messages: ['Invalid payment channel'] }, { status: 400 });
        if (outcome === 'duplicate' || outcome === 'duplicate_paid')
          return Response.json(
            { error_messages: ['order_id has already been taken'] },
            { status: 400 },
          );
        assert.deepEqual(JSON.parse(options.body).enabled_payments, [
          'bank_transfer',
          'cimb_va',
          'danamon_va',
          'bsi_va',
          'other_qris',
        ]);
        amount = JSON.parse(options.body).transaction_details.gross_amount;
        return Response.json({
          redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/token',
        });
      }
      if (url.endsWith('/tanj_midtrans_gateway')) {
        operations.push(JSON.parse(options.body).operation);
        if (gatewayFailure)
          return Response.json({ code: '42501', message: 'permission denied' }, { status: 403 });
        return Response.json({
          status: JSON.parse(options.body).operation === 'status' ? 'PAID' : 'WAITING_PAYMENT',
        });
      }
      throw Error(url);
    },
  });
  const request = () =>
    new Request('https://edge.test/midtrans/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer' },
      body: JSON.stringify({ orderId: oid, total: 1 }),
    });
  assert.equal((await handler(request())).status, 200);
  assert.equal(amount, 123456);
  own = false;
  assert.equal((await handler(request())).status, 404);
  own = true;
  operations.length = 0;
  outcome = 'reject';
  assert.equal((await handler(request())).status, 502);
  assert.deepEqual(operations, ['creation_rejected']);
  gatewayFailure = true;
  const failedCleanup = await handler(request());
  assert.equal(failedCleanup.status, 502);
  assert.match((await failedCleanup.json()).error, /Midtrans belum dapat memproses/);
  outcome = 'success';
  const failedRedirect = await handler(request());
  assert.equal(failedRedirect.status, 409);
  assert.match((await failedRedirect.json()).error, /Status pembayaran belum dapat disimpan/);
  gatewayFailure = false;
  operations.length = 0;
  for (outcome of ['timeout', 'duplicate']) {
    assert.ok((await handler(request())).status >= 500);
    assert.deepEqual(operations, [], 'uncertain creation must not release inventory');
  }
  assert.deepEqual(
    await (
      await handler(
        new Request('https://edge.test/midtrans/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer customer' },
          body: JSON.stringify({ orderId: oid }),
        }),
      )
    ).json(),
    { status: 'WAITING_PAYMENT', notStarted: true },
  );
  outcome = 'duplicate_paid';
  const paidRecovery = await handler(request());
  assert.equal(paidRecovery.status, 200);
  assert.equal((await paidRecovery.json()).status, 'PAID');
  assert.deepEqual(operations, ['status'], 'duplicate recovery verifies the existing transaction');
});
