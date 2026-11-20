import assert from 'node:assert/strict';
import {dataset,INDUSTRIES} from '../../outputs/workspace-concepts/studio-src/data.js';
import {requestApproval,decideApproval} from '../../outputs/workspace-concepts/studio-src/approval-model.js';
import {startCall,connectCall,endCall,logCall,saveContactEmail,saveCallRule,processCallJobs,markEmailReplied,salesWorkbenchAction} from '../../outputs/workspace-concepts/studio-src/calling.js';
const positive=(d,contactId)=>{const c=startCall(d,contactId);connectCall(d,c.id);endCall(d,c.id);logCall(d,c.id,{outcome:'Positive conversation',nextStep:'Demonstrate the sales workflow',notes:'Synthetic test'});return c;};
for(const {id} of INDUSTRIES){
 const d=dataset(id),first=d.contacts[0],missing=d.contacts[1];
 const call=positive(d,first.id);assert.equal(d.emailOutbox.length,1);assert.match(d.emailOutbox[0].body,/Demonstrate the sales workflow/);assert(!d.emailOutbox[0].body.includes('{{'));assert.equal(d.callJobs[0].status,'Sent');assert.equal(d.salesTasks.filter(t=>t.source===call.id).length,1);
 assert.throws(()=>logCall(d,call.id,{outcome:'Positive conversation',nextStep:'Again'}));saveContactEmail(d,first.id,'new@customer.example');assert.equal(d.emailOutbox.length,1);
 const waiting=positive(d,missing.id);assert.equal(d.callJobs[0].status,'Waiting for email');assert.equal(d.emailOutbox.length,1);assert.throws(()=>saveContactEmail(d,missing.id,'invalid'));assert.equal(d.emailOutbox.length,1);
 saveCallRule(d,{...d.callRule,template:'New version',body:'Changed {{firstName}}'});assert.equal(d.automations.find(a=>a.id===d.callRule.automationId).version,2);
 assert.equal(saveContactEmail(d,missing.id,'morgan@customer.example'),1);assert.equal(d.emailOutbox[0].subject,'Thank you for our conversation');assert.equal(d.emailOutbox[0].version,1);assert.equal(processCallJobs(d),0);
 const mail=d.emailOutbox[0];markEmailReplied(d,mail.id);assert.equal(mail.status,'Replied (demo)');assert.equal(d.salesTasks.find(t=>t.source===waiting.id).status,'Stopped on reply');assert(d.outreach.find(m=>m.id===mail.id).replied);
 const count=d.emailOutbox.length;positive(d,d.contacts[4].id);assert.equal(d.emailOutbox.length,count);assert.equal(d.callJobs[0].status,'Suppressed');assert.throws(()=>startCall(d,d.contacts[5].id));
 const auto=d.automations.find(a=>a.id===d.callRule.automationId);auto.status='Paused';positive(d,d.contacts[2].id);assert.equal(d.callJobs[0].status,'Paused');auto.status='Active';assert.equal(processCallJobs(d),1);
 const unanswered=startCall(d,d.contacts[3].id);assert.throws(()=>startCall(d,first.id));endCall(d,unanswered.id);assert.throws(()=>logCall(d,unanswered.id,{outcome:'Positive conversation',nextStep:'Invalid'}));logCall(d,unanswered.id,{outcome:'No answer'});assert(d.salesTasks.some(t=>t.source===unanswered.id));
 const s={role:'sales',callContact:first.id};salesWorkbenchAction(d,s,'sales-quote',{amount:'1200.25'});assert.equal(d.quotes[0].amountPence,120025);const signoff=requestApproval(d,'sales','quote',{targetId:d.quotes[0].id,reason:'Review quote'});decideApproval(d,'saleslead',signoff.id,1,'approved');salesWorkbenchAction(d,s,'sales-quote-review',{id:d.quotes[0].id});assert.equal(d.quotes[0].status,'Accepted (demo)');
 const d2=dataset(id);saveCallRule(d2,{...d2.callRule,missingEmail:'task'});positive(d2,d2.contacts[1].id);saveContactEmail(d2,d2.contacts[1].id,'later@customer.example');assert.equal(d2.emailOutbox.length,0);assert.equal(d2.callJobs[0].status,'Cancelled');
}
console.log('PASS: eight industries — full call lifecycle, known/missing email, invalid email, once-per-call delivery, paused/resumed jobs, template version snapshots, opt-out, unanswered calls, reply stop, task-only branch and quote lifecycle.');

