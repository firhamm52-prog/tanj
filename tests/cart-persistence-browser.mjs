import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { freshSeed, storefront } from '../shared/seed.js';
const root = process.cwd(),
  key = 'noireaterial-cart-v1';
let unavailable = false,
  soldOut = false,
  context;
const doc = storefront(freshSeed());
doc.products = [
  { ...doc.products[0], id: 'cart-test-custom', name: 'Persistent Dress', stock: 5, inStock: true },
];
const user = {
  id: crypto.randomUUID(),
  email: 'cart@example.com',
  user_metadata: { full_name: 'Cart buyer' },
  aud: 'authenticated',
  role: 'authenticated',
};
const session = {
  access_token: [
    { alg: 'HS256', typ: 'JWT' },
    { sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
    'fake',
  ]
    .map((v) => (typeof v === 'string' ? v : Buffer.from(JSON.stringify(v)).toString('base64url')))
    .join('.'),
  refresh_token: 'test',
  expires_in: 3600,
  token_type: 'bearer',
  user,
};
const server = createServer(async (req, res) => {
  try {
    const p = new URL(req.url, 'http://localhost').pathname;
    const f = resolve(root, '.' + (p === '/' ? '/index.html' : p));
    if (!f.startsWith(root + sep)) throw Error();
    res.setHeader(
      'Content-Type',
      { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(f)] ||
        'application/octet-stream',
    );
    res.end(await readFile(f));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
await mkdir('test-results', { recursive: true });
const profile = await mkdtemp(resolve('test-results/cart-profile-'));
const url = `http://127.0.0.1:${server.address().port}/`;
async function launch() {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() =>
    sessionStorage.setItem('tanj-account-invitation-dismissed-v1', 'yes'),
  );
  await context.route('https://api.emailjs.com/**', (r) => r.abort());
  await context.route('**/web/email-config.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'export const emailConfig={enabled:false};',
    }),
  );
  await context.route('**/web/supabase-config.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'export const supabaseConfig={enabled:true,url:"https://cloud.test",publishableKey:"public"};',
    }),
  );
  await context.route('https://cloud.test/**', async (r) => {
    const p = new URL(r.request().url()).pathname;
    let body = {},
      status = 200;
    if (p === '/rest/v1/rpc/tanj_cms_storefront') {
      if (unavailable) {
        status = 503;
        body = { code: 'OFFLINE_TEST', message: 'Catalog temporarily unavailable' };
      } else {
        body = structuredClone(doc);
        if (soldOut) {
          body.products[0].stock = 0;
          body.products[0].inStock = false;
        }
      }
    } else if (p === '/auth/v1/token') body = session;
    else if (p === '/rest/v1/rpc/tanj_is_admin') body = false;
    else if (p === '/rest/v1/tb_m_address' || p === '/rest/v1/tb_t_order') body = [];
    else if (p === '/rest/v1/tb_m_payment_settings') body = { data: { hours: 2, admin: 'TANJ' } };
    else if (p.endsWith('/config')) body = { enabled: false, orderReady: false };
    else {
      status = 404;
      body = { message: p };
    }
    await r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => {
    throw e;
  });
  return page;
}
async function check(page) {
  await page.locator('#bag-badge').filter({ hasText: '1' }).waitFor();
  assert.equal(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k))[0]?.id, key),
    'cart-test-custom',
  );
}
try {
  let p = await launch();
  await p.goto(url);
  await p.locator('[data-product-id="cart-test-custom"] .product-preview').click();
  await p.locator('#product-add').click();
  await check(p);
  await p.reload();
  await check(p);
  await p.locator('[data-account-open]').click();
  await p.locator('#customer-auth [name=email]').fill(user.email);
  await p.locator('#customer-auth [name=password]').fill('cart-password-123');
  await p.locator('#customer-auth [type=submit]').click();
  await p.locator('#customer-account').waitFor({ state: 'hidden' });
  await check(p);
  await context.close();
  context = null;
  p = await launch();
  await p.goto(url);
  await check(p);
  unavailable = true;
  await p.reload();
  await check(p);
  await p.locator('#bag-open').click();
  await p.locator('#bag-items').filter({ hasText: 'Persistent Dress' }).waitFor();
  assert.equal(await p.locator('#bag-next').isDisabled(), true);
  unavailable = false;
  soldOut = true;
  await p.reload();
  await check(p);
  await p.locator('#bag-open').click();
  assert.equal(await p.locator('#bag-next').isDisabled(), true);
  soldOut = false;
  await p.reload();
  await check(p);
  await p.locator('#bag-open').click();
  assert.equal(await p.locator('#bag-next').isEnabled(), true);
  await p.locator('.bag-remove').click();
  assert.deepEqual(await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key), []);
  console.log(
    'PASS: cart survives refresh, explicit login, actual browser close/reopen, catalog outage and sold-out stock; recovery restores checkout and explicit removal still clears it. No real emails/accounts/orders.',
  );
} finally {
  await context?.close();
  await new Promise((r) => server.close(r));
}
