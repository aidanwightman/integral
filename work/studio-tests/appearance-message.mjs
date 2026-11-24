import {usesPipelineMeetings,saveInvitationDetails} from '../../outputs/workspace-concepts/studio-src/pipeline-invitations.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {INDUSTRIES,ROLES,LOOKS,dataset} from '../../outputs/workspace-concepts/studio-src/data.js';
import {sum,balance,metrics,cashForecast,relationships,moveStage,reallocate} from '../../outputs/workspace-concepts/studio-src/model.js';
for(const industry of INDUSTRIES){
 const d=dataset(industry.id), ids=new Set(d.accounts.map(a=>a.id));
 for(const kind of ['opportunities','invoices','work','domain']) for(const r of d[kind]) assert(ids.has(r.accountId));
 assert.equal(metrics(d).allocated,sum(d.work.filter(w=>w.status!=='Complete'),'hours'));
 const baseline=cashForecast(d);assert.equal(baseline[0].cash,d.openingCashPence+baseline[0].receipts-baseline[0].costs);
 assert.equal(cashForecast(d,{delay:1})[0].receipts,0);
 assert(cashForecast(d,{costChange:20}).at(-1).cash<baseline.at(-1).cash);
 const invoice=d.invoices.find(i=>balance(i)>0), amount=balance(invoice);d.openingCashPence+=amount;invoice.paidPence=invoice.totalPence;
 assert.equal(cashForecast(d).at(-1).cash,baseline.at(-1).cash);
 const hours=metrics(d).allocated;reallocate(d,d.work[0].id,d.team[1].name);assert.equal(metrics(d).allocated,hours);
 const opp=d.opportunities.find(o=>o.probability===.2);
 saveInvitationDetails(d,opp.id,usesPipelineMeetings(d)?{meetingLink:'https://meet.example/review'}:{evidence1:'Customer reference 104'});
 moveStage(d,opp.id);assert.equal(opp.probability,.45);assert.equal(opp.next,'Review the proposal');
 for(const role of ROLES)for(const account of d.accounts){const g=relationships(d,account.id,role.id),nodes=new Set(g.nodes.map(n=>n.id));for(const e of g.edges)assert(nodes.has(e.from)&&nodes.has(e.to));}
}
const preferences=new Map([['data-saver-workspace-size','120']]);
const elements=new Map();const element=()=>({innerHTML:'',handlers:{},dataset:{},style:{values:{},setProperty(k,v){this.values[k]=String(v)}},setAttribute(k,v){this[k]=v},querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(){return []},addEventListener(type,fn){this.handlers[type]=fn},classList:{add(){},remove(){}},focus(){}});
const messageHandlers={};
const posted=[];
const parentWindow={postMessage:(message,origin)=>posted.push({message,origin})};
const context=vm.createContext({document:{documentElement:element(),querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s);}},window:{parent:parentWindow,addEventListener(type,handler){const previous=messageHandlers[type];messageHandlers[type]=event=>{previous?.(event);handler(event)}},scrollTo(){}},location:{search:'?identity=glass',hash:'#studio/agency/finance/bento/forecast',origin:'https://example.test',protocol:'https:'},history:{replaceState(){}},structuredClone,URL,URLSearchParams,queueMicrotask,localStorage:{getItem:k=>preferences.get(k)??null,setItem:(k,v)=>preferences.set(k,String(v)),removeItem:k=>preferences.delete(k)},setTimeout(){},clearTimeout(){},MutationObserver:class{observe(){}},console});
const source=JSON.parse(fs.readFileSync('outputs/workspace-concepts/studio-src/package.json','utf8')).studioScripts.map(f=>fs.readFileSync('outputs/workspace-concepts/studio-src/'+f,'utf8').replace(/^import[^\n]+\n/gm,'').replace(/\bexport /g,'')).join('\n');
vm.runInContext(source,context);
assert.equal(vm.runInContext('state.look',context),'bento','Legacy identity query must not force Glass over the route');
assert.equal(vm.runInContext('workspaceSize',context),100,'Every demo visit starts at the default, including with legacy storage');
const sizeRoot=elements.get('#studio-root');
sizeRoot.handlers.input({target:{id:'workspace-size',value:'130',dataset:{}}});
assert.equal(preferences.has('data-saver-workspace-size'),false);assert.equal(context.document.documentElement.style.values['--workspace-text-scale'],'1.3');assert.equal(elements.get('#workspace-size').getAttribute?.('aria-valuetext')||elements.get('#workspace-size')['aria-valuetext'],'130 percent');
vm.runInContext('render()',context);assert.equal(vm.runInContext('workspaceSize',context),130,'Render must preserve display size');
sizeRoot.handlers.input({target:{id:'workspace-size',value:'190',dataset:{}}});assert.equal(vm.runInContext('workspaceSize',context),175);
sizeRoot.handlers.input({target:{id:'workspace-size',value:'bad',dataset:{}}});assert.equal(vm.runInContext('workspaceSize',context),100);
console.log('PASS: legacy identity flag respects routed style; display size lasts for the visit, announces changes and clamps inputs.');
const sizeReset={source:parentWindow,origin:'https://example.test',data:{type:'data-saver-reset-text-size'}};
sizeRoot.handlers.input({target:{id:'workspace-size',value:'145',dataset:{}}});
messageHandlers.message({...sizeReset,source:{}});
messageHandlers.message({...sizeReset,origin:'https://untrusted.test'});
assert.equal(vm.runInContext('workspaceSize',context),145);
messageHandlers.message(sizeReset);
assert.equal(vm.runInContext('workspaceSize',context),100,'A reused iframe starts a new visit at the default');
sizeRoot.handlers.input({target:{id:'workspace-size',value:'155',dataset:{}}});
messageHandlers.pageshow({persisted:true});
assert.equal(vm.runInContext('workspaceSize',context),100,'Returning from another page resets text size even in the back/forward cache');
// A Studio mounted with srcdoc inherits the Classic document's message origin.
context.location.protocol='about:';
for(const [baseURI,origin] of [['file:///preview/workspace.html','null'],['https://example.test/workspace.html','https://example.test']]){
  context.document.baseURI=baseURI;
  sizeRoot.handlers.input({target:{id:'workspace-size',value:'145',dataset:{}}});
  messageHandlers.message({...sizeReset,origin:'https://untrusted.test'});
  assert.equal(vm.runInContext('workspaceSize',context),145);
  messageHandlers.message({...sizeReset,origin});
  assert.equal(vm.runInContext('workspaceSize',context),100);
}
context.location.protocol='https:';
let renders=0;
for(const i of INDUSTRIES)for(const r of ROLES)for(const l of LOOKS)for(const view of r.views){vm.runInContext(`Object.assign(state,${JSON.stringify({industry:i.id,role:r.id,look:l.id,view,gallery:false,account:null})});render()`,context);const html=elements.get('#studio-root').innerHTML;assert(html.includes('studio-main'));assert(!/NaN|undefined/.test(html));for(const destination of r.views)assert(html.includes('data-view="'+destination+'"'),`${l.id}/${r.id} lost ${destination}`);renders++;}
console.log(`PASS: eight dataset integrity and business calculation checks; ${renders} view combinations rendered.`);

