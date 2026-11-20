import {APPROVAL_ROLES,APPROVAL_TYPES,approvalsFor,approvalContacts,approvalLeader,approvalStatus,decideApproval,requestApproval,discountProposal,discountDescription} from './approval-model.js';
import {escapeHTML,gbp,studioButton} from './visuals.js';

const approvalLabel={pending:'Awaiting sign-off',approved:'Approved',changed:'Terms changed',denied:'Changes requested'};
const apEsc=escapeHTML;

function approvalButton(label,{type='',targetId='',requestId=''}={},primary=false) {
  return studioButton('approval-open',apEsc(label),primary?'primary small':'small',
    'data-kind="'+apEsc(type)+'" data-target="'+apEsc(targetId)+'" data-id="'+apEsc(requestId)+'"');
}

export function approvalQuoteControl(d,role,q) {
  if(q.status==='Accepted (demo)') return studioButton('quote-handoff-open',apEsc(q.handoff?.status || 'Prepare handoff'),'small','data-id="'+apEsc(q.id)+'"');
  if(q.status==='Approved (demo)' && role==='sales') return studioButton('sales-quote-review','Record customer acceptance','small','data-id="'+apEsc(q.id)+'"');
  const r=approvalsFor(d,role).find(x=>x.type==='quote' && x.targetId===q.id);
  if(r) return approvalButton(r.status==='denied' && r.requester===role?'Revise quote':'Open sign-off',{requestId:r.id});
  return role==='sales' && q.status==='Draft' ? approvalButton('Request sign-off',{type:'quote',targetId:q.id}) : '—';
}

function approvalFitsRecord(r,type,id) {
  if(type==='accounts') return r.accountId===id;
  if(type==='opportunities') return ['sale','order','discount'].includes(r.type) && r.targetId===id;
  return type==='domain' && r.type==='delegate' && r.targetId===id;
}

export function approvalRecordPanel(d,role,type,id) {
  if(!APPROVAL_ROLES[role] || !['accounts','opportunities','domain'].includes(type)) return '';
  const records=approvalsFor(d,role).filter(r=>approvalFitsRecord(r,type,id));
  const opp=type==='opportunities' && d.opportunities.find(o=>o.id===id);
  const account=type==='accounts' && d.accounts.find(a=>a.id===id);
  const event=type==='domain' && d.id==='events' && d.domain.find(x=>x.id===id);
  let action='',sourceStatus='';
  if(opp){
    const kind=opp.probability===1?'order':'sale';
    const terms=records.find(r=>r.type===kind);
    sourceStatus=terms && approvalStatus(d,terms)==='changed'?'New terms need sign-off':opp.orderStatus || opp.termsStatus || '';
    if(kind==='sale' && role!=='sales' && !sourceStatus) sourceStatus='Sales must submit deal terms for the commercial director before confirming this deal.';
    if(APPROVAL_TYPES[kind].submitters.includes(role) && !d.approvalRequests.some(r=>r.type===kind && r.targetId===id)) action=approvalButton(kind==='order'?'Request order release':'Request terms sign-off',{type:kind,targetId:id});
    if(kind==='sale' && role==='sales' && !records.some(r=>r.type==='discount')) action+=approvalButton('Request discount',{type:'discount',targetId:id});
  }
  if(account) {
    sourceStatus=account.onboardingStatus || '';
    if(sourceStatus==='Prospect' && APPROVAL_TYPES.customer.submitters.includes(role)) action=approvalButton('Request customer onboarding',{type:'customer',targetId:id});
  }
  if(event && event.status!=='Delivered' && event.fields.Registered<event.fields.Capacity && APPROVAL_TYPES.delegate.submitters.includes(role)) action=approvalButton('Request delegate place',{type:'delegate',targetId:id});
  if(!records.length && !action && !sourceStatus) return '';
  return '<section class="record-signoffs"><h3>Sign-off</h3>'+(sourceStatus?'<p>'+apEsc(sourceStatus)+'</p>':'')+records.map(r=>'<div class="modal-list"><span>'+apEsc(APPROVAL_TYPES[r.type].label)+' · '+apEsc(approvalLabel[approvalStatus(d,r)])+'</span>'+approvalButton('View request',{requestId:r.id})+'</div>').join('')+action+'</section>';
}

