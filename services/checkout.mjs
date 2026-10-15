import {randomUUID,randomBytes,randomInt} from 'node:crypto';

import {openDatabase} from './db.mjs';

import {config} from './config.mjs';

import {json,body,error,service} from './http.mjs';

const db=openDatabase('orders');

const demo=process.env.CHECKOUT_DEMO==='true';

const qris=process.env.QRIS_IMAGE||'';

const ready=()=>{if(!demo&&(!process.env.RAJAONGKIR_API_KEY||!process.env.SHIPPING_ORIGIN_ID||!/^\/assets\/[\w.-]+\.(png|webp|jpg)$/.test(qris)))error(503,'Pembayaran belum tersedia. Admin perlu mengatur QRIS dan API ongkir.');};

async function provider(path,form){

 try{const response=await fetch('https://rajaongkir.komerce.id/api/v1/'+path,{method:form?'POST':'GET',headers:{key:process.env.RAJAONGKIR_API_KEY,...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams(form):undefined,signal:AbortSignal.timeout(7000)});const result=await response.json();if(!response.ok||!Array.isArray(result.data))throw Error();return result.data;}catch{error(503,'Layanan ongkir belum merespons. Silakan coba kembali.');}

}

function text(value,max){if(typeof value!=='string'||!value.trim()||value.length>max)error(422,'Data pesanan tidak valid.');return value.trim();}

function expire(){db.prepare("UPDATE orders SET status='expired' WHERE status IN ('awaiting_payment','rejected') AND expires<?").run(Date.now());}

async function price(lines){

 if(!Array.isArray(lines)||!lines.length||lines.length>40)error(422,'Tas tidak valid.');

 const catalog=await service(config.catalogPort,'/state');const seen=new Set();

 return lines.map(line=>{const p=catalog.products.find(p=>p.id===line.id&&p.status==='published');if(!p||seen.has(line.id)||!Number.isInteger(line.qty)||line.qty<1||line.qty>99)error(422,'Produk atau jumlah tidak valid.');seen.add(line.id);return {id:p.id,name:p.name,color:p.colorName,qty:line.qty,price:p.price,stock:p.stock};});

}

function available(lines){expire();const held=db.prepare("SELECT document FROM orders WHERE status IN ('awaiting_payment','pending_review','rejected','approved')").all().flatMap(row=>JSON.parse(row.document).items);for(const line of lines){const reserved=held.filter(x=>x.id===line.id).reduce((n,x)=>n+x.qty,0);if(line.qty>line.stock-reserved)error(409,'Stok tidak cukup. Periksa kembali pilihan produk.');}}

const read=id=>{expire();const row=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!row)error(404,'Pesanan tidak ditemukan.');return row;};

const view=row=>({...JSON.parse(row.document),id:row.id,status:row.status,expires:row.expires,notification:row.notification,reviewNote:row.review_note,demo:JSON.parse(row.document).demo,qris:JSON.parse(row.document).demo?'':qris});

