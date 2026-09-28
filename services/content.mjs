import {resourceService} from './resource.mjs';
import {config} from './config.mjs';
resourceService('content',config.contentPort,['hero','banner','slides']);
