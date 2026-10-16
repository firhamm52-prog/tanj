import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
try {
  await db.exec(
    `create role anon; create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const file of [
    '202610160001_accounts.sql',
    '202610160002_orders.sql',
    '202610160003_catalog.sql',
    '202610160004_review_tracking.sql',
    '202610160005_payment_confirmation_guard.sql',
    '202610160006_signup_email_check.sql',
  ])
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
  const buyer = '11111111-1111-4111-8111-111111111111',
    other = '22222222-2222-4222-8222-222222222222',
    admin = '33333333-3333-4333-8333-333333333333';
  await db.query(
    `insert into auth.users(id,email)values($1,'buyer@example.com'),($2,'other@example.com'),($3,'admin@example.com')`,
    [buyer, other, admin],
  );
  await db.query('insert into public.tb_m_admin values($1)', [admin]);
  async function as(id) {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('set role authenticated');
  }
  await as(buyer);
  assert.equal((await db.query('select * from public.tb_m_account')).rows.length, 1);
  await assert.rejects(db.query(`update public.tb_m_account set id=$1`, [other]));
  const input = {
    name: 'Buyer',
    email: 'forged@example.com',
    phone: '081200000000',
    address: 'Jalan testing',
    provinceId: '36',
    cityId: '36.71',
    districtId: '36.71.07',
    district: 'Testing',
    zip: '15115',
    paymentMethod: 'qris-manual',
    shippingMethod: 'jne-regular',
  };
  const request = '44444444-4444-4444-8444-444444444444';
  const create = () =>
    db.query('select public.tanj_create_order($1,$2,$3) as data', [
      request,
      input,
      [{ id: 'base-0-0', qty: 1, price: 1 }],
    ]);
  const order = (await create()).rows[0].data;
  assert.equal(order.customer.email, 'buyer@example.com');
  assert.equal(order.subtotal, 687000);
  assert.equal(order.shipping.method, 'jne-regular');
  assert.equal(order.total % 1000, order.code);
  assert.equal((await create()).rows[0].data.id, order.id);
  await assert.rejects(
    db.query("select public.tanj_update_order($1,1,'approve',$2)", [
      order.id,
      {
        checked: true,
        amount: order.total,
        reference: 'ref',
        paidAt: new Date().toISOString(),
        note: 'ok',
      },
    ]),
  );
  await as(other);
  assert.equal((await db.query('select * from public.tb_t_order')).rows.length, 0);
  await assert.rejects(db.query("select public.tanj_update_order($1,1,'confirm')", [order.id]));
  await as(buyer);
  await db.query("select public.tanj_update_order($1,1,'confirm')", [order.id]);
  await as(admin);
  assert.equal((await db.query('select * from public.tb_t_order')).rows.length, 1);
  await assert.rejects(
    db.query("select public.tanj_update_order($1,2,'approve',$2)", [
      order.id,
      { checked: true, amount: 1, reference: 'ref', paidAt: new Date().toISOString(), note: 'ok' },
    ]),
  );
  const approved = (
    await db.query("select public.tanj_update_order($1,2,'approve',$2) as data", [
      order.id,
      {
        checked: true,
        amount: order.total,
        reference: 'ref',
        paidAt: new Date().toISOString(),
        note: 'Dana cocok',
      },
    ])
  ).rows[0].data;
  assert.equal(approved.status, 'PAID');
  await assert.rejects(
    db.query("select public.tanj_update_order($1,2,'reject',$2)", [order.id, { note: 'stale' }]),
  );
  await as(buyer);
  await assert.rejects(db.query('select public.tanj_save_qris(null)'));
  await assert.rejects(
    db.query("select public.tanj_save_tracking($1,3,'JNE','TEST123')", [order.id]),
  );
  await assert.rejects(
    db.query("select public.tanj_decide_payment($1,3,'approve',true)", [order.id]),
  );
  const second = (
    await db.query('select public.tanj_create_order($1,$2,$3) as data', [
      '55555555-5555-4555-8555-555555555555',
      input,
      [{ id: 'base-0-1', qty: 1 }],
    ])
  ).rows[0].data;
  await as(admin);
  await assert.rejects(
    db.query("select public.tanj_save_tracking($1,1,'JNE','TEST123')", [second.id]),
  );
  await assert.rejects(
    db.query("select public.tanj_decide_payment($1,1,'approve',false)", [second.id]),
  );
  await assert.rejects(
    db.query("select public.tanj_decide_payment($1,1,'approve',true)", [second.id]),
    /Customer belum/,
  );
  await assert.rejects(
    db.query("select public.tanj_update_order($1,1,'approve',$2)", [
      second.id,
      {
        checked: true,
        amount: second.total,
        reference: 'ref2',
        paidAt: new Date().toISOString(),
        note: 'ok',
      },
    ]),
    /Customer belum/,
  );
  await as(buyer);
  await db.query("select public.tanj_update_order($1,1,'confirm')", [second.id]);
  await as(admin);
  const simple = (
    await db.query("select public.tanj_decide_payment($1,2,'approve',true) as data", [second.id])
  ).rows[0].data;
  assert.equal(simple.status, 'PAID');
  assert.ok(simple.review.reviewedAt);
  assert.equal(simple.review.reference, undefined);
  assert.equal(simple.review.paidAt, undefined);
  const tracked = (
    await db.query("select public.tanj_save_tracking($1,3,'JNE','TEST123') as data", [second.id])
  ).rows[0].data;
  assert.equal(tracked.tracking.number, 'TEST123');
  await assert.rejects(
    db.query("select public.tanj_save_tracking($1,2,'JNE','STALE')", [second.id]),
  );
  await as(buyer);
  const visible = (await db.query('select data from public.tb_t_order where id=$1', [second.id]))
    .rows[0].data;
  assert.equal(visible.tracking.number, 'TEST123');
  await db.exec('reset role;set role anon');
  await assert.rejects(db.query('select * from public.tb_m_account'));
  await assert.rejects(db.query('select * from public.tb_t_order'));
  assert.equal(
    (await db.query("select public.tanj_signup_email_exists(' BUYER@EXAMPLE.COM ') as found"))
      .rows[0].found,
    true,
  );
  assert.equal(
    (await db.query("select public.tanj_signup_email_exists('new@example.com') as found")).rows[0]
      .found,
    false,
  );
  console.log(
    'PASS: PostgreSQL migrations, profile/order RLS, server pricing/email, idempotent order creation, cross-customer denial, customer approval denial, amount validation, stale review guard, admin approval, QRIS admin guard, anonymous denial.',
  );
} finally {
  await db.close();
}
