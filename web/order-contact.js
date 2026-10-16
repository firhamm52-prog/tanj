import { sitePreferences } from './site-preferences.js';
export const orderContacts = Object.freeze({
  whatsapp: '6281363661703',
  email: 'tanj.indonesia@gmail.com',
});

export function orderContactLinks(order, status) {
  const orderContacts = sitePreferences();
  const c = order.customer;
  const body = [
    'PESANAN TANJ',
    'Nomor: ' + order.id,
    'Status: ' + status,
    'Nama: ' + c.name,
    'WhatsApp pembeli: ' + c.phone,
    'Email customer: ' + (c.email || '-'),
    'Alamat: ' + c.address,
    [c.district, c.city, c.province, c.zip].filter(Boolean).join(', '),
    '',
    ...order.items.map(
      (i) =>
        i.name +
        (i.color ? ' / ' + i.color : '') +
        ' x ' +
        i.qty +
        ' = Rp' +
        (i.qty * i.price).toLocaleString('id-ID'),
    ),
    '',
    'Subtotal: Rp' + order.subtotal.toLocaleString('id-ID'),
    'Ongkir: Rp' + order.shipping.fee.toLocaleString('id-ID'),
    'Kode unik: Rp' + order.adjustment.toLocaleString('id-ID'),
    'Total pembayaran: Rp' + order.total.toLocaleString('id-ID'),
    'Catatan: ' + (c.note || '-'),
    'Pembayaran memerlukan verifikasi admin.',
  ].join('\n');
  return {
    gmail:
      'https://mail.google.com/mail/?' +
      new URLSearchParams({
        view: 'cm',
        fs: '1',
        to: orderContacts.email,
        su: 'Bantuan TANJ',
      }).toString(),
    whatsapp: 'https://wa.me/' + orderContacts.whatsapp + '?text=' + encodeURIComponent(body),
    email:
      'mailto:' +
      orderContacts.email +
      '?cc=' +
      encodeURIComponent(c.email || '') +
      '&subject=' +
      encodeURIComponent('Pesanan TANJ ' + order.id) +
      '&body=' +
      encodeURIComponent(body),
  };
}
