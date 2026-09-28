import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import {config,root} from './config.mjs';
import {seed,storefront} from '../shared/seed.js';
export const columns={
 collections:['id','name','description'],products:['id','collectionId','name','colorName','color','price','stock','status','model','product'],
 hijabs:['id','collection','color','name','price','stock','image'],hero:['id','media'],banner:['id','enabled','title','subtitle','mediaType','media'],slides:['id','caption','mediaType','media']
};
export function insert(db,table,item){
 const names=columns[table];
 db.prepare(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(()=>'?').join(',')})`).run(...names.map(name=>typeof item[name]==='boolean'?Number(item[name]):item[name]));
}
export function openDatabase(name){
 mkdirSync(config.dataDir,{recursive:true});
 const db=new DatabaseSync(join(config.dataDir,`${name}.sqlite`));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 db.exec(readFileSync(join(root,'database',`${name}.sql`),'utf8'));
 // A persistent marker prevents deleted demo content from reappearing on restart.
 db.exec('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);');
 if(!db.prepare('SELECT version FROM migrations WHERE version=1').get()){
  db.exec('BEGIN');
  try{
   if(name==='catalog')for(const table of ['collections','products','hijabs'])for(const row of seed[table])insert(db,table,row);
   if(name==='content'){
    insert(db,'hero',{id:1,...seed.hero});insert(db,'banner',{id:1,...seed.banner});
    for(const slide of seed.slides)insert(db,'slides',slide);
   }
   if(name==='auth'){
    const salt=randomBytes(16).toString('hex');
    db.prepare('INSERT INTO users(id,email,password_hash,salt,role) VALUES(?,?,?,?,?)').run('admin',config.email.toLowerCase(),scryptSync(config.password,salt,64).toString('hex'),salt,'admin');
   }
   if(name==='publication')db.prepare('INSERT INTO site_releases(document,published_by) VALUES(?,?)').run(JSON.stringify(storefront(seed)),'seed');
   db.exec('INSERT INTO migrations(version) VALUES(1); COMMIT;');
  }catch(error){db.exec('ROLLBACK');db.close();throw error}
 }
 return db;
}
