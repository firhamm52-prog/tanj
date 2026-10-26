import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { storageFixture } from './storage-fixture.mjs';
import { validate } from '../shared/validation.js';
import { emailTemplateParams } from '../web/emailjs-delivery.js';

test('published discounts drive checkout totals, snapshot savings and preserve live inventory', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
    await storageFixture(db);
    for (const f of (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort())
      await db.exec(await readFile('supabase/migrations/' + f, 'utf8'));
    const uid = '11111111-1111-4111-8111-111111111111';
    await db.query("insert into auth.users(id,email) values($1,'test@example.com')", [uid]);
    await db.query('insert into public.tb_m_admin values($1)', [uid]);
    const videoPath = 'content/' + crypto.randomUUID() + '.mp4';
    const bucket = (await db.query("select * from storage.buckets where id='cms-videos'")).rows[0];
    assert.equal(Number(bucket.file_size_limit), 52428800);
    assert.deepEqual(bucket.allowed_mime_types, ['video/mp4', 'video/webm']);
    await db.query(
      "select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false)",
    );
    await db.exec('set role authenticated');
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('cms-videos',$1)", [videoPath]),
      /row-level security/,
    );
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
    const rpc = async (name, args = []) =>
      (
        await db.query(
          `select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) d`,
          args,
        )
      ).rows[0].d;
    let draft = await rpc('tanj_cms_admin');
    const product = draft.products[0];
    const item = validate('products', {
      ...product,
      price: 100000,
      discountAmount: 25000,
      stock: 10,
      status: 'published',
      gallery: ['assets/look-2.webp', 'assets/campaign-beige.webp'],
    });
    assert.throws(() => validate('products', { ...item, discountAmount: 100000 }), /lebih kecil/);
    assert.throws(
      () => validate('products', { ...item, gallery: ['javascript:alert(1)'] }),
      /HTTPS/,
    );
    assert.throws(
      () => validate('products', { ...item, gallery: Array(11).fill('assets/look-2.webp') }),
      /10 foto/,
    );
    await db.exec('set role authenticated');
    await db.query("insert into storage.objects(bucket_id,name) values('cms-videos',$1)", [
      videoPath,
    ]);
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('cms-videos','content/bad.html')",
      ),
      /row-level security/,
    );
    await assert.rejects(
      rpc('tanj_cms_save', [
        'products',
        product.id,
        { ...item, gallery: ['javascript:alert(1)'] },
        draft.revision,
        product.stock,
      ]),
      /galeri/,
    );
    await assert.rejects(
      rpc('tanj_cms_save', [
        'products',
        product.id,
        { ...item, discountAmount: 100000 },
        draft.revision,
        product.stock,
      ]),
      /lebih kecil/,
    );
    draft = await rpc('tanj_cms_save', [
      'products',
      product.id,
      item,
      draft.revision,
      product.stock,
    ]);
    assert.equal(
      (await rpc('tanj_cms_storefront')).products.find((p) => p.id === product.id).price,
      product.price,
    );
    await rpc('tanj_cms_publish', [draft.revision]);
    const published = (await rpc('tanj_cms_storefront')).products.find((p) => p.id === product.id);
    assert.equal(published.price, 75000);
    assert.equal(published.originalPrice, 100000);
    assert.deepEqual(published.gallery, item.gallery);
    await db.exec('reset role');
    assert.equal(
      (await db.query('select price from public.tb_m_product where id=$1', [product.id])).rows[0]
        .price,
      75000,
    );
    const quote = crypto.randomUUID();
    const destination = { provinceId: '36', cityId: '36.71', districtId: '36.71.07', zip: '15115' };
    const option = {
      id: 'biteship:jne:reg',
      name: 'JNE',
      service: 'REG',
      courier: 'jne',
      serviceCode: 'reg',
      fee: 35000,
    };
    const lines = [{ id: product.id, qty: 2 }];
    await db.query(
      "insert into public.tb_t_shipping_quote(id,account_id,destination,lines,options,expires_at) values($1,$2,$3,$4,$5,now()+interval '10 minutes')",
      [quote, uid, destination, lines, [option]],
    );
    await db.exec('set role authenticated');
    const args = [
      crypto.randomUUID(),
      {
        ...destination,
        name: 'Buyer',
        address: 'Jalan Test',
        phone: '081200000000',
        paymentMethod: 'midtrans',
        paymentChannel: 'va',
        shippingMethod: option.id,
        shippingQuoteId: quote,
        total: 1,
      },
      lines,
    ];
    const order = await rpc('tanj_create_order', args);
    assert.equal(order.subtotal, 150000);
    assert.equal(order.originalSubtotal, 200000);
    assert.equal(order.productDiscount, 50000);
    assert.equal(order.shipping.subsidy, 0);
    assert.equal(order.total, 185000);
    assert.equal(order.items[0].originalPrice, 100000);
    assert.deepEqual(await rpc('tanj_create_order', args), order);
    const params = emailTemplateParams(order, 'https://example.com/tanj/');
    assert.equal(params.product_discount, 'Rp50.000');
    assert.equal(params.shipping_discount, 'Rp0');
    await rpc('tanj_midtrans_prepare', [order.id]);
    const reservedOrder = await rpc('tanj_create_order', args);
    draft = await rpc('tanj_cms_admin');
    const current = draft.products.find((p) => p.id === product.id);
    draft = await rpc('tanj_cms_save', [
      'products',
      product.id,
      { ...item, discountAmount: 0, stock: current.stock },
      draft.revision,
      current.stock,
    ]);
    await rpc('tanj_cms_publish', [draft.revision]);
    const full = (await rpc('tanj_cms_storefront')).products.find((p) => p.id === product.id);
    assert.equal(full.price, 100000);
    assert.equal(full.stock, 8);
    assert.deepEqual(
      await rpc('tanj_create_order', args),
      reservedOrder,
      'old orders keep the accepted price',
    );
  } finally {
    await db.close();
  }
});
