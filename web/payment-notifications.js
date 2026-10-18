import { emailConfig } from './email-config.js?v=tracking-email-6';
import { createEmailDelivery } from './emailjs-delivery.js?v=tracking-email-6';
const browserDelivery = createEmailDelivery({
  config: emailConfig,
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  baseUrl: new URL('../', import.meta.url).href,
  runExclusive: (fn) =>
    navigator.locks ? navigator.locks.request('tanj-email-delivery', fn) : fn(),
});
// A shared backend can replace browser delivery later without changing the Order action.
export async function notifyPayment(order, { resend = false } = {}) {
  const endpoint = window.TANJ_CONFIG?.paymentNotificationEndpoint;
  if (!endpoint) return browserDelivery(order, { resend });
  const target = new URL(endpoint, location.href);
  if (target.origin !== location.origin)
    throw Error('Endpoint notifikasi harus berada pada domain TANJ yang sama.');
  const response = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ orderId: order.id }),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (!response.ok || result.sent !== true)
    throw Error('Email belum terkirim. Coba lagi atau hubungi admin.');
  return result;
}
