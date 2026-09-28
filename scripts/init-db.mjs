import {openDatabase} from '../services/db.mjs';
import {config} from '../services/config.mjs';
for(const name of ['auth','catalog','content','publication']){const db=openDatabase(name);db.close();console.log(`Initialized ${name}.sqlite`)}
console.log(`Database directory: ${config.dataDir}`);