function approvalOptions(items,value,placeholder) {
  return '<option value="">'+apEsc(placeholder)+'</option>'+items.map(([id,label])=>'<option value="'+apEsc(id)+'"'+(id===value?' selected':'')+'>'+apEsc(label)+'</option>').join('');
}

function approvalTargetList(d,type) {
  if(type==='customer') return [];
  if(type==='delegate') return d.domain.filter(o=>o.status!=='Delivered' && o.fields.Registered<o.fields.Capacity).map(o=>[o.id,o.name+' · '+(o.fields.Capacity-o.fields.Registered)+' places left']);
  if(type==='quote') return d.quotes.filter(q=>q.status==='Draft').map(q=>[q.id,(d.contacts.find(c=>c.id===q.contactId)?.name || 'Contact')+' · '+gbp(q.amountPence)]);
  return d.opportunities.filter(o=>(type==='order'?o.probability===1:o.probability<1) && !d.approvalRequests.some(r=>r.type===type && r.targetId===o.id)).map(o=>[o.id,o.name+' · '+gbp(o.valuePence)]);
}

export function updateDiscountPreview(d,form) {
  const output=form.querySelector('[data-discount-preview]');
  if(!output) return;
  const deal=d.opportunities.find(o=>o.id===form.elements.targetId?.value);
  const rate=form.elements.discountPercent?.value;
  if(!deal || !rate){output.textContent='Select a deal and enter a percentage to preview its price.';return;}
  try{output.textContent=discountDescription(discountProposal(deal,rate));}
  catch(error){output.textContent=error.message;}
}

function approvalFields(d,type,targetId,r) {
  const field=(label,input)=>'<label class="workbench-field">'+apEsc(label)+input+'</label>';
  const customer=type==='customer' && d.accounts.find(a=>a.id===(r?.accountId || targetId));
  let body='';
  if(type==='customer') {
    const prospects=d.accounts.filter(a=>a.onboardingStatus==='Prospect');
    if(!customer && prospects.length) body='<details><summary>Use an existing prospect</summary><div class="row-actions">'+prospects.map(a=>approvalButton(a.name,{type:'customer',targetId:a.id})).join('')+'</div></details>';
    if(customer) body+='<input type="hidden" name="targetId" value="'+apEsc(customer.id)+'">';
    body+=field('Company name','<input name="name" required maxlength="150" value="'+apEsc(customer?.name)+'">')+
      field('Region','<input name="region" required maxlength="80" value="'+apEsc(customer?.region)+'">')+
      field('Segment','<select required name="segment">'+approvalOptions(['Enterprise','Growth','Independent'].map(x=>[x,x]),customer?.segment,'Choose segment')+'</select>');
  } else if(r) {
    body='<input type="hidden" name="targetId" value="'+apEsc(r.targetId)+'"><input type="hidden" name="subjectId" value="'+apEsc(r.subjectId)+'">';
    if(type==='quote') body+=field('Revised quote amount (£)','<input type="number" name="amount" min="0.01" max="10000000" step=".01" required value="'+(r.valuePence/100).toFixed(2)+'">');
  } else {
    const name={delegate:'Event',sale:'Open deal',discount:'Open deal',order:'Confirmed deal',quote:'Draft quote'}[type];
    const items=approvalTargetList(d,type);
    if(!items.length) return '<p class="muted">'+(type==='quote'?'Create a draft quote in the Sales desk first.':'There are no eligible records for this request.')+'</p>';
    body=field(name,'<select name="targetId" required>'+approvalOptions(items,targetId,'Choose '+name.toLowerCase())+'</select>');
    if(type==='delegate') body+=field('Delegate','<select name="subjectId" required>'+approvalOptions(approvalContacts(d).map(c=>[c.id,c.name+' · '+(d.accounts.find(a=>a.id===c.accountId)?.name || '')]),'','Choose contact')+'</select>');
  }
  if(type==='discount') {
    const proposal=r?.discount;
    body+=field('Discount off list price (%)','<input type="number" name="discountPercent" min="0.01" max="100" step="0.01" required value="'+(proposal?proposal.rateBps/100:'')+'">')+
      '<output class="tiny" aria-live="polite" data-discount-preview>Enter a percentage to preview the deal price.</output>';
  }
  return body+field(r?'What changed?':'Reason for sign-off','<textarea required rows="2" name="reason" maxlength="1600"></textarea>')+
    '<p class="tiny muted">Assigned to '+apEsc(approvalLeader(d,type))+' · '+apEsc(APPROVAL_ROLES[APPROVAL_TYPES[type].reviewer])+'.</p><button type="submit" class="primary">'+(r?'Resubmit for sign-off':'Submit request')+'</button>';
}

