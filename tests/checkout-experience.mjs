import { isolateEmail } from './helpers/email-isolation.mjs';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { buildOrderEmail } from '../shared/order-email.js';
const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    let path = new URL(req.url, 'http://localhost').pathname;
    if (!path.startsWith('/tanj/')) {
      res.writeHead(404);
      return res.end();
    }
    path = path.slice(5);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) throw Error();
    const bytes = await readFile(file);
    res.writeHead(200, {
      'Content-Type':
        {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.webp': 'image/webp',
        }[extname(file)] || 'application/octet-stream',
    });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/tanj/`;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    page = await context.newPage();
  await isolateEmail(context);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator('.product-preview').first().click();
  await page.locator('#product-modal').click({ position: { x: 2, y: 2 } });
  assert.equal(await page.locator('#product-modal').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#product-modal').isVisible(), true);
  await page.locator('#product-modal-close').click();
  assert.equal(await page.locator('#product-modal').isVisible(), false);
  await page.locator('.product-preview').first().click();
  await page.locator('#product-buy-now').click();
  await page.locator('#customer-account[open]').waitFor();
  assert.equal(await page.locator('#bag-checkout-view').isVisible(), false);
  await page.locator('#customer-auth button[type=submit]').click();
  await page.locator('#customer-auth-error').filter({ hasText: 'email' }).waitFor();
  await page.locator('#customer-auth-toggle').click();
  await page.locator('#customer-auth [name=name]').fill('Pembeli TANJ');
  await page.locator('#customer-auth [name=email]').fill('buyer@example.com');
  await page.locator('#customer-auth [name=password]').fill('buyer-password-123');
  await page.locator('#customer-auth [name=repeat]').fill('different-password');
  await page.locator('#customer-auth [type=submit]').click();
  await page.locator('#customer-auth-error').filter({ hasText: 'Ulangi password' }).waitFor();
  await page.locator('#customer-auth [name=repeat]').fill('buyer-password-123');
  await page.locator('#customer-auth [type=submit]').click();
  await page.locator('#bag-checkout-view').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#checkout-order').textContent(), 'Order');
  await page.locator('#bag-modal').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#bag-checkout-view').isVisible(), true);
  await page.locator('#checkout-order').click();
  await page.locator('#address-dialog[open]').waitFor();
  await page.locator('#address-create').click();
  await page.locator('#checkout-phone').fill('081234567890');
  await page.locator('#checkout-address').fill('Jalan Contoh No. 1, RT 02/RW 03');
  await page.locator('#checkout-province').selectOption('36');
  await page.locator('#checkout-city').selectOption('36.71');
  await page.locator('#checkout-district').selectOption('36.71.07');
  await page.locator('#checkout-zip').selectOption('15115');
  await page.locator('#address-editor [type=submit]').click();
  await page.locator('#address-dialog').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#address-summary').textContent(), /Jalan Contoh/);
  await page.locator('#address-change').click();
  await page.locator('[data-edit]').click();
  await page.locator('#checkout-address').fill('Jalan Contoh No. 2');
  await page.locator('#address-editor [type=submit]').click();
  await page.locator('#address-dialog').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#address-summary').textContent(), /No. 2/);
  await page.locator('#address-change').click();
  await page.locator('#address-create').click();
  await page.locator('#checkout-phone').fill('081234567891');
  await page.locator('#checkout-address').fill('Alamat kedua');
  await page.locator('#checkout-province').selectOption('36');
  await page.locator('#checkout-city').selectOption('36.71');
  await page.locator('#checkout-district').selectOption('36.71.07');
  await page.locator('#checkout-zip').selectOption('15115');
  await page.locator('#address-editor [type=submit]').click();
  await page.locator('#address-dialog').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#address-summary').textContent(), /Alamat kedua/);
  await page.locator('#address-change').click();
  assert.equal(await page.locator('[data-address]').count(), 2);
  await page.locator('[data-address]').first().click();
  await page.locator('#address-dialog').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#address-summary').textContent(), /No. 2/);
  await page.locator('#address-change').click();
  await page.locator('[data-delete]').last().click();
  assert.equal(await page.locator('[data-address]').count(), 1);
  await page.locator('#address-dialog .customer-close').click();
  await page.reload();
  await page.locator('#bag-checkout-view').waitFor({ state: 'visible' });
  await page.locator('#bag-modal [data-utility-close]').click();
  await page.locator('#bag-open').click();
  await page.locator('#bag-next').click();
  await page.locator('#address-summary').filter({ hasText: 'No. 2' }).waitFor();
  await page.locator('#shipping-choice').click();
  await page
    .getByRole('dialog', { name: 'Metode pengiriman', exact: true })
    .locator('[value=jne-regular]')
    .check();
  await page
    .getByRole('dialog', { name: 'Metode pengiriman', exact: true })
    .getByRole('button', { name: 'Konfirmasi', exact: true })
    .click();
  assert.match(await page.locator('#shipping-choice').textContent(), /JNE/);
  await page.locator('#payment-choice').click();
  const methodDialog = page.getByRole('dialog', { name: 'Metode pembayaran', exact: true });
  assert.equal(await methodDialog.locator('[value=permata-va]').isDisabled(), true);
  await methodDialog.getByRole('button', { name: 'Konfirmasi', exact: true }).click();
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/checkout-experience-desktop.png' });
  await page.evaluate(
    () => (document.getElementById('checkout-email').value = 'wrong-recipient@example.com'),
  );
  await page.locator('#checkout-order').click();
  await page.locator('#manual-payment h3').filter({ hasText: 'Menunggu pembayaran' }).waitFor();
  await page
    .locator('#manual-payment-error')
    .filter({ hasText: 'Email otomatis belum aktif' })
    .waitFor();
  const order = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('tanj-manual-payments-demo-v1')).orders.at(-1),
  );
  assert.equal(order.customer.email, 'buyer@example.com');
  assert.equal(order.shipping.method, 'jne-regular');
  assert.equal(order.payment.id, 'qris-manual');
  assert.ok(order.customerId);
  const count = await page.evaluate(
    () => JSON.parse(localStorage.getItem('tanj-manual-payments-demo-v1')).orders.length,
  );
  await page.goBack();
  await page.locator('#bag-checkout-view').waitFor({ state: 'visible' });
  assert.match(await page.locator('#address-summary').textContent(), /No. 2/);
  await page.goForward();
  await page.locator('#manual-payment h3').filter({ hasText: 'Menunggu pembayaran' }).waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('tanj-manual-payments-demo-v1')).orders.length,
    ),
    count,
  );
  const email = buildOrderEmail(order, { baseUrl: url });
  assert.equal(email.to, 'buyer@example.com');
  assert.match(email.html, /Cek cara membayar/);
  assert.ok(email.url.includes(encodeURIComponent(order.id)));
  assert.ok(!email.html.includes('undefined'));
  await page.locator('#preview-payment-email').click();
  await page.locator('#email-preview-dialog[open]').waitFor();
  assert.match(
    await page.frameLocator('#email-preview-dialog iframe').locator('body').textContent(),
    /Total pembayaran/,
  );
  await page.locator('#email-open-payment').click();
  await page.goto(email.url);
  await page.locator('#manual-payment h3').filter({ hasText: 'Menunggu pembayaran' }).waitFor();
  assert.match(await page.locator('.manual-id').textContent(), new RegExp(order.id));
  await page.locator('#bag-modal [data-utility-close]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-account-open]').first().click();
  await page.locator('#customer-logout').click();
  await page.locator('#customer-account .customer-close').click();
  await page.goto(email.url);
  await page.reload();
  await page.locator('#customer-account[open]').waitFor();
  assert.equal(await page.locator('#customer-auth [name=repeat]').count(), 0);
  await page.locator('#customer-auth [name=email]').fill('buyer@example.com');
  await page.locator('#customer-auth [type=submit]').click();
  await page.locator('#customer-auth-error').filter({ hasText: 'Password' }).waitFor();
  await page.locator('#customer-auth [name=password]').fill('buyer-password-123');
  await page.locator('#customer-auth [type=submit]').click();
  await page.locator('.manual-id').waitFor();
  // A second customer in the same browser must not inherit addresses or see another customer's order.
  await page.evaluate(async () => {
    const m = await import('./web/customer-account.js?v=owner-ui-3');
    m.customerLogout();
    await m.authenticateCustomer(
      {
        name: 'Pembeli lain',
        email: 'other@example.com',
        password: 'other-password-123',
        repeat: 'other-password-123',
      },
      true,
    );
  });
  await page.goto(email.url);
  await page.locator('#customer-status-filter').waitFor();
  assert.equal(await page.locator('[data-order-id]').count(), 0);
  assert.match(await page.locator('#manual-payment-error').textContent(), /belum tersedia/);
  await page.goto(url);
  await page.locator('.product-preview').first().click();
  await page.locator('#product-buy-now').click();
  await page.locator('#bag-checkout-view').waitFor({ state: 'visible' });
  assert.match(await page.locator('#address-summary').textContent(), /Tambahkan alamat/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/checkout-experience-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  const boundEmail = await page.evaluate(async () => {
    const store = await import('./web/manual-payment-store.js?v=owner-ui-3');
    const order = await store.createPayment(
      {
        name: 'Recipient test',
        email: 'wrong-recipient@example.com',
        phone: '081200000000',
        address: 'Alamat tes',
        provinceId: '36',
        cityId: '36.71',
        districtId: '36.71.07',
        zip: '15115',
      },
      [{ id: 'test-binding', qty: 1 }],
      [{ id: 'test-binding', name: 'Email binding', price: 1000, stock: 1, status: 'published' }],
    );
    return order.customer.email;
  });
  assert.equal(boundEmail, 'other@example.com');
  console.log(
    'PASS: customer registration/login validation, login gate, Order Sekarang, address create/edit/persistence/isolation, account-bound recipient despite modified input, shipping choice, disabled gateway methods, Order, email preview/deep link, payment ownership, responsive layout.',
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
