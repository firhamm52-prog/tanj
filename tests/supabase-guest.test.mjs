import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { storageFixture } from './storage-fixture.mjs';

test('Supabase guest checkout validates contact, isolates ownership and preserves server totals', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,email text,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
    await storageFixture(db);
    for (const f of (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort())
      await db.exec(await readFile('supabase/migrations/' + f, 'utf8'));
    const guest = crypto.randomUUID(),
      other = crypto.randomUUID();
    await db.query('insert into auth.users(id,is_anonymous) values($1,true)', [guest]);
    await db.query("insert into auth.users(id,email) values($1,'registered@example.com')", [other]);
    const product = (
      await db.query(
        'select id,price,stock from public.tb_m_product where active and stock>1 limit 1',
      )
    ).rows[0];
    const destination = { provinceId: '36', cityId: '36.71', districtId: '36.71.07', zip: '15115' };
    const lines = [{ id: product.id, qty: 1 }];
    const option = {
      id: 'biteship:jne:reg',
      name: 'JNE',
      service: 'REG',
      courier: 'jne',
      serviceCode: 'reg',
      fee: 35000,
    };
    async function argsFor(uid) {
      const quote = crypto.randomUUID();
      await db.exec('reset role');
      await db.query(
        "insert into public.tb_t_shipping_quote(id,account_id,destination,lines,options,expires_at) values($1,$2,$3,$4,$5,now()+interval '10 minutes')",
        [quote, uid, destination, lines, [option]],
      );
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
      await db.exec('set role authenticated');
      return [
        crypto.randomUUID(),
        {
          ...destination,
          name: 'Buyer',
          address: 'Jalan Test',
          phone: '081234567890',
          email: 'guest@example.com',
          paymentMethod: 'midtrans',
          paymentChannel: 'va',
          shippingMethod: option.id,
          shippingQuoteId: quote,
          total: 1,
        },
        lines,
      ];
    }
    const create = (args) =>
      db.query('select public.tanj_create_order($1,$2,$3) d', args).then((r) => r.rows[0].d);
    const args = await argsFor(guest);
    await assert.rejects(create([args[0], { ...args[1], email: '' }, lines]), /email/);
    await assert.rejects(create([args[0], { ...args[1], phone: 'abcdefgh' }, lines]), /nomor HP/);
    assert.equal((await db.query('select count(*)::int n from public.tb_t_order')).rows[0].n, 0);
    const order = await create(args);
    assert.equal(order.customer.email, 'guest@example.com');
    assert.equal(order.orderNumber, 'TANJ-000001');
    assert.equal(order.id, 'TANJ-' + args[0].toUpperCase());
    assert.equal(order.total, Number(product.price) + 15000);
    assert.equal(order.shipping.subsidy, 20000);
    assert.deepEqual(await create(args), order);
    await assert.rejects(
      db.query("select nextval('public.tanj_order_number_seq')"),
      /permission denied/,
    );
    await assert.rejects(
      db.query('select public.tanj_create_order_before_guest($1,$2,$3)', args),
      /permission denied/,
    );
    const registeredArgs = await argsFor(other);
    assert.equal(
      (await db.query('select count(*)::int n from public.tb_t_order')).rows[0].n,
      0,
      'other account cannot read guest orders',
    );
    const registered = await create(registeredArgs);
    assert.equal(
      registered.customer.email,
      'registered@example.com',
      'customer cannot replace account email',
    );
    assert.equal(registered.orderNumber, 'TANJ-000002');
    await assert.rejects(create(args), /pesanan|quote|ongkir|pengiriman/i);
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int n from public.tb_t_order')).rows[0].n, 2);
    assert.equal(
      (await db.query('select stock from public.tb_m_product where id=$1', [product.id])).rows[0]
        .stock,
      product.stock,
      'Midtrans reserves stock at prepare, unchanged by contact validation',
    );
  } finally {
    await db.close();
  }
});
