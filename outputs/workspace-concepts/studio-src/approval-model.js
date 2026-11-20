export const APPROVAL_ROLES = {sales:'Sales', operations:'Operations', saleslead:'Sales leadership', leadership:'Company leadership'};
export const APPROVAL_TYPES = {
  sale:{label:'Deal terms', reviewer:'saleslead', submitters:['sales']},
  discount:{label:'Deal discount', reviewer:'saleslead', submitters:['sales']},
  quote:{label:'Sales quote', reviewer:'saleslead', submitters:['sales']},
  order:{label:'Customer order', reviewer:'leadership', submitters:['sales','operations']},
  customer:{label:'New customer', reviewer:'leadership', submitters:['sales','operations']},
  delegate:{label:'Delegate registration', reviewer:'saleslead', submitters:['sales','operations']}
};

const approvalKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g,' ');
export function approvalLeader(d,type) {
  const department=APPROVAL_TYPES[type].reviewer==='saleslead'?'Growth sales':'Delivery';
  return d.team.find(t=>t.department===department)?.manager || APPROVAL_ROLES[APPROVAL_TYPES[type].reviewer];
}

const approvalRoleCanSee = (r,role) => r.requester === role || r.reviewer === role;

export function approvalStatus(d,r) {
  if (r.type==='discount' && r.status==='approved') {
    const deal=approvalSource(d,r);
    if (!deal || !r.discount || deal.accountId!==r.accountId || deal.valuePence!==r.discount.netPence || deal.pricing?.revision!==r.discount.baseRevision+1) return 'changed';
  }
  if (['sale','order'].includes(r.type) && r.status==='approved') {
    const deal=approvalSource(d,r);
    if (deal && (deal.accountId!==r.accountId || deal.valuePence!==r.valuePence || (deal.pricing?.revision || 0)!==(r.priceRevision || 0))) return 'changed';
  }
  return r.status;
}

export function saleSignoff(d,opportunityId) {
  const r=d.approvalRequests?.find(item=>item.type==='sale' && item.targetId===opportunityId);
  return r && approvalStatus(d,r);
}

export function approvalAlerts(d,role) {
  return (d.approvalRequests || []).filter(r => (r.status === 'pending' && r.reviewer === role) ||
    (['denied','changed'].includes(approvalStatus(d,r)) && r.requester === role)).map(r => ({
    id:'alert-'+r.id, requestId:r.id, revision:r.history.length, owner:r.status==='pending'?r.reviewerTitle:APPROVAL_ROLES[role], severity:'warning',
    title:(r.requester === role ? 'Revise ' : 'Review ')+APPROVAL_TYPES[r.type].label.toLowerCase(),
    detail:r.title+' · '+(approvalStatus(d,r)==='changed' ? 'Commercial terms changed after sign-off' : r.status==='denied' ? r.history.at(-1).note : 'Requested by '+APPROVAL_ROLES[r.requester])
  }));
}

export function approvalsFor(d,role) {
  return (d.approvalRequests || []).filter(r => approvalRoleCanSee(r,role));
}

export function approvalContacts(d) {
  return d.contacts.filter(c=>c.name && c.accountId);
}

export function discountProposal(deal,percent) {
  const rate=String(percent ?? '').trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(rate)) throw new Error('Enter a discount percentage with up to two decimal places.');
  const rateBps=Math.round(Number(rate)*100);
  if(rateBps<=0 || rateBps>10000) throw new Error('Enter a discount between 0.01% and 100%.');
  const priorPence=deal.valuePence, last=deal.pricing;
  const grossPence=last && last.netPence===priorPence ? last.grossPence : priorPence;
  const netPence=Math.round(grossPence*(10000-rateBps)/10000);
  if(!Number.isSafeInteger(grossPence) || grossPence<=0 || netPence===priorPence) throw new Error('Choose a discount that changes the deal price.');
  return {grossPence,priorPence,netPence,rateBps,baseRevision:last?.revision || 0};
}

