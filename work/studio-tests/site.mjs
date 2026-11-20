import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const template=fs.readFileSync('outputs/production-site/site-src/template.html','utf8');
const app=fs.readFileSync('outputs/production-site/site-src/app.js','utf8').replace('__PRODUCT_SLICES__',JSON.stringify(Object.fromEntries(['sales','people','finance','operations'].map(role=>[role,{title:role,columns:['Record','Value'],rows:[['Example','100']]}]))));
class Element {constructor(id='',data={}){this.id=id;this.dataset=data;this.attrs={};this.handlers={};this.textContent='';this.href='';this.src='';this.hidden=false;}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this[k]||this.attrs[k]||null}addEventListener(k,f){this.handlers[k]=f}focus(){this.focused=true}scrollIntoView(){this.scrolled=true}showModal(){this.open=true}close(){this.open=false;this.handlers.close?.()}append(...children){this.children=[...(this.children||[]),...children]}replaceChildren(...children){this.children=children}click(){this.handlers.click?.({currentTarget:this})}}
const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)};
const roles=['sales','people','finance','operations','saleslead','leadership'].map(role=>new Element('',{role}));const tours=['sales','people','finance'].map(tour=>new Element('',{tour}));const brief=new Element(),videoLink=new Element();const handlers={};const frame=get('workspace-demo');frame.contentWindow={postMessage:(data,origin)=>{frame.message={data,origin}}};
const document={documentElement:{style:{setProperty(){}},dataset:{design:'bento',mode:'light'},classList:{add(){},remove(){}}},getElementById:get,querySelectorAll:q=>q==='[data-role]'?roles:q==='[data-tour]'?tours:q==='[data-brief]'?[brief]:q==='[data-video-link]'?[videoLink]:[],querySelector:q=>q==='.site-header .wordmark'?get('site-home'):roles.find(e=>q.includes('"'+e.dataset.role+'"')),createElement:()=>new Element()};
const context=vm.createContext({document,location:{origin:'http://localhost'},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},window:{dispatchEvent(event){handlers[event.type]?.(event)},addEventListener:(k,f)=>handlers[k]=f,location:{assign(){throw new Error('No booking destination configured')}}},SITE_CONFIG:{loomUrl:'',bookingUrl:'',linkedinUrl:'https://www.linkedin.com/in/benwebster465/'},DEMO_URL:'demo.html',URL,Blob,FormData,Date,setTimeout,console});
vm.runInContext(fs.readFileSync('outputs/workspace-concepts/studio-src/workspace-text-preference.js','utf8').replace(/\bexport /g,'')+'\n'+fs.readFileSync('outputs/production-site/site-src/preview-motion.js','utf8')+'\n'+app,context);
for(const r of roles){r.click();assert.equal(roles.filter(x=>x.attrs['aria-pressed']==='true').length,1);assert.equal(frame.src,'','Choosing a preview role must not load the demo');assert(get('expand-demo').href.includes('/'+r.dataset.role+'/'));assert(get('role-title').textContent.length>10);}
const previewLink=get('snapshot-rows').children[0].children[0].children[0];assert.equal(previewLink.className,'preview-record-link');assert(previewLink.href.includes('/leadership/bento/'));previewLink.handlers.click({preventDefault(){},currentTarget:previewLink});assert(get('workspace-dialog').open);get('close-workspace').click();
get('launch-workspace').click();assert(get('workspace-dialog').open);assert(frame.src.includes('/leadership/bento/'));const retained=frame.src;get('close-workspace').click();get('launch-workspace').click();assert.equal(frame.src,retained,'Reopening retains iframe session');document.documentElement.dataset.design='signal';handlers['data-saver-design-change']();assert.equal(frame.src,retained,'Appearance must not reload edited demo');assert.equal(frame.message.data.look,'signal');assert.equal(frame.message.origin,'http://localhost');
// Only the embedded demo may update the outer selected role and full-screen link.
const before=get('expand-demo').href;handlers.message({origin:'http://localhost',source:{},data:{type:'data-saver-studio-state',role:'sales',industry:'agency',look:'glass',view:'dialer'}});assert.equal(get('expand-demo').href,before);
handlers.message({origin:'http://localhost',source:frame.contentWindow,data:{type:'data-saver-studio-state',role:'finance',industry:'agency',look:'editorial',view:'workbench'}});assert.equal(get('expand-demo').href,'demo.html#studio/agency/finance/editorial/workbench');assert.equal(roles.find(r=>r.dataset.role==='finance').attrs['aria-pressed'],'true');
handlers.message({origin:'http://localhost',source:frame.contentWindow,data:{type:'data-saver-studio-state',role:'finance',industry:'https://evil.example',look:'editorial',view:'workbench'}});assert.equal(get('expand-demo').href,'demo.html#studio/agency/finance/editorial/workbench');
for(const t of tours){t.click();assert.equal(vm.runInContext('workspaceRoute.role',context),t.dataset.tour);assert(get('workspace-dialog').open);}
// Home in the nested workspace returns focus to the host home link on HTTP and from disk.
const siteHomeMessage = {source:frame.contentWindow, data:{type:'data-saver-studio-home'}};
let homeClicks = 0;
get('site-home').addEventListener('click',()=>homeClicks++);
handlers.message({...siteHomeMessage, origin:'null'});
assert.equal(get('workspace-dialog').open,true);
handlers.message({...siteHomeMessage, origin:'http://localhost'});
assert.equal(get('workspace-dialog').open,false);
assert.equal(get('site-home').focused,true);
get('launch-workspace').click();
Object.assign(context.location,{protocol:'file:', origin:'file://'});
handlers.message({...siteHomeMessage, source:{}, origin:'null'});
assert.equal(get('workspace-dialog').open,true);
handlers.message({...siteHomeMessage, origin:'null'});
assert.equal(get('workspace-dialog').open,false);
assert.equal(homeClicks,2);
// The chosen desk is used by both finance launch actions, even after changing preview roles.
roles.find(r=>r.dataset.role==='finance').click();
const financeFocus=get('finance-focus');
for(const view of ['financeexceptions','collections','commissions']){
  financeFocus.value=view;
  financeFocus.handlers.change();
  assert.equal(get('finance-focus-field').hidden,false);
  assert(get('expand-demo').href.endsWith('/'+view));
  get('launch-workspace').click();
  assert.equal(vm.runInContext('workspaceRoute.view',context),view);
  get('close-workspace').click();
}
roles.find(r=>r.dataset.role==='sales').click();
assert.equal(get('finance-focus-field').hidden,true);
handlers.message({origin:'null',source:frame.contentWindow,data:{type:'data-saver-studio-state',role:'finance',industry:'agency',look:'glass',view:'collections'}});
assert.equal(get('finance-focus-field').hidden,true,'A hidden iframe must not override the customer’s preview selection');
roles.find(r=>r.dataset.role==='finance').click();
assert.equal(financeFocus.value,'commissions');
get('expand-demo').handlers.click({preventDefault(){},currentTarget:get('expand-demo')});
assert.equal(vm.runInContext('workspaceRoute.view',context),'commissions');
get('close-workspace').click();
brief.click();assert(get('brief-dialog').open);get('brief-dialog').close();assert(brief.focused);get('privacy-open').click();assert(get('privacy-dialog').open);
for(const name of ['outputs/production-site/index.html','work/publish/site-dist/index.html']){const html=fs.readFileSync(name,'utf8');assert(!html.includes('__DEMO_URL__'));assert(!html.includes('__SITE_CONFIG__'));assert(!html.includes('/* SITE_JS */'));const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);for(const m of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(m[1]),'Missing anchor '+m[1]);for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);}
assert(template.includes('Our fee is a share of'));assert(!/decades|£21m|gmxeppy|07886|shadow-labs/.test(template));
console.log('PASS: six snapshot roles, lazy fullscreen open/reopen, appearance without reload, receiving-frame messages, rejected invalid routes, three guided tours, local brief/privacy dialogs, built script syntax, unique IDs and anchor targets. Appearance checks are recorded separately.');
