import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { freshSeed, storefront } from '../shared/seed.js';
import { orderPaymentUrl } from '../shared/order-email.js';
const root = process.cwd(),
  token = 'a'.repeat(64),
  oid = 'TANJ-11111111-1111-4111-8111-111111111111';
const order = {
  id: oid,
  orderNumber: 'TANJ-000001',
  customerId: crypto.randomUUID(),
  guestAccessToken: token,
  customer: {
    name: 'Guest buyer',
    email: 'guest@example.com',
    phone: '081234567890',
    address: 'Jalan Test',
  },
  items: [{ id: 'base-0-0', name: 'Dress', color: 'Cream', qty: 1, price: 100000 }],
  shipping: { fee: 35000, methodName: 'JNE' },
  payment: { provider: 'midtrans', channel: 'qris', name: 'QRIS' },
  subtotal: 100000,
  total: 135000,
  adjustment: 0,
  status: 'WAITING_PAYMENT',
  version: 1,
  createdAt: Date.now(),
  deadline: Date.now() + 3600000,
  logs: [],
  proofs: [],
};
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const f = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!f.startsWith(root + sep)) throw Error();
    res.setHeader(
      'Content-Type',
      { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' }[extname(f)] ||
        'application/octet-stream',
    );
    res.end(await readFile(f));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  async function device(valid = true) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const viewer = crypto.randomUUID();
    let allowed = false;
    const counts = { signup: 0, login: 0, redeem: 0, start: 0 };
    await c.route('https://api.emailjs.com/**', (r) => r.abort());
    await c.route('**/web/email-config.js?*', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: 'export const emailConfig={enabled:false};',
      }),
    );
    await c.route('**/web/supabase-config.js?*', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: 'export const supabaseConfig={enabled:true,url:"https://cloud.test",publishableKey:"public"};',
      }),
    );
    await c.route('https://app.sandbox.midtrans.com/snap/snap.js', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: 'window.snap={embed(t,o){document.getElementById(o.embedId).innerHTML=\'<iframe title="QRIS dan VA"></iframe>\';},hide(){}};',
      }),
    );
    await c.route('https://cloud.test/**', async (r) => {
      const path = new URL(r.request().url()).pathname;
      let body = {},
        status = 200;
      if (path === '/auth/v1/signup') {
        counts.signup++;
        body = {
          access_token: [
            { alg: 'HS256', typ: 'JWT' },
            { sub: viewer, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
            'fake',
          ]
            .map((x) =>
              typeof x === 'string' ? x : Buffer.from(JSON.stringify(x)).toString('base64url'),
            )
            .join('.'),
          refresh_token: 'test',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: viewer,
            is_anonymous: true,
            role: 'authenticated',
            aud: 'authenticated',
            user_metadata: {},
          },
        };
      } else if (path === '/auth/v1/token') {
        counts.login++;
        throw Error('Guest link must not require account login');
      } else if (path === '/rest/v1/rpc/tanj_checkout_capabilities')
        body = { guestCheckout: true, version: 29 };
      else if (path === '/rest/v1/rpc/tanj_redeem_guest_order_link') {
        counts.redeem++;
        const p = r.request().postDataJSON();
        if (valid && p.oid === oid && p.access_token === token) {
          allowed = true;
          body = order;
        } else {
          status = 400;
          body = { message: 'Tautan pesanan tidak valid atau kedaluwarsa.' };
        }
      } else if (path === '/rest/v1/rpc/tanj_cms_storefront') body = storefront(freshSeed());
      else if (path === '/rest/v1/rpc/tanj_is_admin') body = false;
      else if (path === '/rest/v1/tb_m_payment_settings')
        body = { data: { hours: 2, admin: 'TANJ' } };
      else if (path === '/rest/v1/tb_t_order') body = allowed ? [{ data: order }] : [];
      else if (path === '/functions/v1/shipping/config') body = { enabled: false };
      else if (path === '/functions/v1/midtrans/config')
        body = { enabled: true, production: false };
      else if (path === '/functions/v1/midtrans/start') {
        assert.ok(allowed);
        assert.equal(r.request().postDataJSON().orderId, oid);
        counts.start++;
        body = {
          snapToken: 'fake-token',
          clientKey: 'fake-public',
          production: false,
          redirectUrl: 'https://app.sandbox.midtrans.com/snap/v3/redirection/fake-token',
        };
      } else if (path === '/functions/v1/midtrans/status') body = { status: 'WAITING_PAYMENT' };
      else if (path === '/rest/v1/tb_m_address') body = [];
      else {
        status = 404;
        body = { message: path };
      }
      await r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const p = await c.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(orderPaymentUrl(`http://127.0.0.1:${server.address().port}/`, oid, token));
    return { c, p, counts, errors };
  }
  const first = await device();
  await first.p.getByTitle('QRIS dan VA').waitFor();
  assert.equal(await first.p.locator('#customer-account[open]').count(), 0);
  assert.equal(first.counts.signup, 1);
  assert.equal(first.counts.login, 0);
  assert.equal(first.counts.start, 1);
  assert.match(await first.p.locator('.manual-id').textContent(), /TANJ-000001/);
  await first.p.reload();
  await first.p.getByTitle('QRIS dan VA').waitFor();
  assert.equal(first.counts.signup, 1);
  assert.equal(first.counts.login, 0);
  assert.deepEqual(first.errors, []);
  const another = await device();
  await another.p.getByTitle('QRIS dan VA').waitFor();
  assert.equal(another.counts.signup, 1);
  assert.equal(another.counts.login, 0);
  assert.deepEqual(another.errors, []);
  const invalid = await device(false);
  await invalid.p
    .locator('#manual-payment-error')
    .filter({ hasText: 'tidak valid atau kedaluwarsa' })
    .waitFor();
  assert.equal(await invalid.p.locator('#customer-account[open]').count(), 0);
  assert.equal(invalid.counts.start, 0);
  console.log(
    'PASS: guest email opens payment in fresh mobile browsers, survives reload, requires no login, and rejects invalid links. Supabase and Midtrans simulated; no real emails/orders/payments.',
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
