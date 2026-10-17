import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderEmail, orderPaymentUrl } from '../shared/order-email.js';
import { sendOrderEmails } from '../services/order-notifications.mjs';
import { paymentOrderId, isPaymentLink } from '../shared/payment-link.js';
import { readFile } from 'node:fs/promises';
const order = {
  id: 'TANJ-Sand-Cream-TEST',
  customer: {
    name: '<script>alert(1)</script>',
    email: 'customer@example.com',
    phone: '081200000000',
    address: 'Jl. Contoh',
    city: 'Tangerang',
    zip: '15115',
  },
  createdAt: Date.now(),
  deadline: Date.now() + 86400000,
  items: [{ name: 'TANJ Sand', color: 'Cream', qty: 1, price: 687000 }],
  subtotal: 687000,
  shipping: { fee: 10000, methodName: 'JNE Reguler' },
  adjustment: 123,
  total: 697123,
  payment: { name: 'QRIS manual' },
};
test('payment link survives hash removal and removes expired-session or auth parameters', () => {
  const link = orderPaymentUrl(
    'https://example.com/tanj/?session=expired&access_token=do-not-copy#old',
    order.id,
  );
  const url = new URL(link);
  assert.equal(url.searchParams.get('session'), null);
  assert.equal(url.searchParams.get('access_token'), null);
  assert.equal(paymentOrderId(link), order.id);
  url.hash = '';
  assert.equal(paymentOrderId(url.href), order.id);
  assert.equal(isPaymentLink(url.href), true);
  assert.equal(paymentOrderId('https://example.com/tanj/#pesanan?order=OLD'), 'OLD');
});
test('confirmation email mentions TANJ, retains signed verification URL and uses plain HTML', async () => {
  const html = await readFile('supabase/templates/confirmation.html', 'utf8');
  assert.match(html, /Konfirmasi email akun TANJ/);
  assert.ok(html.includes('href="{{ .ConfirmationURL }}"'));
  assert.match(html, /Konfirmasi email saya/);
  assert.ok(!html.includes('style='));
});
test('email template escapes customer content, preserves exact total, and links to the selected order', () => {
  const result = buildOrderEmail(order, { baseUrl: 'https://example.com/tanj/' });
  assert.equal(result.to, 'customer@example.com');
  assert.ok(!result.html.includes('<script>'));
  assert.match(result.html, /&lt;script&gt;/);
  assert.match(result.html, /Rp697\.123/);
  assert.match(result.html, /Cek cara membayar/);
  assert.equal(new URL(result.url).pathname, '/tanj/');
  assert.equal(new URLSearchParams(new URL(result.url).hash.split('?')[1]).get('order'), order.id);
  assert.throws(() => orderPaymentUrl('javascript:alert(1)', order.id));
});
test('server delivery requires both admin and customer acceptance and supplies stable idempotency keys', async () => {
  const calls = [];
  const sendMail = async (message) => {
    calls.push(message);
    return { id: 'accepted-' + calls.length };
  };
  const response = await sendOrderEmails(order, { baseUrl: 'https://example.com/tanj/', sendMail });
  assert.equal(response.sent, true);
  assert.deepEqual(
    calls.map((c) => c.to),
    ['tanj.indonesia@gmail.com', 'customer@example.com'],
  );
  assert.equal(new Set(calls.map((c) => c.idempotencyKey)).size, 2);
  const first = calls[0].idempotencyKey;
  await sendOrderEmails(order, { baseUrl: 'https://example.com/tanj/', sendMail });
  assert.equal(calls[2].idempotencyKey, first);
  const failed = await sendOrderEmails(order, {
    baseUrl: 'https://example.com/tanj/',
    sendMail: async (m) =>
      m.to === 'tanj.indonesia@gmail.com'
        ? { id: 'admin-only' }
        : Promise.reject(Error('Unavailable')),
  });
  assert.equal(failed.sent, false);
  assert.equal(failed.results.filter((r) => r.accepted).length, 1);
  await assert.rejects(
    () => sendOrderEmails(order, { baseUrl: 'https://example.com/tanj/' }),
    /belum dikonfigurasi/,
  );
});