function approvalPlan(d,role,type,v,previous) {
  const spec=APPROVAL_TYPES[type];
  if (!spec?.submitters.includes(role) || (type==='delegate' && d.id!=='events')) throw new Error('This workspace cannot submit that request.');
  const reason=String(v.reason || '').trim();
  if (!reason) throw new Error('Describe what the leader needs to sign off.');
  let title, targetId, accountId, subjectId='', valuePence=0, customer, target, discount;
  if (type==='customer') {
    const name=String(v.name || '').trim(), region=String(v.region || '').trim(), segment=String(v.segment || '').trim();
    if (!name || !region || !['Enterprise','Growth','Independent'].includes(segment)) throw new Error('Enter the customer name, region and segment.');
    const existingId=previous?.accountId || v.targetId;
    target=existingId ? d.accounts.find(a=>a.id===existingId) : null;
    if(existingId && (!target || (!previous && target.onboardingStatus!=='Prospect'))) throw new Error('Choose a prospect awaiting onboarding.');
    if (d.accounts.some(a=>a.id!==existingId && approvalKey(a.name)===approvalKey(name))) throw new Error('A customer with this name is already on file.');
    customer={name,region,segment};
    accountId=existingId || d.id+'-new-customer-'+(d.approvalRequests.length+1);
    targetId=accountId;
    title=name;
  } else if (type==='delegate') {
    target=d.domain.find(o=>o.id===v.targetId);
    const contact=d.contacts.find(c=>c.id===v.subjectId);
    if (!target || target.status==='Delivered' || Number(target.fields.Registered)>=Number(target.fields.Capacity)) throw new Error('Choose an upcoming event with an available place.');
    if (!contact) throw new Error('Choose the delegate.');
    targetId=target.id; subjectId=contact.id; accountId=contact.accountId;
    title=contact.name+' · '+target.name;
  } else if (type==='quote') {
    target=d.quotes.find(q=>q.id===v.targetId);
    if (!target || !['Draft','Changes requested'].includes(target.status)) throw new Error('Choose a draft or returned quote.');
    accountId=d.contacts.find(c=>c.id===target.contactId)?.accountId;
    valuePence=v.amountPence ?? target.amountPence;
    if(!Number.isSafeInteger(valuePence) || valuePence<=0 || valuePence>1000000000) throw new Error('Enter a valid quote amount up to £10m.');
    targetId=target.id; title=(d.accounts.find(a=>a.id===accountId)?.name||'Customer')+' · quote';
  } else {
    target=d.opportunities.find(o=>o.id===v.targetId);
    if (!target || (['sale','discount'].includes(type) && target.probability>=1) || (type==='order' && target.probability!==1)) throw new Error(type!=='order'?'Choose an open deal.':'Choose a confirmed deal for this order.');
    targetId=target.id; accountId=target.accountId; valuePence=target.valuePence; title=target.name;
    if(type==='discount') discount=discountProposal(target,v.discountPercent);
  }
  const linkedAccount=d.accounts.find(a=>a.id===accountId);
  if (['order','sale','discount'].includes(type) && linkedAccount?.onboardingStatus && linkedAccount.onboardingStatus!=='Active customer') throw new Error('Complete customer onboarding before requesting commercial sign-off.');
  if (previous && (previous.targetId!==targetId || previous.subjectId!==subjectId)) throw new Error('Revise the original record.');
  if (d.approvalRequests.some(r=>r!==previous && r.type===type && r.targetId===targetId && r.subjectId===subjectId)) throw new Error('This record already has a request. Open its history.');
  return {title,targetId,subjectId,accountId,valuePence,reason,customer,target, ...(discount?{discount}:{}), ...(['sale','order'].includes(type) && target.pricing?{priceRevision:target.pricing.revision}:{})};
}

function approvalSource(d,r) {
  if (r.type==='customer') return d.accounts.find(a=>a.id===r.targetId);
  if (r.type==='delegate') return d.domain.find(a=>a.id===r.targetId);
  if (r.type==='quote') return d.quotes.find(q=>q.id===r.targetId);
  return d.opportunities.find(o=>o.id===r.targetId);
}

function applyApprovalStatus(d,r,source,status) {
  if (r.type==='discount' && status==='approved') {
    const {grossPence,netPence,rateBps,baseRevision}=r.discount;
    source.valuePence=netPence;
    source.pricing={grossPence,netPence,rateBps,revision:baseRevision+1};
    if(source.termsStatus==='Terms approved') source.termsStatus='New terms need sign-off';
  }
  if (r.type==='quote') source.status={pending:'Awaiting approval',approved:'Approved (demo)',denied:'Changes requested'}[status];
  if (r.type==='customer') source.onboardingStatus={pending:'Pending sign-off',approved:'Active customer',denied:'Changes requested'}[status];
  if (r.type==='order') source.orderStatus={pending:'Held for sign-off',approved:'Released to fulfilment',denied:'Order on hold'}[status];
  if (r.type==='sale') source.termsStatus={pending:'Awaiting sign-off',approved:'Terms approved',denied:'Terms returned'}[status];
  if (r.type==='delegate' && status==='approved') source.fields.Registered++;
}

function recordApprovalEvent(d,r,status,role,note) {
  const at=new Date().toISOString();
  r.status=status;
  r.history.push({status,role,note,at,title:r.title,valuePence:r.valuePence,accountId:r.accountId,...(r.discount?{discount:{...r.discount}}:{}),...(r.priceRevision?{priceRevision:r.priceRevision}:{}),...(r.customerSnapshot?{customer:{...r.customerSnapshot}}:{})});
  d.activity.unshift({action:APPROVAL_TYPES[r.type].label+' '+(status==='pending'?'submitted':status),accountId:r.accountId,
    opportunityId:['sale','order','discount'].includes(r.type)?r.targetId:undefined,recordId:r.targetId,actor:APPROVAL_ROLES[role],detail:r.discount ? [discountDescription(r.discount),note].filter(Boolean).join(' · ') : note,at});
}

