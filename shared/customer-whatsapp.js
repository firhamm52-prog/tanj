import {orderPaymentUrl} from './order-email.js';
export function customerWhatsAppLink(order,status,baseUrl){
 const raw=String(order.customer?.phone||'').trim();if(!/^\+?[0-9\s().-]+$/.test(raw))return null;
 let phone=raw.replace(/[\s().-]/g,'').replace(/^\+/,'');if(phone.startsWith('08'))phone='62'+phone.slice(1);else if(phone.startsWith('8')&&!raw.startsWith('+'))phone='62'+phone;
 if(!/^[1-9][0-9]{7,14}$/.test(phone))return null;
 const money=value=>'Rp'+Number(value||0).toLocaleString('id-ID');
 const text=['Halo '+order.customer.name+',','Berikut detail pesanan kamu di TANJ.','','Nomor pesanan: '+order.id,'Status: '+status,...order.items.map(i=>i.name+(i.color?' / '+i.color:'')+' x '+i.qty),'','Subtotal: '+money(order.subtotal),'Ongkir: '+money(order.shipping.fee),'Penyesuaian kode unik: '+money(order.adjustment),'Total pesanan: '+money(order.total),'',order.status==='WAITING_PAYMENT'?'Cek cara membayar:':'Lihat detail pesanan:',orderPaymentUrl(baseUrl,order.id),'Login dengan akun pemesan untuk membuka detail.',...(order.tracking?['','Kurir: '+order.tracking.courier,'Nomor resi: '+order.tracking.number]:[]),'','Terima kasih, TANJ'].join('\n');
 return 'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
}
