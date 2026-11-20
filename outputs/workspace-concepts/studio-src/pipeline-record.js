import {dealHandoffRoles} from './model.js';
import {PIPELINE_DAY,INVITE_RESPONSES,usesPipelineMeetings,pipelineInviteStage,pipelineEvidenceLabel,pipelineGateReason} from './pipeline-invitations.js';
import {escapeHTML} from './visuals.js';

export function pipelineRecordForm(d,o){
  const stages=d.config.stages, index=stages.indexOf(o.stage), next=index+1;
  const f=o.pipelineEvidence||{}, meeting=usesPipelineMeetings(d), final=index===stages.length-1;
  if(final && (!meeting || !o.pipelineEvidence))return '';
  const esc=escapeHTML;
  const input=(key,label,type='text',placeholder='')=>`<label>${esc(label)}<input type="${type}" name="${key}" value="${esc(f[key])}" placeholder="${esc(placeholder)}" maxlength="${type==='url'?1500:300}"></label>`;
  const select=(key,label,list,empty)=>`<label>${esc(label)}<select name="${key}">${empty?`<option value="">${esc(empty)}</option>`:''}${list.map(value=>`<option value="${esc(value)}" ${f[key]===value?'selected':''}>${esc(value)}</option>`).join('')}</select></label>`;
  let main='';
  if(meeting)main+=input('meetingLink','Video meeting link','url','https://…');
  const label=pipelineEvidenceLabel(d,next);
  if(label)main+=input('evidence'+next,label);
  let invite='';
  if(meeting){
    const expanded=next>=pipelineInviteStage(d) || !!f.response;
    invite=`<details class="pipeline-invite" ${expanded?'open':''}><summary>Calendar invitation${f.response?' · '+esc(f.response):''}</summary>
      <div class="crm-fields">${input('inviteRef','Calendar invitation reference','text','Event ID or invitation link')}
      ${select('response','Recorded response',INVITE_RESPONSES)}
      ${select('chaseOwner','Follow-up owner',d.team.map(t=>t.name),'Choose a person')}
      ${input('chaseDue','Follow-up date','date')}</div>
      <p class="tiny muted">Record the response from your calendar. For a chase, choose an owner and date.</p></details>`;
  }
  const held=o.heldStage && !final ? pipelineGateReason(d,o,next,PIPELINE_DAY):'';
  return `<form class="pipeline-record" data-pipeline-form="${esc(o.id)}" data-stage="${esc(o.stage)}" data-revision="${f.revision||0}">
    <h3>${final?'Meeting follow-up':'Move to '+esc(stages[next])}</h3>
    <div class="crm-fields">${main}</div>${invite}
    <p role="alert" class="pipeline-error" data-pipeline-error>${esc(held)}</p>
    <div class="row pipeline-actions"><button type="submit" name="action" value="save">Save details</button>
    ${final?'':`<button type="submit" name="action" value="advance" class="primary">Move to ${esc(stages[next])}</button>`}</div></form>`;
}

export function dealOwnerForm(d,deal,role) {
  if(!Object.hasOwn(dealHandoffRoles,role)) return '';
  const esc=escapeHTML;
  const colleagues=d.team.filter(t=>t.department.includes('sales') && t.name!==deal.owner);
  return '<details class="pipeline-record"><summary>Change deal owner</summary><form class="workbench-form" data-deal-owner="'+esc(deal.id)+'" data-version="'+(deal.ownerHistory?.length || 0)+'" data-from="'+esc(deal.owner)+'">'+
    '<label class="workbench-field">New owner<select required name="ownerId"><option value="">Choose a sales colleague</option>'+colleagues.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select></label>'+
    '<label class="workbench-field">Handoff note<textarea name="reason" rows="2" maxlength="1600" required placeholder="What should the new owner pick up?"></textarea></label>'+
    '<p role="alert" data-owner-error></p><button class="primary" type="submit">Save handoff</button></form></details>';
}
