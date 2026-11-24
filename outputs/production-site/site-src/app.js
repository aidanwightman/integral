const roleRoutes={sales:{look:'glass',view:'dialer',title:'Calls & follow-up',description:'Make a demo call, log an outcome and inspect the automatic next step.'},people:{look:'bento',view:'leave',title:'Leave & coverage',description:'Arrange cover, approve leave and see capacity and balances change together.'},finance:{look:'ledger',view:'workbench',title:'Payments & reconciliation',description:'Allocate a partial receipt, review the remaining balance and reconcile the payment.'},operations:{look:'atlas',view:'workbench',title:'Delivery & handoffs',description:'Resolve a dependency, confirm acceptance and release the allocated hours.'},saleslead:{look:'signal',view:'performance',title:'Sales performance',description:'Inspect comparable activity, outcomes and the evidence behind a coaching decision.'},leadership:{look:'editorial',view:'company',title:'Company overview',description:'Explore teams, pipeline, commitments and the decisions that need an owner.'}};
function syncGuideTextSize(value = defaultWorkspaceTextSize) {
  document.documentElement.style.setProperty('--guide-text-scale', normalizeTextSize(value) / 100);
}
function resetDemoTextSize() {
  syncGuideTextSize();
  if (frame.getAttribute('src')) frame.contentWindow.postMessage(
    {type:'data-saver-reset-text-size'}, location.protocol==='file:'?'*':location.origin
  );
}
window.addEventListener('pageshow', event => {if (event.persisted) resetDemoTextSize();});
const frame=document.getElementById('workspace-demo'),expand=document.getElementById('expand-demo'),workspaceDialog=document.getElementById('workspace-dialog');
const previewData=__PRODUCT_SLICES__;
const roleNames={sales:'Sales',people:'People & HR',finance:'Finance',operations:'Operations',saleslead:'Sales leadership',leadership:'Company leadership'};
const designNames={glass:'Liquid Glass',forest:'Forest',editorial:'Editorial',signal:'Signal',bento:'Bento',atlas:'Atlas',ledger:'Ledger'};
const roleTools={sales:'Calls · Pipeline · Follow-up automations',people:'Leave · Coverage · Employee records',finance:'Receipts · Collections · Commissions',operations:'Delivery · Dependencies · Capacity',saleslead:'Performance · Coaching · Activity evidence',leadership:'Teams · Pipeline · Business performance'};
let currentRole='sales',workspaceRoute=null,workspaceTrigger=null,workspaceOrigin=null;
const financeFocus=document.getElementById('finance-focus');
const financePreviewViews=new Set(['workbench','financeexceptions','reconciliation','collections','commissions']);
function previewView(role){
  return role==='finance'&&financePreviewViews.has(financeFocus.value)?financeFocus.value:roleRoutes[role].view;
}
financeFocus.addEventListener('change',()=>{if(currentRole==='finance')renderSnapshot('finance')});
function selectedLook(){return document.documentElement.dataset.design||'glass';}
function showRole(role,animate=false){const r=roleRoutes[role];if(!r||(animate&&currentRole===role))return;currentRole=role;document.querySelectorAll('[data-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));transitionPreview('snapshot',[document.querySelector('.demo-caption'),document.querySelector('.snapshot-content')],()=>{document.getElementById('role-title').textContent=r.title;document.getElementById('role-description').textContent=r.description;renderSnapshot(role);},animate);}
let snapshotRole = null;
let snapshotLinks = [];
function renderSnapshot(role) {
  const data = previewData[role] || previewData[role === 'saleslead' ? 'sales' : 'operations'];
  const look = selectedLook();
  const view = data.view || roleRoutes[role].view;
  document.getElementById('snapshot-tool-list').hidden = role === 'finance';
  document.getElementById('finance-focus-field').hidden = role !== 'finance';
  document.getElementById('snapshot-context').textContent = roleNames[role] + ' / ' + (designNames[look] || 'Workspace');
  if (snapshotRole !== role) {
    snapshotRole = role;
    snapshotLinks = [];
    document.getElementById('snapshot-title').textContent = data.title;
    document.getElementById('snapshot-caption').textContent = data.title + ' — synthetic example records';
    document.getElementById('snapshot-tools').textContent = roleTools[role];
    const heading = document.createElement('tr');
    for (const value of data.columns) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = value;
      heading.append(th);
    }
    document.getElementById('snapshot-columns').replaceChildren(heading);
    const rows = data.rows.map(row => {
      const tr = document.createElement('tr');
      row.forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0) {
          const link = document.createElement('a');
          link.className = 'preview-record-link';
          link.textContent = value;
          link.setAttribute('aria-label', value + ' — open ' + roleNames[role] + ' workspace');
          link.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            openWorkspace(role, 'agency', view, link);
          });
          snapshotLinks.push(link);
          td.append(link);
        } else td.textContent = value;
        tr.append(td);
      });
      return tr;
    });
    document.getElementById('snapshot-rows').replaceChildren(...rows);
  }
  for (const link of snapshotLinks) link.href = DEMO_URL + `#studio/agency/${role}/${look}/${view}`;
  const activeRoute=retainedPreviewRoute(role);
  expand.href = DEMO_URL + (activeRoute?workspaceURL(activeRoute):`#studio/agency/${role}/${look}/${previewView(role)}`);
}

