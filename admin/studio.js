import {DEFAULT_PRODUCT_PRICE} from '../shared/seed.js';
import {isApi,request,loadAdmin,save,remove,publish,resetDemo} from '../web/data.js';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>'Rp'+Number(value).toLocaleString('id-ID');
const asset=value=>/^assets\/[\w.-]+$/.test(value)?'../'+value:/^https:\/\//.test(value)?value:'';
const image=value=>`<img src="${esc(asset(value))}" alt="" loading="lazy">`;
let state,tab='overview',query='',filter='all',editing=null;
const tabs={overview:['Ringkasan','Ruang untuk mengelola setiap detail koleksimu.'],products:['Produk','Atur varian, harga, stok, dan foto koleksi TANJ.'],hijabs:['Hijab','Kelola harga dan ketersediaan Selcuk & Georgia.'],collections:['Koleksi','Berikan tempat untuk setiap cerita dan siluet.'],content:['Konten website','Susun tampilan beranda melalui video, banner, dan lookbook.'],settings:['Pengaturan','Kelola sesi dan salinan data workspace.']};
function error(message,target='#global-error'){const el=$(target);el.textContent=message;el.hidden=!message;}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4500)}
async function busy(button,action){if(button.disabled)return;button.disabled=true;try{await action()}catch(err){error(err.message)}finally{button.disabled=false}}
async function refresh(){state=await loadAdmin();render();$('#workspace').setAttribute('aria-busy','false')}
async function openApp(){await refresh();$('#login-screen').hidden=true;$('#app').hidden=false;}
$('#demo-credentials').hidden=isApi;
if(!isApi){$('#login-form').elements.email.value='admin@tanj.test';$('#login-form').elements.password.value='demo123';}
$('#mode-label').textContent=isApi?'Backend terhubung':'Simulasi aktif';
$('#mode-banner').textContent=isApi?'Perubahan disimpan ke database sebagai draf. Klik Publikasikan untuk memperbarui website.':'MODE DEMO · Data dummy tersimpan di browser ini. Publikasi demo hanya mengubah website di browser yang sama.';
$('#login-form').addEventListener('submit',async event=>{
 event.preventDefault();error('','#login-error');const button=event.submitter;button.disabled=true;
 try{const data=Object.fromEntries(new FormData(event.currentTarget));
  if(isApi)await request('/auth/login',{method:'POST',body:JSON.stringify(data)});
  else{if(data.email.trim().toLowerCase()!=='admin@tanj.test'||data.password!=='demo123')throw new Error('Email atau password salah.');sessionStorage.setItem('tanj-studio-session','demo')}
  await openApp();
 }catch(err){error(err.message,'#login-error')}finally{button.disabled=false}
});
$('#logout').addEventListener('click',event=>busy(event.currentTarget,async()=>{
 if(isApi)await request('/auth/logout',{method:'POST',body:'{}'});else sessionStorage.removeItem('tanj-studio-session');
 $('#app').hidden=true;$('#login-screen').hidden=false;$('#login-form').elements.password.value='';
}));
$('#navigation').addEventListener('click',event=>{const button=event.target.closest('[data-tab]');if(button){tab=button.dataset.tab;query='';filter='all';error('');render()}});
$('#publish').addEventListener('click',event=>busy(event.currentTarget,async()=>{
 if(!confirm(isApi?'Publikasikan seluruh perubahan draf ke website?':'Terapkan draf ke landing page demo di browser ini?'))return;
 await publish();toast(isApi?'Website berhasil diperbarui.':'Demo dipublikasikan. Buka atau muat ulang website untuk melihat perubahan.');
}));
function badge(item){return `<span class="badge ${item.status==='draft'?'draft':item.stock===0?'empty':''}">${item.status==='draft'?'Draf':item.stock===0?'Stok habis':'Aktif'}</span>`}
function collectionName(item){return state.collections.find(c=>c.id===item.collectionId)?.name||item.collection||''}
function editButton(kind,id,label='Edit'){return `<button class="small-button" data-action="edit" data-kind="${kind}" data-id="${esc(id)}">${label}</button>`}
function actions(kind,item){return `<div class="row-actions">${editButton(kind,item.id)}${kind==='hijabs'?'':`<button class="small-button" data-action="delete" data-kind="${kind}" data-id="${esc(item.id)}" aria-label="Hapus ${esc(item.name||item.caption)}">Hapus</button>`}</div>`}
function render(){
 $('#page-title').textContent=tabs[tab][0];$('#breadcrumb').textContent=tabs[tab][0];$('#page-subtitle').textContent=tabs[tab][1];
 document.querySelectorAll('#navigation button').forEach(button=>{if(button.dataset.tab===tab)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
 const w=$('#workspace');
 if(tab==='overview'){
  const metrics=[['Total produk',state.products.length+state.hijabs.length,'Varian wear & hijab'],['Koleksi',state.collections.length,'Koleksi modest wear'],['Stok tersedia',[...state.products,...state.hijabs].reduce((n,p)=>n+p.stock,0),'Unit dalam katalog'],['Produk draf',state.products.filter(p=>p.status==='draft').length,'Belum tampil di website']];
  w.innerHTML=`<div class="stats">${metrics.map(([name,value,caption])=>`<article class="stat"><small>${name}</small><strong>${value}</strong><p>${caption}</p></article>`).join('')}</div><div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2>Dalam koleksimu</h2><p>Beberapa produk di workspace saat ini</p></div><button class="small-button" data-action="goto" data-tab="products">Lihat semua ↗</button></div><div class="mini-list">${state.products.slice(0,5).map(item=>`<div class="mini-row">${image(item.model)}<div><strong>${esc(item.name)}</strong><small>${esc(collectionName(item))} · ${money(item.price)}</small></div>${badge(item)}</div>`).join('')||'<p>Belum ada produk. Tambahkan produk pertamamu.</p>'}</div></section><section class="panel"><div class="feature">${image('assets/campaign-beige.webp')}<div><p>THE TANJ EXPERIENCE</p><h2>Your story, beautifully told.</h2><a href="../" target="_blank" rel="noopener">Lihat website ↗</a></div></div><div class="tip"><strong>Mulai dari detail kecil.</strong>Tambahkan produk, sesuaikan foto, lalu publikasikan ketika semuanya sudah siap.</div></section></div>`;
 }else if(tab==='products'||tab==='hijabs'){
  w.innerHTML=`<div class="toolbar"><div class="filters"><input class="search" id="search" aria-label="Cari produk" placeholder="Cari nama atau koleksi…" value="${esc(query)}"><select id="filter" aria-label="Filter status"><option value="all">Semua status</option><option value="published">Aktif</option><option value="empty">Stok habis</option>${tab==='products'?'<option value="draft">Draf</option>':''}</select></div>${tab==='products'?'<button class="primary" data-action="new" data-kind="products">+ Tambah produk</button>':''}</div><div id="list"></div>`;
  $('#filter').value=filter;renderList();
 }else if(tab==='collections'){
  w.innerHTML=`<div class="toolbar"><span>${state.collections.length} koleksi</span><button class="primary" data-action="new" data-kind="collections">+ Tambah koleksi</button></div><div class="collection-cards">${state.collections.map(c=>`<article class="collection-card"><span class="eyebrow">${state.products.filter(p=>p.collectionId===c.id).length} PRODUK</span><h2>${esc(c.name)}</h2><p>${esc(c.description||'Belum ada deskripsi.')}</p>${actions('collections',c)}</article>`).join('')}</div>${state.collections.length?'':'<p class="empty-state">Belum ada koleksi. Tambahkan koleksi pertama.</p>'}`;
 }else if(tab==='content'){
  w.innerHTML=`<div class="content-cards"><article class="content-card"><video src="${esc(asset(state.hero.media))}" poster="../assets/noireaterial-desert-poster.webp" muted playsinline controls preload="metadata"></video><div><p class="eyebrow">FIRST IMPRESSION</p><h2>Video utama</h2><p>Video pembuka landing page TANJ.</p>${editButton('hero','', 'Edit video')}</div></article><article class="content-card">${state.banner.mediaType==='video'?`<video src="${esc(asset(state.banner.media))}" controls muted playsinline preload="metadata"></video>`:image(state.banner.media)}<div><span class="badge ${state.banner.enabled?'':'draft'}">${state.banner.enabled?'Ditampilkan':'Disembunyikan'}</span><h2>${esc(state.banner.title)}</h2><p>${esc(state.banner.subtitle)}</p>${editButton('banner','','Edit banner')}</div></article></div><div class="toolbar"><h2>Lookbook</h2><button class="primary" data-action="new" data-kind="slides">+ Tambah media</button></div><div class="collection-cards">${state.slides.map(s=>`<article class="collection-card">${s.mediaType==='image'?`<div class="product-cell">${image(s.media)}<strong>${esc(s.caption)}</strong></div>`:`<strong>${esc(s.caption)} · Video</strong>`}${actions('slides',s)}</article>`).join('')}</div>${state.slides.length?'':'<p class="empty-state">Belum ada media lookbook.</p>'}`;
 }else{
  w.innerHTML=`<section class="panel settings"><p class="eyebrow">YOUR WORKSPACE</p><h2>${isApi?'CMS dengan database':'Simulasi TANJ Studio'}</h2><p>${isApi?'Produk, koleksi, dan konten tersimpan di database layanan masing-masing. Publikasi membuat satu versi website yang utuh.':'Data awal berisi 12 produk wear, 6 hijab, 4 koleksi, dan 6 media lookbook. Tidak ada transaksi atau pelanggan sungguhan dalam simulasi ini.'}</p><p>${isApi?'Sesi admin berakhir setelah 8 jam.':'Draf dan hasil publikasi hanya tersimpan di browser ini. Pengunjung lain tetap melihat data awal.'}</p><div class="row-actions"><button class="secondary" data-action="export">Unduh salinan JSON</button>${isApi?'':'<button class="secondary" data-action="reset">Reset data dummy</button>'}</div></section>`;
 }
}
function renderList(){
 const items=state[tab].filter(item=>`${item.name} ${collectionName(item)}`.toLowerCase().includes(query.toLowerCase())&&(filter==='all'||filter==='empty'&&item.stock===0||filter==='draft'&&item.status==='draft'||filter==='published'&&item.status!=='draft'&&item.stock>0));
 $('#list').innerHTML=items.length?`<div class="table-wrap"><table><thead><tr><th>PRODUK</th><th>HARGA</th><th>STOK</th><th>STATUS</th><th>KELOLA</th></tr></thead><tbody>${items.map(item=>`<tr><td><div class="product-cell">${image(item.model||item.image)}<div><strong>${esc(item.name)}</strong><small>${esc(collectionName(item))}</small></div></div></td><td>${money(item.price)}</td><td>${item.stock} unit</td><td>${badge(item)}</td><td>${actions(tab,item)}</td></tr>`).join('')}</tbody></table></div><p class="eyebrow">${items.length} HASIL</p>`:'<div class="panel empty-state"><h2>Belum ada hasil.</h2><p>Coba kata kunci lain atau tambahkan produk baru.</p></div>';
}
$('#workspace').addEventListener('input',event=>{if(event.target.id==='search'){query=event.target.value;renderList()}});
$('#workspace').addEventListener('change',event=>{if(event.target.id==='filter'){filter=event.target.value;renderList()}});
$('#workspace').addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return;
 busy(button,async()=>{
  error('');const {action,kind,id}=button.dataset;
  if(action==='goto'){tab=button.dataset.tab;render()}
  if(action==='new'||action==='edit')openEditor(kind,id);
  if(action==='delete'){
   if(!confirm('Hapus konten ini dari draf? Perubahan tampil di website setelah dipublikasikan.'))return;
   await remove(kind,id);await refresh();toast('Konten dihapus dari draf.');
  }
  if(action==='reset'){if(!confirm('Reset semua draf dan publikasi demo di browser ini?'))return;await resetDemo();await refresh();toast('Data dummy dikembalikan.');}
  if(action==='export'){
   const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='tanj-content.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
 });
});
function field(name,label,value='',type='text',full=false,extra=''){
 return `<label class="${full?'full':''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra} required>${['media','model','product','image'].includes(name)?'<span class="field-help">assets/nama.webp atau URL HTTPS foto/video yang sudah dihosting.</span>':''}</label>`;
}
function select(name,label,value,options){return `<label>${label}<select name="${name}" required>${options.map(([id,title])=>`<option value="${esc(id)}" ${value===id?'selected':''}>${esc(title)}</option>`).join('')}</select></label>`}
function openEditor(kind,id){
 if(kind==='products'&&!state.collections.length)throw new Error('Tambahkan koleksi sebelum membuat produk.');
 const item=['hero','banner'].includes(kind)?state[kind]:state[kind].find(x=>x.id===id)||{};
 editing={kind,id};error('','#editor-error');
 $('#editor-title').textContent=(id||['hero','banner'].includes(kind)?'Edit ':'Tambah ')+({products:'produk',collections:'koleksi',hijabs:'hijab',hero:'video utama',banner:'banner',slides:'media lookbook'}[kind]);
 let fields='';
 if(kind==='products')fields=field('name','Nama produk / varian',item.name)+select('collectionId','Koleksi',item.collectionId||state.collections[0].id,state.collections.map(c=>[c.id,c.name]))+field('colorName','Nama warna',item.colorName)+field('color','Warna swatch',item.color||'#eee6d7','color')+field('price','Harga (Rp)',item.price??DEFAULT_PRODUCT_PRICE,'number',false,'min="0" max="1000000000" step="1"')+field('stock','Stok (unit)',item.stock??0,'number',false,'min="0" max="1000000" step="1"')+select('status','Status',item.status||'draft',[['draft','Draf — sembunyikan'],['published','Aktif — tampil setelah publikasi']])+field('model','Foto model',item.model||'assets/campaign-beige.webp','text',true)+field('product','Foto produk',item.product||'assets/look-2.webp','text',true);
 if(kind==='hijabs')fields=field('name','Nama hijab',item.name)+field('price','Harga (Rp)',item.price,'number',false,'min="0" max="1000000000" step="1"')+field('stock','Stok (unit)',item.stock,'number',false,'min="0" max="1000000" step="1"')+field('image','Foto hijab',item.image,'text',true);
 if(kind==='collections')fields=field('name','Nama koleksi',item.name,'text',true)+`<label class="full">Deskripsi<textarea name="description" maxlength="1000">${esc(item.description||'')}</textarea></label>`;
 if(kind==='hero')fields=field('media','URL video utama',item.media,'text',true);
 if(kind==='slides'||kind==='banner'){
  if(kind==='slides')fields=field('caption','Keterangan',item.caption,'text',true);
  else fields=`<label class="checkbox-label full"><input name="enabled" type="checkbox" ${item.enabled?'checked':''}>Tampilkan banner di website</label>`+field('title','Judul banner',item.title,'text',true)+`<label class="full">Subjudul<input name="subtitle" value="${esc(item.subtitle)}" maxlength="400"></label>`;
  fields+=select('mediaType','Jenis media',item.mediaType||'image',[['image','Foto'],['video','Video']])+field('media','URL media',item.media||'assets/campaign-beige.webp','text',true);
 }
 $('#editor-fields').innerHTML=fields;$('#editor').showModal();
}
function closeEditor(){if(editing?.dirty&&!confirm('Tutup editor tanpa menyimpan perubahan?'))return;$('#editor').close();editing=null}
$('#edit-form').addEventListener('input',()=>{if(editing)editing.dirty=true});
$('#close-editor').addEventListener('click',closeEditor);$('#cancel-editor').addEventListener('click',closeEditor);
$('#editor').addEventListener('cancel',event=>{event.preventDefault();closeEditor()});
$('#edit-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;error('','#editor-error');
 try{
  const {kind,id}=editing;const data=Object.fromEntries(new FormData(event.currentTarget));
  if(kind==='hijabs')Object.assign(data,{collection:state.hijabs.find(x=>x.id===id).collection,color:state.hijabs.find(x=>x.id===id).color});
  if(['products','hijabs'].includes(kind)){data.price=Number(data.price);data.stock=Number(data.stock)}
  if(kind==='banner')data.enabled=!!data.enabled;
  await save(kind,id,data);await refresh();$('#editor').close();editing=null;toast('Draf tersimpan. Publikasikan untuk menampilkan perubahan.');
 }catch(err){error(err.message,'#editor-error')}finally{button.disabled=false}
});
try{if(isApi){await request('/auth/session');await openApp()}else if(sessionStorage.getItem('tanj-studio-session'))await openApp()}catch(err){if(!err.message.includes('Sesi berakhir'))error(err.message,'#login-error')}
