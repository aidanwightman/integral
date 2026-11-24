import assert from 'node:assert/strict';
import {dataset} from '../../outputs/workspace-concepts/studio-src/data.js';
import {addCallNote, logCompletedCall, saveContactEmail, scheduleSalesCall} from '../../outputs/workspace-concepts/studio-src/calling.js';
import {researchContactEmail} from '../../outputs/workspace-concepts/studio-src/email-research.js';
import {contactAddressEvidence, recordConfirmedAddress} from '../../outputs/workspace-concepts/studio-src/address-confirmation.js';
import {crmBeginDraft, crmSaveDraft, crmSendDraft, crmLogInbound, crmRecordMethodCheck, crmContactMethod, crmSaveContact} from '../../outputs/workspace-concepts/studio-src/contact-model.js';
import {contactWorkspace} from '../../outputs/workspace-concepts/studio-src/contact-workspace.js';
import {callingView} from '../../outputs/workspace-concepts/studio-src/calling-views.js';
import {ensureOutcomes,outcomeAction,recordFollowupReceipt} from '../../outputs/workspace-concepts/studio-src/outcomes-model.js';
import {outcomeView} from '../../outputs/workspace-concepts/studio-src/outcomes-views.js';
import {contactChecksExample} from '../../outputs/workspace-concepts/studio-src/contact-examples.js';

