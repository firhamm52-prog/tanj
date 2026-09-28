import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
export const production=process.env.NODE_ENV==='production';
export const config={
  host:process.env.HOST||'127.0.0.1',port:Number(process.env.PORT||3000),
  serviceHost:process.env.SERVICE_HOST||'127.0.0.1',
  authPort:Number(process.env.AUTH_PORT||4001),catalogPort:Number(process.env.CATALOG_PORT||4002),contentPort:Number(process.env.CONTENT_PORT||4003),
  dataDir:resolve(process.env.DATA_DIR||resolve(root,'data')),
  secret:process.env.INTERNAL_SECRET||(!production?'local-tanj-service-secret-development-only':''),
  email:process.env.ADMIN_EMAIL||(!production?'admin@tanj.test':''),
  password:process.env.ADMIN_PASSWORD||(!production?'demo123':'')
};
if(production&&(!config.email||config.password.length<12||config.secret.length<32||config.password==='demo123'))throw new Error('Production requires ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters), INTERNAL_SECRET (32+ characters).');
