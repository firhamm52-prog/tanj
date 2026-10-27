import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { freshSeed, storefront } from '../shared/seed.js';
const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://local').pathname;
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) throw Error();
    res.setHeader(
      'Content-Type',
      { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(file)] ||
        'application/octet-stream',
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
let browser,
  verifyCalls = 0,
  resendCalls = 0;
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'buyer@example.com',
  user_metadata: { full_name: 'Buyer' },
  aud: 'authenticated',
  role: 'authenticated',
};
const jwt = [
  { alg: 'HS256', typ: 'JWT' },
  { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 },
  'test',
]
  .map((value) =>
    typeof value === 'string' ? value : Buffer.from(JSON.stringify(value)).toString('base64url'),
  )
  .join('.');
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/web/supabase-config.js?*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export const supabaseConfig={enabled:true,url:"https://otp.test",publishableKey:"public-test"};',
    }),
  );
  await context.route('https://otp.test/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    let body = [],
      status = 200;
    if (path.endsWith('/tanj_cms_storefront')) body = storefront(freshSeed());
    else if (path.endsWith('/tanj_signup_email_exists') || path.endsWith('/tanj_is_admin'))
      body = false;
    else if (path.endsWith('/signup')) body = { user, session: null };
    else if (path.endsWith('/token')) {
      status = 400;
      body = { code: 'email_not_confirmed', msg: 'Email not confirmed' };
    } else if (path.endsWith('/resend')) {
      resendCalls++;
      assert.equal(req.postDataJSON().type, 'signup');
      assert.equal(req.postDataJSON().email, user.email);
      body = {};
    } else if (path.endsWith('/verify')) {
      verifyCalls++;
      const input = req.postDataJSON();
      assert.equal(input.type, 'email');
      assert.equal(input.email, user.email);
      if (input.token === '123456')
        body = {
          access_token: jwt,
          refresh_token: 'test-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { ...user, email_confirmed_at: new Date().toISOString() },
        };
      else {
        status = 403;
        body = { code: 'otp_expired', msg: 'Token has expired or is invalid' };
      }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(async () =>
    (await import('/web/customer-account.js?v=owner-ui-3')).showCustomerAccount(),
  );
  await page.locator('#customer-auth-toggle').click();
  await page.locator('#customer-auth [name=name]').fill('Buyer');
  await page.locator('#customer-auth [name=email]').fill(user.email);
  await page.locator('#customer-auth [name=password]').fill('secure-password-123');
  await page.locator('#customer-auth [name=repeat]').fill('secure-password-123');
  await page.locator('#customer-auth [type=submit]').click();
  await page.locator('#customer-verify').waitFor();
  assert.equal(await page.locator('#customer-verify [name=code]').getAttribute('maxlength'), '6');
  assert.equal(
    await page.locator('#customer-verify [name=code]').getAttribute('pattern'),
    '[0-9]{6}',
  );
  assert.equal(
    await page.evaluate(async () =>
      (await import('/web/customer-account.js?v=owner-ui-3')).customerSession(),
    ),
    null,
  );
  assert.equal(await page.locator('[data-resend]').isDisabled(), true);
  await page.locator('#customer-verify [name=code]').fill('bad');
  await page.locator('#customer-verify [type=submit]').click();
  assert.equal(verifyCalls, 0);
  await page.locator('#customer-verify [name=code]').fill('000000');
  await page.locator('#customer-verify [type=submit]').click();
  await page.locator('#customer-auth-error').filter({ hasText: 'kedaluwarsa' }).waitFor();
  assert.equal(verifyCalls, 1);
  await page.locator('[data-back]').click();
  await page.locator('#customer-auth [name=email]').fill(user.email);
  await page.locator('#customer-auth [name=password]').fill('secure-password-123');
  await page.locator('#customer-auth [type=submit]').click();
  await page.locator('#customer-verify').waitFor();
  // A fresh page has no UI resend cooldown; provider remains authoritative.
  await page.reload();
  await page.evaluate(async () =>
    (await import('/web/customer-account.js?v=owner-ui-3')).showCustomerAccount(),
  );
  await page.locator('#customer-auth [name=email]').fill(user.email);
  await page.locator('#customer-auth [name=password]').fill('secure-password-123');
  await page.locator('#customer-auth [type=submit]').click();
  await page.locator('[data-resend]').click();
  await page
    .locator('[data-verification-status]')
    .filter({ hasText: 'Permintaan kode terkirim' })
    .waitFor();
  assert.equal(resendCalls, 1);
  assert.equal(await page.locator('[data-resend]').isDisabled(), true);
  await page.locator('#customer-verify [name=code]').fill('123456');
  await page.locator('#customer-verify [type=submit]').click();
  await page.locator('#customer-account').waitFor({ state: 'hidden' });
  assert.equal(
    await page.evaluate(
      async () => (await import('/web/customer-account.js?v=owner-ui-3')).customerSession()?.id,
    ),
    user.id,
  );
  assert.equal(new URL(page.url()).hash, '');
  assert.equal(
    await page.evaluate(() => JSON.stringify(localStorage).includes('secure-password-123')),
    false,
  );
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('123456')), false);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: signup OTP form, invalid/expired code, resume unconfirmed login, resend cooldown, verified session and home. Mocked Auth; no real emails sent.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
