import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
try {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const file of [
    '202610160001_accounts.sql',
    '202610160002_orders.sql',
    '202610160003_catalog.sql',
    '202610160004_review_tracking.sql',
    '202610160005_payment_confirmation_guard.sql',
    '202610160006_signup_email_check.sql',
    '202610170007_shared_cms.sql',
    '202610180008_hijab_checkout.sql',
  ]) {
    if (file === '202610170007_shared_cms.sql')
      await db.exec("update public.tb_m_product set price=444000,stock=7 where id='base-0-2'");
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
  }
  const owner = '11111111-1111-4111-8111-111111111111',
    buyer = '22222222-2222-4222-8222-222222222222';
  await db.query(
    `insert into auth.users(id,email) values($1,'owner@example.com'),($2,'buyer@example.com')`,
    [owner, buyer],
  );
  await db.query('insert into public.tb_m_admin values($1)', [owner]);
  const as = async (id) => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
    await db.exec(id ? 'set role authenticated' : 'set role anon');
  };
  const rpc = async (name, params = []) => {
    const args = params.map((_, i) => '$' + (i + 1)).join(',');
    return (await db.query(`select public.${name}(${args}) as data`, params)).rows[0].data;
  };
  await as(null);
  const initial = await rpc('tanj_cms_storefront');
  assert.equal(initial.settings.instagram, 'https://www.instagram.com/tanjofficial/');
  await assert.rejects(db.query('select * from public.tb_m_cms'));
  await assert.rejects(rpc('tanj_cms_admin'));
  await as(buyer);
  await assert.rejects(rpc('tanj_cms_publish', [1]));
  await assert.rejects(rpc('tanj_cms_admin'));
  await as(owner);
  let draft = await rpc('tanj_cms_admin');
  let item = draft.products[0];
  assert.equal(draft.products.find((p) => p.id === 'base-0-2').price, 444000);
  assert.equal(draft.products.find((p) => p.id === 'base-0-2').stock, 7);
  const hijab = draft.hijabs[0];
  draft = await rpc('tanj_cms_save', [
    'hijabs',
    hijab.id,
    { ...hijab, stock: 0, price: 300000 },
    draft.revision,
    null,
  ]);
  assert.equal((await rpc('tanj_cms_storefront')).hijabs[0].inStock, false);
  assert.equal((await rpc('tanj_cms_storefront')).hijabs[0].price, hijab.price);
  draft = await rpc('tanj_cms_save', [
    'products',
    item.id,
    { ...item, stock: 8, price: 888000 },
    draft.revision,
    item.stock,
  ]);
  let live = await rpc('tanj_cms_storefront');
  assert.equal(live.products[0].stock, 8);
  assert.equal(live.products[0].price, 687000);
  await assert.rejects(
    rpc('tanj_cms_save', [
      'products',
      item.id,
      { ...item, model: 'javascript:alert(1)' },
      draft.revision,
      8,
    ]),
  );
  draft = await rpc('tanj_cms_publish', [draft.revision]);
  live = await rpc('tanj_cms_storefront');
  assert.equal(live.products[0].price, 888000);
  const customer = {
    name: 'Buyer',
    phone: '081234567890',
    address: 'Alamat test',
    provinceId: '36',
    cityId: '36.71',
    districtId: '36.71.07',
    district: 'Karawaci',
    zip: '15115',
    paymentMethod: 'qris-manual',
    shippingMethod: 'jne-regular',
  };
  await as(buyer);
  const order = await rpc('tanj_create_order', [
    '44444444-4444-4444-8444-444444444444',
    customer,
    [{ id: item.id, qty: 2, price: 1 }],
  ]);
  assert.equal(order.subtotal, 1776000);
  await as(owner);
  draft = await rpc('tanj_cms_publish', [draft.revision]);
  live = await rpc('tanj_cms_storefront');
  assert.equal(live.products[0].stock, 6);
  await assert.rejects(
    rpc('tanj_cms_save', ['products', item.id, { ...item, stock: 9 }, draft.revision, 8]),
    /Stok berubah/,
  );
  const priorRevision = draft.revision;
  draft = await rpc('tanj_cms_save', [
    'settings',
    null,
    {
      ...draft.settings,
      maxQty: 1,
      paymentHours: 12,
      showStock: false,
      lookbookTitle: 'Edited title',
    },
    draft.revision,
    null,
  ]);
  assert.notEqual((await rpc('tanj_cms_storefront')).settings.lookbookTitle, 'Edited title');
  await assert.rejects(rpc('tanj_cms_publish', [priorRevision]), /Draf berubah/);
  await db.exec('reset role');
  await db.exec(
    `update public.tb_m_payment_settings set data=data||'{"qris":{"name":"existing"}}'::jsonb;`,
  );
  await as(owner);
  draft = await rpc('tanj_cms_publish', [draft.revision]);
  assert.equal((await rpc('tanj_cms_storefront')).settings.lookbookTitle, 'Edited title');
  const settings = (await db.query('select data from public.tb_m_payment_settings')).rows[0].data;
  assert.equal(settings.hours, 12);
  assert.equal(settings.qris.name, 'existing');
  await as(buyer);
  await assert.rejects(
    rpc('tanj_create_order', [
      '55555555-5555-4555-8555-555555555555',
      customer,
      [{ id: item.id, qty: 2 }],
    ]),
    /Qty melebihi/,
  );
  assert.equal((await rpc('tanj_cms_storefront')).products[0].stock, 6);
  await as(owner);
  draft = await rpc('tanj_cms_admin');
  draft = await rpc('tanj_cms_save', [
    'products',
    null,
    { ...draft.products[0], name: 'New item', stock: 3, price: 123000 },
    draft.revision,
    null,
  ]);
  const added = draft.products.at(-1);
  assert.ok(!(await rpc('tanj_cms_storefront')).products.some((p) => p.id === added.id));
  draft = await rpc('tanj_cms_publish', [draft.revision]);
  assert.ok((await rpc('tanj_cms_storefront')).products.some((p) => p.id === added.id));
  draft = await rpc('tanj_cms_remove', ['products', added.id, draft.revision]);
  await rpc('tanj_cms_publish', [draft.revision]);
  assert.ok(!(await rpc('tanj_cms_storefront')).products.some((p) => p.id === added.id));
  assert.equal(
    (await db.query('select active from public.tb_m_product where id=$1', [added.id])).rows[0]
      .active,
    false,
  );
  await as(buyer);
  const checkoutHijab = (await rpc('tanj_cms_storefront')).hijabs[1];
  const hijabOrder = await rpc('tanj_create_order', [
    '88888888-8888-4888-8888-888888888888',
    customer,
    [
      { id: checkoutHijab.id, qty: 1 },
      { id: item.id, qty: 1 },
    ],
  ]);
  assert.ok(hijabOrder);
  assert.equal((await rpc('tanj_cms_storefront')).hijabs[1].stock, checkoutHijab.stock - 1);
  await as(owner);
  draft = await rpc('tanj_cms_admin');
  await rpc('tanj_cms_publish', [draft.revision]);
  assert.equal((await rpc('tanj_cms_storefront')).hijabs[1].stock, checkoutHijab.stock - 1);
  assert.equal(
    (await db.query('select active from public.tb_m_product where id=$1', [checkoutHijab.id]))
      .rows[0].active,
    true,
  );
  console.log(
    'PASS: shared CMS admin-only writes, draft isolation, atomic publish, live stock, concurrent stock protection, trusted checkout price and qty limit, safe media, preserved QRIS and orders.',
  );
} finally {
  await db.close();
}
