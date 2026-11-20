import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = new URL('../../outputs/production-site/site-src/',import.meta.url);
const js = readFileSync(new URL('tenet-partners.js',source),'utf8');
const projects = JSON.parse(readFileSync(new URL('tenet-projects.json',source),'utf8'));
const byName = new Map(projects.map(project => [project.name,project]));
assert.equal(byName.size,projects.length);
assert.equal(new URL(byName.get('KICKZ.com').url).hostname,'www.kickz.com');
assert.equal(byName.get('Deepvelopment').url,'https://deepvelopment.com/');
assert.equal(byName.get('Bridge 3 Labs').url,'https://studiosblank.com/#why');
assert(byName.has('Web Three Audit & Consult'));
for(const project of projects){
  if(project.url){
    assert.equal(new URL(project.url).protocol,'https:');
    assert(project.description);
  }
  if(project.icon){
    const icon=readFileSync(new URL('tenet-icons/'+project.icon,source));
    assert.equal(icon.subarray(1,4).toString(),'PNG');
  }else assert(project.initials);
}

function boot(initial){
  const elements=new Map(), callbacks=[], frames=[];
  const element=id=>{
    if(!elements.has(id)) elements.set(id,{
      id, hidden:false, dataset:{}, attrs:{}, handlers:{},
      querySelector:selector=>element(selector),
      setAttribute(key,value){this.attrs[key]=value;},
      addEventListener(key,fn){this.handlers[key]=fn;},
      focus(){document.activeElement=this;}, scrollIntoView(){},
      contains(other){return ['tenet-labs','tenet-back'].includes(other?.id);}
    });
    return elements.get(id);
  };
  const document=element('document'), window=element('window'), location={hash:initial};
  document.getElementById=element;document.body=element('body');document.activeElement=document.body;
  element('pricing-title').parentElement=element('intro');element('tenet-panel').hidden=true;
  const history={state:null, pushState(state,unused,hash){callbacks.push([this.state,location.hash]);this.state=state;location.hash=hash;},
    replaceState(state,unused,hash){this.state=state;location.hash=hash;},
    back(){[this.state,location.hash]=callbacks.pop();window.handlers.popstate();}
  };
  vm.runInNewContext(js,{window,document,history,location,requestAnimationFrame:fn=>frames.push(fn)});
  return {element,window,document,location,flush(){while(frames.length)frames.shift()();}};
}

const page=boot('#savings-detail');
const launch=page.element('tenet-launch'), panel=page.element('tenet-panel');
assert.equal(launch.hidden,false);assert.equal(panel.hidden,true);
launch.handlers.click();page.flush();
assert.equal(page.document.activeElement.id,'tenet-labs');assert.equal(page.element('.faq').hidden,true);
page.element('tenet-back').handlers.click();page.flush();
assert.equal(page.location.hash,'#savings-detail');assert.equal(page.document.activeElement,launch);
// Simulate browser Forward. Escape can arrive before the fragment's focus frame.
page.location.hash='#tenet-labs';page.window.handlers.popstate();page.document.activeElement=page.document.body;
page.document.handlers.keydown({key:'Escape',preventDefault(){}});page.flush();
assert.equal(panel.hidden,true);assert.equal(page.location.hash,'#savings-detail');
const shared=boot('#tenet-labs');shared.flush();assert.equal(shared.element('tenet-panel').hidden,false);
shared.element('tenet-back').handlers.click();shared.flush();
assert.equal(shared.element('.faq').hidden,false);assert.equal(shared.location.hash,'#savings-detail');
console.log('PASS: Tenet project references, embedded images, history, direct entry, keyboard dismissal and pricing focus.');
