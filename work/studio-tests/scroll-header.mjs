import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const code=fs.readFileSync('outputs/production-site/site-src/scroll-header.js','utf8');
for(const design of ['glass','forest','editorial','signal','bento']){
 const classes=new Set(),events={},headerEvents={},html={dataset:{design},scrollHeight:4000};let focused=false,observer;
 const header={offsetHeight:120,classList:{remove:k=>classes.delete(k),toggle:(k,v)=>v?classes.add(k):classes.delete(k)},querySelector:()=>focused,addEventListener:(k,v)=>headerEvents[k]=v};
 const window={scrollY:0,innerHeight:800,addEventListener:(k,v)=>events[k]=v};
 vm.runInNewContext(code,{document:{documentElement:html,querySelector:()=>header},window,Math,MutationObserver:class{constructor(fn){observer=fn}observe(){}}});
 const scroll=y=>{window.scrollY=y;events.scroll()};
 scroll(300);assert(classes.has('scroll-hidden'));scroll(295);assert(classes.has('scroll-hidden'));scroll(280);assert(!classes.has('scroll-hidden'));
 scroll(400);assert(classes.has('scroll-hidden'));headerEvents.focusin();assert(!classes.has('scroll-hidden'));
 focused=true;scroll(500);assert(!classes.has('scroll-hidden'));focused=false;
 if(design==='glass'){html.dataset.glassTools='true';scroll(650);assert(!classes.has('scroll-hidden'));html.dataset.glassTools='false';}
 scroll(800);assert(classes.has('scroll-hidden'));observer();assert(!classes.has('scroll-hidden'));scroll(0);assert(!classes.has('scroll-hidden'));
}
console.log('PASS: all five identities hide downward, reveal upward, ignore jitter, preserve focused/open controls and reset at top/design changes.');
