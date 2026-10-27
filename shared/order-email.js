const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const money = (value) => 'Rp' + Number(value || 0).toLocaleString('id-ID');
export function orderPaymentUrl(baseUrl, orderId) {
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw Error('URL website tidak valid.');
  url.search = '';
  url.searchParams.set('order', orderId);
  url.hash = 'pesanan?order=' + encodeURIComponent(orderId);
  return url.href;
}
export function buildOrderEmail(order, { baseUrl, audience = 'customer' } = {}) {
  if (order.status === 'PAID' && order.tracking?.number) {
    const url = orderPaymentUrl(baseUrl, order.id);
    const subject = 'TANJ — Pembayaran Berhasil ' + order.id;
    const text = [
      `Hai ${order.customer.name}, terima kasih sudah berbelanja di TANJ.`,
      `Pesanan: ${order.id}`,
      `Kurir: ${order.tracking.courier}`,
      `Nomor resi: ${order.tracking.number}`,
      ...order.items.map(
        (item) => `${item.name} / ${item.color} x ${item.qty}: ${money(item.qty * item.price)}`,
      ),
      `Subtotal: ${money(order.originalSubtotal ?? order.subtotal)}`,
      `Diskon Ongkir: ${money(order.shipping.subsidy || 0)}`,
      `Diskon Produk: ${money(order.productDiscount || 0)}`,
      `Ongkos Kirim: ${money(order.shipping.originalFee ?? order.shipping.fee)}`,
      `Total: ${money(order.total)}`,
      `Penerima: ${order.customer.name} / ${order.customer.phone}`,
      `Alamat: ${[order.customer.address, order.customer.district, order.customer.city, order.customer.province, order.customer.zip].filter(Boolean).join(', ')}`,
      `Lihat Resi & Lacak Pengiriman: ${url}`,
      'Login dengan akun pemesan jika diminta. Di bagian Nomor resi, salin resi lalu buka tautan situs resmi kurir.',
    ].join('\n');
    return {
      subject,
      to: audience === 'admin' ? 'tanj.indonesia@gmail.com' : order.customer.email,
      text,
      url,
      html: `<!doctype html><html lang="id"><meta charset="utf-8"><title>${esc(subject)}</title><body><h1>TANJ</h1><p>${esc(text).replaceAll('\n', '<br>')}</p><a href="${esc(url)}">Lihat Resi &amp; Lacak Pengiriman</a></body></html>`,
    };
  }
  if (order.status === 'PAID') {
    const subject = 'TANJ — Pembayaran diterima ' + order.id;
    const text = `Hai ${order.customer.name},\nTerima kasih sudah berbelanja di TANJ. Pembayaran pesanan ${order.id} sebesar ${money(order.total)} sudah kami terima. Pesanan kamu akan kami siapkan untuk pengiriman.\nButuh bantuan? tanj.indonesia@gmail.com`;
    return {
      subject,
      to: audience === 'admin' ? 'tanj.indonesia@gmail.com' : order.customer.email,
      text,
      html: `<!doctype html><html lang="id"><meta charset="utf-8"><title>${esc(subject)}</title><body><h1>TANJ</h1><p>${esc(text).replaceAll('\n', '<br>')}</p></body></html>`,
      url: '',
    };
  }
  const url = orderPaymentUrl(baseUrl, order.id),
    customer = order.customer;
  const title = 'TANJ — Menunggu pembayaran ' + order.id;
  const greeting = audience === 'admin' ? 'Pesanan baru untuk TANJ' : `Hai ${customer.name},`;
  const deadline = new Date(order.deadline).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:16px 0;border-bottom:1px solid #e6ded3"><strong>${esc(i.name)}</strong><br><span style="color:#968774">${esc(i.color)} · All Size · ${i.qty} barang</span></td><td style="text-align:right;border-bottom:1px solid #e6ded3">${money(i.qty * i.price)}</td></tr>`,
    )
    .join('');
  const text = [
    greeting,
    'Pesanan ' + order.id + ' telah dibuat dan menunggu pembayaran.',
    'Total pembayaran: ' + money(order.total),
    'Batas pembayaran: ' + deadline,
    'Cek cara membayar: ' + url,
    ...order.items.map((i) => `${i.name} / ${i.color} x ${i.qty}: ${money(i.qty * i.price)}`),
    'Subtotal: ' + money(order.originalSubtotal ?? order.subtotal),
    'Diskon Ongkir: ' + money(order.shipping.subsidy || 0),
    'Diskon Produk: ' + money(order.productDiscount || 0),
    'Ongkos Kirim: ' + money(order.shipping.originalFee ?? order.shipping.fee),
    'Pengiriman: ' + (order.shipping.methodName || 'Reguler'),
    'Pembayaran: ' + (order.payment?.name || 'QRIS manual'),
    'Penerima: ' + customer.name + ' / ' + customer.phone,
    'Alamat: ' +
      [customer.address, customer.district, customer.city, customer.province, customer.zip]
        .filter(Boolean)
        .join(', '),
    'Butuh bantuan? tanj.indonesia@gmail.com · +6281363661703',
  ].join('\n');
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body style="margin:0;background:#f4f0e9;color:#302b26;font:14px Arial,sans-serif"><main style="max-width:580px;margin:24px auto;background:#fffdf8;padding:32px"><p style="font:30px Georgia,serif;letter-spacing:7px;text-align:center;margin:10px 0 40px">TANJ</p><p>${esc(greeting)}</p><p style="line-height:1.8">Kami telah menerima pesanan <strong>${esc(order.id)}</strong> dan menunggu pembayaran.</p><div style="padding:24px;background:#eee7db;margin:26px 0;display:block"><span>Total pembayaran</span><strong style="float:right">${money(order.total)}</strong></div><p style="text-align:center;margin:30px 0"><a href="${esc(url)}" style="display:inline-block;padding:16px 26px;background:#302b26;color:#fff;text-decoration:none;border-radius:5px">Cek cara membayar</a></p><p style="text-align:center;color:#968774;font-size:12px;line-height:1.8">Selesaikan pembayaran sebelum ${esc(deadline)} WIB.<br>Login dengan akun pemesan untuk melihat detail.</p><table style="width:100%;border-collapse:collapse;font-size:13px">${rows}<tr><td style="padding-top:20px">Subtotal:</td><td style="text-align:right;padding-top:20px">${money(order.originalSubtotal ?? order.subtotal)}</td></tr><tr><td>Diskon Ongkir</td><td style="text-align:right">${money(order.shipping.subsidy || 0)}</td></tr><tr><td>Diskon Produk</td><td style="text-align:right">${money(order.productDiscount || 0)}</td></tr><tr><td style="padding-top:12px">Ongkos Kirim:</td><td style="text-align:right;padding-top:12px">${money(order.shipping.originalFee ?? order.shipping.fee)}</td></tr><tr style="border-top:1px solid #e6ded3"><td style="padding:20px 0"><strong>Total order</strong></td><td style="text-align:right"><strong>${money(order.total)}</strong></td></tr></table><p style="font-size:12px;line-height:1.9;color:#847563">${esc(order.shipping.methodName || 'Reguler')} · ${esc(order.payment?.name || 'QRIS manual')}<br>${esc(customer.name)} · ${esc(customer.phone)}<br>${esc([customer.address, customer.district, customer.city, customer.zip].filter(Boolean).join(', '))}</p><p style="border-top:1px solid #e6ded3;padding-top:24px;font-size:12px;color:#968774;text-align:center">Butuh bantuan? <a href="mailto:tanj.indonesia@gmail.com" style="color:#75624e">Hubungi TANJ</a></p></main></body></html>`;
  return {
    subject: title,
    to: audience === 'admin' ? 'tanj.indonesia@gmail.com' : customer.email,
    html,
    text,
    url,
  };
}
