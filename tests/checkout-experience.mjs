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
  await page.locator('#manual-orders').waitFor({ state: 'attached' });
  assert.equal(await page.locator('#customer-account[open]').count(), 0);
  await page.evaluate(async () => {
    const { applySitePreferences } = await import('./web/site-preferences.js');
    applySitePreferences({ instagram: 'https://www.instagram.com/tanjofficial/' });
  });
  assert.equal(
    await page.locator('a[href*="instagram.com"]').first().getAttribute('href'),
    'https://www.instagram.com/tanj.idn?mdxt=MXJ1OTlhOHQzMG9leA==',
  );
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await page.locator('#customer-account[open]').count(), 0);
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
  assert.equal(await page.locator('#checkout-order').textContent(), 'Buat pesanan');
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
  assert.equal(await methodDialog.locator('[value=midtrans-va]').isDisabled(), true);
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
  // A stale order email URL must not replace a new mobile checkout on app return.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.product-preview').first().click();
  await page.locator('#product-plus').click();
  await page.locator('#product-buy-now').click();
  await page.locator('#bag-checkout-view').waitFor({ state: 'visible' });
  await page.locator('#checkout-selected-items').filter({ hasText: '2 barang' }).waitFor();
  await page.locator('#address-summary').filter({ hasText: 'Jalan Contoh' }).waitFor();
  await page.locator('#checkout-note').fill('Pertahankan catatan saat pindah aplikasi');
  const checkoutSnapshot = await page.locator('#checkout-price-summary').innerText();
  const addressSnapshot = await page.locator('#address-summary').innerText();
  const shippingSnapshot = await page.locator('#shipping-choice').innerText();
  assert.equal(new URL(page.url()).searchParams.has('order'), false);
  assert.ok(!new URL(page.url()).hash.startsWith('#pesanan'));
  await page.evaluate(async () => {
    // Also cover old bookmarks/history entries that still carry an order query.
    const url = new URL(location.href);
    url.searchParams.set('order', 'STALE-ORDER');
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  assert.equal(await page.locator('#bag-checkout-view').isVisible(), true);
  assert.equal(await page.locator('#manual-payment').isVisible(), false);
  assert.equal(await page.locator('#checkout-price-summary').innerText(), checkoutSnapshot);
  assert.equal(await page.locator('#address-summary').innerText(), addressSnapshot);
  assert.equal(await page.locator('#shipping-choice').innerText(), shippingSnapshot);
  assert.equal(
    await page.locator('#checkout-note').inputValue(),
    'Pertahankan catatan saat pindah aplikasi',
  );
  await page.evaluate(() => localStorage.removeItem('noireaterial-cart-v1'));
  await page.goto(email.url);
  await page.locator('.manual-id').filter({ hasText: order.id }).waitFor();
  await page.locator('#bag-modal [data-utility-close]').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-account-open]').first().click();
  await page.locator('#customer-logout').click();
  await page.locator('#customer-account .customer-close').click();
  await page.goto(email.url);
  await page.reload();
  await page.locator('#manual-orders').waitFor({ state: 'attached' });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
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
  // Exercise live-rate checkout with a stub: no provider calls or paid requests.
  await context.route('**/web/biteship.js*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export async function shippingConfiguration(){return {enabled:true};}
      let rateCalls = 0; export async function shippingRates(){const extra = rateCalls++ ? 2000 : 0; return {quoteId:null,expiresAt:new Date(Date.now()+600000).toISOString(),options:[
        {id:'biteship:jne:reg',name:'JNE',service:'REG',fee:14000+extra,duration:'2 - 3 hari'},
        {id:'biteship:jnt:ez',name:'J&T',service:'EZ',fee:16000+extra,duration:'1 - 2 hari'}]};}`,
    }),
  );
  await page.evaluate(async () => {
    const m = await import('./web/customer-account.js?v=owner-ui-3');
    await m.saveAddress({
      name: 'Pembeli lain',
      phone: '081234567890',
      address: 'Alamat Biteship',
      provinceId: '36',
      cityId: '36.71',
      districtId: '36.71.07',
      district: 'Testing',
      city: 'Tangerang',
      province: 'Banten',
      zip: '15115',
    });
  });
  await page.goto(url);
  if (await page.locator('#bag-modal').isVisible())
    await page.locator('#bag-modal [data-utility-close]').click();
  await page.locator('.product-preview').first().click();
  await page.locator('#product-buy-now').click();
  await page.locator('#address-summary').filter({ hasText: 'Alamat Biteship' }).waitFor();
  assert.match(await page.locator('#shipping-choice').innerText(), /Cek ongkir/);
  await page.locator('#shipping-choice').click();
  const ratesDialog = page.getByRole('dialog', { name: 'Metode pengiriman', exact: true });
  await ratesDialog.locator('[value="biteship:jnt:ez"]').check();
  await ratesDialog.getByRole('button', { name: 'Konfirmasi', exact: true }).click();
  assert.match(await page.locator('#shipping-choice').innerText(), /J&T/);
  assert.match(await page.locator('#checkout-price-summary').innerText(), /16.000/);
  await page.locator('#shipping-choice').click();
  await page
    .getByRole('dialog', { name: 'Metode pengiriman', exact: true })
    .locator('.customer-close')
    .click();
  assert.match(await page.locator('#checkout-price-summary').innerText(), /16.000/);
  assert.doesNotMatch(await page.locator('#checkout-price-summary').innerText(), /18.000/);
  await page.locator('#checkout-order').click();
  await page.locator('#manual-checkout-error').filter({ hasText: 'Hubungi admin TANJ' }).waitFor();
  await page.locator('#checkout-back').click();
  await page.locator('#bag-items button[aria-label^="Tambah jumlah"]').first().click();
  await page.locator('#bag-next').click();
  await page.locator('#shipping-choice').filter({ hasText: 'Cek ongkir' }).waitFor();
  assert.match(
    await page.locator('#checkout-price-summary').innerText(),
    /Pilih kurir untuk total/,
  );
  // A login survives closing a tab, but its fixed deadline never slides on activity.
  await page.locator('#shipping-choice').click();
  await page
    .getByRole('dialog', { name: 'Metode pengiriman', exact: true })
    .locator('[value="biteship:jnt:ez"]')
    .check();
  await page
    .getByRole('dialog', { name: 'Metode pengiriman', exact: true })
    .getByRole('button', { name: 'Konfirmasi', exact: true })
    .click();
  await page.locator('#checkout-price-summary').filter({ hasText: 'Diskon Ongkir' }).waitFor();
  const rupiah = (text) => Number(text.replace(/\D/g, ''));
  assert.ok(
    rupiah(
      await page.locator('#checkout-price-summary .checkout-grand-total strong').textContent(),
    ) >
      rupiah(
        await page.locator('#checkout-price-summary > p').first().locator('strong').textContent(),
      ),
    'shipping stays payable while shipping discount is disabled',
  );
  assert.equal(
    await page
      .locator('#checkout-price-summary > p')
      .filter({ hasText: 'Diskon Ongkir' })
      .locator('strong')
      .textContent(),
    'Rp0',
  );
  const expiry = await page.evaluate(async () => {
    const m = await import('./web/customer-account.js?v=owner-ui-3');
    await m.authenticateCustomer(
      {
        name: 'Session test',
        email: 'session@example.com',
        password: 'session-password-123',
        repeat: 'session-password-123',
      },
      true,
    );
    return JSON.parse(localStorage.getItem('tanj-customer-session-v1')).expires;
  });
  assert.ok(expiry <= Date.now() + 60 * 60 * 1000 + 1000);
  assert.ok(expiry > Date.now() + 59 * 60 * 1000);
  const reopened = await context.newPage();
  await reopened.goto(url);
  await reopened.locator('#manual-orders').waitFor({ state: 'attached' });
  assert.equal(
    await reopened.evaluate(
      async () => (await import('./web/customer-account.js?v=owner-ui-3')).customerSession()?.email,
    ),
    'session@example.com',
  );
  await reopened.evaluate(() => {
    const key = 'tanj-customer-session-v1';
    const session = JSON.parse(localStorage.getItem(key));
    session.expires = Date.now() - 1;
    localStorage.setItem(key, JSON.stringify(session));
  });
  assert.equal(
    await reopened.evaluate(async () =>
      (await import('./web/customer-account.js?v=owner-ui-3')).customerSession(),
    ),
    null,
  );
  await reopened.close();
  await page.evaluate(async () => {
    localStorage.removeItem('noireaterial-cart-v1');
    const m = await import('./web/customer-account.js?v=owner-ui-3');
    await m.authenticateCustomer({
      email: 'session@example.com',
      password: 'session-password-123',
    });
  });
  await page.goto(url);
  await page.goto(url + '#all-products/selcuk');
  const hijabLink = page.locator('[data-hijab-category="selcuk"][data-hijab-color="brown"] a');
  await hijabLink.click();
  await page.locator('#product-modal').waitFor({ state: 'visible' });
  assert.match(await page.locator('#product-modal-title').textContent(), /Selcuk Brown/);
  assert.ok(!(await hijabLink.getAttribute('href')).includes('wa.me'));
  await page.locator('#product-add').click();
  assert.match(await page.locator('#bag-items').textContent(), /Selcuk Brown/);
  assert.equal(await page.locator('#bag-count').textContent(), '1');
  await page.reload();
  if (!(await page.locator('#bag-modal').isVisible())) await page.locator('#bag-open').click();
  assert.match(await page.locator('#bag-items').textContent(), /Selcuk Brown/);
  await page.locator('#bag-next').click();
  await page.locator('#checkout-selected-items').filter({ hasText: 'Selcuk Brown' }).waitFor();
  // Virtual Account stays enabled while QRIS is temporarily unavailable.
  await context.route('**/web/midtrans.js*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export async function midtransConfiguration(){return {enabled:true};} export async function midtransRequest(){throw Error("No real payments in this test");}',
    }),
  );
  await page.reload();
  if (!(await page.locator('#bag-modal').isVisible())) await page.locator('#bag-open').click();
  if (await page.locator('#bag-next').isVisible()) await page.locator('#bag-next').click();
  await page.locator('#payment-choice').click();
  const automaticDialog = page.getByRole('dialog', { name: 'Metode pembayaran', exact: true });
  assert.equal(await automaticDialog.locator('.checkout-method').count(), 2);
  await automaticDialog.locator('[value=midtrans-va]').waitFor();
  assert.equal(await automaticDialog.locator('[value=midtrans-va]').isEnabled(), true);
  assert.equal(await automaticDialog.locator('[value=midtrans-qris]').isDisabled(), true);
  assert.match(await automaticDialog.textContent(), /Segera tersedia/);
  assert.doesNotMatch(await automaticDialog.textContent(), /manual|Belum tersedia/);
  await automaticDialog.getByRole('button', { name: 'Konfirmasi', exact: true }).click();
  assert.match(await page.locator('#payment-choice').textContent(), /Virtual Account/);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: customer registration/login validation, login gate, Order Sekarang, address create/edit/persistence/isolation, account-bound recipient despite modified input, shipping choice, disabled gateway methods, Order, email preview/deep link, payment ownership, responsive layout.',
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
