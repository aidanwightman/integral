import {leaveApprovalIssues} from './role-model.js';
import {escapeHTML} from './visuals.js';

export function peopleDeliveryAlerts(d,role){
  if(role==='people')return d.leave.filter(request=>request.status==='Pending').map(request=>{
    const employee=d.team.find(person=>person.id===request.personId);
    const issues=leaveApprovalIssues(d,request);
    return {id:request.id,leaveId:request.id,kind:'Leave & coverage',actionLabel:'Review leave',
      title:issues.length?'Leave needs a coverage review':'Leave awaiting decision',
      detail:employee.name+' · '+request.start+' to '+request.end+(issues.length?' · '+issues.join(' '):''),
      owner:'People & HR',severity:'warning'};
  });
  if(role==='operations')return d.work.filter(work=>work.issue && work.status!=='Complete').map(work=>({
    id:work.id,recordId:work.id,kind:'Delivery',actionLabel:'Review dependency',title:'Delivery blocked',
    detail:work.title+' · '+work.issue,owner:work.owner,due:work.dependencyDue,severity:'warning'
  }));
  return [];
}
export function recordDependency(d,id,role,values,version){
  const work=d.work.find(item=>item.id===id);
  if(role!=='operations'||!work?.issue||work.status==='Complete')throw Error('This delivery dependency is no longer awaiting an Operations decision.');
  if(Number(version)!==(work.dependencyRevision||0))throw Error('The dependency has changed. Reopen the work item.');
  const note=String(values.note||'').trim();
  if(!note)throw Error('Enter the follow-up detail or the evidence that clears the dependency.');
  if(!['follow','clear'].includes(values.decision))throw Error('Choose a follow-up or a resolution.');
  if(values.decision==='follow'){
    const due=String(values.due||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due||due<'2026-11-20')throw Error('Choose a follow-up date on or after 20 November 2026.');
    work.dependencyDue=due;
  }
  const issue=work.issue;
  if(values.decision==='clear'){
    work.issue='';work.resolutionEvidence=note;delete work.dependencyDue;
  }
  work.dependencyRevision=(work.dependencyRevision||0)+1;
  d.activity.unshift({action:work.issue?'Dependency follow-up recorded':'Dependency cleared',recordId:id,accountId:work.accountId,
    actor:'Operations',at:new Date().toISOString(),detail:[issue,note,work.owner,work.dependencyDue].filter(Boolean).join(' · ')});
}
export function dependencyPanel(d,work,role){
  const e=escapeHTML;
  const history=d.activity.filter(entry=>entry.recordId===work.id&&entry.action.startsWith('Dependency'));
  const log=history.map(entry=>`<p><strong>${e(entry.action)}</strong> · ${e(entry.detail)}</p>`).join('');
  if(!work.issue||role!=='operations')return log;
  return `<form class="pipeline-record" data-dependency="${e(work.id)}" data-version="${work.dependencyRevision||0}">
    <h3>Review dependency</h3><label>Evidence or next action<textarea name="note" required maxlength="1200" rows="2"></textarea></label>
    <label>Follow-up date<input type="date" name="due" min="2026-11-20" value="${e(work.dependencyDue)}"></label>
    <p class="tiny muted">A follow-up keeps this item on ${e(work.owner)}’s alerts.</p>
    <p data-dependency-error role="alert"></p><div class="row"><button type="submit" value="follow">Schedule follow-up</button><button type="submit" value="clear">Clear with evidence</button></div></form>${log}`;
}
