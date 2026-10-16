import {createServer} from 'node:http';
import {config} from './config.mjs';
import {ValidationError} from '../shared/validation.js';
export function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
export function error(status,message){const err=new Error(message);err.status=status;throw err;}
export async function body(req){
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>128*1024)error(413,'Data terlalu besar. Gunakan URL media.');chunks.push(chunk)}
 try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{error(400,'JSON tidak valid.')}
}
export function serve(port,handler,{internal=true,host=config.serviceHost}={}){
 const server=createServer(async(req,res)=>{
  try{
   if(internal&&req.headers['x-service-key']!==config.secret)error(401,'Akses layanan ditolak.');
   await handler(req,res,new URL(req.url,'http://localhost').pathname);
  }catch(err){
   const status=err instanceof ValidationError?422:err.status||500;
   if(status===500)console.error(err.message);
   if(!res.headersSent)json(res,status,{error:status===500?'Layanan mengalami kesalahan.':err.message});else res.end();
  }
 });
 server.requestTimeout=15000;
 server.listen(port,host,()=>console.log(`Listening on http://${host}:${port}`));
 return server;
}
export async function service(port,path,options={}){
 try{
  const base=port===config.authPort?process.env.AUTH_URL:port===config.catalogPort?process.env.CATALOG_URL:process.env.CONTENT_URL;
  const response=await fetch(`${base||`http://127.0.0.1:${port}`}${path}`,{...options,headers:{'Content-Type':'application/json','x-service-key':config.secret,...options.headers},signal:AbortSignal.timeout(8000)});
  const data=await response.json();
  if(!response.ok)error(response.status,data.error||'Layanan tidak tersedia.');
  return data;
 }catch(err){if(err.status)throw err;error(503,'Layanan belum tersedia. Coba kembali.');}
}