const requests=new Map();
export async function checkoutPublic(req,res,path){
 if(req.method==='POST'){const now=Date.now();for(const [key,value] of requests)if(value.until<now)requests.delete(key);const key=req.socket.remoteAddress;const count=requests.get(key)||{until:now+600000,n:0};if(++count.n>100)error(429,'Terlalu banyak permintaan. Coba beberapa menit lagi.');requests.set(key,count);}

 if(path==='/api/checkout/config'&&req.method==='GET'){return json(res,200,{demo,ready:demo||!!(process.env.RAJAONGKIR_API_KEY&&process.env.SHIPPING_ORIGIN_ID&&qris)});}

 if(path==='/api/shipping/destinations'&&req.method==='POST'){

 ready();const input=await body(req);const search=text(input.search,80);if(search.length<3)error(422,'Ketik minimal 3 karakter.');return json(res,200,demo?[{id:1,label:'SIMULASI — tujuan Indonesia'}]:await provider('destination/domestic-destination?'+new URLSearchParams({search,limit:'10',offset:'0'})));

 }

 if(path==='/api/shipping/quotes'&&req.method==='POST'){

 ready();const input=await body(req);const items=await price(input.items);available(items);const destination=Number(input.destination);if(!Number.isSafeInteger(destination)||destination<1)error(422,'Pilih tujuan pengiriman.');

 const weight=Number(process.env.PRODUCT_WEIGHT_GRAMS||0);if(!demo&&(!Number.isInteger(weight)||weight<1))error(503,'Berat paket belum diatur admin.');

 const rates=demo?[{code:'jnt',service:'DEMO',cost:20000,etd:'Simulasi'},{code:'jne',service:'DEMO',cost:25000,etd:'Simulasi'}]:await provider('calculate/domestic-cost',{origin:process.env.SHIPPING_ORIGIN_ID,destination:String(destination),weight:String(items.reduce((n,x)=>n+x.qty,0)*weight),courier:'jnt:jne',price:'lowest'});

 const quotes=rates.filter(r=>['jnt','jne'].includes(r.code)&&Number.isInteger(Number(r.cost))&&Number(r.cost)>0).map(r=>{const id=randomUUID();db.prepare('INSERT INTO quotes VALUES(?,?,?)').run(id,JSON.stringify({items:items.map(({stock,...x})=>x),destination,code:r.code,service:r.service,cost:Number(r.cost),etd:r.etd}),Date.now()+600000);return {id,...r};});return json(res,200,quotes);

 }

 if(path==='/api/orders'&&req.method==='POST'){

 ready();const input=await body(req);const name=text(input.name,80),address=text(input.address,500);let phone=text(input.phone,20).replace(/[+() .-]/g,'').replace(/^0/,'62');if(!/^\d{10,15}$/.test(phone))error(422,'Nomor WhatsApp tidak valid.');if(input.consent!==true)error(422,'Setujui notifikasi pesanan WhatsApp.');const note=input.note?text(input.note,300):'';

 const quote=db.prepare('SELECT * FROM quotes WHERE id=? AND expires>?').get(String(input.quote),Date.now());if(!quote)error(409,'Ongkir kedaluwarsa. Hitung ulang ongkir.');const shipping=JSON.parse(quote.document);const latest=await price(shipping.items);if(latest.some((p,i)=>p.price!==shipping.items[i].price))error(409,'Harga berubah. Hitung ulang ongkir.');

 db.exec('BEGIN IMMEDIATE');try{if(!db.prepare('SELECT id FROM quotes WHERE id=? AND expires>?').get(input.quote,Date.now()))error(409,'Ongkir sudah digunakan atau kedaluwarsa.');available(latest);const used=new Set(db.prepare("SELECT suffix FROM orders WHERE status IN ('awaiting_payment','pending_review','rejected')").all().map(x=>x.suffix));const codes=Array.from({length:999},(_,i)=>i+1).filter(n=>!used.has(n));if(!codes.length)error(409,'Antrean pembayaran penuh. Coba lagi nanti.');const suffix=codes[randomInt(codes.length)];const subtotal=latest.reduce((n,x)=>n+x.price*x.qty,0),base=subtotal+shipping.cost,adjustment=(suffix-base%1000+1000)%1000;const id=randomUUID(),token=randomBytes(32).toString('hex');const document={demo,name,phone,address,note,items:shipping.items,shipping,subtotal,adjustment,suffix,total:base+adjustment,consent:true,created:Date.now()};db.prepare('INSERT INTO orders(id,token,document,status,suffix,expires) VALUES(?,?,?,?,?,?)').run(id,token,JSON.stringify(document),'awaiting_payment',suffix,Date.now()+86400000);db.prepare('DELETE FROM quotes WHERE id=?').run(input.quote);db.exec('COMMIT');return json(res,201,{...view(read(id)),token});}catch(err){db.exec('ROLLBACK');throw err;}

 }

 const match=path.match(/^\/api\/orders\/([\w-]+)(\/proof)?$/);if(!match)return false;

 const row=read(match[1]);if(req.headers.authorization!==`Bearer ${row.token}`)error(404,'Pesanan tidak ditemukan.');

 if(req.method==='GET'&&!match[2])return json(res,200,view(row));

 if(req.method==='POST'&&match[2]){

 if(!['awaiting_payment','rejected'].includes(row.status))error(409,'Pesanan tidak menerima bukti baru.');

 const input=await body(req,6*1024*1024);const proof=String(input.proof||'');const match=proof.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!match)error(422,'Gunakan gambar JPG, PNG, atau WebP.');const bytes=Buffer.from(match[2],'base64');if(bytes.length>4*1024*1024||bytes.length<12)error(422,'Ukuran gambar maksimal 4 MB.');const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid)error(422,'Isi gambar tidak valid.');db.prepare("UPDATE orders SET proof=?,status='pending_review',review_note='' WHERE id=?").run(proof,row.id);return json(res,200,view(read(row.id)));

 }error(405,'Metode tidak diizinkan.');

}

export async function checkoutAdmin(req,res,path,user){

 if(path==='/api/admin/orders'&&req.method==='GET'){expire();return json(res,200,db.prepare('SELECT * FROM orders ORDER BY rowid DESC LIMIT 200').all().map(row=>({...view(row),hasProof:!!row.proof})));}

 const match=path.match(/^\/api\/admin\/orders\/([\w-]+)\/(proof|approve|reject|notify)$/);if(!match)return false;let row=read(match[1]);

 if(match[2]==='proof'&&req.method==='GET')return json(res,200,{proof:row.proof});

 if(req.method!=='POST')error(405,'Metode tidak diizinkan.');

 const input=await body(req);

 if(['approve','reject'].includes(match[2])){if(row.status!=='pending_review'||!row.proof)error(409,'Pesanan tidak sedang menunggu verifikasi.');const status=match[2]==='approve'?'approved':'rejected';db.prepare('UPDATE orders SET status=?,review_note=?,reviewed_by=?,notification=? WHERE id=?').run(status,status==='rejected'?text(input.note,300):'',user.email,status==='approved'?'pending':'none',row.id);}

 row=read(row.id);if(row.status==='approved'&&match[2]!=='reject')await notify(row);return json(res,200,view(read(row.id)));

}

async function notify(row){

 if(row.notification==='submitted'||row.notification==='sending')return;

 const env=process.env;if(JSON.parse(row.document).demo){db.prepare("UPDATE orders SET notification='not_configured' WHERE id=?").run(row.id);return;}if(!env.WHATSAPP_TOKEN||!env.WHATSAPP_PHONE_ID||!env.WHATSAPP_TEMPLATE||!/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION||'')){db.prepare("UPDATE orders SET notification='not_configured' WHERE id=?").run(row.id);return;}

 db.prepare("UPDATE orders SET notification='sending' WHERE id=?").run(row.id);const order=JSON.parse(row.document);

 try{const response=await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${env.WHATSAPP_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:order.phone,type:'template',template:{name:env.WHATSAPP_TEMPLATE,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE||'id'},components:[{type:'body',parameters:[order.name,row.id,String(order.total)].map(text=>({type:'text',text}))}]}}),signal:AbortSignal.timeout(8000)});const result=await response.json();if(!response.ok||!result.messages?.[0]?.id)throw Error();db.prepare("UPDATE orders SET notification='submitted' WHERE id=?").run(row.id);}catch{db.prepare("UPDATE orders SET notification='failed' WHERE id=?").run(row.id);}

}

