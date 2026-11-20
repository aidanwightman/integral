import {saleSignoff} from './approval-model.js';

export const PIPELINE_DAY='2026-11-20';
export const INVITE_RESPONSES=['Not recorded','Awaiting reply','Accepted','Declined','Chasing'];
const PIPELINE_EVIDENCE={
  agency:['','Proposal feedback or negotiation note','Signed engagement reference'],
  events:['','','Signed sponsorship or event contract reference'],
  saas:['','Procurement contact or review reference','Signed subscription reference'],
  field:['Site survey appointment or report','Issued quote reference','Signed service agreement reference'],
  property:['Appraisal appointment or report','Management proposal reference','Appointment or mandate reference'],
  recruitment:['Terms sent reference','Shortlist sent reference','Placement acceptance reference'],
  membership:['Membership application reference','Reviewer or review note','Membership confirmation reference'],
  wholesale:['Sample shipment or collection reference','Issued quote reference','Confirmed purchase order reference']
};

export function usesPipelineMeetings(d){return ['agency','events','saas'].includes(d.id);}
export function pipelineInviteStage(d){return d.id==='events'?2:3;}
export function pipelineEvidenceLabel(d,index){return PIPELINE_EVIDENCE[d.id]?.[index-1]||'';}
function validMeetingLink(value){
  try{
    const link=new URL(value);
    return link.protocol==='https:' && !link.username && !link.password && link.hostname.includes('.') && (link.pathname.length>1 || !!link.search);
  }catch{return false;}
}
function pipelineDayValid(value){
  const date=new Date(value+'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;
}
export function pipelineAudit(d,o,action,detail,actor){
  d.activity.unshift({action,detail,actor:actor||'Workspace user',recordId:o.id,opportunityId:o.id,accountId:o.accountId,stage:o.stage,at:new Date().toISOString()});
}
export function pipelineGateReason(d,o,index,today=PIPELINE_DAY){
  const f=o.pipelineEvidence||{},final=index===d.config.stages.length-1;
  if(final){
    const signoff=saleSignoff(d,o.id);
    if(!signoff)return 'Request deal-terms sign-off from Sales leadership in Approvals.';
    if(signoff==='changed')return 'Deal terms changed. Submit the revised terms for sign-off in Approvals.';
    if(signoff!=='approved')return 'Deal terms '+(signoff==='pending'?'await approval.':'were denied.')+' Review the linked request in Approvals.';
  }
  if(usesPipelineMeetings(d)){
    if(!validMeetingLink(f.meetingLink))return 'Add a complete HTTPS Zoom or video meeting link.';
    if(index>=pipelineInviteStage(d)){
      if(!f.inviteRef)return 'Record the calendar invitation reference.';
      if(final && f.response!=='Accepted')return 'Record an accepted invitation before confirming the sale.';
      if(f.response!=='Accepted'){
        if(f.response!=='Chasing')return 'Record acceptance or assign a chase with an owner and follow-up date.';
        if(!d.team.some(t=>t.name===f.chaseOwner)||!f.chaseDue)return 'Assign a chase owner and follow-up date.';
        if(f.chaseDue<today)return 'The invitation follow-up is overdue. Record a new chase date or the latest response.';
      }
    }
  }
  const label=pipelineEvidenceLabel(d,index);
  return label && !f['evidence'+index]?'Add the '+label.toLowerCase()+'.':'';
}

export function saveInvitationDetails(d,id,values,revision,actor){
  const o=d.opportunities.find(o=>o.id===id);
  if(!o)throw new Error('Opportunity not found.');
  const original=o.pipelineEvidence||{}, next={...original};
  const allowed=['evidence1','evidence2','evidence3'];
  if(usesPipelineMeetings(d))allowed.push('meetingLink','inviteRef','response','chaseOwner','chaseDue');
  for(const key of allowed){
    if(Object.hasOwn(values,key))next[key]=String(values[key]||'').trim();
  }
  if(next.response==='Not recorded')next.response='';
  const invitationReplaced=!!original.inviteRef && (original.inviteRef!==next.inviteRef || original.meetingLink!==next.meetingLink);
  if(invitationReplaced && original.response){
    if(!next.inviteRef || !next.meetingLink)throw new Error('Keep a meeting link and calendar reference on this tracked invitation.');
    next.response='Awaiting reply';next.chaseOwner='';next.chaseDue='';
  }
  if(next.response==='Accepted'){next.chaseOwner='';next.chaseDue='';}
  if(next.meetingLink && !validMeetingLink(next.meetingLink))throw new Error('Use the full HTTPS meeting link, including the meeting path.');
  if(next.response && !INVITE_RESPONSES.includes(next.response))throw new Error('Choose a calendar response.');
  if(original.response && !next.response)throw new Error('Record the latest response to this tracked invitation.');
  if(next.response && !next.inviteRef)throw new Error('Add the calendar invitation reference for this response.');
  if(next.chaseOwner && !d.team.some(t=>t.name===next.chaseOwner))throw new Error('Choose a chase owner from the team.');
  if(next.chaseDue && !pipelineDayValid(next.chaseDue))throw new Error('Enter a valid follow-up date.');
  if(next.response==='Chasing' && !(next.chaseOwner && next.chaseDue))throw new Error('Choose a named chase owner and follow-up date.');
  const changed=allowed.filter(key=>(next[key]||'')!==(original[key]||''));
  if(!changed.length)return o;
  if(revision!=null && Number(revision)!==(original.revision||0))throw new Error('This record has changed. Reopen it before saving.');
  const labels={meetingLink:'Meeting link',inviteRef:'Calendar reference',response:'Invitation response',chaseOwner:'Chase owner',chaseDue:'Follow-up date'};
  const detail=changed.map(k=>(labels[k]||pipelineEvidenceLabel(d,Number(k.slice(-1))))+' · '+(next[k]||'Cleared')).join(' / ');
  o.pipelineEvidence={...next,revision:(original.revision||0)+1};
  pipelineAudit(d,o,'Stage evidence updated',detail,actor);
  return o;
}

export function invitationAlerts(d,today=PIPELINE_DAY){
  return d.opportunities.flatMap(o=>{
    const f=o.pipelineEvidence||{}, due=f.chaseDue||'';
    let title='',detail='',severity='warning';
    const held=o.heldStage && d.config.stages.indexOf(o.heldStage.to);
    const reason=held?pipelineGateReason(d,o,held,today):'';
    if(f.response==='Declined'){
      title='Invitation declined';detail='Record a replacement invitation or assign a follow-up.';severity='urgent';
    }else if(['Chasing','Awaiting reply'].includes(f.response)){
      const overdue=due && due<today;
      title=overdue?'Invitation follow-up overdue':f.response==='Chasing'?'Chase invitation response':'Invitation awaiting reply';
      detail=overdue?'Update the response or set a new chase date.':f.response==='Chasing'?'Follow up and record the customer’s response.':'Record the response or assign someone to follow up.';
      if(overdue)severity='urgent';
    }else if(reason && !reason.includes('Approvals')){
      title='Evidence needed for '+o.heldStage.to;detail=reason;
    }
    if(!title)return [];
    return [{id:'pipeline-'+o.id,opportunityId:o.id,title,detail:o.name+' · '+detail,owner:f.chaseOwner||o.owner,due,severity}];
  });
}
