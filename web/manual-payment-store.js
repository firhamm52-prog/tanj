import {customerSession} from './customer-account.js?v=improve-2';
import {normalizePaymentReview} from '../shared/payment-review.js';
import {cloudEnabled,cloudPayments,refreshPayments,paymentRPC,createCloudPayment} from './supabase-payments.js?v=improve-2';
export {refreshPayments};
import {validateShippingDestination} from './shipping.js?v=districts-1';
export const PAYMENT_KEY='tanj-manual-payments-demo-v1';
export const paymentLabels={WAITING_PAYMENT:'Menunggu pembayaran',CHECKING:'Menunggu verifikasi',NEEDS_HELP:'Perlu bantuan admin',REVIEW_DUE:'Menunggu pembayaran',PAID:'Payment berhasil',REJECTED:'Pembayaran ditolak',CANCELLED:'Dibatalkan'};
export const money=value=>'Rp'+Number(value).toLocaleString('id-ID');
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=()=>({version:1,orders:[],settings:{hours:24,admin:'Admin TANJ'}});
export function readPayments(){if(cloudEnabled)return cloudPayments();try{const raw=localStorage.getItem(PAYMENT_KEY);if(!raw)return empty();const result=JSON.parse(raw);if(result.version!==1||!Array.isArray(result.orders)||!result.settings)throw Error();return result;}catch{throw Error('Simulasi tidak dapat dibaca. Izinkan penyimpanan browser atau coba browser lain.');}}
export function orderStatus(order){return order.status==='WAITING_PAYMENT'&&Date.now()>order.deadline?'REVIEW_DUE':order.status;}
export function subscribePayments(callback){const storage=e=>{if(e.key===PAYMENT_KEY||e.key===null)callback();};window.addEventListener('storage',storage);window.addEventListener('tanj-payments-change',callback);return ()=>{window.removeEventListener('storage',storage);window.removeEventListener('tanj-payments-change',callback);};}
async function mutate(action){const perform=()=>{const state=readPayments();const result=action(state);try{localStorage.setItem(PAYMENT_KEY,JSON.stringify(state));}catch{throw Error('Browser tidak bisa menyimpan simulasi. Hapus bukti contoh yang besar atau izinkan penyimpanan, lalu coba lagi.');}window.dispatchEvent(new Event('tanj-payments-change'));return result;};return navigator.locks? navigator.locks.request(PAYMENT_KEY,perform):perform();}
function log(order,to,actor,note){const from=orderStatus(order);order.status=to;order.version++;order.logs.push({from,to,actor,note,at:Date.now()});}
function required(value,max,label){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(label+' belum valid.');return value.trim();}
export async function createPayment(customer,lines,catalog){
 const owner=customerSession();if(!owner)throw Error('Login customer terlebih dahulu.');
 if(customer.paymentMethod&&customer.paymentMethod!=='qris-manual')throw Error('Metode gateway belum aktif. Gunakan QRIS manual.');
 customer={...customer,email:owner.email};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(owner.email||'')))throw Error('Email akun belum valid. Login kembali.');
 const delivery=await validateShippingDestination(customer.provinceId,customer.cityId,customer.districtId,customer.zip);
 if(cloudEnabled)return createCloudPayment({...customer,district:delivery.district},lines);
 return mutate(state=>{
  const name=required(customer.name,80,'Nama'),phone=required(customer.phone,20,'Nomor WhatsApp'),address=required(customer.address,500,'Alamat'),zip=required(customer.zip,5,'Kode pos');
  if(!/^\d{5}$/.test(zip))throw Error('Kode pos harus 5 angka.');if(!/^[+() .\d-]{8,20}$/.test(phone))throw Error('Nomor WhatsApp belum valid.');
  const carriers={'jt-regular':'J&T Reguler','jne-regular':'JNE Reguler','lion-regpack':'Lion Parcel Reg Pack'};if(customer.shippingMethod&&!carriers[customer.shippingMethod])throw Error('Metode pengiriman tidak valid.');const shipping={...delivery.shipping,method:customer.shippingMethod||'jt-regular',methodName:carriers[customer.shippingMethod||'jt-regular']};
  if(!Array.isArray(lines)||!lines.length||lines.length>40)throw Error('Tas belanja kosong atau tidak valid.');const seen=new Set();
  const items=lines.map(line=>{const item=catalog.find(p=>p.id===line.id&&p.status!=='draft'&&p.inStock!==false);if(!item||seen.has(line.id)||!Number.isInteger(line.qty)||line.qty<1||line.qty>99)throw Error('Pilihan produk berubah. Periksa tas belanja.');seen.add(line.id);if(!Number.isInteger(item.stock)||line.qty>item.stock)throw Error('Stok produk tidak cukup. Kurangi jumlah di tas belanja.');return {id:item.id,name:item.name,color:item.colorName||'',qty:line.qty,price:item.price};});
  const subtotal=items.reduce((n,i)=>n+i.qty*i.price,0),base=subtotal+shipping.fee;if(!Number.isSafeInteger(base)||base<0)throw Error('Harga tidak valid.');
  const used=new Set(state.orders.filter(o=>!['PAID','CANCELLED'].includes(o.status)).map(o=>o.code));const free=Array.from({length:999},(_,i)=>i+1).filter(i=>!used.has(i));if(!free.length)throw Error('Antrean simulasi penuh. Periksa pesanan atau reset simulasi di admin.');const random=crypto.getRandomValues(new Uint32Array(1))[0];const code=free[random%free.length],adjustment=(code-base%1000+1000)%1000;
  const at=Date.now();const order={customerId:owner.id,payment:{id:'qris-manual',name:'QRIS manual'},id:'TANJ-'+[items[0].name.replace(/^TANJ[ -]+/i,''),items[0].color].filter(Boolean).join('-').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65)+'-'+crypto.randomUUID().slice(0,8).toUpperCase(),customer:{name,phone,email:String(customer.email||'').trim().slice(0,120),address,province:shipping.province,provinceId:shipping.provinceId,city:shipping.city,cityId:shipping.id,districtId:delivery.districtId,district:delivery.district,zip,note:String(customer.note||'').slice(0,300)},items,shipping,subtotal,code,adjustment,total:base+adjustment,status:'WAITING_PAYMENT',createdAt:at,deadline:at+state.settings.hours*3600000,version:1,proofs:[],logs:[{from:null,to:'WAITING_PAYMENT',actor:'Pembeli',note:'Pesanan simulasi dibuat; bukti tidak wajib.',at}],review:null};state.orders.push(order);return order;
 });
}
export async function buyerUpdate(id,action,payload){
 if(cloudEnabled){const order=readPayments().orders.find(o=>o.id===id);if(!order)throw Error('Pesanan tidak ditemukan.');return paymentRPC('tanj_update_order',{order_id:id,expected_version:order.version,action,payload:payload||{}});}
 return mutate(state=>{const order=state.orders.find(o=>o.id===id);if(!order)throw Error('Pesanan tidak ditemukan.');const status=orderStatus(order);if(['PAID','CANCELLED'].includes(status))throw Error('Status pesanan sudah berubah. Muat ulang pesanan.');
  if(action==='confirm'){if(status==='CHECKING')return order;log(order,'CHECKING','Pembeli','Pembeli menyatakan sudah bayar. Dana tetap perlu dicocokkan admin.');}
  else if(action==='proof'){if(!payload||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(payload.data)||payload.data.length>1450000)throw Error('Bukti harus gambar JPG, PNG, atau WebP maksimal 1 MB.');order.proofs.push({name:String(payload.name).slice(0,120),data:payload.data,at:Date.now()});log(order,'CHECKING','Pembeli','Bukti opsional ditambahkan; bukan bukti dana masuk.');}
  else if(action==='cancel'){if(!['WAITING_PAYMENT','REVIEW_DUE'].includes(status))throw Error('Hubungi admin untuk membatalkan pesanan yang sedang diperiksa.');log(order,'CANCELLED','Pembeli','Pembeli menyatakan belum membayar dan membatalkan simulasi.');}
  else throw Error('Aksi tidak tersedia.');return order;
 });
}
export async function reviewPayment(id,version,action,input){
 if(action==='approve')input=normalizePaymentReview(input);
 if(cloudEnabled)return paymentRPC('tanj_update_order',{order_id:id,expected_version:version,action,payload:input});
 return mutate(state=>{const order=state.orders.find(o=>o.id===id);if(!order||order.version!==version||order.status==='PAID')throw Error('Status pesanan sudah berubah. Periksa ulang data terbaru.');const admin=state.settings.admin;
  if(action==='approve'){
   if(input.checked!==true)throw Error('Cocokkan dana masuk sebelum menyetujui.');if(Number(input.amount)!==order.total)throw Error('Nominal transaksi tidak sama dengan tagihan. Pilih Perlu bantuan; jangan minta pembeli membayar ulang.');const reference=required(input.reference,100,'Referensi transaksi');if(state.orders.some(o=>o.id!==id&&o.review?.reference.toLowerCase()===reference.toLowerCase()))throw Error('Referensi transaksi ini sudah dipakai pada pesanan lain.');const paidAt=new Date(input.paidAt).getTime();if(!Number.isFinite(paidAt)||paidAt>Date.now()+60000)throw Error('Waktu transaksi belum valid.');order.review={amount:order.total,reference,paidAt,admin};log(order,'PAID',admin,'Dana simulasi dicocokkan: '+reference+'. '+required(input.note,300,'Catatan pemeriksaan'));}
  else if(action==='reject'){log(order,'REJECTED',admin,required(input.note,300,'Alasan penolakan'));}
  else if(action==='help'){log(order,'NEEDS_HELP',admin,required(input.note,300,'Catatan bantuan'));}
  else throw Error('Aksi tidak tersedia.');return order;
 });
}
export async function savePaymentSettings(input){if(cloudEnabled)throw Error('Pengaturan online dikelola melalui Supabase.');return mutate(state=>{const hours=Number(input.hours);if(!Number.isInteger(hours)||hours<1||hours>72)throw Error('Batas bayar harus 1–72 jam.');state.settings={...state.settings,hours,admin:required(input.admin,80,'Nama admin')};});}
export async function resetPayments(){if(cloudEnabled)throw Error('Reset pesanan online tidak tersedia.');return mutate(state=>{Object.assign(state,empty());});}

