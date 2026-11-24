import {addEmailExamples} from './email-research.js';
import {normalizedContactMethod, writeContactMethodCheck} from './contact-evidence.js';
import {contactHasAddress, emailCanBeUsed, matchesAddressSuggestion, setContactAddress, validContactAddress} from './email-address.js';
export const CALL_OUTCOMES=['Positive conversation','Meeting requested','Callback requested','Not interested','No answer','Wrong number','Do not contact'];
export const CALL_PURPOSES=['Setup call','Pitch call','Follow-up call','Other call'];
export const PITCH_RESULTS=['Budget approval pending','Revised proposal requested','Ready to proceed','Declined'];
export function extendCallingData(d){
 const p=d.id+'-';
 d.contacts=['Sam Carter','Morgan Quinn','Jordan Lee','Charlie Hayes','Alex Taylor','Rory Brooks'].map((name,i)=>({id:p+'contact'+i,name,accountId:d.accounts[i].id,ownerId:d.team[i%4].id,title:['Operations director','Managing director','Commercial lead'][i%3],phone:'+44 7700 90000'+i,email:i===1?'':name.toLowerCase().replace(' ','.')+'@customer.example',emailAllowed:i!==4,callAllowed:i!==5,timezone:'Europe/London',need:['Replace disconnected spreadsheets','Connect sales to delivery','Improve renewal visibility'][i%3],lastTouch:i?'No recent conversation':'Requested a product walkthrough',queueStatus:'Ready'}));
 addEmailExamples(d);
 const auto={id:p+'call-rule',name:'Positive call → follow-up',ownerId:d.team[0].id,trigger:'Positive call outcome logged',status:'Active',steps:['Wait for a saved positive business outcome','Check contact preferences and call identity','If email is missing, wait for a valid email','Send the follow-up once for this call','Create a follow-up task and stop on reply'],schedule:'Immediate after a qualifying saved event · demo only',version:1};d.automations.push(auto);
 d.callRule={automationId:auto.id,trigger:'Positive conversation',missingEmail:'wait',template:'Thank you for our conversation',body:'Hi {{firstName}},\n\nThank you for speaking with me about {{company}}. As discussed, we can bring your customer records, workflows and reporting together.\n\nOur next step: {{nextStep}}.\n\nBest,\n{{owner}}',createTask:true,advanceQueue:false};
 d.calls=[];d.callJobs=[];d.emailOutbox=[];d.salesTasks=[{id:p+'task0',contactId:d.contacts[0].id,title:'Prepare discovery questions',due:'2026-11-16',status:'Open',source:'Manual'}];d.salesMeetings=[];d.quotes=[];d.salesActivity=[];d.nextSalesId=1;
 return d;
}
const salesId=(d,kind)=>d.id+'-'+kind+'-'+d.nextSalesId++;
export function salesEvent(d,type,recordId,detail,relatedId){d.salesActivity.unshift({id:salesId(d,'event'),at:new Date().toISOString(),type,recordId,detail,...(relatedId?{relatedId}:{})});}
export function startCall(d, contactId, scheduledTaskId='') {
  if (d.calls.some(c => ['Ringing', 'Connected', 'Wrap-up'].includes(c.status))) throw new Error('Finish and log the current call first.');
  const contact = d.contacts.find(c => c.id === contactId);
  if (!contact?.callAllowed) throw new Error('This contact is excluded from calling.');
  const task=scheduledTaskId && d.salesTasks.find(t=>t.id===scheduledTaskId && t.kind==='Scheduled call' && t.contactId===contactId && t.status==='Open');
  if(scheduledTaskId && !task) throw new Error('Choose an open scheduled call for this contact.');
  const account = d.accounts.find(a => a.id === contact.accountId);
  const call = {
    id: salesId(d, 'call'), contactId, accountId: account.id, ownerId: task?.ownerId || contact.ownerId, dialedPhone:contact.phone,
    purpose:task?.purpose || '', opportunityId:task?.opportunityId || '', scheduledTaskId,
    week: '2026-11-16', source: 'Outbound', segment: account.segment === 'Enterprise' ? 'Enterprise' : 'Growth',
    startedAt: new Date().toISOString(), connectedAt: null, endedAt: null, durationSeconds: 0,
    status: 'Ringing', connected: false, outcome: null, notes: '', nextStep: '', recorded: false
  };
  d.calls.unshift(call);
  salesEvent(d, 'Call started', call.id, 'Simulated outbound call.');
  return call;
}
export function connectCall(d, id) {
  const call = d.calls.find(c => c.id === id);
  if (call?.status !== 'Ringing') throw new Error('Only a ringing call can connect.');
  Object.assign(call, {status: 'Connected', connected: true, connectedAt: new Date().toISOString()});
  salesEvent(d, 'Call connected', id, 'Demo contact answered.');
}
export function endCall(d, id) {
  const call = d.calls.find(c => c.id === id);
  if (!call || !['Ringing', 'Connected'].includes(call.status)) throw new Error('No active call to end.');
  call.endedAt = new Date().toISOString();
  call.durationSeconds = call.connectedAt ? Math.max(0, Math.round((Date.parse(call.endedAt) - Date.parse(call.connectedAt)) / 1000)) : 0;
  call.status = 'Wrap-up';
  salesEvent(d, 'Call ended', id, call.connected ? 'Awaiting business outcome.' : 'No connection; log an unanswered outcome.');
}
export function nextCallDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
function scheduledCallValues(d,contact,{purpose,scheduledAt,ownerId,opportunityId='',agenda=''}){
 if(!contact?.callAllowed) throw new Error('This contact is excluded from calling.');
 if(!CALL_PURPOSES.includes(purpose)) throw new Error('Choose the purpose of the scheduled call.');
 if(!d.team.some(person=>person.id===ownerId)) throw new Error('Choose an owner for the scheduled call.');
 if(opportunityId && !d.opportunities.some(o=>o.id===opportunityId && o.accountId===contact.accountId)) throw new Error('Choose an opportunity for this company.');
 const parts=String(scheduledAt||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
 const date=new Date(scheduledAt);
 if(!parts || !Number.isFinite(date.getTime()) || [date.getFullYear(),date.getMonth()+1,date.getDate(),date.getHours(),date.getMinutes()].some((v,i)=>v!==Number(parts[i+1])) || date.getTime()<=Date.now()) throw new Error('Choose a valid future date and time for the call.');
 return {kind:'Scheduled call',title:purpose,purpose,scheduledAt:date.toISOString(),due:scheduledAt.slice(0,10),ownerId,contactId:contact.id,accountId:contact.accountId,opportunityId,agenda:String(agenda||'').trim()};
}
function saveScheduledCall(d,values,source){
 const existing=d.salesTasks.find(t=>t.kind==='Scheduled call' && t.status==='Open' && t.contactId===values.contactId && t.scheduledAt===values.scheduledAt && t.ownerId===values.ownerId);
 if(existing) {
   if(existing.purpose===values.purpose && existing.opportunityId===values.opportunityId && existing.agenda===values.agenda && existing.source===source)return existing;
   throw new Error('A call for this contact and owner is already scheduled at that time.');
 }
 const task={...values,id:salesId(d,'task'),source,status:'Open'};
 d.salesTasks.unshift(task);
 salesEvent(d,'Call scheduled',task.contactId,task.purpose+' · '+new Date(task.scheduledAt).toLocaleString()+' · '+d.team.find(t=>t.id===task.ownerId).name,task.id);
 return task;
}
export function scheduleSalesCall(d,contactId,values,sourceCallId=''){
 const contact=d.contacts.find(c=>c.id===contactId);
 if(sourceCallId && !d.calls.some(c=>c.id===sourceCallId && c.contactId===contactId && c.status==='Logged')) throw new Error('Choose a completed call for this contact.');
 return saveScheduledCall(d,scheduledCallValues(d,contact,values),sourceCallId||'Manual');
}
export function processCallJobs(d){let sent=0;const auto=d.automations.find(a=>a.id===d.callRule.automationId);
 for(const job of d.callJobs){if(['Sent','Suppressed','Cancelled','Replied'].includes(job.status))continue;const contact=d.contacts.find(c=>c.id===job.contactId),call=d.calls.find(c=>c.id===job.callId);
  if(!contact.emailAllowed){job.status='Suppressed';job.reason='Contact preference prevents follow-up';salesEvent(d,'Follow-up suppressed',job.id,job.reason);continue;}
  if(auto.status!=='Active'){job.status='Paused';job.reason='Workflow paused';continue;}
  if(!emailCanBeUsed(contact)){job.status='Waiting for email';job.reason='A usable saved address is needed';continue;}
  if(d.emailOutbox.some(m=>m.callId===job.callId)){job.status='Sent';job.reason='Existing delivery retained';continue;}
  const account=d.accounts.find(a=>a.id===contact.accountId),owner=d.team.find(t=>t.id===call.ownerId);const replace=text=>text.replaceAll('{{firstName}}',contact.name.split(' ')[0]).replaceAll('{{company}}',account.name).replaceAll('{{nextStep}}',call.nextStep||'arrange a product walkthrough').replaceAll('{{owner}}',owner.name);
  const email={id:salesId(d,'email'),at:new Date().toISOString(),callId:call.id,contactId:contact.id,jobId:job.id,to:contact.email,subject:job.subject,body:replace(job.body),status:'Sent (demo)',version:job.version};d.emailOutbox.unshift(email);job.status='Sent';job.reason='Follow-up simulated once for this call';sent++;
  d.outreach.push({id:email.id,ownerId:owner.id,accountId:account.id,automationId:auto.id,week:'2026-11-16',source:'Outbound',segment:account.segment==='Enterprise'?'Enterprise':'Growth',status:'Sent',replied:false,meeting:false,personalised:true,reason:'Positive-call follow-up simulated',responseHours:null});
  if(job.createTask&&!d.salesTasks.some(t=>t.source===call.id))d.salesTasks.unshift({id:salesId(d,'task'),contactId:contact.id,title:call.nextStep||'Check the agreed next step',due:call.followUpDate||nextCallDate(),status:'Open',source:call.id});
  salesEvent(d,'Follow-up sent (demo)',email.id,`Call ${call.id} · rule v${job.version} · ${contact.email}`);
 }return sent;
}
function commitCallOutcome(d,call,{outcome,purpose=call.purpose||'Other call',pitchResult='',buyerFeedback='',notes='',nextStep='',callbackDate=nextCallDate(),opportunityId=call.opportunityId||'',scheduledAt='',scheduledPurpose='',scheduledOwnerId=''}={},runFollowUp=true) {
 const needsNextStep=['Positive conversation','Meeting requested','Callback requested'].includes(outcome);
 if(!CALL_OUTCOMES.includes(outcome)) throw new Error('Choose a call outcome.');
 if(!CALL_PURPOSES.includes(purpose)) throw new Error('Choose the purpose of this call.');
 buyerFeedback=String(buyerFeedback||'').trim();
 if(pitchResult || buyerFeedback){
   if(purpose!=='Pitch call' || !call.connected) throw new Error('Record buyer feedback and pitch results on a connected pitch call.');
   if(pitchResult && !PITCH_RESULTS.includes(pitchResult)) throw new Error('Choose a listed pitch result.');
 }
 if(!call.connected && (needsNextStep || outcome==='Not interested')) throw new Error('An unanswered call cannot have a conversation outcome.');
 if(needsNextStep && !nextStep.trim()) throw new Error('Record the agreed next step.');
 if(runFollowUp && (!/^\d{4}-\d{2}-\d{2}$/.test(callbackDate) || !Number.isFinite(Date.parse(callbackDate)) || new Date(callbackDate).toISOString().slice(0,10)!==callbackDate)) throw new Error('Choose a valid follow-up date.');
 if(opportunityId && !d.opportunities.some(o=>o.id===opportunityId && o.accountId===call.accountId)) throw new Error('Choose an opportunity for this company.');
 const contact=d.contacts.find(c=>c.id===call.contactId);
 let schedule;
 if(scheduledAt){
   if(['Do not contact','Wrong number'].includes(outcome)) throw new Error('This outcome prevents scheduling another call.');
   schedule=scheduledCallValues(d,contact,{purpose:scheduledPurpose,scheduledAt,ownerId:scheduledOwnerId,opportunityId,agenda:nextStep});
   if(d.salesTasks.some(t=>t.kind==='Scheduled call' && t.status==='Open' && t.id!==call.scheduledTaskId && t.contactId===contact.id && t.scheduledAt===schedule.scheduledAt && t.ownerId===schedule.ownerId)) throw new Error('A call for this contact and owner is already scheduled at that time.');
 }
 const newerCall=d.calls.some(c=>c.contactId===contact.id && c.status==='Logged' && c.endedAt>call.endedAt);
 if(!call.id){
   call.id=salesId(d,'call');
   d.calls.unshift(call);
 }
 Object.assign(call,{status:'Logged',loggedAt:new Date().toISOString(),purpose,pitchResult,buyerFeedback,opportunityId,followUpDate:runFollowUp?callbackDate:'',outcome,notes:notes.trim(),nextStep:nextStep.trim()});
 const booked=call.scheduledTaskId && d.salesTasks.find(t=>t.id===call.scheduledTaskId);
 if(booked) Object.assign(booked,{status:'Complete',completedCallId:call.id});
 if(schedule) call.nextCallTaskId=saveScheduledCall(d,schedule,call.id).id;
 if(!newerCall){
   if(contact.callAllowed) contact.queueStatus='Attempted';
   contact.lastTouch=outcome;
 }
 if(outcome==='Do not contact'){contact.callAllowed=false;contact.emailAllowed=false;contact.queueStatus='Excluded';}
 if(outcome==='Wrong number' && contact.queueStatus!=='Excluded'){contact.callAllowed=false;contact.queueStatus='Needs phone correction';}
 if(outcome==='Wrong number' && call.dialedPhone && normalizedContactMethod('phone',call.dialedPhone)===normalizedContactMethod('phone',contact.phone)){
   writeContactMethodCheck(contact,'phone',{at:call.endedAt,result:'unconfirmed',source:'Outbound call',evidence:'Wrong number reported on call '+call.id+'.'});
 }
 if(!contact.callAllowed)d.salesTasks.filter(t=>t.kind==='Scheduled call' && t.contactId===contact.id && t.status==='Open').forEach(t=>t.status='Cancelled');
 if(runFollowUp) queueCallFollowUp(d,call,contact);
 d.activity.unshift({action:'Call logged',recordId:call.id,accountId:call.accountId,contactId:call.contactId,opportunityId,at:call.loggedAt,ownerId:call.ownerId,detail:outcome});
 salesEvent(d,call.entryMethod==='Manual'?'Completed call logged':'Call outcome saved',call.id,outcome+' · '+(call.nextStep||'No next step'));
 if(runFollowUp) processCallJobs(d);
 return call;
}
function queueCallFollowUp(d,call,contact) {
 const {outcome,followUpDate:callbackDate}=call;
 if(!call.nextCallTaskId && (outcome==='Callback requested'||outcome==='No answer'))d.salesTasks.unshift({id:salesId(d,'task'),contactId:contact.id,title:outcome==='Callback requested'?'Call back: '+call.nextStep:'Review unanswered call',due:callbackDate,status:'Open',source:call.id});
 if(outcome==='Meeting requested')d.salesTasks.unshift({id:salesId(d,'task'),contactId:contact.id,title:'Arrange meeting: '+call.nextStep,due:callbackDate,status:'Open',source:call.id});
 const auto=d.automations.find(a=>a.id===d.callRule.automationId);
 if(outcome===d.callRule.trigger){const job={id:salesId(d,'job'),callId:call.id,contactId:contact.id,status:'Queued',reason:'Qualifying outcome saved',version:auto.version,subject:d.callRule.template,body:d.callRule.body,createTask:d.callRule.createTask};if(!emailCanBeUsed(contact)&&d.callRule.missingEmail==='task'){job.status='Cancelled';job.reason='Rule creates a research task instead of waiting';d.salesTasks.unshift({id:salesId(d,'task'),contactId:contact.id,title:'Find an email and review follow-up',due:callbackDate,status:'Open',source:call.id});}d.callJobs.unshift(job);}
}
export function logCall(d,id,values) {
 const call=d.calls.find(c=>c.id===id);
 if(!call||call.status!=='Wrap-up') throw new Error('End the call before logging its outcome.');
 return commitCallOutcome(d,call,values);
}

export function addCallNote(d, callId, {contactId, authorId, kind, body, revision}) {
  const call = d.calls.find(item => item.id === callId && item.contactId === contactId);
  if (call?.status !== 'Logged') throw new Error('Open a completed call to add a note.');
  const author = d.team.find(person => person.id === authorId);
  if (!author) throw new Error('Choose the author of this note.');
  const text = String(body || '').trim();
  if (!text || !['Additional note','Correction'].includes(kind)) throw new Error('Choose the note type and enter its text.');
  const notes = call.addenda || [];
  const version = Number(revision);
  if (!Number.isInteger(version) || version !== notes.length) {
    const prior = notes[version];
    if (prior && prior.authorId === authorId && prior.kind === kind && prior.body === text) return prior;
    throw new Error('This call has newer notes. Reopen the call to review them.');
  }
  const note = {id:salesId(d,'note'), authorId, author:author.name, kind, body:text, at:new Date().toISOString()};
  (call.addenda ||= []).push(note);
  const detail = author.name + ' · ' + kind + ' · ' + text;
  d.activity.unshift({action:'Call note added', recordId:call.id, accountId:call.accountId, contactId, opportunityId:call.opportunityId, actor:author.name, at:note.at, detail});
  salesEvent(d,'Call note added',call.id,detail);
  return note;
}

export function logCompletedCall(d,values={}) {
 const {contactId,ownerId,direction,endedAt,durationSeconds,outcome,runFollowUp=false}=values;
 const contact=d.contacts.find(person=>person.id===contactId);
 const account=contact && d.accounts.find(company=>company.id===contact.accountId);
 if(!account) throw new Error('Choose a contact and company.');
 if(!d.team.some(person=>person.id===ownerId)) throw new Error('Choose a call owner.');
 if(!['Inbound','Outbound'].includes(direction)) throw new Error('Choose an inbound or outbound call.');
 const stamp=String(endedAt||'');
 const day=stamp.slice(0,10);
 const end=new Date(stamp);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stamp) || !Number.isFinite(end.getTime()) || new Date(day).toISOString().slice(0,10)!==day || end.getTime()>Date.now()) throw new Error('Choose the time the completed call ended, in the past.');
 const duration=Number(durationSeconds);
 if(durationSeconds==null || String(durationSeconds).trim()==='' || !Number.isSafeInteger(duration) || duration<0 || duration>86400) throw new Error('Enter talk time in seconds between 0 and 86,400.');
 if(outcome==='No answer' && duration!==0) throw new Error('Use zero talk time for an unanswered call.');
 const finished=end.toISOString();
 const existing=d.calls.find(c=>c.contactId===contactId && c.source===direction && c.endedAt===finished && c.status==='Logged');
 if(existing) return {call:existing,duplicate:true};
 const started=new Date(end.getTime()-duration*1000).toISOString();
 const week=new Date(started);
 week.setUTCDate(week.getUTCDate()-(week.getUTCDay()+6)%7);
 const call={
   entryMethod:'Manual',contactId,accountId:account.id,ownerId,source:direction,week:week.toISOString().slice(0,10),
   segment:account.segment==='Enterprise'?'Enterprise':'Growth',startedAt:started,endedAt:finished,
   connectedAt:duration>0?started:null,connected:duration>0,durationSeconds:duration,recorded:false
 };
 return {call:commitCallOutcome(d,call,values,runFollowUp===true),duplicate:false};
}
export function saveContactEmail(d,id,email,confirmation) {
  const contact=d.contacts.find(c=>c.id===id);
  const value=String(email || '').trim();
  if(!contact || !validContactAddress(value)) throw new Error('Enter a valid email address.');
  if(confirmation && (normalizedContactMethod('email',confirmation.address)!==normalizedContactMethod('email',value) ||
    !confirmation.source || !confirmation.detail || !Number.isFinite(Date.parse(confirmation.at))))
    throw new Error('Provide dated source evidence for this email address.');
  if(d.contacts.some(c=>c.id!==id && contactHasAddress(c,value)))
    throw new Error('This email is already saved on another contact.');
  if(!confirmation && matchesAddressSuggestion(contact,value))
    throw new Error('Confirm the source of this suggested address on the contact before using it.');
  setContactAddress(contact,value);
  if(confirmation) {
    contact.emailStatus='confirmed';
    contact.emailEvidence=confirmation;
    writeContactMethodCheck(contact,'email',{
      at:confirmation.at,result:'verified',source:confirmation.source,evidence:confirmation.detail
    },confirmation.verifiedAt || confirmation.at);
  }
  salesEvent(d,'Email updated',id,'Pending follow-ups re-evaluated');
  return processCallJobs(d);
}
export function saveCallRule(d,values){if(!['Positive conversation','Meeting requested'].includes(values.trigger))throw new Error('Choose a supported outcome trigger.');if(!values.template?.trim()||!values.body?.trim())throw new Error('A subject and message are required.');if(!['wait','task'].includes(values.missingEmail))throw new Error('Choose the missing-email action.');Object.assign(d.callRule,values);const auto=d.automations.find(a=>a.id===d.callRule.automationId);auto.version++;auto.trigger=values.trigger+' logged';auto.steps[0]='Wait for '+values.trigger.toLowerCase()+' to be logged';auto.steps[2]=values.missingEmail==='wait'?'Wait for a valid email if missing':'Create a research task if email is missing';salesEvent(d,'Call rule updated',auto.id,'Version '+auto.version+'; existing jobs retain their template snapshot.');}
export function markEmailReplied(d,id){const email=d.emailOutbox.find(e=>e.id===id);if(!email||email.status==='Replied (demo)')return;email.status='Replied (demo)';const job=d.callJobs.find(j=>j.id===email.jobId);job.status='Replied';d.outreach.find(m=>m.id===id).replied=true;d.salesTasks.filter(t=>t.source===email.callId&&t.status==='Open'&&t.kind!=='Scheduled call').forEach(t=>t.status='Stopped on reply');salesEvent(d,'Reply received (demo)',id,'Open follow-up task stopped.');}
export function salesWorkbenchAction(d,s,action,v={}){
 const active=d.calls.find(c=>['Ringing','Connected','Wrap-up'].includes(c.status));s.activeCall=active?.id||null;const contact=d.contacts.find(c=>c.id===(active?.contactId||s.callContact))||d.contacts[0];
 if(action==='contact-select'){if(d.calls.some(c=>['Ringing','Connected','Wrap-up'].includes(c.status)))throw new Error('Finish the current call before switching contacts.');s.callContact=v.id;return 'Contact selected.';}
 if(action==='dial-start'){s.activeCall=startCall(d,contact.id).id;return 'Demo call ringing. No real call is placed.';}
 if(action==='dial-scheduled'){
   const task=d.salesTasks.find(t=>t.id===v.id && t.kind==='Scheduled call');
   if(!task)throw new Error('Choose a scheduled call.');
   const call=startCall(d,task.contactId,task.id);
   s.activeCall=call.id;s.callContact=call.contactId;s.view='dialer';
   return 'Scheduled demo call started.';
 }
 if(action==='cancel-scheduled'){
   const task=d.salesTasks.find(t=>t.id===v.id && t.kind==='Scheduled call' && t.status==='Open');
   if(!task || active?.scheduledTaskId===task.id) throw new Error('Only a pending call can be cancelled.');
   task.status='Cancelled';
   salesEvent(d,'Scheduled call cancelled',task.contactId,task.purpose+' · '+new Date(task.scheduledAt).toLocaleString());
   return 'Scheduled call cancelled.';
 }
 if(action==='dial-connect'){connectCall(d,s.activeCall);return 'Demo conversation connected.';}
 if(action==='dial-end'){endCall(d,s.activeCall);return 'Add the call outcome and next step.';}
 if(action==='dial-log'){const call=logCall(d,s.activeCall,v);if(d.callRule.advanceQueue){const next=d.contacts.find(c=>c.callAllowed&&c.queueStatus==='Ready'&&c.id!==call.contactId);if(next)s.callContact=next.id;}s.activeCall=null;return 'Call saved. Matching follow-up rules have run.';}
 if(action==='contact-email')return `${saveContactEmail(d,contact.id,v.email)} pending follow-up(s) sent in the demo.`;
 if(action==='call-rule-save'){saveCallRule(d,v);return 'Rule saved for future qualifying calls.';}
 if(action==='call-rule-toggle'){const a=d.automations.find(a=>a.id===d.callRule.automationId);a.status=a.status==='Active'?'Paused':'Active';const sent=processCallJobs(d);return a.status==='Paused'?'Follow-up workflow paused.':`Workflow resumed; ${sent} pending follow-up(s) simulated.`;}
 if(action==='call-email-reply'){markEmailReplied(d,v.id);return 'Reply recorded; outstanding follow-up task stopped.';}
 if(action==='sales-task-done'){const t=d.salesTasks.find(t=>t.id===v.id);if(!t || t.kind==='Scheduled call')throw new Error('Start the scheduled call and log its outcome.');if(t.status==='Open')t.status='Complete';return 'Task completed.';}
 if(action==='sales-meeting'){if(!v.title?.trim()||!v.date)throw new Error('Enter a meeting title and date.');d.salesMeetings.unshift({id:salesId(d,'meeting'),contactId:contact.id,title:v.title.trim(),date:v.date,status:'Scheduled (demo)'});salesEvent(d,'Meeting scheduled',contact.id,v.title+' · '+v.date);return 'Meeting added locally. No invitation sent.';}
 if(action==='sales-quote'){const value=Number(v.amount);if(!Number.isFinite(value)||value<=0||value>10000000)throw new Error('Enter a quote value between £0 and £10m.');d.quotes.unshift({id:salesId(d,'quote'),contactId:contact.id,amountPence:Math.round(value*100),status:'Draft'});return 'Quote draft created for this contact.';}
 if(action==='sales-quote-review'){
   const quote=d.quotes.find(q=>q.id===v.id);
   if (s.role!=='sales' || quote?.status!=='Approved (demo)') throw new Error('Sales can record customer acceptance after the assigned leader approves the quote.');
   quote.status='Accepted (demo)';
   salesEvent(d,'Quote accepted',quote.id,quote.status);
   return 'Customer acceptance recorded. The quote is ready for delivery handoff.';
 }
 return null;
}
