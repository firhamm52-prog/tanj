import {resourceService} from './resource.mjs';
import {config} from './config.mjs';
resourceService('catalog',config.catalogPort,['collections','products','hijabs']);