export async function savePaymentQR(image){
 if(image!==null&&(!image||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image.data)||image.data.length>1450000))throw Error('Gambar QRIS harus JPG, PNG, atau WebP maksimal 1 MB.');
 if(cloudEnabled)return paymentRPC('tanj_save_qris',{image:image?{data:image.data,name:String(image.name||'QRIS').slice(0,120)}:null});
 return mutate(state=>{state.settings.qris=image?{data:image.data,name:String(image.name||'QRIS').slice(0,120)}:null;});
}
export async function decidePayment(id,version,decision,checked=false){
 if(cloudEnabled)return paymentRPC('tanj_decide_payment',{order_id:id,expected_version:version,decision,checked});
 return mutate(state=>{const order=state.orders.find(o=>o.id===id);if(!order||order.version!==version||['PAID','CANCELLED'].includes(order.status))throw Error('Status pesanan sudah berubah. Muat ulang.');if(!['approve','reject'].includes(decision))throw Error('Aksi tidak tersedia.');if(decision==='approve'&&!checked)throw Error('Cocokkan dana masuk sebelum menyetujui.');if(decision==='approve')order.review={amount:order.total,admin:state.settings.admin,reviewedAt:Date.now()};log(order,decision==='approve'?'PAID':'REJECTED',state.settings.admin,decision==='approve'?'Pembayaran disetujui setelah pemeriksaan admin.':'Pembayaran ditolak oleh admin. Hubungi CS untuk bantuan.');return order;});
}
export async function saveTracking(id,version,courier,number){
 courier=String(courier||'').trim();number=String(number||'').trim();if(!courier||courier.length>80||!/^[A-Za-z0-9][A-Za-z0-9 ./_-]{0,79}$/.test(number))throw Error('Isi kurir dan nomor resi yang valid.');
 if(cloudEnabled)return paymentRPC('tanj_save_tracking',{order_id:id,expected_version:version,courier,tracking_number:number});
 return mutate(state=>{const order=state.orders.find(o=>o.id===id);if(!order||order.status!=='PAID'||order.version!==version)throw Error('Resi hanya dapat disimpan pada pembayaran berhasil. Muat ulang pesanan.');order.tracking={courier,number,updatedAt:Date.now()};log(order,'PAID',state.settings.admin,'Nomor resi diperbarui: '+courier+' / '+number);return order;});
}