let lastSiteLook = selectedLook();
function syncWorkspaceAppearance() {
  const siteLook = selectedLook();
  if (workspaceRoute && siteLook !== lastSiteLook) workspaceRoute.look = siteLook;
  lastSiteLook = siteLook;
  const look = workspaceRoute?.look || siteLook;
  document.getElementById('workspace-design-label').textContent = (designNames[look] || look) + ' workspace';
  if (frame.getAttribute('src')) frame.contentWindow.postMessage({
    type: 'data-saver-appearance', look, mode: document.documentElement.dataset.mode || 'light',
    clarity: document.documentElement.dataset.glassClarity === 'true'
  }, location.protocol === 'file:' ? '*' : location.origin);
  renderSnapshot(currentRole);
}

function workspaceURL(route){
  const {industry,role,look,view,outcomeCase,followupRecord}=route;
  const suffix=view==='reconciliation' && route.reconciliationLedger==='practice'?'/practice':view==='outcomes' && outcomeCase?'/'+encodeURIComponent(outcomeCase):'';
  return `#studio/${industry}/${role}/${look}/${view}${suffix}${followupRecord?'/record':''}`;
}
function isSamRecord(route){
  return route?.followupRecord===true && route.view==='outcomes' && route.outcomeCase==='followup' && ['sales','saleslead','leadership'].includes(route.role);
}
function retainedPreviewRoute(role){
  if(workspaceRoute?.role!==role)return null;
  if(isSamRecord(workspaceRoute))return workspaceRoute;
  return workspaceRoute.view==='reconciliation' && previewView(role)==='reconciliation'?workspaceRoute:null;
}
let pendingWorkspaceExample=null;
const samModalSessionKey='integral-followup-modal-v1/'+location.pathname;
function rememberSamModal(route){
  try{
    if(isSamRecord(route))sessionStorage.setItem(samModalSessionKey,JSON.stringify(route));
    else sessionStorage.removeItem(samModalSessionKey);
  }catch{}
}
function openWorkspace(role=currentRole,industry=workspaceRoute?.role===role?workspaceRoute.industry:'agency',view=workspaceRoute?.role===role?workspaceRoute.view:roleRoutes[role].view,trigger=document.activeElement,outcomeCase=null,followupRecord,example=null){
  if(followupRecord===undefined)followupRecord=isSamRecord(workspaceRoute) && role===workspaceRoute.role &&
    industry===workspaceRoute.industry && view===workspaceRoute.view && outcomeCase===workspaceRoute.outcomeCase;
  if (!workspaceDialog.open) resetDemoTextSize();
  if (!workspaceDialog.open && trigger) {
    const rect = trigger.getBoundingClientRect();
    workspaceOrigin = rect.bottom > 0 && rect.top < innerHeight ? {trigger, top:rect.top} : null;
  }
  showRole(role);
  workspaceTrigger=trigger;
  const look=workspaceRoute?.look||selectedLook();
  const same=workspaceRoute && workspaceRoute.role===role && workspaceRoute.industry===industry &&
    workspaceRoute.view===view && workspaceRoute.outcomeCase===outcomeCase && Boolean(workspaceRoute.followupRecord)===followupRecord;
  pendingWorkspaceExample=example;
  if(!same || example){
    workspaceRoute={role,industry,look,view,outcomeCase,followupRecord};
    if(!frame.getAttribute('src'))frame.src=DEMO_URL+'?embed=site&build=__WORKSPACE_BUILD__'+workspaceURL(workspaceRoute);
    else navigateWorkspace();
  }
  if(!workspaceDialog.open){workspaceDialog.showModal();document.documentElement.classList.add('workspace-is-open');}
  document.getElementById('close-workspace').focus();
  syncWorkspaceAppearance();
}

