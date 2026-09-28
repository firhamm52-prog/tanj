import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {openDatabase} from './db.mjs';
import {config} from './config.mjs';
import {serve,json,body,error} from './http.mjs';
const db=openDatabase('auth');
const hash=token=>createHash('sha256').update(token).digest('hex');
const attempts=new Map();
serve(config.authPort,async(req,res,path)=>{
 if(path==='/health'&&req.method==='GET')return json(res,200,{status:'ok',service:'auth'});
 if(path==='/login'&&req.method==='POST'){
  const data=await body(req);
  const email=String(data.email||'').trim().toLowerCase();
  if(email.length>254||typeof data.password!=='string'||data.password.length>256)error(400,'Email atau password tidak valid.');
  const now=Date.now();for(const [key,entry] of attempts)if(entry.until<now)attempts.delete(key);
  const key=String(req.headers['x-client-ip']||'local');
  const attempt=attempts.get(key)||{count:0,until:now+15*60*1000};
  if(attempt.count>=10)error(429,'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const actual=scryptSync(data.password,user?.salt||'invalid-account-salt',64);
  const expected=user?Buffer.from(user.password_hash,'hex'):Buffer.alloc(64);
  if(!timingSafeEqual(actual,expected)||!user){attempt.count++;attempts.set(key,attempt);error(401,'Email atau password salah.');}
  attempts.delete(key);
  const token=randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(hash(token),user.id,now+8*60*60*1000);
  return json(res,200,{token,user:{email:user.email,role:user.role}});
 }
 if(path==='/session'&&req.method==='POST'){
  const {token}=await body(req);
  const user=db.prepare('SELECT u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(String(token||'')),Date.now());
  if(!user)error(401,'Sesi berakhir. Silakan masuk kembali.');
  return json(res,200,{user});
 }
 if(path==='/logout'&&req.method==='POST'){
  const {token}=await body(req);db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(String(token||'')));return json(res,200,{ok:true});
 }
 error(404,'Endpoint tidak ditemukan.');
});
