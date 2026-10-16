export const orderContacts = Object.freeze({whatsapp:'6281363661703', email:'tanj.indonesia@gmail.com'});

export function orderContactLinks(order, status) {
 const c=order.customer;
 const body=[
  'PESANAN TANJ - SIMULASI',
  'Nomor: '+order.id,
  'Status: '+status,
  'Nama: '+c.name,
  'WhatsApp pembeli: '+c.phone,
  'Alamat: '+c.address,
  [c.district,c.city,c.province,c.zip].filter(Boolean).join(', '),
  '',
  ...order.items.map(i=>i.name+(i.color?' / '+i.color:'')+' x '+i.qty+' = Rp'+(i.qty*i.price).toLocaleString('id-ID')),
  '',
  'Subtotal: Rp'+order.subtotal.toLocaleString('id-ID'),
  'Perkiraan ongkir: Rp'+order.shipping.fee.toLocaleString('id-ID'),
  'Penyesuaian kode unik: Rp'+order.adjustment.toLocaleString('id-ID'),
  'Total simulasi: Rp'+order.total.toLocaleString('id-ID'),
  'Catatan: '+(c.note||'-'),
  'Ini pesanan simulasi; pembayaran belum diverifikasi.'
 ].join('\n');
 return {
  whatsapp:'https://wa.me/'+orderContacts.whatsapp+'?text='+encodeURIComponent(body),
  email:'mailto:'+orderContacts.email+'?subject='+encodeURIComponent('Pesanan TANJ '+order.id)+'&body='+encodeURIComponent(body)
 };
}