const d = dataset('agency');
{
  const sample=dataset('agency'),sam=structuredClone(sample.contacts[0]);
  const occupied=crmSaveContact(sample,{firstName:'Another',lastName:'Visitor',email:'elena.ward@lindenquay.example',phone:'+44 1632 960105',accountId:sample.accounts[0].id,ownerId:sample.team[0].id});
  const previous=structuredClone(occupied);
  const elena=contactChecksExample(sample);
  assert.notEqual(elena.id,occupied.id);
  assert.notEqual(elena.email,occupied.email);
  assert.notEqual(elena.phone,occupied.phone);
  assert.deepEqual(occupied,previous);
  assert.deepEqual(sample.contacts[0],sam);
  const email=crmContactMethod(elena,'email'),phone=crmContactMethod(elena,'phone');
  assert.equal(email.status,'Verified');
  assert.ok(email.lastVerifiedAt<email.lastCheckedAt);
  assert.equal(sample.crmEmails.find(row=>row.id===email.sourceMessageId)?.contactId,elena.id);
  assert.equal(phone.status,'Needs review');
  assert.ok(email.lastCheckedAt<phone.lastVerifiedAt && phone.lastVerifiedAt<phone.lastCheckedAt);
  elena.name='Visitor edited the example';
  const before=structuredClone(sample);
  assert.equal(contactChecksExample(sample).name,elena.name);
  assert.deepEqual(sample,before);
}
const contactSummary=(native,id)=>contactWorkspace(native,{view:'contacts',callContact:id}).match(/aria-label="Contact activity summary">([\s\S]*?)<\/dl>/)[1];
{
  const native=dataset('agency'), [sam,other]=native.contacts;
  const baseline=contactSummary(native,sam.id);
  assert.match(baseline,/Requested a product walkthrough<br>No date recorded/);
  assert.match(baseline,/Prepare discovery questions/);
  assert.match(contactSummary(native,other.id),/No dated interaction recorded/);
  assert.match(contactSummary(native,other.id),/No call scheduled/);
  assert.match(contactSummary(native,other.id),/No open tasks/);
  const call=logCompletedCall(native,{contactId:sam.id,ownerId:sam.ownerId,direction:'Inbound',endedAt:'2025-03-04T15:05:06Z',durationSeconds:52,outcome:'Positive conversation',notes:'Discussed onboarding',nextStep:'Send options'}).call;
  const afterCall=contactSummary(native,sam.id);
  assert.match(afterCall,/Inbound call · Positive conversation/);
  assert.ok(afterCall.includes('datetime="'+call.endedAt+'"'));
  assert.ok(!afterCall.includes(call.loggedAt));
  crmLogInbound(native,{sender:sam.email,subject:'Delivery brief <updated>',received:'2025-03-05T16:07:08+01:00',body:'Please send the plan.'});
  const laterEmail=contactSummary(native,sam.id);
  assert.match(laterEmail,/Email received · Delivery brief &lt;updated&gt;/);
  assert.match(laterEmail,/datetime="2025-03-05T15:07:08.000Z"/);
  assert.doesNotMatch(contactSummary(native,other.id),/Delivery brief|Positive conversation|Prepare discovery/);
  const book=(contact,date,purpose)=>scheduleSalesCall(native,contact.id,{purpose,scheduledAt:date,ownerId:contact.ownerId});
  book(other,'2098-01-03T10:00','Pitch call');
  const next=book(sam,'2099-02-01T11:30','Follow-up call');
  book(sam,'2099-02-03T09:00','Pitch call');
  const cancelled=book(sam,'2099-01-01T09:00','Pitch call');
  cancelled.status='Cancelled';
  const completed=book(sam,'2099-01-02T09:00','Pitch call');
  completed.status='Complete';
  native.salesTasks.push({id:'undated-task',contactId:sam.id,title:'Plan handover',kind:'Task',status:'Open'});
  const booked=contactSummary(native,sam.id);
  assert.ok(booked.includes('datetime="'+next.scheduledAt+'"'));
  assert.match(booked,/Follow-up call · /);
  assert.doesNotMatch(booked,/2098|2099-01-/);
  assert.match(booked,/Next open task \(2 open\)/);
  native.salesTasks.find(task=>task.title==='Prepare discovery questions').status='Complete';
  assert.match(contactSummary(native,sam.id),/Plan handover<br>No due date recorded/);
}
{
  const native = dataset('agency'), sam = native.contacts.find(c=>c.id===native.id+'-contact0');
  const views = [
    id=>contactWorkspace(native,{view:'contacts',callContact:id}),
    id=>callingView(native,{view:'dialer',callContact:id})
  ];
  for(const render of views) assert.doesNotMatch(render(sam.id),/data-sam-overview/);
  ensureOutcomes(native);
  outcomeAction(native,'followup','validate',{email:'sam.overview@example.com'});
  for(const render of views) assert.doesNotMatch(render(sam.id),/data-sam-overview/);
  outcomeAction(native,'followup','send');
  assert.match(contactSummary(native,sam.id),/Practice email sent · Product overview/);
  assert.doesNotMatch(contactSummary(native,native.contacts[1].id),/Practice email sent/);
  for(const render of views){
    const html=render(sam.id);
    assert.match(html,/data-sam-overview/);
    assert.match(html,/sam\.overview@example\.com/);
    assert.match(html,/Awaiting delivery confirmation/);
    assert.match(html,/data-do="open-sam-followup"/);
    assert.match(html,/No confirmation recorded/);
    assert.doesNotMatch(render(native.contacts[1].id),/data-sam-overview/);
  }
  recordFollowupReceipt(native,{channel:'Phone',evidence:'Sam said “I received the overview”.'});
  for(const render of views){
    const html=render(sam.id);
    assert.match(html,/<dt>Confirmed by Sam<\/dt><dd>Phone/);
    assert.match(html,/Sam said “I received the overview”/);
    assert.match(html,/Awaiting delivery confirmation/);
  }
  outcomeAction(native,'followup','reconcile');
  for(const render of views) assert.match(render(sam.id),/<dt>Email delivery<\/dt><dd>Delivered<\/dd>/);
  const state={role:'sales',outcomeCase:'followup',followupRecord:true};
  saveContactEmail(native,sam.id,'sam.current@example.com');
  const independent=outcomeView(native,state);
  assert.match(independent,/<dt>Sent to<\/dt><dd>sam\.overview@example\.com/);
  assert.match(independent,/<dt>Current contact email<\/dt><dd>sam\.current@example\.com/);
  for(const label of ['Sent','Delivery checked','Confirmation recorded'])assert.ok(independent.includes('<dt>'+label+'</dt><dd><time datetime="'));
  assert.match(independent,/DEMO-ACK-104/);
  const confirmed=crmRecordMethodCheck(native,sam.id,{method:'phone',value:sam.phone,result:'verified',source:'Contact confirmation',evidence:'Sam read it back',checkedAt:'2026-01-04T10:00:00Z'});
  crmRecordMethodCheck(native,sam.id,{method:'phone',value:sam.phone,result:'unconfirmed',source:'Company directory',evidence:'No number listed'});
  for(const screen of [views[0](sam.id),outcomeView(native,state)]){
    assert.ok(screen.includes('<dt>Last verified</dt><dd><time datetime="'+confirmed.lastVerifiedAt+'">'));
    assert.match(screen,/Sam read it back/);
    assert.match(screen,/No number listed/);
    assert.match(screen,/Needs review/);
  }
}
const morgan = d.contacts.find(c => c.name === 'Morgan Quinn');
const jamie = d.contacts.find(c => c.name === 'Jamie Rivers');
assert.equal(researchContactEmail(d, morgan).candidate, 'morgan.quinn@juniperworks.example');
assert.equal(researchContactEmail(d, jamie).candidate, 'jrivers@juniperworks.example');

