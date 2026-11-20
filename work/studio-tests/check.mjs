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
const context=vm.createContext({document:{documentElement:element(),querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s);}},window:{addEventListener(){},scrollTo(){}},location:{search:'?identity=glass',hash:'#studio/agency/finance/bento/forecast'},history:{replaceState(){}},structuredClone,URLSearchParams,queueMicrotask,localStorage:{getItem:k=>preferences.get(k)??null,setItem:(k,v)=>preferences.set(k,String(v)),removeItem:k=>preferences.delete(k)},setTimeout(){},clearTimeout(){},MutationObserver:class{observe(){}},console});
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
for(const [input, expectedFill] of [[80,'0%'],[100,'16.6667%'],[130,'50%'],[175,'100%']]) {
  sizeRoot.handlers.input({target:{id:'workspace-size',value:String(input),dataset:{}}});
  assert.equal(context.document.documentElement.style.values['--workspace-size-fill'],expectedFill);
}
sizeRoot.handlers.input({target:{id:'workspace-size',value:'100',dataset:{}}});
console.log('PASS: legacy identity flag respects routed style; display size lasts for the visit, announces changes and clamps inputs.');
// Inspecting a scenario keeps the native controls and the user's calculation disclosure in place.
const forecastHTML=()=>vm.runInContext('forecastView()',context);
assert.match(forecastHTML(),/data-forecast-calculation open/);
const ranges=[['collection-delay','delay', '3','3 months'],['cost-change','costChange','30','+30%']];
for(const [id] of ranges) sizeRoot.querySelector('#'+id).parentElement=element();
for(const [id,control,value,announced] of ranges){
  const input=sizeRoot.querySelector('#'+id);
  Object.assign(input,{id,type:'range',value,dataset:{control}});
  sizeRoot.handlers.input({target:input});
  assert.equal(input['aria-valuetext'],announced);
  assert.equal(input.parentElement.style.values['--range-fill'],'100%');
}
const lines=vm.runInContext('cashForecast(D(),{delay:3,costChange:30})',context);
const data=vm.runInContext('D()',context);
assert.equal(lines[0].receipts,0);
assert.equal(lines[0].costs,Math.round(data.monthlyCostPence*1.3));
const money=pence=>vm.runInContext('gbp('+pence+')',context);
const firstMonth=[lines[0].receipts,lines[0].potential,lines[0].costs,lines[0].cash].map(pence=>'<td>'+money(pence)+'</td>').join('');
assert.ok(elements.get('[data-forecast="months"]').innerHTML.includes(firstMonth));
sizeRoot.handlers.toggle({target:{dataset:{forecastCalculation:''},open:false}});
assert.doesNotMatch(forecastHTML(),/data-forecast-calculation open/);
vm.runInContext("state.delay=0;state.costChange=0;state.forecastCalculationOpen=true;",context);
console.log('PASS: forecast ranges recalculate during input; both readouts, fill and monthly calculation preference follow the current scenario.');
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