{
 const {logCompletedCall}=await import('../../outputs/workspace-concepts/studio-src/calling.js');
 const {callingView}=await import('../../outputs/workspace-concepts/studio-src/calling-views.js');
 const d=dataset('agency'), contact=d.contacts[0];
 const opportunity=d.opportunities.find(o=>o.accountId===contact.accountId);
 const values={contactId:contact.id,ownerId:d.team[1].id,direction:'Inbound',endedAt:'2025-11-05T15:30:00Z',durationSeconds:'320',
   opportunityId:opportunity.id,outcome:'Callback requested',notes:'Procurement requested a new time.',nextStep:'Call after the board meeting',callbackDate:'2025-11-07',runFollowUp:true};
 const before=JSON.stringify(d);
 for(const overrides of [
   {direction:'other'}, {ownerId:'missing'}, {contactId:'missing'}, {endedAt:'2100-01-01T10:00:00Z'}, {endedAt:'2025-02-31T10:00:00Z'},
   {durationSeconds:-1}, {durationSeconds:''}, {durationSeconds:1.5}, {outcome:'No answer'}, {durationSeconds:0},
   {nextStep:''}, {opportunityId:d.opportunities.find(o=>o.accountId!==contact.accountId).id}, {callbackDate:'2025-02-30'}
 ]){
   assert.throws(()=>logCompletedCall(d,{...values,...overrides}));
   assert.equal(JSON.stringify(d),before,'An invalid entry must leave the entire dataset untouched');
 }
 const {call,duplicate}=logCompletedCall(d,values);
 assert.equal(duplicate,false);
 assert.equal(call.status,'Logged');
 assert.equal(call.connected,true);
 assert.equal(call.source,'Inbound');
 assert.equal(call.week,'2025-11-03');
 assert.equal(call.startedAt,'2025-11-05T15:24:40.000Z');
 assert.equal(call.endedAt,'2025-11-05T15:30:00.000Z');
 assert.equal(call.ownerId,d.team[1].id);
 assert.equal(call.opportunityId,opportunity.id);
 assert.equal(d.activity[0].recordId,call.id);
 assert.equal(d.salesTasks.find(t=>t.source===call.id).due,values.callbackDate);
 assert.equal(d.salesActivity[0].type,'Completed call logged');
 const after=JSON.stringify(d);
 assert.equal(logCompletedCall(d,{...values,endedAt:'2025-11-05T10:30:00-05:00'}).duplicate,true);
 assert.equal(JSON.stringify(d),after);
 const historical=logCompletedCall(d,{...values,direction:'Outbound',endedAt:'2025-11-04T12:00:00Z',outcome:'Positive conversation',runFollowUp:false}).call;
 assert.equal(d.callJobs.length,0);
 assert.equal(d.emailOutbox.length,0);
 assert.equal(d.salesTasks.filter(t=>t.source===historical.id).length,0);
 assert.equal(contact.lastTouch,'Callback requested');
 const inactive=d.contacts[5];
 const missed=logCompletedCall(d,{...values,contactId:inactive.id,opportunityId:'',outcome:'No answer',durationSeconds:'0',nextStep:'',runFollowUp:false});
 assert.equal(missed.call.connected,false);
 assert.equal(inactive.callAllowed,false);
 const positiveManual={...values,endedAt:'2025-12-01T16:55:00Z',outcome:'Positive conversation'};
 logCompletedCall(d,positiveManual);
 logCompletedCall(d,positiveManual);
 assert.equal(d.callJobs.length,1);
 assert.equal(d.emailOutbox.length,1);
 const view=callingView(d,{view:'dialer',callContact:contact.id});
 assert.match(view,/data-manual-call/);
 assert.match(view,/Manually logged/);
 assert.match(view,/Procurement requested a new time/);
 assert.match(callingView(d,{view:'salesdesk'}),/Dial or log a call/);
 console.log('PASS: manual dated inbound/outbound calls, ownership, related deals, audit history, validation, optional follow-up, replay and historical ordering.');
}
