import {freshSeed,DEMO_KEY,PUBLISHED_KEY,storefront} from '../shared/seed.js';
import {validate} from '../shared/validation.js';
export const isApi = window.TANJ_CONFIG?.mode === 'api';
const apiBase = window.TANJ_CONFIG?.apiBase || '/api';
function read(key){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
export async function request(path,options={}){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(apiBase+path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers},signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Permintaan gagal.');
    return data;
  }catch(error){if(error.name==='AbortError')throw new Error('Server belum merespons. Coba lagi.');throw error}finally{clearTimeout(timeout)}
}
export async function loadStorefront(){
  if(isApi)return request('/storefront');
  return read(PUBLISHED_KEY)||storefront(freshSeed());
}
export async function loadAdmin(){
  if(isApi)return request('/admin/state');
  return read(DEMO_KEY)||freshSeed();
}
export async function save(kind,id,raw){
  const item=validate(kind,raw);
  if(isApi)return request(`/admin/${kind}${id?'/'+encodeURIComponent(id):''}`,{method:['hero','banner'].includes(kind)?'PUT':id?'PUT':'POST',body:JSON.stringify(item)});
  const state=await loadAdmin();
  if(kind==='products'&&!state.collections.some(c=>c.id===item.collectionId))throw new Error('Koleksi tidak ditemukan.');
  if(['hero','banner'].includes(kind))state[kind]=item;
  else{
    const saved={...item,id:id||crypto.randomUUID()};
    const index=state[kind].findIndex(x=>x.id===id);
    if(id&&index<0)throw new Error('Konten tidak ditemukan. Muat ulang halaman.');
    if(index<0)state[kind].push(saved);else state[kind][index]=saved;
  }
  localStorage.setItem(DEMO_KEY,JSON.stringify(state));
  return state;
}
export async function remove(kind,id){
  if(isApi)return request(`/admin/${kind}/${encodeURIComponent(id)}`,{method:'DELETE'});
  const state=await loadAdmin();
  if(kind==='collections'&&state.products.some(p=>p.collectionId===id))throw new Error('Pindahkan atau hapus produk dalam koleksi ini terlebih dahulu.');
  state[kind]=state[kind].filter(item=>item.id!==id);
  localStorage.setItem(DEMO_KEY,JSON.stringify(state));
}
export async function publish(){
  if(isApi)return request('/admin/publish',{method:'POST',body:'{}'});
  localStorage.setItem(PUBLISHED_KEY,JSON.stringify(storefront(await loadAdmin())));
}
export async function resetDemo(){
  if(isApi)throw new Error('Reset hanya tersedia di mode demo.');
  localStorage.setItem(DEMO_KEY,JSON.stringify(freshSeed()));
  localStorage.removeItem(PUBLISHED_KEY);
}
