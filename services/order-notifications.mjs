import { buildOrderEmail } from '../shared/order-email.js';

// Server-side seam: the caller must load an authorized, persisted order, never a browser-supplied total.
// sendMail is an email-provider adapter and must honor the supplied idempotencyKey.
export async function sendOrderEmails(order, { baseUrl, sendMail } = {}) {
  if (typeof sendMail !== 'function') throw Error('Layanan pengirim email belum dikonfigurasi.');
  if (!order?.id || !order.customer?.email || !Number.isSafeInteger(order.total) || order.total < 0)
    throw Error('Pesanan tersimpan belum valid.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer.email))
    throw Error('Email customer tidak valid.');
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
    throw Error('Email produksi memerlukan URL HTTPS.');
  const results = await Promise.all(
    ['admin', 'customer'].map(async (audience) => {
      const email = buildOrderEmail(order, { baseUrl, audience });
      try {
        const result = await sendMail({
          ...email,
          idempotencyKey: `tanj-order-${order.id}-${audience}${order.status === 'PAID' ? '-paid' : ''}`,
        });
        if (!result?.id) throw Error('Penyedia email belum menerima pengiriman.');
        return { audience, accepted: true, messageId: result.id };
      } catch {
        return { audience, accepted: false };
      }
    }),
  );
  return { sent: results.every((r) => r.accepted), results };
}
