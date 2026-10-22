import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { storageFixture } from './storage-fixture.mjs';

test('CMS hijab restocks live inventory, preserves reservations and rejects stale saves', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
    await storageFixture(db);
    for (const f of (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort())
      await db.exec(await readFile('supabase/migrations/' + f, 'utf8'));
    const owner = '11111111-1111-4111-8111-111111111111';
    await db.query("insert into auth.users(id,email) values($1,'admin@example.com')", [owner]);
    await db.query('insert into public.tb_m_admin values($1)', [owner]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await db.exec('set role authenticated');
    const objectPath = 'products/' + crypto.randomUUID() + '.jpg';
    await db.query("insert into storage.objects(bucket_id,name) values('cms-media',$1)", [
      objectPath,
    ]);
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('cms-media','unsafe.svg')"),
      /row-level security/,
    );
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      '22222222-2222-4222-8222-222222222222',
    ]);
    await db.exec('set role authenticated');
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('cms-media',$1)", [objectPath]),
      /row-level security/,
    );
    await db.exec('reset role');
    const bucket = (await db.query("select * from storage.buckets where id='cms-media'")).rows[0];
    assert.equal(bucket.file_size_limit, 5242880);
    assert.equal(bucket.public, true);
    assert.deepEqual(bucket.allowed_mime_types, ['image/jpeg', 'image/png', 'image/webp']);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await db.exec('set role authenticated');
    const rpc = async (name, params = []) =>
      (
        await db.query(
          `select public.${name}(${params.map((_, i) => '$' + (i + 1)).join(',')}) d`,
          params,
        )
      ).rows[0].d;
    let draft = await rpc('tanj_cms_admin');
    const h = draft.hijabs[0];
    draft = await rpc('tanj_cms_save', [
      'hijabs',
      h.id,
      { ...h, stock: 3, price: 11000 },
      draft.revision,
      h.stock,
    ]);
    assert.equal(draft.hijabs[0].stock, 3);
    let live = await rpc('tanj_cms_storefront');
    assert.equal(live.hijabs[0].stock, 3);
    assert.equal(live.hijabs[0].price, h.price, 'price remains unpublished');
    draft = await rpc('tanj_cms_publish', [draft.revision]);
    assert.equal((await rpc('tanj_cms_storefront')).hijabs[0].price, 11000);
    await db.exec('reset role');
    await db.query('update public.tb_m_product set stock=2 where id=$1', [h.id]);
    await db.exec('set role authenticated');
    await assert.rejects(
      rpc('tanj_cms_save', ['hijabs', h.id, { ...h, stock: 3 }, draft.revision, 3]),
      /Stok berubah/,
    );
    draft = await rpc('tanj_cms_admin');
    // Replenishing to the old draft's value must still update the live quantity.
    draft = await rpc('tanj_cms_save', [
      'hijabs',
      h.id,
      { ...draft.hijabs[0], stock: 3 },
      draft.revision,
      2,
    ]);
    assert.equal(draft.hijabs[0].stock, 3);
    await db.exec('reset role');
    await db.query('update public.tb_m_product set stock=1 where id=$1', [h.id]);
    await db.exec('set role authenticated');
    await rpc('tanj_cms_publish', [draft.revision]);
    live = await rpc('tanj_cms_storefront');
    assert.equal(live.hijabs[0].stock, 1, 'publishing cannot reset stock held by orders');
    assert.equal(live.hijabs[0].inStock, true);
    draft = await rpc('tanj_cms_admin');
    const newItem = {
      name: 'Pashmina Olive',
      collection: 'pashmina',
      color: 'olive',
      price: 125000,
      stock: 3,
      image: 'assets/hijab-selcuk-brown.webp',
      status: 'draft',
    };
    draft = await rpc('tanj_cms_save', ['hijabs', null, newItem, draft.revision, null]);
    const created = draft.hijabs.find((item) => item.name === newItem.name);
    assert.ok(created.id);
    assert.equal(created.stock, 3);
    draft = await rpc('tanj_cms_publish', [draft.revision]);
    assert.equal(
      (await rpc('tanj_cms_storefront')).hijabs.some((item) => item.id === created.id),
      false,
    );
    draft = await rpc('tanj_cms_save', [
      'hijabs',
      created.id,
      { ...newItem, status: 'published' },
      draft.revision,
      3,
    ]);
    await rpc('tanj_cms_publish', [draft.revision]);
    const published = (await rpc('tanj_cms_storefront')).hijabs.find(
      (item) => item.id === created.id,
    );
    assert.equal(published.stock, 3);
    assert.equal(published.price, 125000);
    assert.equal(published.inStock, true);
  } finally {
    await db.close();
  }
});
