import assert from 'node:assert/strict';
import {dataset} from '../../outputs/workspace-concepts/studio-src/data.js';
import {addCallNote, logCompletedCall, saveContactEmail} from '../../outputs/workspace-concepts/studio-src/calling.js';
import {researchContactEmail} from '../../outputs/workspace-concepts/studio-src/email-research.js';
import {contactAddressEvidence, recordConfirmedAddress} from '../../outputs/workspace-concepts/studio-src/address-confirmation.js';
import {crmBeginDraft, crmSaveDraft, crmSendDraft, crmLogInbound} from '../../outputs/workspace-concepts/studio-src/contact-model.js';

const d = dataset('agency');
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
