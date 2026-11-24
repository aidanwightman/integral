import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const template=fs.readFileSync('outputs/production-site/site-src/template.html','utf8');
const app=fs.readFileSync('outputs/production-site/site-src/app.js','utf8').replace('__PRODUCT_SLICES__',JSON.stringify(Object.fromEntries(['sales','people','finance','operations'].map(role=>[role,{title:role,columns:['Record','Value'],rows:[['Example','100']]}]))));
const scrollCorrections=[];
const sizes=new Map();
const frameMessages=[];
class Element {getBoundingClientRect(){const top=this.top??200;return {top,bottom:top+44,height:44}}constructor(id='',data={}){this.id=id;this.dataset=data;this.attrs={};this.handlers={};this.textContent='';this.href='';this.src='';this.hidden=false;}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this[k]||this.attrs[k]||null}addEventListener(k,f){this.handlers[k]=f}focus(){this.focused=true}scrollIntoView(){this.scrolled=true}showModal(){this.open=true}close(){this.open=false;this.handlers.close?.()}append(...children){this.children=[...(this.children||[]),...children]}replaceChildren(...children){this.children=children}click(options={}){const event={currentTarget:this,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...options};this.handlers.click?.(event);return event}}
const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)};
const roles=['sales','people','finance','operations','saleslead','leadership'].map(role=>new Element('',{role}));const tours=['sales','people','finance'].map(tour=>new Element('',{tour}));const brief=new Element(),videoLink=new Element();const handlers={};const frame=get('workspace-demo');frame.contentWindow={postMessage:(data,origin)=>{frame.message={data,origin};frameMessages.push(data.type)}};
const document={documentElement:{style:{setProperty(key,value){sizes.set(key,value)}},dataset:{design:'bento',mode:'light'},classList:{add(){},remove(){}}},getElementById:get,querySelectorAll:q=>q==='[data-role]'?roles:q==='[data-tour]'?tours:q==='[data-brief]'?[brief]:q==='[data-video-link]'?[videoLink]:[],querySelector:q=>q==='.site-header .wordmark'?get('site-home'):roles.find(e=>q.includes('"'+e.dataset.role+'"')),createElement:()=>new Element()};
const context=vm.createContext({document,innerHeight:720,location:{origin:'http://localhost'},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},window:{scrollBy({top}){scrollCorrections.push(top)},dispatchEvent(event){handlers[event.type]?.(event)},addEventListener:(k,f)=>handlers[k]=f,location:{assign(){throw new Error('No booking destination configured')}}},SITE_CONFIG:{loomUrl:'',bookingUrl:'',linkedinUrl:'https://www.linkedin.com/in/benwebster465/'},DEMO_URL:'demo.html',URL,Blob,FormData,Date,setTimeout,console});
vm.runInContext(fs.readFileSync('outputs/workspace-concepts/studio-src/workspace-text-preference.js','utf8').replace(/\bexport /g,'')+'\n'+fs.readFileSync('outputs/production-site/site-src/preview-motion.js','utf8')+'\n'+app,context);
for(const r of roles){r.click();assert.equal(roles.filter(x=>x.attrs['aria-pressed']==='true').length,1);assert.equal(frame.src,'','Choosing a preview role must not load the demo');assert(get('expand-demo').href.includes('/'+r.dataset.role+'/'));assert(get('role-title').textContent.length>10);}
const launch=get('expand-demo');
assert.equal((template.match(/id="expand-demo"/g)||[]).length,1);
assert.match(template,/<div class="snapshot-next">[^]*?<a class="button dark" id="expand-demo"/);
assert(!template.slice(template.indexOf('class="demo-tools"'),template.indexOf('class="demo-caption"')).includes('expand-demo'));
for(const modifiers of [{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{button:1}]){
  assert.equal(launch.click(modifiers).defaultPrevented,false,'Modified activation keeps the native link behavior');
  assert.equal(Boolean(get('workspace-dialog').open),false);
}
const previewLink=get('snapshot-rows').children[0].children[0].children[0];assert.equal(previewLink.className,'preview-record-link');assert(previewLink.href.includes('/leadership/bento/'));previewLink.handlers.click({preventDefault(){},currentTarget:previewLink});assert(get('workspace-dialog').open);get('close-workspace').click();
assert.equal(get('snapshot-rows').children[0].children[0].children[0],previewLink,'Opening a workspace should preserve its preview link for the return trip');
assert(previewLink.focused);
get('expand-demo').click();assert(get('workspace-dialog').open);assert(frame.src.includes('/leadership/bento/'));const retained=frame.src;get('close-workspace').click();get('expand-demo').click();assert.equal(frame.src,retained,'Reopening retains iframe session');document.documentElement.dataset.design='signal';handlers['data-saver-design-change']();assert.equal(frame.src,retained,'Appearance must not reload edited demo');assert.equal(frame.message.data.look,'signal');assert.equal(frame.message.origin,'http://localhost');
const sizeUpdate={origin:'http://localhost',source:frame.contentWindow,data:{type:'data-saver-text-size',size:145}};
handlers.message(sizeUpdate);
assert.equal(sizes.get('--guide-text-scale'),1.45);
handlers.message({...sizeUpdate,source:{},data:{...sizeUpdate.data,size:85}});
assert.equal(sizes.get('--guide-text-scale'),1.45);
get('close-workspace').click();
handlers.message(sizeUpdate);
assert.equal(sizes.get('--guide-text-scale'),1,'Closed guides ignore delayed slider changes');
frameMessages.length=0;
get('expand-demo').click();
assert(frameMessages.includes('data-saver-reset-text-size'),'Reusing the same iframe starts a fresh text-size visit');
// Only the embedded demo may update the outer selected role and full-screen link.
const before=get('expand-demo').href;handlers.message({origin:'http://localhost',source:{},data:{type:'data-saver-studio-state',role:'sales',industry:'agency',look:'glass',view:'dialer'}});assert.equal(get('expand-demo').href,before);
handlers.message({origin:'http://localhost',source:frame.contentWindow,data:{type:'data-saver-studio-state',role:'finance',industry:'agency',look:'editorial',view:'workbench'}});assert.equal(get('expand-demo').href,'demo.html#studio/agency/finance/editorial/workbench');assert.equal(roles.find(r=>r.dataset.role==='finance').attrs['aria-pressed'],'true');
handlers.message({origin:'http://localhost',source:frame.contentWindow,data:{type:'data-saver-studio-state',role:'finance',industry:'https://evil.example',look:'editorial',view:'workbench'}});assert.equal(get('expand-demo').href,'demo.html#studio/agency/finance/editorial/workbench');
for(const t of tours){t.click();assert.equal(vm.runInContext('workspaceRoute.role',context),t.dataset.tour);assert(get('workspace-dialog').open);}
// Atlas and Ledger are full workspace identities without a matching landing theme.
for (const look of ['atlas','ledger']) {
  handlers.message({origin:'http://localhost',source:frame.contentWindow,data:{type:'data-saver-studio-state',role:'finance',industry:'agency',look,view:'workbench'}});
  get('close-workspace').click();
  get('expand-demo').click();
  assert.equal(frame.message.data.look,look);
}
// Changing workspace appearance can reflow the landing page while it is covered.
get('expand-demo').top=900;
get('close-workspace').click();
assert.equal(scrollCorrections.at(-1),700);
get('expand-demo').top=200;
get('expand-demo').click();
// Home in the nested workspace returns focus to the host home link on HTTP and from disk.
const siteHomeMessage = {source:frame.contentWindow, data:{type:'data-saver-studio-home'}};
let homeClicks = 0;
get('site-home').addEventListener('click',()=>homeClicks++);
handlers.message({...siteHomeMessage, origin:'null'});
assert.equal(get('workspace-dialog').open,true);
handlers.message({...siteHomeMessage, origin:'http://localhost'});
assert.equal(get('workspace-dialog').open,false);
assert.equal(get('site-home').focused,true);
get('expand-demo').click();
Object.assign(context.location,{protocol:'file:', origin:'file://'});
handlers.message({...siteHomeMessage, source:{}, origin:'null'});
assert.equal(get('workspace-dialog').open,true);
handlers.message({...siteHomeMessage, origin:'null'});
assert.equal(get('workspace-dialog').open,false);
assert.equal(homeClicks,2);
// The chosen desk is used by the finance launch link, even after changing preview roles.
roles.find(r=>r.dataset.role==='finance').click();
const financeFocus=get('finance-focus');
for(const view of ['financeexceptions','reconciliation','collections','commissions']){
  financeFocus.value=view;
  financeFocus.handlers.change();
  assert.equal(get('finance-focus-field').hidden,false);
  assert(get('expand-demo').href.endsWith('/'+view));
  get('expand-demo').click();
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
handlers.message({origin:'null',source:frame.contentWindow,data:{type:'data-saver-studio-state',industry:'events',role:'finance',look:'glass',view:'reconciliation',reconciliationLedger:'practice'}});
assert.equal(get('expand-demo').href,'demo.html#studio/events/finance/glass/reconciliation/practice');
get('close-workspace').click();
get('expand-demo').click();
assert.equal(vm.runInContext('workspaceURL(workspaceRoute)',context),'#studio/events/finance/glass/reconciliation/practice');
get('close-workspace').click();
brief.click();assert(get('brief-dialog').open);get('brief-dialog').close();assert(brief.focused);get('privacy-open').click();assert(get('privacy-dialog').open);
const savingsData = vm.createContext({});
for (const file of ['savings-paths.js', 'savings-field-industries.js', 'savings-industries.js']) {
  vm.runInContext(fs.readFileSync('outputs/production-site/site-src/' + file, 'utf8'), savingsData);
}
const savingsRoutes = new Set();
for (const [base, entries] of [['walkthrough', 'SAVINGS_PATHS'], ['walkthrough/business', 'SAVINGS_INDUSTRIES']]) {
  for (const [key, entry] of Object.entries(vm.runInContext(entries, savingsData))) {
    savingsRoutes.add(base + '/' + key);
    for (const choice of entry.choices) savingsRoutes.add(base + '/' + key + '/' + choice.id);
  }
}
for (const name of ['outputs/production-site/index.html', 'work/publish/site-dist/index.html']) {
  const html = fs.readFileSync(name, 'utf8');
  for (const token of ['__DEMO_URL__', '__SITE_CONFIG__', '/* SITE_JS */']) assert(!html.includes(token));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
    assert(ids.includes(target) || savingsRoutes.has(target), 'Missing anchor ' + target);
  }
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
}
assert(template.includes('Our fee is a share of'));assert(!/decades|£21m|gmxeppy|07886|shadow-labs/.test(template));
// A single case stays expanded, and its ordinary link and embedded launch always agree.
class GalleryNode extends Element {
  removeAttribute(name){ delete this.attrs[name]; }
  getBoundingClientRect(){ return {top:100,bottom:120}; }
}
const gallery = new GalleryNode();
const changes = [];
const launches = [];
let galleryLook = 'glass';
vm.runInNewContext(fs.readFileSync('outputs/production-site/site-src/outcome-stories.js','utf8'), {
  document:{
    createElement:()=>new GalleryNode(),
    getElementById:id=>id==='northstar-preview'?{dataset:{url:'workspace.html#events-home'}}:null,
    querySelector:selector=>selector==='#outcome-stories .outcome-story-grid'?gallery:null
  },
  window:{addEventListener:(name,fn)=>{ if(name==='data-saver-design-change') changes.push(fn); }},
  DEMO_URL:'demo.html', selectedLook:()=>galleryLook, openWorkspace:(...args)=>launches.push(args)
});
const galleryItems = gallery.children.flatMap(group=>group.children);
const panels = galleryItems.filter(item=>item.className==='outcome-case');
const selectors = galleryItems.filter(item=>item.className==='outcome-toggle');
assert.equal(panels.length,9);
assert.equal(panels.filter(panel=>!panel.hidden).length,1);
galleryLook='editorial';
changes.forEach(update=>update());
for (const selector of selectors) {
  selector.click();
  const open=panels.filter(panel=>!panel.hidden);
  assert.equal(open.length,1);
  const [panel]=open;
  assert.equal(panel.id,selector.getAttribute('aria-controls'));
  assert.equal(selectors.filter(button=>button.getAttribute('aria-expanded')==='true').length,1);
  const link=panel.children.at(-1);
  const previous=launches.length;
  link.handlers.click({metaKey:true});
  assert.equal(launches.length,previous);
  link.handlers.click({preventDefault(){}});
  if(panel.id==='outcome-case-order-change'){
    assert.equal(launches.length,previous);
    assert.equal(link.href,'workspace.html#events-orders');
    continue;
  }
  const [role,industry,view,trigger,caseId]=launches.at(-1);
  assert.equal(trigger,link);
  assert.equal(link.href,`demo.html#studio/${industry}/${role}/editorial/${view}`+(caseId?'/'+caseId:''));
}
console.log('PASS: six snapshot roles, lazy fullscreen open/reopen, appearance without reload, receiving-frame messages, rejected invalid routes, three guided tours, local brief/privacy dialogs, built script syntax, unique IDs and anchor targets. Appearance checks are recorded separately.');
vm.runInContext("openWorkspace('sales','agency','outcomes',document.getElementById('expand-demo'),'followup')",context);
handlers.message({origin:'null',source:frame.contentWindow,data:{type:'data-saver-studio-state',role:'sales',industry:'agency',look:'glass',view:'outcomes',outcomeCase:'followup',followupRecord:true}});
assert.equal(get('expand-demo').href,'demo.html#studio/agency/sales/glass/outcomes/followup/record');
get('close-workspace').click();
get('expand-demo').click();
assert.equal(vm.runInContext('workspaceRoute.followupRecord',context),true);
get('close-workspace').click();
vm.runInContext("openWorkspace('sales','agency','outcomes',document.getElementById('expand-demo'),'followup')",context);
assert.equal(vm.runInContext('workspaceRoute.followupRecord',context),true);
get('close-workspace').click();

const landingHead = fs.readFileSync('work/publish/site-dist/index.html','utf8').split('</head>')[0];
const preferenceScript = landingHead.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const [shared, legacy, expected] of [
  [null, null, true],
  [null, '{"mode":"dark"}', true],
  [null, '{"clarity":false}', false],
  ['true', '{"clarity":false}', true],
  ['false', 'malformed', false],
  ['invalid', '{"clarity":false}', false],
  ['invalid', 'malformed', true]
]) {
  const html = {dataset:{}};
  const prefs = new Map([['data-saver-glass-clarity',shared],['data-saver-glass-material-v1',legacy]]);
  vm.runInNewContext(preferenceScript,{document:{documentElement:html},localStorage:{getItem:key=>prefs.get(key)}});
  assert.equal(html.dataset.glassClarity,String(expected));
}
const privatePage = {dataset:{}};
vm.runInNewContext(preferenceScript,{document:{documentElement:privatePage},localStorage:{getItem(){throw Error('Storage blocked');}}});
assert.equal(privatePage.dataset.glassClarity,'true');
console.log('PASS: Clarity is set before first paint and restores explicit choices, legacy preferences and defaults with unavailable storage.');
