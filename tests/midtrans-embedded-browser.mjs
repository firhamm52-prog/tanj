import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/fixture') {
      res.setHeader('Content-Type', 'text/html');
      return res.end('<div id="checkout"></div>');
    }
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root)) throw Error();
    res.setHeader('Content-Type', 'text/javascript');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
let browser;
try {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', async (dialog) => {
    errors.push('Unexpected browser dialog: ' + dialog.message());
    await dialog.dismiss();
  });
  await page.route('https://app.sandbox.midtrans.com/snap/snap.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.snap={embed(token, options) {
      if(window.snapActive) throw Error('Invalid state transition from PopupInView to PopupInView');
      window.snapActive=true; window.parent.onPayError=options.onError;
      window.parent.embeddedToken=token; window.parent.onPay=options.onSuccess;
      window.parent.embedCount=(window.parent.embedCount||0)+1;
      document.getElementById(options.embedId).innerHTML='<iframe title="QRIS dan VA"></iframe>';
    }, hide(){ window.snapActive=false; window.parent.hideCount=(window.parent.hideCount||0)+1;
      document.querySelectorAll('.midtrans-embed iframe').forEach(frame=>frame.remove());
    }};`,
    }),
  );
  await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
  await page.clock.install();
  await page.evaluate(async () => {
    const { mountMidtransCheckout } = await import('/web/midtrans-checkout.js');
    window.mount = mountMidtransCheckout;
    window.calls = [];
    window.verified = 0;
    window.fail = true;
    window.paymentState = 'WAITING_PAYMENT';
    window.stop = mountMidtransCheckout(
      document.getElementById('checkout'),
      'TANJ-test',
      (window.checkoutOptions = {
        request: async (operation, orderId) => {
          window.calls.push({ operation, orderId });
          if (operation === 'status') return { status: window.paymentState };
          if (window.fail) {
            window.fail = false;
            throw Error('Koneksi terputus');
          }
          return {
            snapToken: 'test-token',
            clientKey: 'PUBLIC-client-key',
            production: false,
            redirectUrl: 'https://app.sandbox.midtrans.com/snap/v3/redirection/test-token',
          };
        },
        onVerified: async () => {
          window.verified++;
        },
      }),
    );
  });
  await page.getByText('Koneksi terputus').waitFor();
  await page.getByRole('button', { name: 'Muat ulang pembayaran' }).click();
  await page.locator('iframe[title="QRIS dan VA"]').waitFor();
  assert.equal(
    await page
      .frameLocator('iframe[title="QRIS dan VA"]')
      .locator('script[data-client-key]')
      .getAttribute('data-client-key'),
    'PUBLIC-client-key',
  );
  assert.equal(
    await page.evaluate(() => window.calls.filter((c) => c.operation === 'start').length),
    2,
  );
  await page.waitForFunction(() => window.embedCount === 1);
  await page.evaluate(() => window.onPayError());
  await page.getByRole('button', { name: 'Muat ulang pembayaran' }).click();
  await page.locator('iframe[title="QRIS dan VA"]').waitFor();
  await page.waitForFunction(() => window.embedCount === 2);
  assert.equal(await page.evaluate(() => window.hideCount), 1);
  await page.evaluate(() => {
    window.stop();
    window.stop = window.mount(
      document.getElementById('checkout'),
      'TANJ-test',
      window.checkoutOptions,
    );
  });
  await page.locator('iframe[title="QRIS dan VA"]').waitFor();
  await page.waitForFunction(() => window.embedCount === 3);
  assert.equal(await page.evaluate(() => window.hideCount), 2);
  await page.evaluate(async () => {
    await window.onPay();
  });
  assert.equal(
    await page.evaluate(() => window.verified),
    0,
    'browser success alone must not mark paid',
  );
  await page.evaluate(() => {
    window.paymentState = 'PAID';
  });
  await page.clock.fastForward(5000);
  await page.waitForFunction(() => window.verified === 1);
  assert.equal(await page.evaluate(() => window.verified), 1);
  assert.ok(await page.evaluate(() => window.calls.every((c) => c.orderId === 'TANJ-test')));
  await page.evaluate(() => window.stop());
  await page.evaluate(() => {
    window.stop = window.mount(document.getElementById('checkout'), 'TANJ-test', {
      ...window.checkoutOptions,
      load: async () => ({
        async embed() {
          throw Error(
            'snap.embed is not allowed to be called in this state. Invalid state transition from PopupInView to PopupInView',
          );
        },
        hide() {},
      }),
    });
  });
  await page
    .getByText(
      'Pembayaran belum dapat ditampilkan. Tekan Muat ulang pembayaran untuk mencoba kembali.',
    )
    .waitFor();
  assert.equal(await page.getByRole('button', { name: 'Muat ulang pembayaran' }).isVisible(), true);
  await page.evaluate(() => window.stop());
  assert.deepEqual(errors, []);
  await page.evaluate(() => {
    window.changes = 0;
    window.changeVerified = 0;
    window.failChange = true;
    window.stop = window.mount(document.getElementById('checkout'), 'TANJ-test', {
      ...window.checkoutOptions,
      canChangeMethod: true,
      request: async (operation, id) => {
        if (operation === 'change-method') {
          window.changes++;
          if (window.failChange) throw Error('Database metode pembayaran belum siap.');
          return { changed: true };
        }
        if (operation === 'status')
          throw Object.assign(Error('Status pembayaran belum dapat disimpan.'), { status: 409 });
        const data = await window.checkoutOptions.request(operation, id);
        if (operation === 'start' && window.changes === 2) data.snapToken = 'qris-to-va-token';
        return data;
      },
      onVerified: async () => {
        window.changeVerified++;
      },
    });
  });
  await page.locator('iframe[title="QRIS dan VA"]').waitFor();
  await page.clock.fastForward(5000);
  await page
    .getByText('Pengecekan status belum berhasil: Status pembayaran belum dapat disimpan.')
    .waitFor();
  await page.getByRole('button', { name: 'Ubah metode pembayaran', exact: true }).click();
  await page
    .locator('[data-method-change]')
    .filter({ hasText: 'Database metode pembayaran belum siap.' })
    .waitFor();
  assert.equal(await page.locator('iframe[title="QRIS dan VA"]').count(), 1);
  assert.equal(await page.evaluate(() => window.changeVerified), 0);
  await page.evaluate(() => {
    window.failChange = false;
  });
  await page.getByRole('button', { name: 'Ubah metode pembayaran', exact: true }).click();
  await page.waitForFunction(() => window.embeddedToken === 'qris-to-va-token');
  assert.equal(await page.locator('iframe').count(), 1);
  assert.equal(await page.locator('[data-payment-link]').count(), 0);
  assert.equal(await page.evaluate(() => window.changeVerified), 1);
  assert.equal(await page.evaluate(() => window.changes), 2);
  assert.equal(
    await page.getByRole('button', { name: 'Ubah metode pembayaran', exact: true }).isVisible(),
    false,
  );
  await page.evaluate(() => window.stop());
  await page.evaluate(() => {
    window.bankChanges = [];
    window.bankRefreshed = 0;
    window.stop = window.mount(document.getElementById('checkout'), 'TANJ-test', {
      ...window.checkoutOptions,
      canChangeBank: true,
      request: async (operation, id) => {
        if (operation === 'change-bank') {
          window.bankChanges.push(id);
          return { changed: true };
        }
        const data = await window.checkoutOptions.request(operation, id);
        if (operation === 'start' && window.bankChanges.length) data.snapToken = 'new-bank-token';
        return data;
      },
      onVerified: async () => {
        window.bankRefreshed++;
      },
    });
  });
  await page.waitForFunction(() => window.embeddedToken === 'test-token');
  const samePage = page.url();
  await page.getByRole('button', { name: 'Ubah bank account', exact: true }).click();
  await page.waitForFunction(() => window.embeddedToken === 'new-bank-token');
  assert.equal(page.url(), samePage, 'changing bank must not navigate or reload TANJ');
  assert.deepEqual(await page.evaluate(() => window.bankChanges), ['TANJ-test']);
  assert.equal(await page.evaluate(() => window.bankRefreshed), 1);
  assert.equal(page.context().pages().length, 1);
  await page.locator('iframe[title="QRIS dan VA"]').waitFor();
  assert.equal(await page.evaluate(() => window.embeddedToken), 'new-bank-token');
  assert.equal(
    await page.getByRole('button', { name: 'Ubah bank account', exact: true }).isVisible(),
    true,
  );
  assert.equal(await page.locator('[data-payment-link], a[target="_blank"]').count(), 0);
  await page.evaluate(() => window.stop());
  await page.evaluate(() => {
    window.expiredCalls = [];
    window.expiredVerified = 0;
    window.expiredState = 'not-found';
    window.stop = window.mount(document.getElementById('checkout'), 'TANJ-expired', {
      request: async (operation) => {
        window.expiredCalls.push(operation);
        if (operation === 'start')
          throw Object.assign(Error('Batas pembayaran telah lewat. Hubungi admin.'), {
            status: 409,
          });
        return window.expiredState === 'not-found'
          ? { status: 'WAITING_PAYMENT', notStarted: true }
          : { status: 'CANCELLED' };
      },
      onVerified: async () => {
        window.expiredVerified++;
      },
    });
  });
  await page.getByText('Pembayaran kedaluwarsa', { exact: true }).waitFor();
  await page.getByText('Status belum tersedia.', { exact: true }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Muat ulang pembayaran' }).isVisible(),
    false,
  );
  assert.equal(await page.evaluate(() => window.expiredVerified), 0);
  await page.evaluate(() => {
    window.expiredState = 'cancelled';
  });
  await page.getByRole('button', { name: 'Cek status pembayaran', exact: true }).click();
  await page.waitForFunction(() => window.expiredVerified === 1);
  assert.equal(
    await page.evaluate(
      () => window.expiredCalls.filter((operation) => operation === 'start').length,
    ),
    1,
    'status check must not create another payment',
  );
  await page.evaluate(() => window.stop());
  await page.evaluate(() => {
    window.deadlineCalls = [];
    window.stop = window.mount(document.getElementById('checkout'), 'TANJ-expired-known', {
      deadline: Date.now() - 1000,
      canChangeBank: true,
      request: async (operation) => {
        window.deadlineCalls.push(operation);
        return { status: 'WAITING_PAYMENT' };
      },
    });
  });
  await page.getByText('Pembayaran kedaluwarsa', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.deadlineCalls), ['status']);
  assert.equal(await page.getByRole('button', { name: 'Ubah bank account' }).count(), 0);
  assert.equal(await page.locator('.payment-expired-icon svg').count(), 1);
  await page.evaluate(() => window.stop());
  console.log(
    'PASS: automatic embedded checkout, upload-free public Client Key, retry same order, server-verified payment callbacks, mobile viewport. Provider is simulated.',
  );
} finally {
  await browser?.close();
  if (server.listening) await new Promise((r) => server.close(r));
}
