import {randomBytes,scryptSync} from 'node:crypto';
import {openDatabase} from '../services/db.mjs';
import {config} from '../services/config.mjs';
if(config.password.length<12)throw new Error('Set ADMIN_PASSWORD in .env to at least 12 characters before resetting.');
const db=openDatabase('auth');const salt=randomBytes(16).toString('hex');
db.exec('BEGIN');
try{
 db.prepare('UPDATE users SET email=?,salt=?,password_hash=? WHERE id=?').run(config.email.toLowerCase(),salt,scryptSync(config.password,salt,64).toString('hex'),'admin');
 db.exec('DELETE FROM sessions; COMMIT;');console.log('Admin credentials updated. All sessions revoked.');
}catch(err){db.exec('ROLLBACK');throw err}finally{db.close()}