export function discountDescription(discount) {
  const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n/100);
  return money(discount.grossPence)+' list · '+(discount.rateBps/100)+'% discount · '+money(discount.priorPence)+' → '+money(discount.netPence);
}

function latestApproval(d,id,version) {
  const r=d.approvalRequests.find(item=>item.id===id);
  if (!r || !Number.isInteger(Number(version)) || String(version).trim()==='' || Number(version)!==r.history.length) throw new Error('This request has changed. Review its latest version.');
  return r;
}

export function requestApproval(d,role,type,values={}) {
  const previous=values.requestId ? latestApproval(d,values.requestId,values.version) : null;
  if (previous && (!['denied','changed',...(type==='discount'?['approved']:[])].includes(approvalStatus(d,previous)) || previous.requester!==role || previous.type!==type)) throw new Error('Only the requesting team can revise its returned request.');
  const p=approvalPlan(d,role,type,values,previous);
  const r=previous || {id:d.id+'-approval-'+(d.approvalRequests.length+1),type,requester:role,reviewer:APPROVAL_TYPES[type].reviewer,reviewerTitle:approvalLeader(d,type),history:[]};
  const {target,customer,...fields}=p;
  Object.assign(r,fields);
  let source=target;
  if (type==='customer') {
    source=target || {id:r.targetId,owner:d.team.find(t=>t.department===(role==='operations'?'Delivery':'Growth sales')).name};
    Object.assign(source,customer);r.customerSnapshot={...customer};
    if (!target) d.accounts.push(source);
  }
  if (type==='quote') source.amountPence=p.valuePence;
  if (!previous) d.approvalRequests.unshift(r);
  applyApprovalStatus(d,r,source,'pending');
  recordApprovalEvent(d,r,'pending',role,p.reason);
  return r;
}

export function decideApproval(d,role,id,version,decision,note='') {
  const r=latestApproval(d,id,version);
  if (r.reviewer!==role || r.requester===role) throw new Error('Only the assigned leadership team can decide this request.');
  if (r.status!=='pending' || !['approved','denied'].includes(decision)) throw new Error('Only a pending request can be approved or denied.');
  note=String(note).trim();
  if (decision==='denied' && !note) throw new Error('Explain the change the requesting team needs to make.');
  const source=approvalSource(d,r);
  if (!source) throw new Error('The linked record is unavailable.');
  if (decision==='approved') {
    if (r.type==='delegate' && (source.status==='Delivered' || Number(source.fields.Registered)>=Number(source.fields.Capacity))) throw new Error('This event no longer has an available place. Return the request to the team.');
    if (r.type==='customer' && Object.entries(r.customerSnapshot).some(([key,value])=>source[key]!==value)) throw new Error('The customer details changed. Return this request for revision.');
    if (['sale','order','discount'].includes(r.type)) {
      const eligible=r.type!=='order'?source.probability<1:source.probability===1;
      const account=d.accounts.find(a=>a.id===source.accountId);
      if(!account || (account.onboardingStatus && account.onboardingStatus!=='Active customer')) throw new Error('Complete customer onboarding before approving commercial terms.');
      const expectedRevision=r.type==='discount'?r.discount?.baseRevision:r.priceRevision;
      if(!eligible || (source.pricing?.revision || 0)!==(expectedRevision || 0) || source.valuePence!==r.valuePence || source.accountId!==r.accountId) throw new Error('The linked terms changed. Return this request for revision.');
    }
    if(r.type==='discount') {
      const proposed=discountProposal(source,r.discount.rateBps/100);
      if(Object.keys(proposed).some(k=>proposed[k]!==r.discount[k])) throw new Error('The discount basis changed. Return this request for revision.');
    }
    if (r.type==='quote' && (source.status!=='Awaiting approval' || source.amountPence!==r.valuePence || d.contacts.find(c=>c.id===source.contactId)?.accountId!==r.accountId)) throw new Error('The linked terms changed. Return this request for revision.');
  }
  applyApprovalStatus(d,r,source,decision);
  recordApprovalEvent(d,r,decision,role,note);
  return r;
}

export function initializeApprovals(d) {
  if (Array.isArray(d.approvalRequests)) return d;
  d.approvalRequests=[];
  const confirmed=d.opportunities.find(o=>o.probability===1);
  if (confirmed) requestApproval(d,'operations','order',{targetId:confirmed.id,reason:'The customer has confirmed the order. Please release the agreed scope to fulfilment.'});
  const proposal=d.opportunities.filter(o=>o.probability<1).at(-1);
  if (proposal) requestApproval(d,'sales','sale',{targetId:proposal.id,reason:'Review the proposed contract value before we confirm terms with the customer.'});
  if (d.id==='events') {
    const event=d.domain.find(x=>x.status==='On sale');
    const contact=approvalContacts(d)[0];
    if (event && contact) requestApproval(d,'operations','delegate',{targetId:event.id,subjectId:contact.id,reason:'The group organiser requested a delegate place. Please confirm the allocation.'});
  }
  return d;
}
