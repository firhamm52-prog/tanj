import {spawn} from 'node:child_process';
import {root,config} from '../services/config.mjs';
const children=['auth','catalog','content','gateway'].map(name=>spawn(process.execPath,[`services/${name}.mjs`],{cwd:root,stdio:'inherit',env:process.env}));
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
for(const child of children){child.on('error',()=>stop(1));child.on('exit',code=>{if(!stopping)stop(code||1)})}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
console.log(`TANJ website: http://localhost:${config.port}\nTANJ admin: http://localhost:${config.port}/admin/`);