function approvalForm(d,type,targetId,r) {
  return '<form class="workbench-form approval-form" data-approval-form="request" data-kind="'+apEsc(type)+'" data-id="'+apEsc(r?.id)+'" data-version="'+(r?.history.length || 0)+'">'+approvalFields(d,type,targetId,r)+'</form>';
}

function approvalRequestCard(d,role,r,focused) {
  const status=approvalStatus(d,r), previous=r.history.at(-1), account=d.accounts.find(a=>a.id===r.accountId);
  const reviewer=r.reviewer===role && status==='pending', revise=r.requester===role && (['denied','changed'].includes(status) || (r.type==='discount' && status==='approved' && d.opportunities.some(o=>o.id===r.targetId && o.probability<1)));
  const effect=({discount:'Discount applied to the deal and its weighted pipeline value',quote:'Quote approved for customer acceptance',sale:'Terms cleared for deal progression',customer:'Customer account activated',order:'Order released to fulfilment',delegate:'Delegate registered and one place allocated'})[r.type];
  const sourceId=r.type==='quote'?r.accountId:r.targetId;
  const controls=reviewer?'<form class="workbench-form approval-form" data-approval-form="decide" data-id="'+apEsc(r.id)+'" data-version="'+r.history.length+'"><label class="workbench-field">Decision note <small>Required when denying a request</small><textarea rows="2" name="note" maxlength="1600"></textarea></label><div class="row-actions"><button type="submit" class="primary" name="decision" value="approved">Approve</button><button type="submit" name="decision" value="denied">Deny and return</button></div></form>':revise?(status==='approved'?'<details><summary>Request a different discount</summary>'+approvalForm(d,r.type,r.targetId,r)+'</details>':approvalForm(d,r.type,r.targetId,r)):'';
  const history=r.history.map(entry=>'<li><strong>'+apEsc(entry.status==='pending'?'Submitted':approvalLabel[entry.status])+'</strong> · '+apEsc(APPROVAL_ROLES[entry.role])+' · <time datetime="'+apEsc(entry.at)+'">'+apEsc(new Date(entry.at).toLocaleString('en-GB',{timeZone:'UTC'}))+' UTC</time>'+(entry.discount?'<p>'+apEsc(discountDescription(entry.discount))+'</p>':'')+(entry.note?'<p>'+apEsc(entry.note)+'</p>':'')+'</li>').join('');
  return '<details class="approval-card" data-approval-id="'+apEsc(r.id)+'"'+(focused?' open':'')+'><summary'+(focused?' data-approval-focus':'')+'><span><small>'+apEsc(APPROVAL_TYPES[r.type].label)+'</small><strong>'+apEsc(r.title)+'</strong></span><span class="pill '+({pending:'warn',approved:'good',denied:'bad',changed:'warn'}[status])+'">'+apEsc(approvalLabel[status])+'</span></summary>'+
    '<div class="approval-detail"><p>'+apEsc(r.reason)+'</p>'+(r.discount?'<p><strong>Discount terms</strong><br>'+apEsc(discountDescription(r.discount))+'</p>':'')+'<p class="tiny muted">'+apEsc(APPROVAL_ROLES[r.requester])+' → '+apEsc(r.reviewerTitle)+' · '+apEsc(APPROVAL_ROLES[r.reviewer])+(r.valuePence?' · '+gbp(r.valuePence):'')+'</p>'+
    (status==='changed'?'<p>The commercial terms have changed since the last decision. Submit the revised terms for approval.</p>':status==='denied'?'<p><strong>Reason for return</strong><br>'+apEsc(previous.note)+'</p>':r.status==='approved'?'<p>'+apEsc(effect)+'.</p>':'')+
    studioButton('record',apEsc(r.type==='quote'?(account?.name || 'Open account'):'Open linked record'),'small','data-id="'+apEsc(sourceId)+'"')+
    controls+'<details class="approval-history"><summary>Request history ('+r.history.length+')</summary><ol>'+history+'</ol></details></div></details>';
}

