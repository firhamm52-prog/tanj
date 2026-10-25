import { PGlite } from '@electric-sql/pglite';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { storageFixture } from './storage-fixture.mjs';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const db = new PGlite(),
  root = process.cwd();
let browser;
const owner = '11111111-1111-4111-8111-111111111111',
  buyer = '22222222-2222-4222-8222-222222222222';
const server = createServer(async (req, res) => {
  try {
    let path = new URL(req.url, 'http://localhost').pathname;
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root)) throw Error();
    res.setHeader(
      'Content-Type',
      { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' }[
        extname(file)
      ] || 'application/octet-stream',
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
try {
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  await storageFixture(db);
  for (const file of (await readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
  await db.query(
    `insert into auth.users(id,email) values($1,'owner@example.com'),($2,'buyer@example.com')`,
    [owner, buyer],
  );
  await db.query('insert into public.tb_m_admin values($1)', [owner]);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  let queue = Promise.resolve();
  let rejectUpload = true;
  const photoBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=',
    'base64',
  );
  const errors = [];
  const rpcArgs = {
    tanj_is_admin: [],
    tanj_cms_storefront: [],
    tanj_cms_admin: [],
    tanj_cms_save: ['kind', 'content_id', 'item', 'expected_revision', 'expected_stock'],
    tanj_cms_remove: ['kind', 'content_id', 'expected_revision'],
    tanj_cms_publish: ['expected_revision'],
  };
  async function device() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    let current = null;
    await context.route('**/web/supabase-config.js?*', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: 'export const supabaseConfig={enabled:true,url:"https://cms.test",publishableKey:"public-test"};',
      }),
    );
    await context.route('https://api.emailjs.com/**', (r) => r.abort());
    await context.route('https://cms.test/**', async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      if (path.startsWith('/storage/v1/object/public/cms-media/')) {
        return route.fulfill({ status: 200, contentType: 'image/png', body: photoBytes });
      }
      if (path.startsWith('/storage/v1/object/cms-media/')) {
        const denied = current?.id !== owner || rejectUpload;
        rejectUpload = false;
        return route.fulfill({
          status: denied ? 403 : 200,
          contentType: 'application/json',
          body: JSON.stringify(
            denied
              ? { error: 'Unauthorized', message: 'Upload denied', statusCode: '403' }
              : { Key: path.replace('/storage/v1/object/', ''), Id: crypto.randomUUID() },
          ),
        });
      }
      let body = {},
        status = 200;
      if (path === '/auth/v1/token') {
        const input = request.postDataJSON();
        if (input.password !== 'test-password-123') {
          status = 400;
          body = { code: 'invalid_credentials', msg: 'Invalid login credentials' };
        } else {
          current = {
            id: input.email === 'owner@example.com' ? owner : buyer,
            email: input.email,
            user_metadata: { full_name: 'Test' },
            aud: 'authenticated',
            role: 'authenticated',
          };
          const token = [
            { alg: 'HS256', typ: 'JWT' },
            { sub: current.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' },
            'fake',
          ]
            .map((x) =>
              typeof x === 'string' ? x : Buffer.from(JSON.stringify(x)).toString('base64url'),
            )
            .join('.');
          body = {
            access_token: token,
            refresh_token: 'refresh-test',
            expires_in: 3600,
            token_type: 'bearer',
            user: current,
          };
        }
      } else if (path === '/auth/v1/logout') {
        current = null;
        status = 204;
      } else if (path === '/auth/v1/user') body = current;
      else if (path.startsWith('/rest/v1/rpc/')) {
        const name = path.split('/').at(-1),
          keys = rpcArgs[name];
        if (!keys) {
          status = 404;
          body = { message: 'Unknown RPC' };
        } else {
          const input = request.postDataJSON() || {},
            values = keys.map((k) => input[k] ?? null);
          const task = queue.then(async () => {
            await db.exec('reset role');
            await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
              current?.id || '',
            ]);
            await db.exec(current ? 'set role authenticated' : 'set role anon');
            return (
              await db.query(
                `select public.${name}(${values.map((_, i) => '$' + (i + 1)).join(',')}) as data`,
                values,
              )
            ).rows[0].data;
          });
          queue = task.catch(() => {});
          try {
            body = await task;
          } catch (error) {
            status = 400;
            body = { message: error.message };
          }
        }
      } else if (path === '/rest/v1/tb_m_payment_settings')
        body = { data: { hours: 24, admin: 'TANJ' } };
      else if (path === '/rest/v1/tb_t_order' || path === '/rest/v1/tb_m_address') body = [];
      else {
        status = 404;
        body = { message: path };
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: status === 204 ? '' : JSON.stringify(body),
      });
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    return { page, context };
  }
  const admin = await device();
  await admin.page.goto(url + 'admin/');
  await admin.page.locator('#login-form [name=email]').fill('owner@example.com');
  await admin.page.locator('#login-form [name=password]').fill('test-password-123');
  await admin.page.locator('#login-form [type=submit]').click();
  await admin.page.locator('#app').waitFor({ state: 'visible' });
  const customer = await device();
  await customer.page.goto(url);
  await customer.page.locator('.tanj-chat').waitFor();
  assert.match(await customer.page.locator('.card').first().textContent(), /Rp687.000/);
  await admin.page.locator('#navigation [data-tab=products]').click();
  await admin.page.locator('[data-kind=products][data-action=edit]').first().click();
  await admin.page.locator('#edit-form [name=price]').fill('777000');
  await admin.page.locator('#edit-form [name=stock]').fill('5');
  await admin.page.locator('#edit-form [type=submit]:not([name=publish])').click();
  await admin.page.locator('#editor').waitFor({ state: 'hidden' });
  await customer.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await customer.page.locator('.card-stock').first().filter({ hasText: 'Stok: 5' }).waitFor();
  assert.match(await customer.page.locator('.card').first().textContent(), /Rp687.000/);
  admin.page.on('dialog', (dialog) => dialog.accept());
  await admin.page.locator('#publish').click();
  await admin.page.locator('#toast').filter({ hasText: 'Website berhasil' }).waitFor();
  await customer.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await customer.page.locator('.card .price').first().filter({ hasText: 'Rp777.000' }).waitFor();
  await admin.page.locator('#navigation [data-tab=hijabs]').click();
  await admin.page.locator('[data-kind=hijabs][data-action=edit]').first().click();
  await admin.page.locator('#edit-form [name=price]').fill('11500000');
  await admin.page.locator('#edit-form [name=publish]').click();
  await admin.page.locator('#editor').waitFor({ state: 'hidden' });
  await admin.page.locator('#toast').filter({ hasText: 'sudah dipublikasikan' }).waitFor();
  // No focus/refresh: the open buyer page must update by itself.
  await customer.page
    .locator('.hijab-price')
    .first()
    .filter({ hasText: 'Rp11.500.000' })
    .waitFor({ state: 'attached' });
  // New hijab in a new collection: draft hidden, then publish into an already-open buyer tab.
  await admin.page.locator('[data-action=new][data-kind=hijabs]').click();
  await admin.page.locator('#edit-form [name=name]').fill('Pashmina Olive');
  await admin.page.locator('#edit-form [name=collection]').fill('pashmina');
  await admin.page.locator('#edit-form [name=color]').fill('olive');
  await admin.page.locator('#edit-form [name=price]').fill('125000');
  await admin.page.locator('#edit-form [name=stock]').fill('3');
  const uploadPicker = admin.page.locator('[data-upload-target=image]');
  const photoFile = { name: 'device-photo.png', mimeType: 'image/png', buffer: photoBytes };
  await uploadPicker.setInputFiles(photoFile);
  await admin.page.getByRole('button', { name: 'Pakai foto & upload', exact: true }).click();
  await admin.page.locator('#editor-error').filter({ hasText: 'Foto gagal diunggah' }).waitFor();
  assert.equal(await admin.page.locator('#edit-form [name=image]').inputValue(), '');
  await uploadPicker.setInputFiles(photoFile);
  await admin.page.getByRole('button', { name: 'Pakai foto & upload', exact: true }).click();
  await admin.page
    .locator('.upload-control [role=status]')
    .filter({ hasText: 'Foto terunggah' })
    .waitFor();
  const uploadedUrl = await admin.page.locator('#edit-form [name=image]').inputValue();
  assert.match(
    uploadedUrl,
    /^https:\/\/cms.test\/storage\/v1\/object\/public\/cms-media\/products\//,
  );
  await admin.page.locator('.upload-preview').waitFor({ state: 'visible' });
  await admin.page.locator('#edit-form [type=submit]:not([name=publish])').click();
  await admin.page.locator('#editor').waitFor({ state: 'hidden' });
  await admin.page.locator('#publish').click();
  await admin.page.locator('#toast').filter({ hasText: 'Website berhasil' }).waitFor();
  await customer.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  assert.equal(
    await customer.page.locator('.hijab-card').filter({ hasText: 'Pashmina Olive' }).count(),
    0,
  );
  await admin.page
    .locator('tr')
    .filter({ hasText: 'Pashmina Olive' })
    .locator('[data-action=edit]')
    .click();
  await admin.page.locator('#edit-form [name=status]').selectOption('published');
  await admin.page.locator('#edit-form [name=publish]').click();
  await admin.page.locator('#editor').waitFor({ state: 'hidden' });
  const newHijab = customer.page.locator('.hijab-card').filter({ hasText: 'Pashmina Olive' });
  await newHijab.waitFor({ state: 'attached' });
  assert.match(await newHijab.textContent(), /Rp125.000/);
  assert.equal(await newHijab.locator('img').getAttribute('src'), uploadedUrl);
  await customer.page.goto(url + '#all-products/scarves');
  await newHijab.waitFor({ state: 'visible' });
  await newHijab.locator('a').click();
  await customer.page.locator('#product-modal').waitFor({ state: 'visible' });
  assert.match(await customer.page.locator('#product-modal').textContent(), /Pashmina Olive/);
  await customer.page.goto(url);
  // Clothing creation uses the same CMS stock controller.
  await admin.page.locator('[data-tab=products]').click();
  await admin.page.locator('[data-action=new][data-kind=products]').click();
  await admin.page.locator('#edit-form [name=name]').fill('New Outer Olive');
  await admin.page.locator('#edit-form [name=colorName]').fill('Olive');
  await admin.page.locator('#edit-form [name=price]').fill('250000');
  await admin.page.locator('#edit-form summary').filter({ hasText: 'Atur Diskon Produk' }).click();
  await admin.page.locator('#edit-form [name=discountAmount]').fill('50000');
  await admin.page.locator('#edit-form [name=stock]').fill('3');
  await admin.page.locator('#edit-form [name=status]').selectOption('published');
  await admin.page.locator('#edit-form [name=publish]').click();
  await admin.page.locator('#editor').waitFor({ state: 'hidden' });
  await customer.page
    .locator('.card')
    .filter({ hasText: 'New Outer Olive' })
    .waitFor({ state: 'attached' });
  const discountedCard = customer.page.locator('.card').filter({ hasText: 'New Outer Olive' });
  await discountedCard.locator('.price del').waitFor({ state: 'attached' });
  assert.match(await discountedCard.locator('.price del').textContent(), /250/);
  assert.match(await discountedCard.locator('.price').textContent(), /200/);
  await admin.page.locator('[data-tab=site]').click();
  await admin.page.locator('[data-kind=settings]').click();
  await admin.page.locator('#edit-form [name=maxQty]').fill('2');
  await admin.page.locator('#edit-form [name=showStock]').uncheck();
  await admin.page.locator('#edit-form [name=lookbookTitle]').fill('A shared collection');
  await admin.page.locator('#edit-form [name=qrisWidth]').fill('240');
  await admin.page.locator('#edit-form [name=recommendations]').fill('1');
  await admin.page.locator('#edit-form [type=submit]:not([name=publish])').click();
  await admin.page.locator('#editor').waitFor({ state: 'hidden' });
  await admin.page.locator('#publish').click();
  await admin.page.locator('#toast').filter({ hasText: 'Website berhasil' }).waitFor();
  await customer.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await customer.page
    .locator('.moving-intro h2')
    .filter({ hasText: 'A shared collection' })
    .waitFor();
  assert.equal(await customer.page.locator('.card-stock').first().isVisible(), false);
  assert.equal(
    await customer.page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--qris-width').trim(),
    ),
    '240px',
  );
  await customer.page.locator('.product-preview').first().click();
  await customer.page.locator('#product-plus').click();
  assert.equal(await customer.page.locator('#product-plus').isDisabled(), true);
  assert.equal(await customer.page.locator('#product-quantity').textContent(), '2');
  await customer.page.locator('#product-add').click();
  assert.equal(
    await customer.page.locator('#cart-recommendations [data-recommended-id]').count(),
    1,
  );
  await mkdir('test-results', { recursive: true });
  await admin.page.screenshot({ path: 'test-results/cms-online-settings.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: actual PostgreSQL CMS RPCs through official SDK, admin UI save/publish, independent customer tab updates, live stock/draft price isolation, site settings, cart recommendation count and max qty.',
  );
} finally {
  await browser?.close();
  if (server.listening) await new Promise((r) => server.close(r));
  await db.close();
}
