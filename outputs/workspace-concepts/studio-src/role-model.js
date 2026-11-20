import {REVIEW_WEEKS} from './role-data.js';
const total=(a,f)=>a.reduce((n,x)=>n+f(x),0);
export function businessDays(start,end){let count=0;for(let day=new Date(start+'T12:00:00Z');day<=new Date(end+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+1)){if(day.getUTCDay()!==0&&day.getUTCDay()!==6)count++;}return count;}
export function leaveHours(leave,week){const end=new Date(week+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+4);const from=leave.start>week?leave.start:week,to=leave.end<end.toISOString().slice(0,10)?leave.end:end.toISOString().slice(0,10);return from>to?0:businessDays(from,to)*8;}
export function availability(d,personId,week){const p=d.team.find(x=>x.id===personId);const approved=total(d.leave.filter(l=>l.personId===personId&&l.status==='Approved'),l=>leaveHours(l,week));const pending=total(d.leave.filter(l=>l.personId===personId&&l.status==='Pending'),l=>leaveHours(l,week));return {approved,pending,available:Math.max(0,p.capacity-approved),remaining:p.capacity-approved-p.allocated};}
export function leaveConflict(d,leave){return d.leave.filter(l=>l.id!==leave.id&&l.status==='Approved'&&l.start<=leave.end&&l.end>=leave.start&&d.team.find(t=>t.id===l.personId).department===d.team.find(t=>t.id===leave.personId).department);}
function leaveDateValid(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function leaveApprovalIssues(d,leave){
 const issues=[],person=d.team.find(t=>t.id===leave.personId);
 if(!person)return ['Employee not found.'];
 if(!leaveDateValid(leave.start)||!leaveDateValid(leave.end)||leave.end<leave.start)return ['Choose valid dates with the end on or after the start.'];
 const span=(Date.parse(leave.end)-Date.parse(leave.start))/86400000;
 if(span>366)return ['Review requests longer than one year separately.'];
 const hours=businessDays(leave.start,leave.end)*8;
 if(!hours)issues.push('Choose at least one working day.');
 if(hours>person.leaveBalanceHours)issues.push('Insufficient available leave balance.');
 if(d.leave.some(l=>l.id!==leave.id&&l.personId===leave.personId&&['Pending','Approved'].includes(l.status)&&l.start<=leave.end&&l.end>=leave.start))issues.push('This employee already has a request covering these dates.');
 const conflicts=leaveConflict(d,leave);if(conflicts.length)issues.push('Coverage conflict with '+conflicts.map(l=>d.team.find(t=>t.id===l.personId)?.name||'a teammate').join(', ')+'. Change dates or use the coverage workbench.');
 return issues;
}
export function decideLeave(d,id,status){
 const leave=d.leave.find(l=>l.id===id);if(!leave||leave.status!=='Pending')throw new Error('Only pending leave can be reviewed');if(!['Approved','Declined'].includes(status))throw new Error('Invalid decision');
 if(status==='Approved'){const issues=leaveApprovalIssues(d,leave);if(issues.length)throw new Error(issues.join(' '));}
 const person=d.team.find(t=>t.id===leave.personId),hours=businessDays(leave.start,leave.end)*8;
 leave.status=status;leave.decisionBy='Demo manager';if(status==='Approved'){person.leaveBalanceHours-=hours;leave.deductedHours=hours;}
 d.activity.unshift({action:'Leave '+status.toLowerCase(),recordId:id,actor:'Demo manager',detail:`${leave.start} to ${leave.end}; ${hours} hours`,at:new Date().toISOString()});
}
export function editLeaveDates(d,id,start,end){
 const leave=d.leave.find(l=>l.id===id);if(!leave||!['Pending','Approved'].includes(leave.status))throw new Error('Only pending or approved requests can be edited.');
 const person=d.team.find(t=>t.id===leave.personId),oldHours=businessDays(leave.start,leave.end)*8;
 const candidate={...leave,start,end},copy={...d,team:d.team.map(t=>t.id===person.id?{...t,leaveBalanceHours:t.leaveBalanceHours+(leave.status==='Approved'?oldHours:0)}:t)};
 const issues=leaveApprovalIssues(copy,candidate);if(issues.length)throw new Error(issues.join(' '));
 const newHours=businessDays(start,end)*8,previous=`${leave.start} to ${leave.end}`;
 if(start===leave.start&&end===leave.end)return 'Dates unchanged; balance unchanged.';
 if(leave.status==='Approved')person.leaveBalanceHours+=oldHours-newHours;
 Object.assign(leave,{start,end,...(leave.status==='Approved'?{deductedHours:newHours}:{})});
 d.activity.unshift({action:'Leave dates edited',recordId:id,actor:'Demo manager',detail:`${previous} → ${start} to ${end}; ${oldHours}h → ${newHours}h; ${leave.status}`,at:new Date().toISOString()});
 return leave.status==='Approved'?'Approved dates updated; only the hours difference adjusted the balance.':'Pending dates updated; no leave balance deducted.';
}
export function roleMetrics(d,filters={}){const match=x=>(!filters.week||x.week===filters.week)&&(!filters.source||filters.source==='All'||x.source===filters.source)&&(!filters.segment||filters.segment==='All'||x.segment===filters.segment);return d.team.filter(t=>t.department.includes('sales')&&(!filters.team||filters.team==='All'||t.department===filters.team)).map(t=>{
 const messages=d.outreach.filter(x=>x.ownerId===t.id&&match(x)),sent=messages.filter(x=>x.status==='Sent'),results=d.salesResults.filter(x=>x.ownerId===t.id&&match(x)),won=results.filter(x=>x.outcome==='Won');
 const calls=(d.calls||[]).filter(c=>c.ownerId===t.id&&c.status==='Logged'&&match(c));const count=f=>sent.filter(f).length;return {person:t,calls:calls.length,connectedCalls:calls.filter(c=>c.connected).length,positiveCalls:calls.filter(c=>c.outcome==='Positive conversation').length,attempts:messages.length,sent:sent.length,automated:count(x=>!!x.automationId),manual:count(x=>!x.automationId),replies:count(x=>x.replied),meetings:count(x=>x.meeting),failed:messages.filter(x=>x.status==='Failed').length,suppressed:messages.filter(x=>x.status==='Suppressed').length,personalised:count(x=>x.personalised),replyRate:sent.length?count(x=>x.replied)/sent.length:null,meetingRate:sent.length?count(x=>x.meeting)/sent.length:null,closed:results.length,won:won.length,bookings:total(won,x=>x.valuePence),winRate:results.length?won.length/results.length:null,cycleDays:results.length?Math.round(total(results,x=>x.cycleDays)/results.length):null,messages,results};});}
export function automationSummary(d,id){const rows=d.outreach.filter(x=>x.automationId===id),sent=rows.filter(x=>x.status==='Sent');return {attempts:rows.length,sent:sent.length,replies:sent.filter(x=>x.replied).length,meetings:sent.filter(x=>x.meeting).length,failed:rows.filter(x=>x.status==='Failed').length,suppressed:rows.filter(x=>x.status==='Suppressed').length};}
export function simulateAutomation(d,id){const a=d.automations.find(x=>x.id===id);if(!a)throw new Error('Automation not found');if(a.status!=='Active')throw new Error('Resume this automation before running a simulation.');let sent=0,skipped=0;
 for(const en of d.enrolments.filter(x=>x.automationId===id&&!x.processed)){en.processed=true;const ok=en.state==='Eligible';if(ok)sent++;else skipped++;const msg={id:d.id+'sim-'+en.id,ownerId:en.ownerId,accountId:en.accountId,automationId:id,week:REVIEW_WEEKS[0],source:'Outbound',segment:'Growth',status:ok?'Sent':'Suppressed',replied:false,meeting:false,personalised:true,reason:ok?'Simulated delivery':en.state,responseHours:null};d.outreach.push(msg);d.runLog.unshift({id:msg.id,automationId:id,enrolmentId:en.id,status:msg.status,reason:msg.reason,version:a.version});}
 d.activity.unshift({action:'Automation simulated',recordId:id,sent,skipped});return {sent,skipped};}
