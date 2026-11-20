import {defaultWorkspaceTextSize} from './workspace-text-preference.js';
import {setWorkspaceTextSize,workspaceTextSizeControl,syncWorkspaceTextSize,workspaceRangeInput,workspaceRangeFill} from './workspace-text-size.js';
import {collectionMoney,collectionRecordPanel,updateCollectionFields} from './collections-views.js';
import {approveCollectionBill,recordCollectionAction,collectionOpenAmount} from './collections-model.js';
import {pipelineRecordForm,dealOwnerForm} from './pipeline-record.js';
import {saveInvitationDetails} from './pipeline-invitations.js';
import {recordDependency,dependencyPanel} from './operational-exceptions.js';
import {financeExceptionsView,submitFinanceException,financeExceptionRecordPanel} from './finance-exceptions-view.js';
import {installNorthstarPreview} from './northstar-preview.js';
import {workspaceAlerts,workspaceAlertTracker,workspaceAlertBell,workspaceAlertView,workspaceAlertNotice} from './workspace-alerts.js';
import {approvalView,approvalAction,approvalSubmit,approvalRecordPanel,updateDiscountPreview} from './approval-views.js';
import {quoteHandoffAction} from './quote-handoff.js';
import {contactWorkspace, crmInteraction} from './contact-workspace.js';
import {openContactEmailLookup, closeContactEmailLookup, updateContactEmailField} from './email-lookup.js';
import {commissionView} from './commissions-views.js';
import {commissionAction,ensureCommissions} from './commissions-model.js';
import {OUTCOME_SCENARIOS,outcomeAction,resetOutcome} from './outcomes-model.js';
import {outcomeView} from './outcomes-views.js';
import {atlasLedgerShell} from './atlas-ledger-identity.js';
import {editorialSignalShell} from './editorial-signal-identity.js';
import {glassIdentityShell,installGlassIdentity,setGlassPreferences} from './glass-identity.js';
import {bentoShell,bentoOverview} from './bento-identity.js';
import {depthAction,depthFields} from './depth-model.js';
import {depthExamples} from './depth-examples.js';
import {salesWorkbenchAction,processCallJobs,logCompletedCall,addCallNote} from './calling.js';
import {CALL_TITLES} from './calling-views.js';
import {roleView,ROLE_TITLES} from './role-views.js';
import {editLeaveDates,decideLeave,simulateAutomation,availability} from './role-model.js';
import {INDUSTRIES,ROLES,LOOKS,PRESETS,MONTHS,dataset} from './data.js';
import {sum,balance,metrics,cashForecast,relationships,recordsFor,moveStage,reallocate,handoffOpportunity} from './model.js';
import {escapeHTML,gbp,compact,glyph,studioButton,lineChart,relationshipGraph,miniPreview} from './visuals.js';

Object.assign(ROLE_TITLES,CALL_TITLES);
const root=document.querySelector('#studio-root');
const modal=document.querySelector('#studio-dialog');
if((location.search||'').includes('embed=site'))root.classList.add('site-embed');
const stores=new Map(INDUSTRIES.map(i=>[i.id,dataset(i.id)]));
const state={leaveEdit:null,commissionEdit:null,outcomeCase:null,outcomeFeedback:'',reviewWeek:'2026-11-16',reviewTeam:'All',reviewSource:'All',reviewSegment:'All',companyTeam:'All',inspectPerson:null,automationId:null,industry:'agency',role:'finance',look:'glass',view:'forecast',gallery:true,preset:0,query:'',account:null,delay:0,costChange:0,pipeline:false,forecastCalculationOpen:true,graphSelected:null};
const viewLabels={financeexceptions:'Transaction exceptions',alerts:'Alerts',approvals:'Approvals',contacts:'Contacts & email',commissions:'Commissions',outcomes:'Workflow demos',workbench:'Task workbench',workflows:'Workflow catalogue',salesdesk:'Sales desk',dialer:'Dialer & calls',callrules:'After-call workflow',outbox:'Follow-up history',pipelinehealth:'Pipeline health',leave:'Time off & coverage',lifecycle:'Employee changes',automations:'Automations',performance:'Team performance',company:'Company overview',control:'Delivery control',collections:'Collections & bills',overview:'Overview',board:'Pipeline',forecast:'Cash forecast',timeline:'Delivery timeline',capacity:'Team capacity',graph:'Relationships',records:'Records'};
const roleTitles={saleslead:'Sales performance',sales:'Sales overview',finance:'Cash forecast',operations:'Operations overview',people:'Team capacity',leadership:'Company overview'};
let lastTrigger=null,lastRecordTrigger=null;
const D=()=>stores.get(state.industry);
const R=()=>ROLES.find(r=>r.id===state.role);
const L=()=>LOOKS.find(l=>l.id===state.look);
const e=escapeHTML;
const b=studioButton;
const accountName=(id)=>D().accounts.find(a=>a.id===id)?.name||'—';
const shortName=name=>name.split(' ').map(n=>n[0]).slice(0,2).join('');
const tag=(text,type='')=>`<span class="pill ${type}">${e(text)}</span>`;
const personAvatar=name=>`<span class="avatar">${e(shortName(name))}</span>`;
const link=(record,label)=>b('record',e(label||record.name||record.title||record.number),'text-button record-link',`data-id="${record.id}"`);
const sumText=(value)=>`${value.toLocaleString('en-GB')}`;

let workspaceSize = defaultWorkspaceTextSize;
function applyWorkspaceSize(value = workspaceSize) {
  workspaceSize = setWorkspaceTextSize(value);
  root.dataset.largeText = String(workspaceSize >= 135);
  syncWorkspaceTextSize(root, workspaceSize);
}
window.addEventListener('pageshow', event => {
  applyWorkspaceSize(event.persisted ? defaultWorkspaceTextSize : workspaceSize);
});
const NORTHSTAR_APPEARANCE={
  id:'northstar',name:'Northstar Events',
  caption:'An events CRM with a compact record sidebar, territory filters and a shared action queue.'
};
const appearanceChoices=[...LOOKS,NORTHSTAR_APPEARANCE];

