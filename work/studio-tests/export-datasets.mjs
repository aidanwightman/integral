import {mock} from 'node:test';
import {writeFileSync} from 'node:fs';
import {INDUSTRIES,dataset} from '../../outputs/workspace-concepts/studio-src/data.js';
import {ensureCommissions} from '../../outputs/workspace-concepts/studio-src/commissions-model.js';

// Preserve the opening date on generated example activity across rebuilds.
mock.timers.enable({apis:['Date'],now:new Date('2026-11-20T09:00:00Z')});
try {
  for(const industry of INDUSTRIES){
    const data=dataset(industry.id);
    ensureCommissions(data);
    const target=new URL(`../../outputs/workspace-concepts/datasets/${industry.id}.json`,import.meta.url);
    writeFileSync(target,JSON.stringify(data,null,2)+'\n');
  }
} finally {
  mock.timers.reset();
}
console.log('Exported eight synthetic business datasets.');