function openRole(role){if(roleRoutes[role])openWorkspace(role);}
function closeWorkspace(){workspaceDialog.close();}
workspaceDialog.addEventListener('close', () => {
  rememberSamModal(null);
  syncGuideTextSize();
  document.documentElement.classList.remove('workspace-is-open');
  document.getElementById('tour-coach').hidden = true;
  document.getElementById('training-panel').hidden = true;
  document.getElementById('resume-guide').hidden = true;
  const target = workspaceTrigger?.isConnected === false ? expand : workspaceTrigger;
  target?.focus({preventScroll:true});
  if (target && workspaceOrigin?.trigger === workspaceTrigger) {
    const rect = target.getBoundingClientRect();
    const top = Math.max(0, Math.min(workspaceOrigin.top, innerHeight - rect.height));
    window.scrollBy({top:rect.top - top, behavior:'instant'});
  }
  workspaceOrigin = null;
});
document.getElementById('close-workspace').addEventListener('click',closeWorkspace);
expand.addEventListener('click',event=>{
  if(event.defaultPrevented || event.button>0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
  event.preventDefault();
  const r=retainedPreviewRoute(currentRole);
  if(r)openWorkspace(r.role,r.industry,r.view,event.currentTarget,r.outcomeCase,r.followupRecord);
  else openWorkspace(currentRole,'agency',previewView(currentRole),event.currentTarget);
});
function navigateWorkspace(){
  if(!workspaceRoute)return;
  frame.contentWindow.postMessage({type:'data-saver-navigate',...workspaceRoute,example:pendingWorkspaceExample},location.protocol==='file:'?'*':location.origin);
  pendingWorkspaceExample=null;
}
function showGuideWorkspace(){
  if(workspaceDialog.open&&!document.getElementById('tour-coach').hidden) {
    frame.contentWindow.postMessage({type:'data-saver-guide-open'},location.protocol==='file:'?'*':location.origin);
  }
}
window.addEventListener('data-saver-guide-open',showGuideWorkspace);
frame.addEventListener('load',()=>{syncGuideTextSize();navigateWorkspace();syncWorkspaceAppearance();showGuideWorkspace();});
document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>showRole(b.dataset.role,true)));
document.querySelectorAll('[data-tour]').forEach(b=>b.addEventListener('click',()=>openRole(b.dataset.tour)));
window.addEventListener('data-saver-design-change',syncWorkspaceAppearance);
window.addEventListener('message',event=>{const localFile=location.protocol==='file:'&&event.origin==='null';if(event.source!==frame.contentWindow||(!localFile&&event.origin!==location.origin))return;if(event.data?.type==='data-saver-text-size'){
 if(workspaceDialog.open && Number.isFinite(event.data.size))syncGuideTextSize(event.data.size);
 return;
}if(event.data?.type==='data-saver-glass-clarity'){
 if(workspaceDialog.open&&typeof event.data.clarity==='boolean')window.dispatchEvent(new CustomEvent('data-saver-workspace-clarity',{detail:event.data.clarity}));
 return;
}if(event.data?.type==='data-saver-studio-home'){if(workspaceDialog.open){workspaceTrigger=document.querySelector('.site-header .wordmark');closeWorkspace();workspaceTrigger.click();}return;}if(event.data?.type==='data-saver-studio-close'||event.data?.type==='data-saver-studio-escape'){if(workspaceDialog.open)closeWorkspace();return;}if(event.data?.type!=='data-saver-studio-state'||!workspaceDialog.open)return;const {role,industry,look,view,outcomeCase}=event.data;if(!roleRoutes[role]||![industry,look,view].every(v=>typeof v==='string'&&/^[a-z-]+$/.test(v)))return;if(role==='finance'&&financePreviewViews.has(view))financeFocus.value=view;workspaceRoute={role,industry,look,view,outcomeCase:typeof outcomeCase==='string'&&/^[a-z-]+$/.test(outcomeCase)?outcomeCase:null};if(view==='reconciliation')workspaceRoute.reconciliationLedger=event.data.reconciliationLedger==='practice'?'practice':'statement';workspaceRoute.followupRecord=isSamRecord({...workspaceRoute,followupRecord:event.data.followupRecord});rememberSamModal(workspaceRoute);window.dispatchEvent(new CustomEvent('data-saver-workspace-design',{detail:{look}}));showRole(role);document.getElementById('workspace-design-label').textContent=(designNames[look]||look)+' workspace';expand.href=DEMO_URL+workspaceURL(workspaceRoute);});
// Guided practice belongs inside the modal top layer, beside the full workspace.
workspaceDialog.append(document.getElementById('tour-coach'),document.getElementById('training-panel'));
showRole('sales');
if(window.performance?.getEntriesByType('navigation')[0]?.type==='reload'){
  let restored;
  try{restored=JSON.parse(sessionStorage.getItem(samModalSessionKey));}catch{}
  if(isSamRecord(restored) && Object.hasOwn(designNames,restored.look) && /^[a-z-]+$/.test(restored.industry)){
    workspaceRoute={...restored,followupRecord:false};
    openWorkspace(restored.role,restored.industry,restored.view,expand,'followup',true);
  }
}
const brief=document.getElementById('brief-dialog'),privacy=document.getElementById('privacy-dialog');let dialogTrigger=null;
function openDialog(dialog,trigger){dialogTrigger=trigger;dialog.showModal();}
document.querySelectorAll('[data-brief]').forEach(b=>b.addEventListener('click',()=>{openDialog(brief,b);}));
document.getElementById('privacy-open').addEventListener('click',event=>openDialog(privacy,event.currentTarget));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
for(const dialog of [brief,privacy])dialog.addEventListener('close',()=>dialogTrigger?.focus());
document.getElementById('brief-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const fields=new FormData(form);const content=['INTEGRAL — DISCOVERY BRIEF','Created '+new Date().toISOString().slice(0,10),'',...['business','workflow','tools','outcome'].map(key=>({business:'Business',workflow:'Workflow to improve',tools:'Current tools',outcome:'Desired outcome'}[key])+':\n'+String(fields.get(key)||'Not provided').trim()+'\n'),'This brief was downloaded locally. It has not been sent to Integral.'].join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='integral-discovery-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.getElementById('brief-status').textContent='Your download has been requested. Nothing has been sent to Integral.';});
if(SITE_CONFIG.linkedinUrl)document.getElementById('founder-link').href=SITE_CONFIG.linkedinUrl;
if(SITE_CONFIG.loomUrl){const u=new URL(SITE_CONFIG.loomUrl),id=u.pathname.split('/').filter(Boolean).at(-1);if(['www.loom.com','loom.com'].includes(u.hostname)&&/^[a-zA-Z0-9]+$/.test(id)){document.getElementById('guided-tour').hidden=true;const slot=document.getElementById('video-slot');slot.hidden=false;const intro=document.createElement('div');intro.className='video-intro';const button=document.createElement('button');button.className='button dark';button.type='button';button.textContent='Play the product walkthrough ▶';const note=document.createElement('p');note.textContent='Playing this video connects to Loom.';intro.append(button,note);slot.append(intro);button.addEventListener('click',()=>{const video=document.createElement('iframe');video.title='Integral product walkthrough';video.src='https://www.loom.com/embed/'+id;video.allow='fullscreen; picture-in-picture';video.allowFullscreen=true;slot.replaceChildren(video);});document.querySelectorAll('[data-video-link]').forEach(a=>a.textContent='Watch the walkthrough →');}}
