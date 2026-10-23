import { orderPaymentUrl } from '../shared/order-email.js';
const RECEIPTS = 'tanj-email-receipts-v1';
const money = (value) => 'Rp' + Number(value).toLocaleString('id-ID');
const hasTracking = (order) => order?.status === 'PAID' && Boolean(order.tracking?.number?.trim());
export function emailTemplateParams(order, baseUrl) {
  const email = String(order?.customer?.email || '').trim();
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) || email.length > 120)
    throw Error('Email customer belum valid. Periksa detail pesanan.');
  if (
    !order.id ||
    !Array.isArray(order.items) ||
    !order.items.length ||
    !Number.isSafeInteger(order.total) ||
    order.total < 0
  )
    throw Error('Detail pesanan belum valid untuk pengiriman email.');
  const customer = order.customer;
  return {
    has_tracking: hasTracking(order),
    tracking_number: hasTracking(order) ? order.tracking.number : '',
    tracking_courier: hasTracking(order) ? order.tracking.courier : '',
    order_url: orderPaymentUrl(baseUrl, order.id),
    order_id: order.id,
    customer_name: String(customer.name || ''),
    customer_email: email,
    customer_phone: String(customer.phone || ''),
    shipping_address: [
      customer.address,
      customer.district,
      customer.city,
      customer.province,
      customer.zip,
    ]
      .filter(Boolean)
      .join(', '),
    order_items: order.items
      .map((i) => `${i.name} / ${i.color || '-'} / All Size x ${i.qty} — ${money(i.qty * i.price)}`)
      .join('\n'),
    order_subtotal: money(order.subtotal),
    shipping_fee: money(order.shipping.fee),
    has_shipping_discount: Number(order.shipping.subsidy) > 0,
    original_shipping_fee: money(order.shipping.originalFee ?? order.shipping.fee),
    shipping_discount: money(order.shipping.subsidy || 0),
    has_unique_code: Number(order.adjustment) > 0,
    unique_code: order.adjustment ? money(order.adjustment) : '',
    order_total: money(order.total),
    shipping_method: order.shipping.methodName || 'Reguler',
    payment_method: order.payment?.name || 'QRIS manual',
    payment_deadline:
      new Date(order.deadline).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
    payment_url: order.status === 'PAID' ? '' : orderPaymentUrl(baseUrl, order.id),
  };
}
export function createEmailDelivery({
  config,
  fetchImpl = globalThis.fetch,
  storage,
  baseUrl,
  now = Date.now,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  runExclusive = async (fn) => fn(),
} = {}) {
  let queue = Promise.resolve(),
    lastAttempt = 0;
  const pending = new Map();
  const configured = () =>
    config?.enabled === true &&
    ['serviceId', 'templateId', 'publicKey'].every(
      (key) =>
        typeof config[key] === 'string' &&
        config[key].trim() &&
        !/YOUR_|PLACEHOLDER/i.test(config[key]),
    );
  async function send(order, resend = false) {
    if (!configured())
      throw Error('Email otomatis belum aktif. Hubungi admin untuk salinan pesanan.');
    const params = emailTemplateParams(order, baseUrl);
    const templateId = hasTracking(order) ? config.trackingTemplateId : config.templateId;
    if (!templateId?.trim()) throw Error('Template email resi belum dikonfigurasi.');
    if (order.status === 'PAID' && !hasTracking(order))
      throw Error('Email kedua dikirim hanya setelah nomor resi tersedia.');
    if (hasTracking(order) && !config.trackingEmailEnabled)
      throw Error(
        'Resi tersimpan. Template EmailJS perlu diperbarui sebelum email resi diaktifkan.',
      );
    const key =
      [config.serviceId, templateId, order.id].join(':') + (params.has_tracking ? ':tracking' : '');
    let receipts;
    try {
      receipts = JSON.parse(storage.getItem(RECEIPTS) || '{}');
      if (!receipts || typeof receipts !== 'object' || Array.isArray(receipts)) throw Error();
    } catch {
      throw Error(
        'Catatan email tidak dapat dibaca. Periksa inbox admin sebelum mencoba kirim ulang.',
      );
    }
    if (receipts[key]?.status === 'accepted' && !(resend && hasTracking(order)))
      return { sent: true, accepted: true, alreadySent: true };
    // Web Locks and a shared timestamp also serialize separate tabs at the provider rate limit.
    const previous = Number(receipts._lastAttemptAt) || 0;
    lastAttempt = Math.max(lastAttempt, previous <= now() ? previous : 0);
    const remaining = 1100 - (now() - lastAttempt);
    if (remaining > 0) await sleep(remaining);
    lastAttempt = now();
    // Save intent before contacting the provider. A quota failure must never silently send an untracked email.
    receipts._lastAttemptAt = lastAttempt;
    receipts[key] = { status: 'sending', at: lastAttempt };
    try {
      storage.setItem(RECEIPTS, JSON.stringify(receipts));
    } catch {
      throw Error(
        'Browser tidak dapat menyimpan catatan email. Izinkan penyimpanan lalu coba lagi.',
      );
    }
    let result;
    try {
      const response = await fetchImpl('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          service_id: config.serviceId.trim(),
          template_id: templateId.trim(),
          user_id: config.publicKey.trim(),
          template_params: params,
        }),
      });
      const responseText = await response.text();
      if (response.status !== 200 || responseText.trim() !== 'OK') {
        const message =
          response.status === 429
            ? 'Batas pengiriman email tercapai. Tunggu sebentar lalu coba kirim ulang.'
            : response.status === 400 || response.status === 401 || response.status === 403
              ? 'Konfigurasi layanan email belum sesuai. Hubungi admin TANJ.'
              : 'Layanan email belum menerima pengiriman. Coba lagi nanti.';
        result = { status: 'failed', at: now() };
        throw Error(message + ' (HTTP ' + response.status + ', template ' + templateId + ').');
      }
      result = { status: 'accepted', at: now() };
    } catch (err) {
      result ||= { status: 'unknown', at: now() };
      receipts[key] = result;
      try {
        storage.setItem(RECEIPTS, JSON.stringify(receipts));
      } catch {}
      if (result.status === 'unknown')
        throw Error(
          'Status pengiriman email belum dapat dipastikan. Periksa Inbox/Spam sebelum kirim ulang. Pesanan tetap tersimpan.',
        );
      throw err;
    }
    receipts[key] = result;
    try {
      storage.setItem(RECEIPTS, JSON.stringify(receipts));
    } catch {
      return { sent: true, accepted: true, receiptSaved: false };
    }
    return { sent: true, accepted: true, receiptSaved: true };
  }
  return function notify(order, { resend = false } = {}) {
    const key = String(order?.id || '') + (hasTracking(order) ? ':tracking' : '');
    if (pending.has(key)) return pending.get(key);
    const task = queue.catch(() => {}).then(() => runExclusive(() => send(order, resend)));
    pending.set(key, task);
    queue = task;
    task.then(
      () => pending.delete(key),
      () => pending.delete(key),
    );
    return task;
  };
}
