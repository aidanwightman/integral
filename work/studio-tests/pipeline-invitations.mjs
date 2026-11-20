import assert from 'node:assert/strict';
import {dataset,INDUSTRIES} from '../../outputs/workspace-concepts/studio-src/data.js';
import {metrics,moveStage} from '../../outputs/workspace-concepts/studio-src/model.js';
import {decideApproval,requestApproval} from '../../outputs/workspace-concepts/studio-src/approval-model.js';
import {invitationAlerts,saveInvitationDetails,usesPipelineMeetings} from '../../outputs/workspace-concepts/studio-src/pipeline-invitations.js';
import {pipelineRecordForm} from '../../outputs/workspace-concepts/studio-src/pipeline-record.js';

const d=dataset('events'),o=d.opportunities[0],id=o.id,initial=metrics(d);
const link='https://us02web.zoom.us/j/12345678901';
const save=(values,revision)=>saveInvitationDetails(d,id,values,revision,'Sales');
const move=from=>moveStage(d,id,from,'Sales');
const alert=()=>invitationAlerts(d).find(a=>a.opportunityId===id);
assert.equal(invitationAlerts(d).length,1);
assert.equal(invitationAlerts(d)[0].opportunityId,'events-d2');
assert.deepEqual(d.config.stages,['Discovery','Pitched','Booked','Won']);
assert.throws(()=>move('Discovery'),/meeting link/);
assert.throws(()=>move('Discovery'),/meeting link/);
assert.equal(d.activity.filter(a=>a.action==='Stage held'&&a.opportunityId===id).length,1);
assert.equal(alert().title,'Evidence needed for Pitched');
assert.deepEqual(metrics(d),initial);
for(const bad of ['https://zoom.us','javascript:alert(1)','http://zoom.us/j/123','https://someone:secret@zoom.us/j/123']){
  assert.throws(()=>save({meetingLink:bad}),/HTTPS meeting link/);
}
save({meetingLink:link},0);
assert.equal(alert(),undefined);
save({meetingLink:link},0); // Retransmitted identical save after its revision was committed.
assert.equal(o.pipelineEvidence.revision,1);
move('Discovery');move('Discovery');
assert.equal(o.stage,'Pitched');
assert.equal(metrics(d).weighted-initial.weighted,Math.round(o.valuePence*.25));
assert.throws(()=>move('Pitched'),/invitation reference/);
save({inviteRef:'CAL-20',response:'Awaiting reply'});
assert.match(alert().title,/awaiting reply/i);
save({response:'Declined'});
assert.equal(alert().severity,'urgent');
assert.throws(()=>move('Pitched'),/assign a chase/);
for(const fields of [
  {response:'Chasing'},
  {response:'Chasing',chaseOwner:'Someone else',chaseDue:'2026-11-22'},
  {response:'Chasing',chaseOwner:d.team[1].name,chaseDue:'2026-11-31'},
  {response:'Chasing',chaseOwner:d.team[1].name,chaseDue:'2026-23-22'}
])assert.throws(()=>save(fields),/owner|date/);
save({response:'Chasing',chaseOwner:d.team[1].name,chaseDue:'2026-11-19'});
assert.throws(()=>move('Pitched'),/overdue/);
assert.equal(alert().title,'Invitation follow-up overdue');
assert.throws(()=>save({chaseDue:'2026-11-24'},1),/record has changed/);
save({chaseDue:'2026-11-23'});
move('Pitched');move('Pitched');
assert.equal(o.stage,'Booked');
assert.equal(metrics(d).won,initial.won);
assert.equal(alert().owner,d.team[1].name);
assert.throws(()=>move('Booked'),/Request deal-terms sign-off/);
const sale=requestApproval(d,'sales','sale',{targetId:id,reason:'Review signed sponsorship terms'});
assert.throws(()=>move('Booked'),/await approval/);
decideApproval(d,'saleslead',sale.id,sale.history.length,'denied','Confirm the fee.');
assert.throws(()=>move('Booked'),/denied/);
requestApproval(d,'sales','sale',{requestId:sale.id,version:sale.history.length,targetId:id,reason:'Fee confirmed'});
decideApproval(d,'saleslead',sale.id,sale.history.length,'approved');
assert.throws(()=>move('Booked'),/accepted invitation/);
save({response:'Accepted'});
assert.equal(alert().title,'Evidence needed for Won');
assert.throws(()=>move('Booked'),/signed sponsorship/);
save({evidence3:'AGR-102'});
assert.equal(alert(),undefined);
save({inviteRef:'CAL-21',response:'Accepted',chaseDue:'2027-01-01'});
assert.equal(o.pipelineEvidence.response,'Awaiting reply');
assert.equal(o.pipelineEvidence.chaseDue,'');
assert.equal(alert().title,'Invitation awaiting reply');
save({response:'Accepted'});
move('Booked');move('Booked');
assert.equal(o.stage,'Won');
assert.equal(metrics(d).won-initial.won,o.valuePence);
assert.throws(()=>move('Discovery'),/stage has changed/);
assert.throws(()=>save({meetingLink:''}),/Keep a meeting link/);
assert.throws(()=>save({response:'Not recorded'}),/tracked invitation/);
assert.equal(alert(),undefined);
save({meetingLink:'https://meet.example/revised',response:'Accepted'});
assert.equal(alert().title,'Invitation awaiting reply');
save({response:'Accepted'});
assert.equal(alert(),undefined);
assert.match(pipelineRecordForm(d,o),/Meeting follow-up/);
assert.equal(d.activity.filter(a=>a.action==='Stage changed'&&a.opportunityId===id).length,3);
assert(d.activity.filter(a=>a.opportunityId===id && a.action==='Stage changed').every(a=>a.accountId===o.accountId && a.actor==='Sales' && a.at && a.detail));
for(const industry of INDUSTRIES.filter(i=>!usesPipelineMeetings(i))){
  const other=dataset(industry.id),opp=other.opportunities[0];
  assert.deepEqual(invitationAlerts(other),[]);
  assert(!pipelineRecordForm(other,opp).includes('meeting link'));
  assert.throws(()=>moveStage(other,opp.id),/Add the /);
  saveInvitationDetails(other,opp.id,{evidence1:'Visit or application reference 203'});
  moveStage(other,opp.id,other.config.stages[0]);
  assert.equal(opp.stage,other.config.stages[1]);
}
console.log('PASS: stage gates, non-cash booking, role sign-off, tracked responses and overdue chases, stale/retried submissions, replaced invitations, record history and industry-specific evidence.');
