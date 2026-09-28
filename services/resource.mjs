import {randomUUID} from 'node:crypto';
import {openDatabase,columns,insert} from './db.mjs';
import {validate} from '../shared/validation.js';
import {serve,json,body,error} from './http.mjs';
export function resourceService(name,port,tables){
 const db=openDatabase(name);
 const singleton=kind=>['hero','banner'].includes(kind);
 const getState=()=>Object.fromEntries(tables.map(table=>{
  const rows=db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().map(row=>table==='banner'?{...row,enabled:!!row.enabled}:['products','hijabs'].includes(table)?{...row,inStock:row.stock>0}:row);
  return [table,singleton(table)?rows[0]:rows];
 }));
 return serve(port,async(req,res,path)=>{
  if(path==='/health'&&req.method==='GET')return json(res,200,{status:'ok',service:name});
  if(path==='/state'&&req.method==='GET')return json(res,200,getState());
  const parts=path.split('/').filter(Boolean);
  if(parts.length>2)error(404,'Endpoint tidak ditemukan.');
  const [kind,urlId]=parts;
  if(!tables.includes(kind))error(404,'Jenis konten tidak ditemukan.');
  if(singleton(kind)&&urlId)error(404,'Endpoint tidak ditemukan.');
  const id=singleton(kind)?1:urlId;
  if(req.method==='DELETE'){
   if(singleton(kind)||kind==='hijabs'||!id)error(405,'Konten ini tidak bisa dihapus.');
   if(kind==='collections'&&db.prepare('SELECT id FROM products WHERE collectionId=? LIMIT 1').get(id))error(409,'Pindahkan atau hapus produk dalam koleksi ini terlebih dahulu.');
   if(!db.prepare(`DELETE FROM ${kind} WHERE id=?`).run(id).changes)error(404,'Konten tidak ditemukan.');
   return json(res,200,{ok:true});
  }
  if(!['POST','PUT'].includes(req.method))error(405,'Metode tidak diizinkan.');
  if(req.method==='POST'&&(id||kind==='hijabs'))error(405,'Gunakan edit untuk konten ini.');
  if(req.method==='PUT'&&(!id||!db.prepare(`SELECT id FROM ${kind} WHERE id=?`).get(id)))error(404,'Konten tidak ditemukan.');
  const item=validate(kind,await body(req));
  if(kind==='products'&&!db.prepare('SELECT id FROM collections WHERE id=?').get(item.collectionId))error(422,'Koleksi tidak ditemukan.');
  const record={...item,id:id||randomUUID()};
  if(req.method==='POST')insert(db,kind,record);
  else{
   const names=columns[kind].filter(column=>column!=='id');
   db.prepare(`UPDATE ${kind} SET ${names.map(column=>`${column}=?`).join(',')} WHERE id=?`).run(...names.map(column=>typeof record[column]==='boolean'?Number(record[column]):record[column]),id);
  }
  return json(res,req.method==='POST'?201:200,record);
 });
}