vm.runInContext("Object.assign(state,{gallery:false,look:'glass',query:'keep this filter',graphSelected:'account-1'})",context);
elements.get('#studio-root').handlers.change({target:{dataset:{select:'look'},value:'bento'}});
assert.equal(vm.runInContext('state.query',context),'keep this filter');
assert.equal(vm.runInContext('state.graphSelected',context),'account-1');
console.log('PASS: every role destination remains reachable in each identity; appearance switching preserves search and graph selection.');

for(const look of ['atlas','ledger']){
 vm.runInContext(`Object.assign(state,{industry:'agency',role:'finance',look:'${look}',view:'forecast',gallery:false,graphSelected:null});showRecord(D().invoices.find(i=>balance(i)>0).id)`,context);
 let html=elements.get('#studio-root').innerHTML;
 assert(html.includes('id="record-title"'));assert(html.includes('Record full collection'));
 assert.equal(elements.get('#studio-dialog').innerHTML,'');
 vm.runInContext("onAction({target:{closest:()=>({dataset:{do:'collect',id:state.graphSelected}})}})",context);
 assert.equal(vm.runInContext('balance(findRecord(state.graphSelected).record)',context),0);
 assert(elements.get('#studio-root').innerHTML.includes('Fully collected'));
 vm.runInContext('closeRecord()',context);assert.equal(vm.runInContext('state.graphSelected',context),null);
 vm.runInContext(`Object.assign(state,{role:'operations',view:'timeline'});showRecord(D().work[0].id)`,context);
 elements.get('#reassign-owner')??elements.set('#reassign-owner',element());
 elements.get('#reassign-owner').value=vm.runInContext('D().team[1].name',context);
 vm.runInContext("onAction({target:{closest:()=>({dataset:{do:'reassign',id:state.graphSelected}})}})",context);
 assert.equal(vm.runInContext('findRecord(state.graphSelected).record.owner',context),elements.get('#reassign-owner').value);
 vm.runInContext('closeRecord()',context);
}
console.log('PASS: Atlas/Ledger attached record collection, reassignment and close preserve functioning business actions without opening a modal.');

