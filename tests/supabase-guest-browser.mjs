import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const server = createServer(async (req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><title>Guest test</title>');
    return;
  }
  try {
    const file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + sep)) throw Error();
    res.setHeader('Content-Type', extname(file) === '.js' ? 'text/javascript' : 'text/plain');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const uid = crypto.randomUUID();
  let rateCalls = 0;
  await context.route('**/api/shipping/rates', async (r) => {
    rateCalls++;
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        quoteId: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        options: [{ id: 'biteship:jne:reg', courier: 'jne', fee: 35000 }],
      }),
    });
  });
  let signups = 0,
    roleCalls = 0,
    saved;
  await context.route('**/web/supabase-config.js?*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: 'export const supabaseConfig={enabled:true,url:"https://cloud.test",publishableKey:"test-key"};',
    }),
  );
  await context.route('https://cloud.test/**', async (r) => {
    const path = new URL(r.request().url()).pathname;
    let body;
    if (path === '/rest/v1/rpc/tanj_checkout_capabilities')
      body = { guestCheckout: true, version: 29 };
    else if (path === '/auth/v1/signup') {
      signups++;
      assert.equal(r.request().postDataJSON().email, undefined);
      body = {
        access_token: [
          { alg: 'HS256', typ: 'JWT' },
          { sub: uid, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
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
          id: uid,
          is_anonymous: true,
          aud: 'authenticated',
          role: 'authenticated',
          user_metadata: {},
        },
      };
    } else if (path === '/rest/v1/rpc/tanj_is_admin') {
      roleCalls++;
      body = true;
    } else if (path === '/rest/v1/tb_m_address') {
      saved = r.request().postDataJSON();
      body = { ...saved, id: crypto.randomUUID() };
    } else throw Error('Unexpected network: ' + path);
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async () => {
    const m = await import('./web/supabase-customer.js?v=guest-email-20261115');
    await m.cloudReady;
    const sessions = await Promise.all(Array.from({ length: 5 }, () => m.cloudGuestSession()));
    const a = await m.cloudSaveAddress({
      name: 'Guest',
      phone: '081234567890',
      email: 'guest@example.com',
      address: 'Jalan Test',
      provinceId: '36',
      cityId: '36.71',
      districtId: '36.71.07',
      zip: '15115',
    });
    return { sessions, address: a, admin: m.cloudIsAdmin() };
  });
  assert.equal(signups, 1, 'concurrent checkout creates one anonymous session');
  assert.ok(result.sessions.every((s) => s.id === uid && s.role === 'guest' && s.email === ''));
  assert.equal(result.admin, false);
  assert.equal(roleCalls, 0);
  assert.equal(saved.contact_email, 'guest@example.com');
  assert.equal(result.address.email, 'guest@example.com');
  const quoteId = await page.evaluate(async () => {
    const { shippingRates } = await import('./web/biteship.js?v=guest-email-20261115');
    const a = { zip: '15115', provinceId: '36', cityId: '36.71', districtId: '36.71.07' };
    const values = await Promise.all(
      Array.from({ length: 4 }, () => shippingRates(a, [{ id: 'dress', qty: 1 }])),
    );
    return values[0].quoteId;
  });
  assert.equal(rateCalls, 1, 'concurrent rate requests share a single server request');
  await page.reload();
  assert.equal(
    await page.evaluate(async () => {
      const m = await import('./web/supabase-customer.js?v=guest-email-20261115');
      await m.cloudReady;
      return m.cloudSession()?.role;
    }),
    'guest',
  );
  assert.equal(
    await page.evaluate(async () => {
      const { shippingRates } = await import('./web/biteship.js?v=guest-email-20261115');
      return (
        await shippingRates(
          { zip: '15115', provinceId: '36', cityId: '36.71', districtId: '36.71.07' },
          [{ id: 'dress', qty: 1 }],
        )
      ).quoteId;
    }),
    quoteId,
  );
  assert.equal(rateCalls, 1, 'refresh reuses the stored quote without another shipping request');
  await page.evaluate(async () => {
    const { shippingRates } = await import('./web/biteship.js?v=guest-email-20261115');
    await shippingRates(
      { zip: '15115', provinceId: '36', cityId: '36.71', districtId: '36.71.07' },
      [{ id: 'dress', qty: 2 }],
    );
  });
  assert.equal(rateCalls, 2, 'changed quantities request a fresh quote');
  console.log(
    'PASS: Supabase anonymous SDK session, concurrent checkout, contact email, reload and admin isolation. No real accounts, emails or payments.',
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
