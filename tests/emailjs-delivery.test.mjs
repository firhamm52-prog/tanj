import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmailDelivery, emailTemplateParams } from '../web/emailjs-delivery.js';
const config = {
  enabled: true,
  serviceId: 'service_test',
  templateId: 'template_order',
  trackingTemplateId: 'template_tracking',
  publicKey: 'public_test',
};
const sample = () => ({
  id: 'TANJ-ORDER-1',
  customer: {
    name: 'Buyer <script>',
    email: 'customer@example.com',
    phone: '081200000000',
    address: 'Jalan contoh',
    district: 'Karawaci',
    city: 'Tangerang',
    province: 'Banten',
    zip: '15115',
  },
  items: [{ name: 'TANJ Sand', color: 'Cream', qty: 1, price: 687000 }],
  subtotal: 687000,
  shipping: { fee: 10000, methodName: 'JNE Reguler' },
  adjustment: 123,
  total: 697123,
  payment: { name: 'QRIS manual' },
  deadline: Date.now() + 86400000,
});
function setup(overrides = {}) {
  const values = new Map(),
    calls = [],
    sleeps = [];
  let time = 100000;
  const storage = { getItem: (k) => values.get(k) || null, setItem: (k, v) => values.set(k, v) };
  const options = {
    config,
    baseUrl: 'https://example.com/tanj/',
    storage,
    now: () => time,
    sleep: async (ms) => {
      sleeps.push(ms);
      time += ms;
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, ...options });
      return { status: 200, text: async () => 'OK' };
    },
    ...overrides,
  };
  return { notify: createEmailDelivery(options), options, calls, values, sleeps };
}
test('disabled email requires account setup and never makes a network request', async () => {
  const t = setup({ config: { ...config, enabled: false } });
  await assert.rejects(() => t.notify(sample()), /belum aktif/);
  assert.equal(t.calls.length, 0);
});
test('email preserves gross courier cost and reports subsidy with net customer fee', () => {
  const order = sample();
  const params = emailTemplateParams(
    { ...order, shipping: { ...order.shipping, originalFee: 35000, subsidy: 20000, fee: 15000 } },
    'https://example.com/tanj/',
  );
  assert.equal(params.has_shipping_discount, true);
  assert.equal(params.shipping_fee, 'Rp15.000');
  assert.equal(params.original_shipping_fee, 'Rp35.000');
  assert.equal(params.shipping_discount, 'Rp20.000');
});
test('tracking email is separate from Order, requires a resi, and sends once', async () => {
  const t = setup({ config: { ...config, trackingEmailEnabled: true } });
  const shipped = {
    ...sample(),
    status: 'PAID',
    tracking: { courier: 'Lion Parcel', number: 'LP123' },
  };
  await t.notify(sample());
  await assert.rejects(() => t.notify({ ...sample(), status: 'PAID' }), /hanya setelah nomor resi/);
  await Promise.all([t.notify(shipped), t.notify(shipped)]);
  await t.notify({ ...shipped, tracking: { ...shipped.tracking, number: 'LP456' } });
  assert.equal(t.calls.length, 2);
  const receipt = JSON.parse(t.calls[1].body);
  assert.equal(receipt.template_id, config.trackingTemplateId);
  assert.equal(receipt.template_params.has_tracking, true);
  assert.equal(receipt.template_params.tracking_number, 'LP123');
  assert.match(receipt.template_params.order_url, /example.com\/tanj\/\?order=/);
  assert.equal(JSON.parse(t.calls[0].body).template_params.has_tracking, false);
  assert.equal(receipt.template_params.payment_url, '');
  await t.notify(shipped, { resend: true });
  assert.equal(t.calls.length, 3);
  assert.equal(JSON.parse(t.calls[2].body).template_id, config.trackingTemplateId);
  await t.notify(shipped);
  assert.equal(t.calls.length, 3);
  const missing = setup();
  await assert.rejects(() => missing.notify(shipped), /Template EmailJS perlu diperbarui/);
  assert.equal(missing.calls.length, 0);
});
test('provider receives exact template parameters; concurrent and repeated Order notifications are deduplicated locally', async () => {
  const t = setup(),
    order = sample();
  const [a, b] = await Promise.all([t.notify(order), t.notify(order)]);
  assert.equal(a.sent, true);
  assert.equal(b.sent, true);
  assert.equal(t.calls.length, 1);
  const payload = JSON.parse(t.calls[0].body);
  assert.equal(t.calls[0].url, 'https://api.emailjs.com/api/v1.0/email/send');
  assert.equal(payload.service_id, config.serviceId);
  assert.equal(payload.template_id, config.templateId);
  assert.equal(payload.user_id, config.publicKey);
  assert.equal(payload.template_params.customer_email, order.customer.email);
  assert.equal(payload.template_params.order_total, 'Rp697.123');
  assert.equal(payload.accessToken, undefined);
  assert.equal(payload.template_params.to_email, undefined);
  assert.match(payload.template_params.payment_url, /#pesanan\?order=TANJ-ORDER-1/);
  assert.equal((await t.notify(order)).alreadySent, true);
  assert.equal((await createEmailDelivery(t.options)(order)).alreadySent, true);
  assert.equal(t.calls.length, 1);
  await t.notify({ ...order, id: 'TANJ-ORDER-2' });
  assert.equal(t.calls.length, 2);
  assert.equal(t.sleeps[0], 1100);
});
test('provider refusal is not a success; a later explicit retry can succeed', async () => {
  let count = 0;
  const t = setup({
    fetchImpl: async () =>
      ++count === 1
        ? { status: 429, text: async () => 'Rate limited' }
        : { status: 200, text: async () => 'OK' },
  });
  await assert.rejects(() => t.notify(sample()), /Batas pengiriman/);
  assert.equal((await t.notify(sample())).sent, true);
  assert.equal(count, 2);
});
test('unexpected success body, missing recipient and network uncertainty never report delivery', async () => {
  const bad = setup({
    fetchImpl: async () => ({ status: 200, text: async () => '<html>wrong endpoint</html>' }),
  });
  await assert.rejects(() => bad.notify(sample()), /belum menerima/);
  const invalid = setup();
  await assert.rejects(
    () => invalid.notify({ ...sample(), customer: { email: 'a@example.com,b@example.com' } }),
    /belum valid/,
  );
  assert.equal(invalid.calls.length, 0);
  const offline = setup({
    fetchImpl: async () => {
      throw Error('network unavailable');
    },
  });
  await assert.rejects(() => offline.notify(sample()), /belum dapat dipastikan/);
});
test('storage failure before send prevents a request; failure after acceptance is reported as accepted without a saved receipt', async () => {
  const blocked = setup({
    storage: {
      getItem: () => null,
      setItem: () => {
        throw Error('quota');
      },
    },
  });
  await assert.rejects(() => blocked.notify(sample()), /tidak dapat menyimpan/);
  assert.equal(blocked.calls.length, 0);
  let writes = 0;
  const partial = setup({
    storage: {
      getItem: () => null,
      setItem: () => {
        if (++writes > 1) throw Error('quota');
      },
    },
  });
  const result = await partial.notify(sample());
  assert.equal(result.sent, true);
  assert.equal(result.receiptSaved, false);
  assert.equal(partial.calls.length, 1);
  assert.throws(() => emailTemplateParams(sample(), 'javascript:alert(1)'), /URL website/);
});
