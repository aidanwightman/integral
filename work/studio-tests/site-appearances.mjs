import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const code=fs.readFileSync('outputs/production-site/site-src/appearances.js','utf8');
for(const saved of [null,'bad','{"mode":"dark"}','{"mode":"unknown","design":"forest"}','{"design":"invalid"}']){
 const root={dataset:{},style:{}},els=Object.fromEntries(['site-mode','site-design','shuffle-design','design-status'].map(id=>[id,{handlers:{},attrs:{},addEventListener(k,f){this.handlers[k]=f},setAttribute(k,v){this.attrs[k]=v}}]));let persisted,events=0,lastEvent;const handlers={};
 const launcher={open:true,getAttribute(){return String(this.open)},click(){this.open=false}};
 vm.runInNewContext(code,{document:{documentElement:root,getElementById:id=>els[id],querySelector:()=>launcher},window:{addEventListener(k,f){handlers[k]=f},dispatchEvent(event){events++;lastEvent=event}},Event,CustomEvent,Math,localStorage:{getItem:()=>saved,setItem:(key,value)=>persisted={key,value}}});
 assert.equal(root.dataset.design,saved?.includes('forest')?'forest':'glass');const initial=root.dataset.mode;els['site-mode'].handlers.click();assert.notEqual(root.dataset.mode,initial);
 for(let i=0;i<30;i++){const before=root.dataset.design;els['shuffle-design'].handlers.click();assert.notEqual(root.dataset.design,before);assert.ok(['glass','forest','editorial','signal','bento'].includes(root.dataset.design));}
 els['site-design'].value='signal';els['site-design'].handlers.change();assert.equal(root.dataset.design,'signal');handlers['data-saver-workspace-design']({detail:{look:'bento'}});assert.equal(root.dataset.design,'bento');const count=events;handlers['data-saver-workspace-design']({detail:{look:'bento'}});assert.equal(events,count);assert.equal(JSON.parse(persisted.value).design,'bento');
 els['site-design'].value='northstar';els['site-design'].handlers.change();
 assert.equal(launcher.open,false);assert.equal(lastEvent.type,'data-saver-open-northstar');assert.equal(lastEvent.detail.trigger,launcher);
 assert.equal(els['site-design'].value,'bento');assert.equal(root.dataset.design,'bento');assert.equal(JSON.parse(persisted.value).design,'bento');
}
console.log('PASS: Glass fallback, saved valid style, mode persistence, nonrepeating shuffle, valid choices, an independent Northstar launcher and loop-free workspace style sync.');