export function approvalView(d,s) {
  const allowed=Object.keys(APPROVAL_TYPES).filter(type=>APPROVAL_TYPES[type].submitters.includes(s.role) && (type!=='delegate' || d.id==='events'));
  const type=allowed.includes(s.approvalType)?s.approvalType:'';
  const queue=approvalsFor(d,s.role);
  const focus=queue.find(r=>r.id===s.approvalFocus);
  const actionable=r=>(r.status==='pending' && r.reviewer===s.role) || (['denied','changed'].includes(approvalStatus(d,r)) && r.requester===s.role);
  const open=queue.filter(actionable), other=queue.filter(r=>!actionable(r));
  const panel=(title,items,empty)=>'<section class="panel approval-panel"><h2>'+title+' <span class="tiny muted">'+items.length+'</span></h2>'+(items.length?items.map(r=>approvalRequestCard(d,s.role,r,r===focus)).join(''):'<p class="muted">'+empty+'</p>')+'</section>';
  const form=allowed.length?'<section class="panel approval-panel"><h2>Request sign-off</h2><div class="row-actions approval-types">'+allowed.map(k=>studioButton('approval-kind',apEsc(APPROVAL_TYPES[k].label),k===type?'small active':'small','data-kind="'+k+'" aria-pressed="'+(k===type)+'"')).join('')+'</div>'+
    (type?'<h3 tabindex="-1" data-approval-focus>'+apEsc(APPROVAL_TYPES[type].label)+'</h3>'+approvalForm(d,type,s.approvalTarget):'')+'</section>':'';
  return '<div class="page-heading"><div><p class="eyebrow">'+apEsc(APPROVAL_ROLES[s.role] || 'Workspace')+'</p><h1>Approvals</h1><p>Review sign-offs and track the decision on each record.</p></div></div><div class="approval-workspace">'+
    (s.approvalType?form:'')+panel('Needs action',open,'Your team has no requests awaiting action.')+(!s.approvalType?form:'')+panel('Request history',other,'No other requests for this team.')+'</div>';
}

export function approvalAction(d,s,action,el) {
  if (!['approval-open','approval-kind'].includes(action) || !APPROVAL_ROLES[s.role]) throw new Error('This workspace cannot open that request.');
  const {id,kind,target}=el.dataset;
  if(id && !approvalsFor(d,s.role).some(r=>r.id===id)) throw new Error('This request belongs to another team.');
  if(kind && !APPROVAL_TYPES[kind]?.submitters.includes(s.role)) throw new Error('This workspace cannot submit that request.');
  s.view='approvals';s.approvalFocus=id || null;s.approvalType=kind || null;s.approvalTarget=target || null;s.graphSelected=null;
}

export function approvalSubmit(d,s,form,submitter) {
  const values=Object.fromEntries(new FormData(form));
  const {id,version,kind}=form.dataset;
  let r;
  if(form.dataset.approvalForm==='decide') r=decideApproval(d,s.role,id,version,submitter?.value,values.note);
  else {
    if(values.amount!==undefined) values.amountPence=Math.round(Number(values.amount)*100);
    r=requestApproval(d,s.role,kind,{...values,requestId:id,version});
  }
  s.approvalFocus=r.id;s.approvalType=null;s.approvalTarget=null;
  return r.status==='pending'?'Request sent to '+APPROVAL_ROLES[r.reviewer]+'.':r.status==='denied'?'Request returned to '+APPROVAL_ROLES[r.requester]+'.':'Approved. The linked record has been updated.';
}