const before=vm.runInContext("JSON.stringify({role:state.role,view:state.view,query:state.query,industry:state.industry,data:D()})",context);
messageHandlers.message({source:{},origin:'https://example.test',data:{type:'data-saver-appearance',look:'forest'}});
assert.notEqual(vm.runInContext('state.look',context),'forest');
messageHandlers.message({source:parentWindow,origin:'https://attacker.test',data:{type:'data-saver-appearance',look:'forest'}});
assert.notEqual(vm.runInContext('state.look',context),'forest');
messageHandlers.message({source:parentWindow,origin:'https://example.test',data:{type:'data-saver-appearance',look:'forest'}});
assert.equal(vm.runInContext('state.look',context),'forest');
assert.equal(vm.runInContext("JSON.stringify({role:state.role,view:state.view,query:state.query,industry:state.industry,data:D()})",context),before);
messageHandlers.message({source:parentWindow,origin:'https://example.test',data:{type:'data-saver-appearance',look:'invented'}});
assert.equal(vm.runInContext('state.look',context),'forest');
console.log('PASS: embedding appearance receiver rejects wrong source/origin/identity and preserves edited business data, role, view and filters.');

const storedData=vm.runInContext('JSON.stringify([...stores])',context);
messageHandlers.message({source:parentWindow,origin:'https://example.test',data:{type:'data-saver-navigate',industry:'field',role:'people',look:'forest',view:'leave'}});
assert.equal(vm.runInContext('state.role',context),'people');
assert.equal(vm.runInContext('state.view',context),'leave');
assert.equal(vm.runInContext('state.industry',context),'field');
assert.equal(vm.runInContext('JSON.stringify([...stores])',context),storedData);
messageHandlers.message({source:parentWindow,origin:'https://example.test',data:{type:'data-saver-navigate',industry:'agency',role:'finance',look:'glass',view:'invented'}});
assert.equal(vm.runInContext('state.view===R().defaultView',context),true);
assert.equal(vm.runInContext('JSON.stringify([...stores])',context),storedData);
messageHandlers.message({source:parentWindow,origin:'https://example.test',data:{type:'data-saver-navigate',industry:'invented',role:'finance',look:'forest',view:'overview'}});
assert.equal(vm.runInContext('state.industry',context),'agency');
console.log('PASS: validated parent navigation changes role/business without recreating edited datasets; invalid views fall back and invalid businesses are rejected.');

