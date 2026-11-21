import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { collectionCopy } from '../shared/collection-copy.js';

test('legacy collection adapter never overwrites product-specific copy', () => {
  const state = {
    collections: [{ id: 'base-3', name: 'Flow Dress Belted', description: 'Old copy' }],
    products: [
      {
        id: 'base-3-0',
        collectionId: 'base-3',
        name: 'Cream',
        description: 'Deskripsi khusus varian Cream.',
      },
    ],
  };
  const result = collectionCopy(state);
  assert.equal(result.collections[0].name, 'TANJ Sera');
  assert.equal(result.products[0].description, 'Deskripsi khusus varian Cream.');
});

test('migration 034 persists collection names and copy without changing other CMS content', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.tb_m_cms(
        id boolean primary key,
        draft jsonb not null,
        published jsonb not null,
        revision integer not null
      );
    `);
    const document = {
      collections: [
        { id: 'base-0', name: 'Embroidered Outer', description: 'Old' },
        { id: 'base-1', name: 'Everyday Drape Outer', description: 'Old' },
        { id: 'base-2', name: 'Flow Dress', description: 'Keep me' },
        { id: 'base-3', name: 'Flow Dress Belted', description: 'Old' },
      ],
      products: [
        { id: 'base-3-0', collectionId: 'base-3', gallery: ['https://example.com/new.webp'] },
      ],
      settings: { keep: true },
    };
    await db.query(
      'insert into public.tb_m_cms(id,draft,published,revision) values(true,$1,$1,10)',
      [JSON.stringify(document)],
    );
    const migration = await readFile(
      'supabase/migrations/202611210034_persist_collection_names.sql',
      'utf8',
    );
    await db.exec(migration);
    let row = (await db.query('select * from public.tb_m_cms where id')).rows[0];
    assert.deepEqual(
      row.published.collections.map((item) => item.name),
      ['TANJ Lira', 'TANJ Runa', 'Flow Dress', 'TANJ Sera'],
    );
    assert.equal(row.published.collections[2].description, 'Keep me');
    assert.deepEqual(row.published.products[0].gallery, ['https://example.com/new.webp']);
    assert.equal(row.published.products[0].description.startsWith('Outer panjang'), true);
    assert.equal(row.published.settings.keep, true);
    assert.equal(row.revision, 11);

    await db.exec(migration);
    row = (await db.query('select revision from public.tb_m_cms where id')).rows[0];
    assert.equal(row.revision, 11, 'running the migration again is a no-op');
  } finally {
    await db.close();
  }
});
