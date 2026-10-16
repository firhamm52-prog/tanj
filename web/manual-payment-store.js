export const PAYMENT_KEY='tanj-manual-payments-demo-v1';
export const shippingMethods=[{id:'regular',name:'Reguler (contoh tarif)',fee:15000,estimate:'2–4 hari (simulasi)'},{id:'instant',name:'Instan (contoh area lokal)',fee:25000,estimate:'Hari ini (simulasi, bukan seluruh Indonesia)'}];
export const paymentLabels={WAITING_PAYMENT:'Menunggu pembayaran',CHECKING:'Menunggu pengecekan admin',NEEDS_HELP:'Perlu bantuan admin',REVIEW_DUE:'Batas waktu lewat · perlu diperiksa',PAID:'Pembayaran diterima',CANCELLED:'Pesanan dibatalkan'};
export const money=value=>'Rp'+Number(value).toLocaleString('id-ID');
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=()=>({version:1,orders:[],settings:{hours:24,admin:'Admin TANJ'}});
export function readPayments(){try{const raw=localStorage.getItem(PAYMENT_KEY);if(!raw)return empty();const result=JSON.parse(raw);if(result.version!==1||!Array.isArray(result.orders)||!result.settings)throw Error();return result;}catch{throw Error('Simulasi tidak dapat dibaca. Izinkan penyimpanan browser atau coba browser lain.');}}
export function orderStatus(order){return order.status==='WAITING_PAYMENT'&&Date.now()>order.deadline?'REVIEW_DUE':order.status;}
export function subscribePayments(callback){const storage=e=>{if(e.key===PAYMENT_KEY||e.key===null)callback();};window.addEventListener('storage',storage);window.addEventListener('tanj-payments-change',callback);return ()=>{window.removeEventListener('storage',storage);window.removeEventListener('tanj-payments-change',callback);};}
async function mutate(action){const perform=()=>{const state=readPayments();const result=action(state);try{localStorage.setItem(PAYMENT_KEY,JSON.stringify(state));}catch{throw Error('Browser tidak bisa menyimpan simulasi. Hapus bukti contoh yang besar atau izinkan penyimpanan, lalu coba lagi.');}window.dispatchEvent(new Event('tanj-payments-change'));return result;};return navigator.locks? navigator.locks.request(PAYMENT_KEY,perform):perform();}
function log(order,to,actor,note){const from=orderStatus(order);order.status=to;order.version++;order.logs.push({from,to,actor,note,at:Date.now()});}
function required(value,max,label){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(label+' belum valid.');return value.trim();}
export async function createPayment(customer,lines,catalog){
 return mutate(state=>{
  const name=required(customer.name,80,'Nama'),phone=required(customer.phone,20,'Nomor WhatsApp'),address=required(customer.address,500,'Alamat'),city=required(customer.city,100,'Kota/kecamatan'),zip=required(customer.zip,5,'Kode pos');
  if(!/^\d{5}$/.test(zip))throw Error('Kode pos harus 5 angka.');if(!/^[+() .\d-]{8,20}$/.test(phone))throw Error('Nomor WhatsApp belum valid.');
  const shipping=shippingMethods.find(s=>s.id===customer.shipping);if(!shipping)throw Error('Pilih metode pengiriman.');
  if(!Array.isArray(lines)||!lines.length||lines.length>40)throw Error('Tas belanja kosong atau tidak valid.');const seen=new Set();
  const items=lines.map(line=>{const item=catalog.find(p=>p.id===line.id&&p.status!=='draft'&&p.inStock!==false);if(!item||seen.has(line.id)||!Number.isInteger(line.qty)||line.qty<1||line.qty>99)throw Error('Pilihan produk berubah. Periksa tas belanja.');seen.add(line.id);const held=state.orders.filter(o=>o.status!=='CANCELLED').flatMap(o=>o.items).filter(i=>i.id===line.id).reduce((n,i)=>n+i.qty,0);if(line.qty>item.stock-held)throw Error('Stok simulasi tidak cukup. Kurangi jumlah atau reset simulasi pembayaran di admin.');return {id:item.id,name:item.name,color:item.colorName||'',qty:line.qty,price:item.price};});
  const subtotal=items.reduce((n,i)=>n+i.qty*i.price,0),base=subtotal+shipping.fee;if(!Number.isSafeInteger(base)||base<0)throw Error('Harga tidak valid.');
  const used=new Set(state.orders.filter(o=>!['PAID','CANCELLED'].includes(o.status)).map(o=>o.code));const free=Array.from({length:999},(_,i)=>i+1).filter(i=>!used.has(i));if(!free.length)throw Error('Antrean simulasi penuh. Periksa pesanan atau reset simulasi di admin.');const random=crypto.getRandomValues(new Uint32Array(1))[0];const code=free[random%free.length],adjustment=(code-base%1000+1000)%1000;
  const at=Date.now();const order={id:'TANJ-'+new Date(at).toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomUUID().slice(0,8).toUpperCase(),customer:{name,phone,address,city,zip,note:String(customer.note||'').slice(0,300)},items,shipping,subtotal,code,adjustment,total:base+adjustment,status:'WAITING_PAYMENT',createdAt:at,deadline:at+state.settings.hours*3600000,version:1,proofs:[],logs:[{from:null,to:'WAITING_PAYMENT',actor:'Pembeli',note:'Pesanan simulasi dibuat; bukti tidak wajib.',at}],review:null};state.orders.push(order);return order;
 });
}
export async function buyerUpdate(id,action,payload){
 return mutate(state=>{const order=state.orders.find(o=>o.id===id);if(!order)throw Error('Pesanan tidak ditemukan.');const status=orderStatus(order);if(['PAID','CANCELLED'].includes(status))throw Error('Status pesanan sudah berubah. Muat ulang pesanan.');
  if(action==='confirm'){if(status==='CHECKING')return order;log(order,'CHECKING','Pembeli','Pembeli menyatakan sudah bayar. Dana tetap perlu dicocokkan admin.');}
  else if(action==='proof'){if(!payload||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(payload.data)||payload.data.length>1450000)throw Error('Bukti harus gambar JPG, PNG, atau WebP maksimal 1 MB.');order.proofs.push({name:String(payload.name).slice(0,120),data:payload.data,at:Date.now()});log(order,'CHECKING','Pembeli','Bukti opsional ditambahkan; bukan bukti dana masuk.');}
  else if(action==='cancel'){if(!['WAITING_PAYMENT','REVIEW_DUE'].includes(status))throw Error('Hubungi admin untuk membatalkan pesanan yang sedang diperiksa.');log(order,'CANCELLED','Pembeli','Pembeli menyatakan belum membayar dan membatalkan simulasi.');}
  else throw Error('Aksi tidak tersedia.');return order;
 });
}
export async function reviewPayment(id,version,action,input){
 return mutate(state=>{const order=state.orders.find(o=>o.id===id);if(!order||order.version!==version||order.status==='PAID')throw Error('Status pesanan sudah berubah. Periksa ulang data terbaru.');const admin=state.settings.admin;
  if(action==='approve'){
   if(input.checked!==true)throw Error('Cocokkan dana masuk sebelum menyetujui.');if(Number(input.amount)!==order.total)throw Error('Nominal transaksi tidak sama dengan tagihan. Pilih Perlu bantuan; jangan minta pembeli membayar ulang.');const reference=required(input.reference,100,'Referensi transaksi');if(state.orders.some(o=>o.id!==id&&o.review?.reference.toLowerCase()===reference.toLowerCase()))throw Error('Referensi transaksi ini sudah dipakai pada pesanan lain.');const paidAt=new Date(input.paidAt).getTime();if(!Number.isFinite(paidAt)||paidAt>Date.now()+60000)throw Error('Waktu transaksi belum valid.');order.review={amount:order.total,reference,paidAt,admin};log(order,'PAID',admin,'Dana simulasi dicocokkan: '+reference+'. '+required(input.note,300,'Catatan pemeriksaan'));}
  else if(action==='help'){log(order,'NEEDS_HELP',admin,required(input.note,300,'Catatan bantuan'));}
  else throw Error('Aksi tidak tersedia.');return order;
 });
}
export async function savePaymentSettings(input){return mutate(state=>{const hours=Number(input.hours);if(!Number.isInteger(hours)||hours<1||hours>72)throw Error('Batas bayar harus 1–72 jam.');state.settings={hours,admin:required(input.admin,80,'Nama admin')};});}
export async function resetPayments(){return mutate(state=>{Object.assign(state,empty());});}
