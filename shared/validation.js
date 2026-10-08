export class ValidationError extends Error {}
const fail = message => { throw new ValidationError(message); };
function text(value,label,max=160){
  if(typeof value!=='string'||!value.trim()||value.length>max) fail(`${label} wajib diisi (maks. ${max} karakter).`);
  return value.trim();
}
function number(value,label,max){
  if(!Number.isSafeInteger(value)||value<0||value>max) fail(`${label} harus bilangan bulat antara 0 dan ${max}.`);
  return value;
}
export function media(value){
  value=text(value,'URL media',2048);
  if(/^assets\/[\w-]+\.(webp|png|jpe?g|mp4|webm|ogg)$/i.test(value)) return value;
  try { const url=new URL(value); if(url.protocol==='https:'&&!url.username&&!url.password) return value; } catch {}
  fail('Gunakan aset lokal assets/nama.webp atau URL HTTPS yang valid.');
}
export function validate(kind,raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) fail('Data tidak valid.');
  if(kind==='collections')return {name:text(raw.name,'Nama koleksi'),description:typeof raw.description==='string'?raw.description.slice(0,1000):''};
  if(kind==='products'){
    if(!/^#[a-f\d]{6}$/i.test(raw.color)) fail('Warna swatch tidak valid.');
    if(!['draft','published'].includes(raw.status)) fail('Status produk tidak valid.');
    const stock=number(raw.stock,'Stok',1000000);
    return {name:text(raw.name,'Nama produk'),collectionId:text(raw.collectionId,'Koleksi'),colorName:text(raw.colorName,'Nama warna'),color:raw.color,price:number(raw.price,'Harga',1000000000),stock,sold:number(raw.sold??0,'Jumlah terjual',1000000000),inStock:stock>0,status:raw.status,model:media(raw.model),product:media(raw.product)};
  }
  if(kind==='hijabs'){
    const stock=number(raw.stock,'Stok',1000000);
    if(!['selcuk','georgia'].includes(raw.collection))fail('Koleksi hijab tidak valid.');
    return {name:text(raw.name,'Nama hijab'),collection:raw.collection,color:text(raw.color,'Warna'),image:media(raw.image),price:number(raw.price,'Harga',1000000000),stock,inStock:stock>0};
  }
  if(kind==='hero') return {media:media(raw.media)};
  if(kind==='banner'||kind==='slides'){
    if(!['image','video'].includes(raw.mediaType)) fail('Jenis media tidak valid.');
    const result={mediaType:raw.mediaType,media:media(raw.media)};
    if(kind==='slides') return {...result,caption:text(raw.caption,'Keterangan')};
    if(typeof raw.enabled!=='boolean')fail('Status banner tidak valid.');
    return {...result,enabled:raw.enabled,title:text(raw.title,'Judul'),subtitle:typeof raw.subtitle==='string'?raw.subtitle.slice(0,400):''};
  }
  fail('Jenis konten tidak dikenal.');
}