function demoBar(){
  const select=(name,label,items,value)=>`<div class="selector"><label for="choose-${name}">${label}</label><select id="choose-${name}" data-select="${name}">${items.map(i=>`<option value="${i.id}" ${i.id===value?'selected':''}>${e(i.name)}</option>`).join('')}</select></div>`;
  return `<header class="demo-bar"><a class="demo-brand" data-do="site-home" href="../production-site/index.html" target="_top" aria-label="Integral home"><span class="brand-logo" aria-hidden="true">i.</span><span>Integral<small>Home</small></span></a><div class="selectors">${select('industry','Business',INDUSTRIES,state.industry)}${select('role','Function',ROLES,state.role)}${select('look','Appearance',appearanceChoices,state.look)}</div>${workspaceTextSizeControl(workspaceSize)}${b('gallery',glyph('layers')+' Gallery','','aria-label="Open workspace gallery"')}${window.parent!==window?b('close-embed',glyph('left'),'icon-button','aria-label="Close workspace" title="Close workspace"'):''}</header>`;
}
function viewNav(iconOnly=false){return R().views.map(v=>b('view',glyph(v==='overview'?'home':v)+(iconOnly?'':e(viewLabels[v])),state.view===v?'active':'',`data-view="${v}" aria-label="${e(viewLabels[v])}" ${state.view===v?'aria-current="page"':''}`)).join('');}
function brand(){return `<div class="workspace-brand"><span class="workspace-mark">${D().config.short}</span><div><strong>${e(D().config.brand)}</strong><small>${e(R().name)} · demo workspace</small></div></div>`;}
function sideNav(){return `<aside class="side-nav">${brand()}<div class="side-caption">Your workspace</div><nav class="view-nav" aria-label="Workspace views">${viewNav()}</nav><div class="side-caption">Connected business</div>${b('domain',glyph('records')+e(D().config.domain),'quiet small')}<p class="side-note">A different perspective.<br>The same connected data.<br><br>Sample activity: Nov 2026<br>Cash plan: Dec 2026 – May 2027</p></aside>`;}
const alertTrackers = new Map();
for (const [industry, data] of stores) {
  for (const role of ROLES.filter(r => r.views.includes('alerts'))) {
    alertTrackers.set(industry + '/' + role.id, workspaceAlertTracker(workspaceAlerts(data, role.id)));
  }
}
function shell(content,alerts){
  const data=D(),look=state.look;
  const alertControl=R().views.includes('alerts')?workspaceAlertBell(alerts.length):'';
  const page=`<main class="page" id="studio-main" tabindex="-1">${content}</main>`;
  let frame='';
  if(look==='glass')frame=glassIdentityShell({content,alertControl,views:R().views,currentView:state.view,labels:viewLabels,brandHTML:brand(),domainHTML:b('domain',glyph('records')+e(D().config.domain),'quiet small'),glyph,title:R().title});
  if(look==='atlas'||look==='ledger')frame=atlasLedgerShell({look,page,data,alertControl,role:R(),state,viewLabels,brand,b,e,glyph,inspectorHTML:state.graphSelected?recordDetails(state.graphSelected):(look==='atlas'&&state.view==='graph'?graphContext():'')});
  if(look==='editorial')frame=editorialSignalShell({look,page,data,role:R(),viewLabels,state,brand,b,e,glyph,alertControl});
  if(look==='signal')frame=editorialSignalShell({look,page,data,role:R(),viewLabels,state,brand,b,e,glyph,alertControl});
  if(look==='forest')frame=`<div class="frame forest-workspace">${sideNav()}<section class="forest-workplane"><header class="forest-context"><span>${e(R().name)} / ${e(viewLabels[state.view]||'Workspace')}</span>${alertControl}</header>${page}</section></div>`;
  if(look==='bento'){
   frame=bentoShell({page,data,role:R(),alertControl,state,viewLabels,e,b,glyph,brand});
   frame=frame.replace('<div class="bento-launchpad"',`<details class="workspace-navigation"><summary>${glyph('layers')}<strong>${e(viewLabels[state.view]||'Workspace')}</strong><span>Browse workspace sections</span></summary><div class="bento-launchpad"`).replace(`${page}</div>`,`</details>${page}</div>`);
  }
  return `<section class="scene ${look}"><div class="scene-label"><span class="sample"><i class="live-dot"></i>${e(L().name)} &nbsp;/&nbsp; ${e(L().shell)}</span><div class="row">${b('previous',glyph('left')+' Previous','small')}${b('next','Next workspace '+glyph('arrow'),'small')}</div></div>${frame}<footer class="studio-footer"><span>Integral · ${e(data.config.name)} · ${e(R().name)} · ${e(L().name)}</span><span>Synthetic data · Local changes only · Role views are not access controls</span></footer></section>`;
}
function heading(){const title=ROLE_TITLES[state.view]|| (state.view==='graph'?'Relationships':state.view==='records'?`${state.role==='leadership'?D().config.domain:R().name+' records'}.`:roleTitles[state.role]);return `<div class="page-heading"><div><p class="eyebrow">${e(D().config.tagline)}</p><h1>${e(title)}</h1><p>${e(R().focus)}.</p></div><div class="heading-aside">Connected sample data<br>${D().accounts.length} accounts · ${D().config.domain.toLowerCase()}</div></div>`;}
function statGrid(){const d=D(),m=metrics(d);let list=[];
  if((state.role==='sales'||state.role==='saleslead'))list=[['Open pipeline',compact(m.pipeline),'Unwon opportunities'],['Weighted bookings',compact(m.weighted),'Value × stage probability'],['Won bookings',compact(m.won),'Contract value, not cash received'],['Open opportunities',d.opportunities.filter(x=>x.probability<1).length,'Across the commercial journey']];
  if(state.role==='finance')list=[['Opening cash',compact(m.cash),'Illustrative starting balance'],['Open receivables',compact(m.receivables),'Invoices less amounts paid'],['Overdue balance',compact(m.overdue),'Outstanding past-due invoices'],['Monthly costs',compact(d.monthlyCostPence),'Fixed planning assumption']];
  if(state.role==='operations')list=[['Work in flight',m.active,'Not yet complete'],['Needs attention',d.work.filter(w=>w.issue&&w.status!=='Complete').length,'Open delivery dependencies'],['Allocated hours',m.allocated+'h','Planned active work this week'],['Completed',d.work.filter(w=>w.status==='Complete').length,'Items delivered in the sample']];
  if(state.role==='people')list=[['Team members',d.team.length,'Sample delivery team'],['Available this week',sum(d.team,t=>availability(d,t.id,'2026-11-16').available)+'h','Week of 16 Nov · after approved leave'],['Allocation',Math.round(m.allocated/Math.max(1,sum(d.team,t=>availability(d,t.id,'2026-11-16').available))*100)+'%','Planned hours / available hours'],['Over capacity',d.team.filter(t=>t.allocated>availability(d,t.id,'2026-11-16').available).length,'People needing a workload review']];
  if(state.role==='leadership')list=[['Won bookings',compact(m.won),'Contract value, not revenue'],['Open receivables',compact(m.receivables),'Uncollected invoice balance'],['Work in flight',m.active,'Queued, active and in review'],[D().config.domain,d.domain.length,'Connected industry records']];
  return `<div class="stat-grid">${list.map(([label,value,note])=>`<section class="stat"><div class="stat-label">${e(label)}</div><div class="stat-value">${e(value)}</div><div class="stat-note">${e(note)}</div></section>`).join('')}</div>`;
}
function panel(title,subtitle,body,extra='',className=''){return `<section class="panel ${className}"><div class="panel-head"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${extra}</div><div class="panel-body">${body}</div></section>`;}
function historicalChart(){const h=D().history;return lineChart([{name:'Cash received',values:h.map(x=>x.receiptsPence),color:'var(--accent)'},{name:'Cash costs',values:h.map(x=>x.costsPence),color:'var(--muted)',dashed:true}],{labels:h.map(x=>x.month),title:'Illustrative historical cash received and costs, June to November 2026'});}
function concentration(){const rows=D().accounts.map(a=>({...a,total:sum(D().invoices.filter(i=>i.accountId===a.id),balance)})).sort((a,b)=>b.total-a.total).slice(0,5);const max=Math.max(...rows.map(a=>a.total),1);return rows.map(a=>`<div class="bar-row"><span class="bar-label">${link(a,a.name)}</span><div class="bar-track"><span style="width:${a.total/max*100}%"></span></div><strong>${compact(a.total)}</strong></div>`).join('');}
function pipelineBars(){const rows=D().config.stages.map(stage=>({stage,value:sum(D().opportunities.filter(d=>d.stage===stage),'valuePence')}));const max=Math.max(...rows.map(s=>s.value),1);return rows.map((s,i)=>`<div class="bar-row"><span>${e(s.stage)}</span><div class="bar-track"><span style="width:${s.value/max*100}%;opacity:${1-i*.15}"></span></div><strong>${compact(s.value)}</strong></div>`).join('');}
function insights(){const d=D(),m=metrics(d);const high=d.team.filter(t=>t.allocated>t.capacity);const entries=state.role==='finance'?[['Review overdue invoices',`${compact(m.overdue)} remains outstanding on invoices marked overdue.`,'records'],['Test a slower collection cycle','Compare the baseline with a one-month delay before making a planning decision.','forecast'],['Account balances','Trace a balance to its account without losing the financial view.','graph']]:(state.role==='sales'||state.role==='saleslead')?[['Late-stage opportunities',`${d.opportunities.filter(o=>o.probability===.7).length} opportunities are at the final open stage.`,'board'],['Bookings are not cash','The weighted pipeline is a scenario using explicit stage probabilities.','overview'],['Account relationships','Explore opportunities and their owners around one account.','graph']]:state.role==='people'?[['Review the overloaded people',`${high.length} team members exceed the 40-hour capacity assumption.`,'capacity'],['Inspect the work behind the hours','Reassign a work item and see both people’s allocation update.','timeline'],['Work assignments','See the account and owner linked to each commitment.','graph']]:[['Review the delivery handoffs',`${d.work.filter(w=>w.issue&&w.status!=='Complete').length} open work items have a dependency flag.`,'timeline'],['Watch customer concentration','Outstanding balances are unevenly distributed across the accounts.','graph'],['Review records','Switch function to see what the same business means to a different team.','records']];return entries.map(([title,text,view],i)=>`<div class="insight"><strong><span class="num">0${i+1}</span>${e(title)}</strong><p>${e(text)}</p>${view===state.view?'':b('view',(R().views.includes(view)?'Explore ':'Open operations view ')+glyph('arrow'),'text-button',`data-view="${view}" ${R().views.includes(view)?'':'data-role="operations"'}`)}</div>`).join('');}
function overviewView(){
  if(state.role==='people')return statGrid()+capacityView(false);
  const chart=(state.role==='sales'||state.role==='saleslead')?panel('A pipeline with context','Total contract value by stage',pipelineBars(),b('view','Open pipeline '+glyph('arrow'),'text-button tiny','data-view="board"')):panel('The last six months','Illustrative cash activity · June–November 2026',historicalChart());
  if(state.look==='bento')return bentoOverview({statGrid:statGrid(),chart,agenda:insights(),details:panel(state.role==='operations'?'Work to watch':(state.role==='sales'||state.role==='saleslead')?'Next conversations':'Receivables by account','Connected to the same business records',state.role==='operations'?compactWork():(state.role==='sales'||state.role==='saleslead')?compactDeals():concentration()),e,role:R()});
  return statGrid()+`<div class="two-col"><div class="stack">${chart}${panel(state.role==='operations'?'Work to watch':(state.role==='sales'||state.role==='saleslead')?'Next conversations':'Receivables by account',state.role==='operations'?'Open items with a dependency':(state.role==='sales'||state.role==='saleslead')?'Highest-value open opportunities':'Outstanding invoice balances · highest five accounts',state.role==='operations'?compactWork():(state.role==='sales'||state.role==='saleslead')?compactDeals():concentration())}</div>${panel('On the agenda','A role-specific reading of the sample data',insights())}</div>`;
}
function compactWork(){return D().work.filter(w=>w.issue&&w.status!=='Complete').map(w=>`<div class="insight">${link(w)}<p>${e(accountName(w.accountId))} · ${e(w.issue)}</p></div>`).join('');}
function compactDeals(){return D().opportunities.filter(o=>o.probability<1).sort((a,b)=>b.valuePence-a.valuePence).slice(0,4).map(o=>`<div class="insight row between"><div>${link(o)}<p>${e(o.next)}</p></div><strong>${compact(o.valuePence)}</strong></div>`).join('');}
function boardView(){const d=D();return statGrid()+`<div class="board">${d.config.stages.map(stage=>{const rows=d.opportunities.filter(o=>o.stage===stage);return `<section class="board-column"><div class="column-title">${e(stage)}<span>${rows.length} · ${compact(sum(rows,'valuePence'))}</span></div>${rows.map(o=>`<article class="deal-card"><span class="eyebrow">${e(accountName(o.accountId))}</span><h3>${e(o.name.split(' · ')[1])}</h3><p>Expected close · ${MONTHS[o.closeMonth-1]}</p><div class="deal-value">${compact(o.valuePence)}</div><p>${e(o.next)}</p><footer><span class="row tiny">${personAvatar(o.owner)}${e(o.owner.split(' ')[0])}</span>${b('record','Open '+glyph('arrow'),'text-button tiny',`data-id="${o.id}"`)}</footer></article>`).join('')}</section>`;}).join('')}</div><p class="footnote">Stage probabilities are illustrative: 20%, 45%, 70%, 100%. Moving a record updates bookings metrics; it does not create a payment or recognise revenue.</p>`;}
const forecastRanges = [
  {id:'collection-delay',control:'delay',label:'Collection delay',min:0,max:3,step:1,
   format:value=>value+' month'+(value===1?'':'s')},
  {id:'cost-change',control:'costChange',label:'Monthly cost change',min:-20,max:30,step:5,
   format:value=>(value>0?'+':'')+value+'%'}
];
function forecastRangeControl(range) {
  const value=state[range.control], formatted=range.format(value);
  return `<div><div class="scenario-readout"><label for="${range.id}">${range.label}</label>
    <output id="${range.id}-value" for="${range.id}" aria-hidden="true">${formatted}</output></div>
    ${workspaceRangeInput({...range,value,valueText:formatted})}</div>`;
}
function forecastFigures() {
  const d=D(), base=cashForecast(d), scenario=cashForecast(d,state);
  const last=scenario.at(-1), delta=last.cash-base.at(-1).cash;
  return {
    chart:lineChart([{name:'Baseline',values:base.map(x=>x.cash),color:'var(--muted)',dashed:true},{name:'Your scenario',values:scenario.map(x=>x.cash),color:'var(--accent)'}],{labels:MONTHS,title:'Baseline and scenario closing cash balances'}),
    months:scenario.map((r,i)=>`<tr><td>${MONTHS[i]}</td><td>${gbp(r.receipts)}</td><td>${gbp(r.potential)}</td><td>${gbp(r.costs)}</td><td>${gbp(r.cash)}</td></tr>`).join(''),
    summary:`<p class="eyebrow">May closing cash</p><div class="big">${compact(last.cash)}</div>${tag(`${delta>=0?'+':''}${compact(delta)} vs baseline`,delta<0?'warn':'good')}<p>${last.cash<0?'The scenario ends below zero. Inspect the timing and cost assumptions before planning action.':'This is the cash remaining under the selected assumptions, not a prediction or financial recommendation.'}</p><div class="formula">Opening cash + invoice collections ${state.pipeline?'+ weighted pipeline ':''}− monthly costs.<br>Receipts delayed beyond May are outside this chart, not written off.</div>`
  };
}
function refreshForecast() {
  const figures=forecastFigures();
  for(const [part,html] of Object.entries(figures)) root.querySelector('[data-forecast="'+part+'"]').innerHTML=html;
  for(const range of forecastRanges){
    const input=root.querySelector('#'+range.id), value=state[range.control], formatted=range.format(value);
    if(input.value!==String(value)) input.value=String(value);
    input.setAttribute('aria-valuetext',formatted);
    input.parentElement.style.setProperty('--range-fill',workspaceRangeFill(value,range.min,range.max));
    root.querySelector('#'+range.id+'-value').textContent=formatted;
  }
  root.querySelector('[data-control="pipeline"]').checked=state.pipeline;
}
function changeForecastControl(input) {
  const key=input.dataset.control, value=key==='pipeline'?input.checked:Number(input.value);
  if(state[key]===value) return;
  state[key]=value;
  refreshForecast();
}
function forecastView(){
  const figures=forecastFigures();
  return statGrid()+`<div class="two-col">
    <section class="panel"><div class="panel-head"><div><h2>How much room do you have?</h2><p>Projected closing cash · Dec 2026–May 2027 · hypothetical scenario</p></div>${b('open-commission-forecast','Commission forecast','small')}</div>
    <div class="panel-body"><div data-forecast="chart">${figures.chart}</div>
    <div class="scenario-controls">${forecastRanges.map(forecastRangeControl).join('')}</div>
    <label class="check-label"><input type="checkbox" data-control="pipeline" ${state.pipeline?'checked':''}> Include weighted open pipeline as same-month cash (illustrative assumption)</label>
    <details class="spaced" data-forecast-calculation ${state.forecastCalculationOpen?'open':''}><summary>Inspect the monthly calculation</summary><div class="table-scroll"><table><thead><tr><th>Month</th><th>Invoice receipts</th><th>Pipeline assumption</th><th>Costs</th><th>Closing cash</th></tr></thead><tbody data-forecast="months">${figures.months}</tbody></table></div></details></div></section>
    <div class="stack"><aside class="scenario-summary"><div data-forecast="summary">${figures.summary}</div>${b('reset-forecast','Reset assumptions','small spaced')}</aside>
    ${panel('What sits behind the balance','Highest outstanding account balances',concentration())}</div></div>`;
}
function timelineView(){return statGrid()+`<section class="panel"><div class="panel-head"><div><h2>Delivery, without the blind spots</h2><p>Illustrative eight-week plan · 16 Nov 2026–10 Jan 2027</p></div>${tag('16 work items')}</div><div class="timeline-scroll"><div class="timeline"><div class="timeline-header"><span>Work / owner</span><div class="timeline-weeks">${['16 Nov','23 Nov','30 Nov','7 Dec','14 Dec','21 Dec','28 Dec','4 Jan'].map(x=>`<span>${x}</span>`).join('')}</div></div>${D().work.map(w=>`<div class="timeline-row"><div class="timeline-label">${link(w)}<small>${e(w.owner)} · ${e(accountName(w.accountId))}</small></div><div class="timeline-track">${b('record',e(w.status),`timeline-bar ${w.status.toLowerCase()}`,`data-id="${w.id}" style="grid-column:${w.startWeek+1}/span ${w.durationWeeks}"`)}</div></div>`).join('')}</div></div></section><p class="footnote">Open a work item to inspect its dependency or change its owner. Planned hours are weekly workload assumptions; the bars show the wider delivery window.</p>`;}
function capacityView(withStats=true){return (withStats?statGrid():'')+`<div class="capacity-grid">${D().team.map(t=>{const net=availability(D(),t.id,'2026-11-16').available,pct=net?Math.round(t.allocated/net*100):0,over=t.allocated>net;return `<article class="panel person-card">${personAvatar(t.name)}<h3>${e(t.name)}</h3><p>${e(t.title)}</p><div class="allocation ${over?'over':''}">${net?pct+'%':t.allocated?'No capacity':'0%'} </div><div class="bar-track"><span class="${over?'overbar':''}" style="width:${Math.min(100,pct)}%"></span></div><p>${t.allocated}h allocated / ${net}h available after leave</p>${b('record','Inspect workload '+glyph('arrow'),'text-button tiny',`data-id="${t.id}"`)}</article>`;}).join('')}</div><p class="footnote">Capacity is a planning conversation, not an employee performance score. All people and allocations are fictional. This view uses the week of 16 November 2026 and deducts approved leave from contracted capacity.</p>`;}
function graphContext(){const g=relationships(D(),state.account,state.role);return `<p class="eyebrow">Connected to</p><h3>${e(g.account.name)}</h3><p>${e(g.account.segment)} · ${e(g.account.region)}<br>Account owner: ${e(g.account.owner)}</p><div class="relationship-list">${g.nodes.slice(1).map(n=>b('record',`<div>${e(n.label)}<small>${e(n.type==='domain'?D().config.singular:n.type)}</small></div>`,'',`data-id="${n.id}"`)).join('')}</div><p>Click a node to inspect the underlying record. Change function to reveal a different set of connections.</p>`;}
function graphView(){const d=D(),g=relationships(d,state.account,state.role);state.account=g.account.id;return `<div class="toolbar"><label class="row" for="graph-account">Focus account <select id="graph-account" data-select="account">${d.accounts.map(a=>`<option value="${a.id}" ${a.id===g.account.id?'selected':''}>${e(a.name)}</option>`).join('')}</select></label><span class="tiny muted">${g.nodes.length} records · ${g.edges.length} relationships · ${e(R().name)} perspective</span></div><div class="graph-layout"><section class="panel graph-stage">${relationshipGraph(g,state.graphSelected)}</section>${state.look==='atlas'?'':`<aside class="panel graph-inspector"><p class="eyebrow">Connected to</p><h3>${e(g.account.name)}</h3><p>${e(g.account.segment)} · ${e(g.account.region)}<br>Account owner: ${e(g.account.owner)}</p><div class="relationship-list">${g.nodes.slice(1).map(n=>b('record',`<div>${e(n.label)}<small>${e(n.type==='domain'?D().config.singular:n.type)}</small></div>`,'',`data-id="${n.id}"`)).join('')}</div><p>Click a node to inspect the underlying record. Change function to reveal a different set of connections.</p></aside>`}</div><div class="chart-legend spaced"><span><i style="background:var(--accent)"></i>Account / industry record</span><span><i style="background:#bc8a3a"></i>Invoice</span><span><i style="background:#478a7d"></i>Work</span><span><i style="background:#9174b7"></i>Person</span></div><p class="footnote">Links come from the synthetic dataset’s account and ownership references. This is a relationship view over relational data; it does not require or claim a deployed graph database.</p>`;}
function columnsForRole(){switch(state.role){case'finance':return ['Invoice','Account','Total','Outstanding','Due','Status'];case'saleslead':case'sales':return ['Opportunity','Owner','Contract value','Stage','Probability','Expected close'];case'operations':return ['Work item','Account','Owner','Status','Hours','Dependency'];case'people':return ['Person','Role','Contracted hours','Allocated','Unallocated after leave'];default:return [D().config.singular,'Account','Status',...D().config.schema.map(s=>s[0])];}}
function schemaValue(key,value){const type=D().config.schema.find(s=>s[0]===key)?.[1];return type==='money'?gbp(value):type==='percent'?value+'%':e(value);}
function recordCells(r){switch(state.role){case'finance':return [link(r,r.number),e(accountName(r.accountId)),gbp(r.totalPence),gbp(balance(r)),MONTHS[r.dueMonth-1],tag(r.status,r.status==='Overdue'?'warn':r.status==='Paid'?'good':'')];case'saleslead':case'sales':return [link(r),e(r.owner),gbp(r.valuePence),tag(r.stage),Math.round(r.probability*100)+'%',MONTHS[r.closeMonth-1]];case'operations':return [link(r),e(accountName(r.accountId)),e(r.owner),tag(r.status),r.hours+'h',e(r.issue||'—')];case'people':return [link(r),e(r.title),r.capacity+'h',r.allocated+'h',availability(D(),r.id,'2026-11-16').remaining+'h'];default:return [link(r),e(accountName(r.accountId)),tag(r.status),...Object.entries(r.fields).map(([k,v])=>schemaValue(k,v))];}}
function recordsView(){const list=recordsFor(D(),state.role).filter(r=>e(JSON.stringify(r)+' '+accountName(r.accountId)).toLowerCase().includes(state.query.toLowerCase()));return `<div class="toolbar"><input id="record-search" aria-label="Search current records" placeholder="Search these records…" value="${e(state.query)}"><div class="row"><span class="tiny muted">${list.length} records</span>${b('export',glyph('download')+' Export dataset','small')}</div></div><section class="panel"><div class="table-scroll"><table><thead><tr>${columnsForRole().map(c=>`<th>${e(c)}</th>`).join('')}</tr></thead><tbody>${list.map(r=>`<tr>${recordCells(r).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>${!list.length?'<div class="empty">No records match this search.</div>':''}</div></section><p class="footnote">These are ${e(R().name.toLowerCase())} records for ${e(D().config.brand)}. ${state.role==='leadership'?'The fields change with the business model.':'Switch function to change the underlying record type, not just the column labels.'}</p>`;}
function gallery(){return `<main class="gallery" id="studio-main"><div class="gallery-intro"><div><p class="eyebrow">WORKSPACE GALLERY</p><h1>Choose a workspace</h1><p>Choose a business, role and design.</p></div><div class="gallery-count"><div><strong>08</strong> business datasets</div><div><strong>06</strong> roles</div><div><strong>${String(appearanceChoices.length).padStart(2,'0')}</strong> designs</div></div></div><div class="gallery-section-title"><span>Workspace designs</span><span class="launch-status">Interactive concepts · synthetic data</span></div><section class="appearance-gallery" aria-label="Choose a workspace appearance"><div class="gallery-section-title"><strong>Choose a design</strong></div><div class="appearance-grid">${appearanceChoices.map(l=>`<article class="appearance-card">${miniPreview(l.id)}<div><h2>${e(l.name)}</h2><p>${e(l.caption)}</p>${b('appearance',(l===NORTHSTAR_APPEARANCE?'Open ':'Use ')+e(l.name)+' '+glyph('arrow'),'',`data-look="${l.id}"`)}</div></article>`).join('')}</div></section><div class="gallery-section-title"><strong>Workflow demos</strong><span>Choose a task</span></div><div class="gallery-grid">${PRESETS.map((p,i)=>`<article class="preset-card">${miniPreview(p.look)}<div class="preset-info"><p class="eyebrow">${e(INDUSTRIES.find(x=>x.id===p.industry).name)} / ${e(ROLES.find(x=>x.id===p.role).name)}</p><h2>${e(p.name)}</h2><p>${e(p.note)}</p>${b('preset','Open workspace '+glyph('arrow'),'',`data-index="${i}"`)}</div></article>`).join('')}</div><div class="gallery-axis"><div><strong>01 / The business</strong><p>Real differences in the model: properties and leases, vacancies and placements, assets and service work.</p></div><div><strong>02 / The responsibility</strong><p>A finance user sees collections and cash assumptions. A delivery lead sees work and capacity.</p></div><div><strong>03 / The experience</strong><p>Change the shell, navigation, typography, hierarchy and density. Keep the connected data underneath.</p></div></div></main>`;}
function render(){
  closeContactEmailLookup();
  const alerts = state.gallery || !R().views.includes('alerts') ? [] : workspaceAlerts(D(), state.role);
  const tracker = alertTrackers.get(state.industry + '/' + state.role);
  const notices = !state.gallery && tracker ? tracker.update(alerts, state.view === 'alerts') : [];
  const content = state.gallery ? gallery() : shell(
    state.view === 'alerts' ? workspaceAlertView(alerts,state.alertKind) :
    state.view === 'financeexceptions' ? financeExceptionsView(D(),state) :
    state.view === 'approvals' ? approvalView(D(),state) :
    state.view==='contacts'?contactWorkspace(D(),state):state.view==='commissions'?commissionView(D(),state):state.view==='outcomes'?outcomeView(D(),state):heading()+(ROLE_TITLES[state.view]?roleView(D(),state):({overview:overviewView,board:boardView,forecast:forecastView,timeline:timelineView,capacity:capacityView,graph:graphView,records:recordsView}[state.view]||overviewView)()), alerts);
  root.innerHTML = demoBar() + content + workspaceAlertNotice(notices);
  applyWorkspaceSize();
  syncURL();
}
function changeWorkspaceLook(look) {
  const active = document.activeElement;
  const page = root.querySelector('#studio-main');
  const record = (modal.open ? modal : root).querySelector('[data-workspace-record]');
  const keepRecord = record?.isConnected;
  // These two views have look-specific markup. Other views can keep live forms and disclosures.
  const keepPage = page?.isConnected && page.matches('.page') && !state.gallery && !['overview', 'graph'].includes(state.view);
  state.look = look;
  render();
  if (keepPage) root.querySelector('#studio-main').replaceChildren(...page.childNodes);
  if (keepRecord) {
    const inspector = root.querySelector('[data-workspace-record]');
    if (inspector) {
      inspector.replaceWith(record);
      if (modal.open) modal.close();
    } else if (!modal.open) {
      modal.replaceChildren(record);
      modal.showModal();
    }
  }
  if (active?.isConnected && active !== document.body) active.focus({preventScroll:true});
}
function studioHash(){return state.gallery?'#gallery':`#studio/${state.industry}/${state.role}/${state.look}/${state.view}${state.view==='outcomes'&&state.outcomeCase?'/'+state.outcomeCase:''}`;}
function syncURL(){if((location.search||'').includes('embed=site')&&window.parent!==window)window.parent.postMessage({type:'data-saver-studio-state',industry:state.industry,role:state.role,look:state.look,view:state.view,outcomeCase:state.outcomeCase},'*');const hash=studioHash();if(location.hash!==hash){try{history.replaceState(null,'',hash);}catch{ /* Embedded srcdoc has no independent share URL. */ }}}
function readURL(){const parts=location.hash.slice(1).split('/');if(parts[0]!=='studio')return;if(INDUSTRIES.some(i=>i.id===parts[1])&&ROLES.some(r=>r.id===parts[2])&&LOOKS.some(l=>l.id===parts[3])){state.industry=parts[1];state.role=parts[2];state.look=parts[3];state.view=R().views.includes(parts[4])?parts[4]:R().defaultView;state.outcomeCase=OUTCOME_SCENARIOS.some(x=>x.id===parts[5])?parts[5]:null;state.outcomeFeedback='';state.gallery=false;}}
function openPreset(index){document.querySelector('#studio-toast').classList.remove('on');const p=PRESETS[(index+PRESETS.length)%PRESETS.length];Object.assign(state,p,{preset:(index+PRESETS.length)%PRESETS.length,gallery:false,query:'',account:null,delay:0,costChange:0,pipeline:false});render();window.scrollTo(0,0);}
function flash(message){const el=document.querySelector('#studio-toast');el.textContent=message;el.classList.add('on');clearTimeout(flash.timer);flash.timer=setTimeout(()=>el.classList.remove('on'),4000);}
function findRecord(id){for(const type of ['accounts','opportunities','invoices','bills','work','team','domain']){const record=D()[type].find(r=>r.id===id);if(record)return {type,record};}return null;}
function recordDetails(id){const found=findRecord(id);if(!found)return '';const {type,record:r}=found;let fields=[],body='',actions='';
  const field=(label,value)=>`<div><small>${e(label)}</small><strong>${value}</strong></div>`;
  if(type==='accounts'){fields=[['Segment',e(r.segment)],['Region',e(r.region)],['Owner',e(r.owner)],['Outstanding invoices',gbp(sum(D().invoices.filter(i=>i.accountId===r.id),balance))]];body=`<p class="eyebrow">Linked business records</p>${D().domain.filter(x=>x.accountId===r.id).map(x=>`<div class="modal-list">${link(x)}${tag(x.status)}</div>`).join('')}`;const contacts=D().contacts.filter(c=>c.accountId===id);
    if(contacts.length)body+='<p class="eyebrow">Contacts</p>'+contacts.map(c=>`<div class="modal-list"><strong>${e(c.name)}</strong><span>${e(c.title)}</span></div>`).join('');
    actions=b('focus-account','Explore relationships','primary',`data-id="${r.id}"`);}
  if(type==='opportunities'){fields=[['Account',e(accountName(r.accountId))],['Contract value',collectionMoney(r.valuePence)],...(r.pricing?.netPence===r.valuePence?[['List price',collectionMoney(r.pricing.grossPence)],['Approved discount',(r.pricing.rateBps/100)+'%']]:[]),['Stage',e(r.stage)],['Stage probability',Math.round(r.probability*100)+'%'],['Owner',e(r.owner)],['Expected close',MONTHS[r.closeMonth-1]]];body=`<p class="tiny muted">Next step: ${e(r.next)}.</p>`+pipelineRecordForm(D(),r)+dealOwnerForm(D(),r,state.role);actions=r.probability===1?tag('Final stage reached','good'):'';}
  if(type==='invoices'){fields=[['Account',e(accountName(r.accountId))],['Invoice total',collectionMoney(r.totalPence)],['Already paid',collectionMoney(r.paidPence)],['Outstanding',collectionMoney(balance(r))],['Invoice due',e(r.dueDate)],['Expected collection',MONTHS[r.dueMonth-1]],['Overdue days',r.overdueDays]];body='<p class="tiny muted">Opening invoice balances are synthetic. Recording a collection changes only this demo and updates its forecast.</p>';actions=balance(r)>0?b('collect','Record full collection','primary',`data-id="${r.id}"`):tag('Fully collected','good');}
  if(type==='bills'){
    fields=[['Supplier',e(r.supplier)],['Invoice number',e(r.number)],['Due date',e(r.due)],['Outstanding',collectionMoney(collectionOpenAmount(r))],['Review status',e(r.status)],['Category',e(r.category)]];
    if(state.role==='finance' && r.status==='Needs review' && !r.collection?.dispute)actions=b('bill-approve','Approve for payment review','small',`data-id="${r.id}"`);
  }
  if(type==='invoices'||type==='bills')body+=collectionRecordPanel(D(),state.role,r);
  if(type==='work'){fields=[['Account',e(accountName(r.accountId))],['Status',e(r.status)],['Weekly allocation',r.hours+'h'],['Dependency',e(r.issue||'None recorded')]];body=`<label for="reassign-owner">Change owner</label><select id="reassign-owner">${D().team.map(t=>`<option ${r.owner===t.name?'selected':''}>${e(t.name)}</option>`).join('')}</select>`;actions=b('reassign','Save assignment','primary',`data-id="${r.id}"`);}
  if(type==='team'){fields=[['Role',e(r.title)],['Weekly capacity',r.capacity+'h'],['Allocated',r.allocated+'h'],['Available after leave',availability(D(),r.id,'2026-11-16').available+'h'],['Unallocated after leave',availability(D(),r.id,'2026-11-16').remaining+'h']];body=`<p class="eyebrow">Active work</p>${D().work.filter(w=>w.owner===r.name&&w.status!=='Complete').map(w=>`<div class="modal-list">${link(w)}<span>${w.hours}h</span></div>`).join('')||'<p class="tiny muted">No active work allocated.</p>'}`;}
  if(type==='domain'){fields=[['Account',e(accountName(r.accountId))],['Status',e(r.status)],...Object.entries(r.fields).map(([k,v])=>[k,schemaValue(k,v)])];body=`<p class="tiny muted">${e(D().config.singular)} record linked to its account. These business-specific fields are part of the example dataset.</p>`;actions=b('focus-account','Explore account relationships','primary',`data-id="${r.accountId}"`);}
  if(type==='accounts' || type==='opportunities'){
    const history=D().activity.filter(a=>(type==='accounts'?a.accountId:a.opportunityId)===id);
    if(history.length)body+='<p class="eyebrow">CRM activity</p>'+history.map(a=>`<div class="modal-list"><strong>${e(a.action)}</strong><span>${e(a.detail)}${a.at?' · '+e(new Date(a.at).toLocaleString('en-GB')):''}</span></div>`).join('');
  }
  if(type==='accounts'&&R().views.includes('commissions')){
    const lines=ensureCommissions(D()).deals.filter(line=>line.accountId===id);
    if(lines.length)body+='<section><h3>Commission statement</h3>'+lines.map(line=>b('open-commission-line',e(line.id)+' · '+e(line.owner),'small',`data-id="${e(line.id)}"`)).join('')+'</section>';
  }
  if(type==='work')body+=dependencyPanel(D(),r,state.role);
  body+=financeExceptionRecordPanel(D(),state.role,type,r.id);
  body+=approvalRecordPanel(D(),state.role,type,r.id);
  return `<div data-workspace-record><div class="row between"><p class="eyebrow">${e(type==='domain'?D().config.singular:type)} · synthetic record</p>${b('close',glyph('close'),'icon-button','aria-label="Close record"')}</div><h2 id="record-title" tabindex="-1">${e(r.name||r.title||r.number)}</h2><div class="detail-grid">${fields.map(([k,v])=>field(k,v)).join('')}</div>${body}<div class="modal-actions">${b('close','Close')}${actions}</div></div>`;}
function showRecord(id){if(!findRecord(id))return;lastTrigger=document.activeElement;if(lastTrigger?.dataset?.do==='record')lastRecordTrigger={id:lastTrigger.dataset.id};state.graphSelected=id;if(['atlas','ledger'].includes(state.look)){if(modal.open)modal.close();render();document.querySelector('#record-title')?.focus();flash('Selected '+(findRecord(id).record.name||findRecord(id).record.title||findRecord(id).record.number));return;}if(modal.open)modal.close();modal.innerHTML=recordDetails(id);modal.showModal();}
function closeRecord() {
  const attached = ['atlas', 'ledger'].includes(state.look);
  state.graphSelected = null;
  if (attached) render();
  else modal.close();
  const previous = lastTrigger?.isConnected && !modal.contains(lastTrigger) ? lastTrigger : null;
  const launcher = previous || [...root.querySelectorAll('[data-do="record"]')].find(el => el.dataset.id === lastRecordTrigger?.id);
  (launcher || root.querySelector('#studio-main'))?.focus();
}
modal.addEventListener('cancel', event => {event.preventDefault();closeRecord();});
function exportData(){const file=new Blob([JSON.stringify(D(),null,2)],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=`integral-${state.industry}-dataset.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);flash('Synthetic dataset exported.');}
function openFinanceCase(id){
  if(!R().views.includes('financeexceptions'))return;
  if(modal.open)modal.close();
  state.financeException=id;state.graphSelected=null;state.view='financeexceptions';render();
  root.querySelector('[data-finance-focus]')?.focus();
}
function roleAction(action,el){
 try {
  const d=D(),id=el.dataset.id;
  if(action==='open-commission-line'){
    if(!R().views.includes('commissions'))return true;
    if(modal.open)modal.close();
    state.view='commissions';state.graphSelected=null;state.commissionFocus=id;render();
    root.querySelector('[data-commission-line="'+id+'"]')?.focus();return true;
  }
  if(action==='finance-exception-open'){openFinanceCase(id);return true;}
  if(action==='open-alerts'){
    state.view='alerts';state.alertKind='';state.graphSelected=null;render();
    root.querySelector('#alert-heading')?.focus();return true;
  }
  if(action==='dismiss-alert'){
    alertTrackers.get(state.industry+'/'+state.role)?.dismiss();
    el.closest('.workspace-alert-notice')?.remove();
    (root.querySelector('.workspace-alert-bell')||root.querySelector('#studio-main'))?.focus();return true;
  }
  if(action==='open-alert-item'){
    const item=workspaceAlerts(d,state.role).find(alert=>alert.key===id);
    if(!item){render();return true;}
    if(item.opportunityId || item.recordId){showRecord(item.opportunityId || item.recordId);return true;}
    if(item.leaveId){
      state.view='leave';state.leaveEdit=null;render();
      root.querySelector('#leave-'+item.leaveId+' [data-do="leave-edit"]')?.focus();return true;
    }
    if(item.commissionId){
      state.view='commissions';state.commissionFocus=item.commissionId;render();
      root.querySelector('[data-commission-inquiry="'+item.commissionId+'"] summary')?.focus();return true;
    }
    if(item.financeExceptionId){openFinanceCase(item.financeExceptionId);return true;}
    Object.assign(state,{view:'approvals',graphSelected:null,approvalFocus:item.requestId,approvalType:null,approvalTarget:null});
    render();root.querySelector('[data-approval-focus]')?.focus();return true;
  }
  if(action==='approval-open'||action==='approval-kind'){
    approvalAction(d,state,action,el);state.graphSelected=null;
    if(modal.open)modal.close();render();root.querySelector('[data-approval-focus]')?.focus();return true;
  }
  if(action.startsWith('crm-')){const message=crmInteraction(d,state,action.slice(4),el);render();if(message)flash(message);return true;}
  if(action.startsWith('quote-handoff-')){
    const findPacket=()=>[...root.querySelectorAll('[data-quote-packet]')].find(packet=>packet.dataset.quotePacket===id);
    if(action==='quote-handoff-open'){
      const packet=findPacket();
      if(packet){packet.open=true;packet.querySelector('summary')?.focus();packet.scrollIntoView({block:'nearest'});}
      return true;
    }
    const packet=el.closest('[data-quote-packet]');
    const values=Object.fromEntries([...packet.querySelectorAll('[name]')].map(field=>[field.name,field.value]));
    const message=quoteHandoffAction(d,state.role,action,id,{...values,version:el.dataset.version});
    render();
    const updated=findPacket();
    if(updated){updated.open=true;updated.querySelector('summary')?.focus({preventScroll:true});}
    flash(message);
    return true;
  }
  if(action==='open-commission-forecast'){
    state.view='commissions';state.commissionForecastOpen=true;render();
    root.querySelector('.commission-forecast summary')?.focus();return true;
  }
  if(action.startsWith('commission-')){
    if(action==='commission-edit')state.commissionEdit=id;
    else if(action==='commission-cancel')state.commissionEdit=null;
    else{const input=Object.fromEntries([...(el.closest('form')?.querySelectorAll('[data-commission-field]')||[])].map(field=>[field.dataset.commissionField,field.value]));const message=commissionAction(d,action,id,input,state.role);if(['commission-query','commission-resolve','commission-refund-review'].includes(action))state.commissionFocus=id;if(action==='commission-save')state.commissionEdit=null;
    if(action==='commission-assign-package')state.commissionForecastOpen=true;
    render();
    if(action==='commission-assign-package')root.querySelector('[data-do="commission-assign-package"][data-id="'+id+'"]')?.focus();
    if(action==='commission-new-package'||action==='commission-plan'||action==='commission-team'){
      const rules=root.querySelector('.commission-rules');
      if(rules){rules.open=true;rules.querySelector('summary')?.focus();}
    }
    flash(message);return true;}
    render();return true;
  }
  if(action==='leave-edit'){state.leaveEdit=id;render();root.querySelector('[data-leave-edit] input')?.focus();return true;}
  if(action==='leave-edit-cancel'){state.leaveEdit=null;render();return true;}
  if(action==='leave-save'){const form=el.closest('form');const message=editLeaveDates(d,id,form.elements.start.value,form.elements.end.value);state.leaveEdit=null;render();flash(message);return true;}

  if(action.startsWith('outcome-')){
    const spec=OUTCOME_SCENARIOS.find(x=>x.id===id);
    if(!spec)return true;
    state.outcomeCase=id;state.outcomeFeedback='';
    let outcomeInput={},outcomeFailed=false;
    try{
      if(action==='outcome-reset'){resetOutcome(d,id);state.outcomeFeedback='This practice case has been reset. Other work is unchanged.';}
      else if(action==='outcome-run'){
        const form=el.closest('[data-outcome-form]');
        const input=Object.fromEntries([...(form?.querySelectorAll('[data-outcome-field]')||[])].map(f=>[f.dataset.outcomeField,f.type==='checkbox'?f.checked:f.value]));
        outcomeInput=input;state.outcomeFeedback=outcomeAction(d,id,el.dataset.action,input);
      }
    }catch(error){state.outcomeFeedback=error.message;outcomeFailed=true;}
    render();
    if(outcomeFailed){
      for(const field of root.querySelectorAll('[data-outcome-field]'))if(Object.hasOwn(outcomeInput,field.dataset.outcomeField))field.value=outcomeInput[field.dataset.outcomeField];
      root.querySelector('[data-outcome-field]')?.focus({preventScroll:true});
    }else document.querySelector(action==='outcome-select'?'#outcome-title':'#outcome-task-title')?.focus({preventScroll:true});
    return true;
  }
  if(action.startsWith('depth-')){
    const c=d.depth.cases.find(x=>x.id===(id||state.depthCase)&&x.role===state.role)||d.depth.cases.find(x=>x.role===state.role);
    const values=Object.fromEntries([...document.querySelectorAll('[data-depth-field]')].map(f=>[f.dataset.depthField,f.type==='checkbox'?f.checked:f.value]));
    if(action==='depth-example'){depthFields(d,c,depthExamples(d,c));c.error='';render();flash('Editable example evidence loaded. Review before completing the step.');return true;}
    const note=document.querySelector(action==='depth-handoff'?'#handoff-'+id:action==='depth-cancel-leave'?'#depth-cancel-note':'#depth-note')?.value||'';
    try{const result=depthAction(d,state,action,{id,values,note});render();flash(result);const heading=document.querySelector('.depth-layout .stack > .panel:nth-child(2) h2');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'nearest'});}catch(error){render();flash(error.message);}
    return true;
  }
  if(action==='call-view'){if(R().views.includes(el.dataset.view)){state.view=el.dataset.view;render();window.scrollTo(0,0);}return true;}
  const value=id=>document.querySelector('#'+id)?.value||'';
  let input={id};
  if(action==='dial-log')input={outcome:value('call-outcome'),notes:value('call-notes'),nextStep:value('call-next'),callbackDate:value('call-date'),opportunityId:value('call-opportunity')};
  if(action==='contact-email')input={email:value('contact-email')};
  if(action==='call-rule-save')input={trigger:value('rule-trigger'),missingEmail:value('rule-missing'),template:value('rule-subject'),body:value('rule-body'),createTask:document.querySelector('#rule-task').checked,advanceQueue:document.querySelector('#rule-advance').checked};
  if(action==='sales-meeting')input={title:value('meeting-title'),date:value('meeting-date')};
  if(action==='sales-quote')input={amount:value('quote-amount')};
  const callResult=salesWorkbenchAction(d,state,action,input);if(callResult!==null){render();flash(callResult);return true;}

  if(action==='leave-approve'||action==='leave-decline'){decideLeave(d,id,action==='leave-approve'?'Approved':'Declined');flash('Leave decision saved in this demo. Coverage and balance updated.');}
  else if(action==='auto-select')state.automationId=id;
  else if(action==='auto-toggle'){const a=d.automations.find(x=>x.id===id);a.status=a.status==='Active'?'Paused':'Active';if(id===d.callRule.automationId)processCallJobs(d);d.activity.unshift({action:'Automation '+a.status.toLowerCase(),recordId:id});flash('Automation '+a.status.toLowerCase()+' in the demo.');}
  else if(action==='auto-run'){const result=simulateAutomation(d,id);flash(`${result.sent} simulated sends; ${result.skipped} suppressed. No real messages sent.`);}
  else if(action==='inspect-person')state.inspectPerson=id;
  else if(action==='team-drill')state.companyTeam=el.dataset.team;
  else if(action==='jump-role'){state.role=el.dataset.role;state.view=el.dataset.view;state.query='';}
  else if(action==='life-complete'){d.lifecycle.find(x=>x.id===id).status='Complete';d.activity.unshift({action:'People task completed',recordId:id});}
  else if(action==='risk-review'){d.risks.find(x=>x.id===id).status='Reviewed';d.activity.unshift({action:'Risk reviewed',recordId:id});}
  else if(action==='work-unblock'){showRecord(id);return true;}
  else if(action==='bill-approve'){
    if(state.role!=='finance')throw new Error('Use the Finance desk for payment review.');
    approveCollectionBill(d,id);render();showRecord(id);flash('Supplier invoice approved for payment review.');return true;
  }
  else return false;
  render();return true;
 }catch(error){flash(error.message);return true;}
}
let northstarLaunchControl=null;
function returnFromNorthstar(control=northstarLaunchControl){
  const selector=state.gallery?'[data-look="northstar"]':'#choose-look';
  (control?.isConnected?control:root.querySelector(selector))?.focus();
  northstarLaunchControl=null;
}
function openNorthstar(trigger){
  northstarLaunchControl=trigger;
  if(window.parent!==window && (new URLSearchParams(location.search).get('embed')==='site'||location.protocol==='about:')){
    window.parent.postMessage({type:'data-saver-open-northstar'},['about:','file:'].includes(location.protocol)?'*':location.origin);
  }else{
    northstarPreview.open(trigger);
  }
}

function onAction(event){
  const el=event.target.closest('[data-do]');if(!el)return;const action=el.dataset.do;
  if(action==='find-email'){openContactEmailLookup(D(),el);return;}
  if(roleAction(action,el))return;switch(action){
  case'appearance':if(el.dataset.look==='northstar'){openNorthstar(el);break;}if(LOOKS.some(l=>l.id===el.dataset.look)){state.look=el.dataset.look;state.gallery=false;render();window.scrollTo(0,0);}break;
  case'gallery':state.gallery=true;render();window.scrollTo(0,0);break;
  case'site-home':
    if(window.parent!==window && new URLSearchParams(location.search).get('embed')==='site' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey){
      event.preventDefault();
      window.parent.postMessage({type:'data-saver-studio-home'}, location.protocol==='file:'?'*':location.origin);
    }
    break;
  case'close-embed':if(window.parent!==window)window.parent.postMessage({type:'data-saver-studio-close'},location.protocol==='file:'||location.protocol==='about:'?'*':location.origin);break;
  case'preset':openPreset(Number(el.dataset.index));break;
  case'previous':openPreset(state.preset-1);break;
  case'next':openPreset(state.preset+1);break;
  case'view':if(el.dataset.workflow)state.depthCase=D().depth.cases.find(c=>c.workflow===el.dataset.workflow)?.id;if(el.dataset.role)state.role=el.dataset.role;if(R().views.includes(el.dataset.view)){state.view=el.dataset.view;state.gallery=false;state.query='';render();}break;
  case'domain':state.role='leadership';state.view='records';state.gallery=false;state.query='';render();break;
  case'record':showRecord(el.dataset.id);break;
  case'close':closeRecord();break;
  case'focus-account':closeRecord();state.account=el.dataset.id;state.view='graph';render();break;

  case'collect':{const invoice=D().invoices.find(i=>i.id===el.dataset.id),amount=balance(invoice);if(!amount){flash('Invoice already settled.');break;}D().openingCashPence+=amount;invoice.paidPence=invoice.totalPence;invoice.status='Paid';invoice.overdueDays=0;D().activity.unshift({action:'Collection recorded',recordId:invoice.id,amount});render();showRecord(invoice.id);flash('Demo collection recorded. No real payment was made.');break;}
  case'reassign':reallocate(D(),el.dataset.id,document.querySelector('#reassign-owner').value);render();showRecord(el.dataset.id);flash('Owner changed. Team allocations recalculated.');break;
  case'reset-forecast':state.delay=0;state.costChange=0;state.pipeline=false;refreshForecast();break;
  case'export':exportData();break;
}}
function submitCollectionForm(event){
  const form=event.target;
  if(!form.matches('[data-collection-form]'))return;
  event.preventDefault();
  try{
    const result=recordCollectionAction(D(),state.role,form.dataset.collectionForm,Object.fromEntries(new FormData(form)),form.dataset.revision);
    render();showRecord(result.record.id);flash(result.duplicate?'Activity already recorded.':'Follow-up saved on the invoice.');
  }catch(error){const feedback=form.querySelector('[data-finance-error]');feedback.textContent=error.message;feedback.tabIndex=-1;feedback.focus();}
}
for(const target of [root,modal]){
  target.addEventListener('submit',submitCollectionForm);
  target.addEventListener('submit',event=>{
    const form=event.target;
    if(!form.matches('[data-deal-owner]'))return;
    event.preventDefault();
    try{
      const deal=handoffOpportunity(D(),form.dataset.dealOwner,state.role,Object.fromEntries(new FormData(form)),form.dataset.version,form.dataset.from);
      render();showRecord(deal.id);
      (modal.open?modal:root).querySelector('[data-deal-owner]')?.closest('details')?.querySelector('summary')?.focus();
      flash('Deal handed to '+deal.owner+'.');
    }catch(error){const feedback=form.querySelector('[data-owner-error]');feedback.textContent=error.message;feedback.tabIndex=-1;feedback.focus();}
  });
  target.addEventListener('change',event=>{if(event.target.matches('[data-collection-action]'))updateCollectionFields(event.target.form);});
}
function submitPipelineForm(event){
  const form=event.target;
  if(!form.matches('[data-pipeline-form]'))return;
  event.preventDefault();
  const id=form.dataset.pipelineForm,stage=form.dataset.stage;
  const actor=R().name, advance=event.submitter?.value==='advance';
  let saved=false, resultForm=form;
  try{
    const opp=saveInvitationDetails(D(),id,Object.fromEntries(new FormData(form)),form.dataset.revision,actor);
    form.dataset.revision=String(opp.pipelineEvidence?.revision||0);
    saved=true;
    if(advance)moveStage(D(),id,stage,actor);
    render();showRecord(id);
    flash(advance?'Moved to '+opp.stage+'.':'Stage evidence saved.');
  }catch(error){
    if(saved && advance){
      render();showRecord(id);
      resultForm=(modal.open?modal:root).querySelector('[data-pipeline-form]');
    }
    const message=resultForm?.querySelector('[data-pipeline-error]');
    if(message){message.textContent=error.message;message.tabIndex=-1;message.focus();}
  }
}
function submitDependency(event){
  const form=event.target;
  if(!form.matches('[data-dependency]'))return;
  event.preventDefault();
  try{
    recordDependency(D(),form.dataset.dependency,state.role,{...Object.fromEntries(new FormData(form)),decision:event.submitter?.value},form.dataset.version);
    render();showRecord(form.dataset.dependency);flash('Delivery record updated.');
  }catch(error){form.querySelector('[data-dependency-error]').textContent=error.message;}
}
root.addEventListener('toggle',event=>{
  if(event.target.dataset.forecastCalculation!==undefined) state.forecastCalculationOpen=event.target.open;
},true);
root.addEventListener('submit',submitDependency);
modal.addEventListener('submit',submitDependency);
root.addEventListener('submit',submitPipelineForm);
modal.addEventListener('submit',submitPipelineForm);
root.addEventListener('input',event=>{
  const form=event.target.form;
  if(form?.matches('[data-approval-form="request"][data-kind="discount"]'))updateDiscountPreview(D(),form);
});
root.addEventListener('submit',event=>{
  if(event.target.matches('[data-finance-exception]')){
    event.preventDefault();
    try{
      const message=submitFinanceException(D(),state.role,event.target,event.submitter);
      if(event.target.dataset.financeException==='new')state.financeException=D().financeExceptions[0].id;
      render();root.querySelector('[data-finance-focus]')?.focus();flash(message);
    }catch(error){flash(error.message);}
    return;
  }
  if(event.target.matches('[data-approval-form]')){
    event.preventDefault();
    try{
      const message=approvalSubmit(D(),state,event.target,event.submitter);
      render();root.querySelector('[data-approval-focus]')?.focus();flash(message);
    }catch(error){flash(error.message);}
    return;
  }
  if(event.target.matches('[data-call-note]')){
    event.preventDefault();
    const form=event.target;
    try {
      addCallNote(D(),form.dataset.callNote,{...Object.fromEntries(new FormData(form)), contactId:form.dataset.contact, revision:form.dataset.revision});
      render();
      const row=[...root.querySelectorAll('[data-call-history]')].find(item=>item.dataset.callHistory===form.dataset.callNote);
      if(row){row.open=true;row.querySelector('summary').focus();}
      flash('Call note added to the history.');
    } catch(error){flash(error.message);}
    return;
  }
  if(event.target.matches('[data-manual-call]')){
    event.preventDefault();
    const form=event.target;
    const values=Object.fromEntries(new FormData(form));
    values.runFollowUp=form.elements.runFollowUp.checked;
    try {
      const {call,duplicate}=logCompletedCall(D(),values);
      state.callContact=call.contactId;
      render();
      flash(duplicate?'This call is already in the contact’s history.':'Completed call saved to the contact’s history.');
    } catch(error){flash(error.message);}
    return;
  }
  if(event.target.dataset.crmForm){
    event.preventDefault();
    const action=event.target.dataset.crmForm==='mail-editor' ? (event.submitter?.value || 'save-draft') : event.target.dataset.crmForm;
    try {
      const message=crmInteraction(D(),state,action,event.target);render();
      if(action==='address-entry')root.querySelector('[data-saved-email], [data-email-entry]')?.focus();
      if(message)flash(message);
    } catch(error){flash(error.message);}
    return;
  }
  if(event.target.matches('[data-leave-edit]')){event.preventDefault();event.target.querySelector('[data-do="leave-save"]')?.click();}if(event.target.matches('[data-outcome-form]')){event.preventDefault();event.target.querySelector('[data-do="outcome-run"]')?.click();}});
root.addEventListener('click',onAction);modal.addEventListener('click',onAction);
root.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('.graph-node')){event.preventDefault();showRecord(event.target.dataset.id);}});
root.addEventListener('change',event=>{const el=event.target;
  if(el.form?.matches('[data-manual-call]')){
    const fields=el.form.elements;
    if(el.name==='contactId'){
      const contact=D().contacts.find(c=>c.id===el.value);
      fields.ownerId.value=contact.ownerId;
      fields.opportunityId.replaceChildren(new Option('Company and contact only',''),
        ...D().opportunities.filter(o=>o.accountId===contact.accountId).map(o=>new Option(o.name,o.id)));
    }
    if(el.name==='runFollowUp'){
      el.form.querySelector('[data-manual-due]').hidden=!el.checked;
      fields.callbackDate.disabled=!el.checked;
      fields.callbackDate.required=el.checked;
    }
    return;
  }
  if(el.name==='sourceId' && el.closest('[data-email-field]')) updateContactEmailField(el.closest('[data-email-field]'));
  if(el.dataset.crmSelect!==undefined){
    try {crmInteraction(D(),state,'select',el);render();root.querySelector('[data-crm-select]')?.focus();}
    catch(error){el.value=state.callContact||D().calls.find(c=>c.status!=='Logged')?.contactId||D().contacts[0].id;flash(error.message);}
    return;
  }
  if(el.name==='accountId' && el.closest('[data-crm-form="save"]')){
    const company=el.form.querySelector('[data-crm-company]');company.hidden=el.value!=='new';
    for(const key of ['company','domain'])el.form.elements[key].required=!company.hidden;
    return;
  }
  if(el.id==='commission-forecast-month'||el.id==='commission-forecast-owner'){
    const key=el.id==='commission-forecast-month'?'commissionForecastMonth':'commissionForecastOwner';
    state[key]=el.value;state.commissionForecastOpen=true;render();root.querySelector('#'+el.id)?.focus();return;
  }
  if(el.id==='alert-kind'){state.alertKind=el.value;render();root.querySelector('#alert-kind')?.focus();return;}
  if(el.id==='call-outcome'){const call=D().calls.find(c=>c.status==='Wrap-up');if(call)call.draftOutcome=el.value;}if(el.dataset.roleFilter){state[el.dataset.roleFilter]=el.value;state.inspectPerson=null;render();document.querySelector(`[data-role-filter="${el.dataset.roleFilter}"]`)?.focus();return;}if(el.dataset.select){const key=el.dataset.select;
    if(key==='look'){
      if(el.value==='northstar'){el.value=state.look;openNorthstar(el);return;}
      state.gallery=false;
      changeWorkspaceLook(el.value);
      root.querySelector('#choose-look')?.focus({preventScroll:true});
      return;
    }
    state[key]=el.value;state.gallery=false;state.query='';state.graphSelected=null;state.alertKind='';state.commissionFocus=null;state.commissionEdit=null;state.financeException=null;state.approvalFocus=null;state.approvalType=null;state.approvalTarget=null;if(key==='industry'){state.account=null;state.callContact=null;state.activeCall=null;state.inspectPerson=null;state.automationId=null;state.companyTeam='All';state.delay=0;state.costChange=0;state.pipeline=false;}if(key==='role'){state.view=state.view==='outcomes'?'outcomes':R().defaultView;state.outcomeCase=null;state.outcomeFeedback='';}render();const replacement=document.querySelector(`[data-select="${key}"]`);replacement?.focus();}if(el.dataset.control)changeForecastControl(el);});
root.addEventListener('input',event=>{const el=event.target;
  if(el.dataset?.emailEntry !== undefined) updateContactEmailField(el.closest('[data-email-field]'));
  if(['firstName','lastName','accountId','title'].includes(el.name) && el.form?.dataset.crmForm==='save'){
    const field=el.form.querySelector('[data-email-field]');
    const marker=field?.querySelector('[name="suggestedEmail"]');
    if(marker?.value){
      const input=field.querySelector('[data-email-entry]');
      if(input.value.trim().toLowerCase()===marker.value.toLowerCase()) input.value='';
      marker.value='';updateContactEmailField(field);
    }
  }
  if(el.id==='workspace-size'){
    applyWorkspaceSize(el.value);
    if(window.parent!==window && new URLSearchParams(location.search).get('embed')==='site'){
      window.parent.postMessage({type:'data-saver-text-size',size:workspaceSize},location.protocol==='file:'?'*':location.origin);
    }
    return;
  }
  if(el.dataset.depthField||el.id==='depth-note'){const c=D().depth.cases.find(x=>x.id===state.depthCase&&x.role===state.role)||D().depth.cases.find(x=>x.role===state.role);if(el.id==='depth-note')c.draftNote=el.value;else depthFields(D(),c,{[el.dataset.depthField]:el.type==='checkbox'?el.checked:el.value});}if(['call-notes','call-next'].includes(el.id)){const call=D().calls.find(c=>c.status==='Wrap-up');if(call)call[el.id==='call-notes'?'notes':'nextStep']=el.value;}if(el.id==='record-search'){const position=el.selectionStart;state.query=el.value;render();const input=document.querySelector('#record-search');input.focus();input.setSelectionRange(position,position);}if(el.dataset.control&&el.type==='range')changeForecastControl(el);});
window.addEventListener('hashchange',event=>{
  // Returning from the overlay leaves this workspace and its form inputs intact.
  if(event.oldURL?.endsWith('#northstar-events') && location.hash===studioHash())return;
  if(location.hash==='#gallery'){state.gallery=true;render();}else if(location.hash.startsWith('#studio/')){readURL();render();}});
window.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||window.parent===window||!(location.search||'').includes('embed=site'))return;
 if(document.querySelector('dialog[open], [popover]:popover-open'))return;
 window.parent.postMessage({type:'data-saver-studio-escape'},location.protocol==='file:'?'*':location.origin);
});
// Only the embedding parent on this origin can change presentation. Business state stays intact.
window.addEventListener('message',event=>{
 // The Studio opened from the classic gallery uses srcdoc and inherits its parent's origin.
 const pageOrigin=location.protocol==='about:'?new URL(document.baseURI).origin:location.origin;
 const trustedOrigin=event.origin===pageOrigin||(location.protocol==='file:'&&event.origin==='null');
 if(window.parent===window||event.source!==window.parent||!trustedOrigin)return;
 const payload=event.data;
 if(payload?.type==='data-saver-reset-text-size'){applyWorkspaceSize(defaultWorkspaceTextSize);return;}
 if(payload?.type==='data-saver-guide-open'){
  if(window.innerWidth<=850 || window.innerHeight<=600){
   requestAnimationFrame(()=>document.querySelector('#studio-main')?.scrollIntoView({block:'start',behavior:'instant'}));
  }
  return;
 }
 if(payload?.type==='data-saver-northstar-return'){returnFromNorthstar();return;}
 if(!payload||!['data-saver-appearance','data-saver-navigate'].includes(payload.type)||!LOOKS.some(l=>l.id===payload.look))return;
 if(payload.type==='data-saver-navigate'){
  const role=ROLES.find(r=>r.id===payload.role);
  if(!role||!INDUSTRIES.some(i=>i.id===payload.industry))return;
  const changedContext=state.role!==payload.role||state.industry!==payload.industry;
  if(changedContext)Object.assign(state,{query:'',account:null,graphSelected:null,inspectPerson:null,automationId:null,companyTeam:'All',callContact:null,activeCall:null});
  state.outcomeCase=OUTCOME_SCENARIOS.some(x=>x.id===payload.outcomeCase)?payload.outcomeCase:null;state.outcomeFeedback='';
  Object.assign(state,{industry:payload.industry,role:payload.role,view:role.views.includes(payload.view)?payload.view:role.defaultView,gallery:false});
 }
 if(payload.type==='data-saver-navigate'){
  state.look=payload.look;render();
 }else if(state.look!==payload.look){
  changeWorkspaceLook(payload.look);
 }
 if(payload.look==='glass')setGlassPreferences(root,payload);
});
if(new URLSearchParams(location.search).get('identity')==='glass'){document.documentElement.dataset.edition='glass';state.gallery=false;}
const directNorthstar=location.hash==='#northstar-events';
readURL();render();installGlassIdentity(root,clarity=>{
 if(window.parent!==window&&new URLSearchParams(location.search).get('embed')==='site'){
  window.parent.postMessage({type:'data-saver-glass-clarity',clarity},location.protocol==='file:'?'*':location.origin);
 }
});
const northstarPreview=installNorthstarPreview({
  dialog:document.querySelector('.northstar-preview'),
  url:'./index.html#events-home',
  fallbackHash:studioHash,
  onReturn:returnFromNorthstar,
  onHome:()=>document.querySelector('.demo-brand')?.click()
});
if(directNorthstar)northstarPreview.restore(true);