const {call} = logCompletedCall(d, {
  contactId: morgan.id, ownerId: morgan.ownerId, direction: 'Inbound', endedAt: '2026-03-02T12:00:00Z',
  durationSeconds: 240, outcome: 'Positive conversation', nextStep: 'Send the delivery dates',
  notes: 'Internal margin discussion', runFollowUp: false
});
const note = {contactId: morgan.id, authorId: morgan.ownerId, kind: 'Correction', body: 'Internal approval belongs to finance', revision: 0};
assert.equal(addCallNote(d, call.id, note), addCallNote(d, call.id, note));
const draft = crmBeginDraft(d, morgan.id, {callId: call.id});
assert.equal(draft.address, '');
assert.match(draft.body, /delivery dates/);
assert.doesNotMatch(draft.body, /Internal/);
const saved = crmSaveDraft(d, draft);
assert.throws(() => crmSendDraft(d, saved), /recipient/);

const supplied = {address: 'MQ-Direct@JuniperWorks.example', sourceId: call.id, detail: 'Morgan spelled it out and read it back.'};
assert.throws(() => recordConfirmedAddress(d, jamie.id, supplied), /source/);
assert.throws(() => recordConfirmedAddress(d, morgan.id, {...supplied, address: d.contacts[0].email}), /another contact/);
assert.equal(morgan.email, '');
const evidence = recordConfirmedAddress(d, morgan.id, supplied);
assert.equal(recordConfirmedAddress(d, morgan.id, supplied), evidence);
assert.equal(d.activity.filter(a => a.action === 'Email address confirmed' && a.recordId === morgan.id).length, 1);
assert.equal(evidence.sourceId, call.id);
assert.match(contactAddressEvidence(d, morgan), /read it back/);
assert.equal(researchContactEmail(d, morgan).address, 'mq-direct@juniperworks.example');
assert.equal(saved.address, '');
assert.throws(() => crmSendDraft(d, saved), /recipient/);
morgan.emailAllowed = false;
const reviewed = {...saved, address: morgan.email};
assert.throws(() => crmSendDraft(d, reviewed), /disabled/);
assert.ok(d.crmDrafts.some(x => x.id === saved.id));
morgan.emailAllowed = true;
const sent = crmSendDraft(d, reviewed);
assert.equal(crmSendDraft(d, reviewed).id, sent.id);
assert.equal(sent.callId, call.id);
assert.equal(sent.address, evidence.address);
assert.equal(d.crmEmails.filter(x => x.draftId === saved.id).length, 1);

const incoming = {sender: morgan.email, subject: 'Delivery dates', body: 'Thursday works', received: '2026-03-03T09:00:00Z', messageId: 'dates-inbox-25'};
assert.equal(crmLogInbound(d, incoming).duplicate, false);
assert.equal(crmLogInbound(d, incoming).duplicate, true);
const original = d.crmEmails.find(m => m.direction === 'Incoming');
const reply = crmBeginDraft(d, morgan.id, {replyToId: original.id});
reply.body = 'We will see you on Thursday.';
assert.equal(crmSendDraft(d, reply).replyToId, original.id);
assert.throws(() => crmBeginDraft(d, jamie.id, {replyToId: original.id}));
saveContactEmail(d, morgan.id, 'another@juniperworks.example');
assert.equal(morgan.emailEvidence, undefined);
assert.ok(d.activity.some(a => a.detail?.includes('Morgan spelled it out')));

const legacy = dataset('agency');
const person = legacy.contacts[1];
person.email = 'mquinn@juniperworks.example';
person.emailStatus = 'inferred';
const history = logCompletedCall(legacy, {contactId: person.id, ownerId: person.ownerId, direction:'Outbound', endedAt:'2026-03-01T10:00:00Z',
  durationSeconds: 50, outcome:'Positive conversation', nextStep:'Send dates', runFollowUp:true});
assert.equal(legacy.callJobs[0].status, 'Waiting for email');
assert.equal(crmBeginDraft(legacy, person.id).address, '');
assert.equal(legacy.emailOutbox.length, 0);
const confirm = {address:person.email, sourceId:history.call.id, detail:'Address spelled aloud.'};
person.emailStatus = 'bounced';
assert.throws(() => recordConfirmedAddress(legacy, person.id, confirm), /delivery failure/);
recordConfirmedAddress(legacy, person.id, {...confirm,address:'m.quinn+events@juniperworks.example'});
assert.equal(legacy.emailOutbox.length, 1);
assert.equal(legacy.emailOutbox[0].to, 'm.quinn+events@juniperworks.example');
console.log('PASS: call → internal correction → addressless draft → cohort comparison → independently confirmed address → reviewed send and linked reply; duplicate, legacy and suppression checks.');