context.location.search='?embed=site';
const picker={dataset:{select:'look'},value:'northstar',isConnected:true,focus(){this.focused=true;}};
const beforeNorthstar=vm.runInContext('JSON.stringify(state)',context);
elements.get('#studio-root').handlers.change({target:picker});
assert.equal(JSON.stringify(posted.at(-1)),JSON.stringify({message:{type:'data-saver-open-northstar'},origin:'https://example.test'}));
assert.equal(vm.runInContext('JSON.stringify(state)',context),beforeNorthstar);
assert.equal(picker.value,vm.runInContext('state.look',context));
messageHandlers.message({source:parentWindow,origin:'https://example.test',data:{type:'data-saver-northstar-return'}});
assert(picker.focused);
const galleryHTML=vm.runInContext('gallery()',context);
assert.equal((galleryHTML.match(/data-look="northstar"/g)||[]).length,1);
assert.match(galleryHTML,/mini-northstar/);
for(const look of LOOKS){
  const html=vm.runInContext(`Object.assign(state,{look:${JSON.stringify(look.id)},gallery:false});render();root.innerHTML`,context);
  assert.equal((html.match(/data-do="open-alerts" aria-label="Alerts,/g)||[]).length,1,`Permanent Alerts control in ${look.id}`);
}
for (const role of ROLES) {
  for (const view of role.views) {
    const html = vm.runInContext(`Object.assign(state,{look:'bento',role:${JSON.stringify(role.id)},view:${JSON.stringify(view)}});render();root.innerHTML`, context);
    assert(html.includes(`data-view="${view}" aria-current="page"`), `Bento should mark ${role.id}/${view} as current`);
  }
}
console.log('PASS: Northstar picker and gallery preserve Studio state, return focus, and all seven Studio shells expose live Alerts.');

vm.runInContext("Object.assign(state,{look:'glass',gallery:false});render()",context);
const glassMarkup=elements.get('#studio-root').innerHTML;
const toolbar=glassMarkup.slice(0,glassMarkup.indexOf('</header>'));
assert.match(toolbar,/data-glass-action="clarity"/,'Clarity is accessible directly in the top toolbar');
assert.equal((glassMarkup.match(/data-glass-action="clarity"/g)||[]).length,1);
vm.runInContext("state.look='bento';render()",context);
assert(!elements.get('#studio-root').innerHTML.includes('data-glass-action="clarity"'),'Only offer the control on a workspace with Glass surfaces');

const materialMessage={source:parentWindow,origin:'https://example.test',data:{type:'data-saver-appearance',look:'glass',mode:'dark',clarity:true}};
vm.runInContext("state.look='glass';render()",context);
const retainedRoot=elements.get('#studio-root');
retainedRoot.innerHTML='draft still being edited';
messageHandlers.message({...materialMessage,source:{}});
assert.notEqual(preferences.get('data-saver-glass-clarity'),'true');
messageHandlers.message(materialMessage);
assert.deepEqual(JSON.parse(preferences.get('data-saver-glass-material-v1')),{mode:'dark',clarity:true});
assert.equal(preferences.get('data-saver-glass-clarity'),'true');
messageHandlers.message({...materialMessage,data:{...materialMessage.data,mode:null,clarity:'false'}});
assert.deepEqual(JSON.parse(preferences.get('data-saver-glass-material-v1')),{mode:'dark',clarity:true});
assert.equal(retainedRoot.innerHTML,'draft still being edited');
console.log('PASS: trusted Glass preferences update in place and ignore invalid Clarity values.');

const contactRoute={type:'data-saver-navigate',industry:'agency',role:'sales',look:'glass',view:'contacts'};
for(const [example,expected] of [['incoming-signature',/Direct number for our next call/],['contact-checks',/Elena Ward/]]){
  messageHandlers.message({source:parentWindow,origin:'https://example.test',data:{...contactRoute,example}});
  assert.match(retainedRoot.innerHTML,expected);
}
