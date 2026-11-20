import assert from 'node:assert/strict';
import {dataset,INDUSTRIES} from '../../outputs/workspace-concepts/studio-src/data.js';
import {availability,leaveHours,businessDays,decideLeave,roleMetrics,simulateAutomation,automationSummary} from '../../outputs/workspace-concepts/studio-src/role-model.js';
assert.equal(businessDays('2026-11-20','2026-11-23'),2);
assert.equal(leaveHours({start:'2026-11-13',end:'2026-11-18'},'2026-11-16'),24);
for(const {id} of INDUSTRIES){
 const d=dataset(id),ready=d.leave.find(l=>l.personId===d.team[6].id),person=d.team[6];
 assert.equal(availability(d,d.team[0].id,'2026-11-16').available,24);
 const balance=person.leaveBalanceHours;decideLeave(d,ready.id,'Approved');assert.equal(person.leaveBalanceHours,balance-24);assert.equal(availability(d,person.id,'2026-11-30').available,16);assert.throws(()=>decideLeave(d,ready.id,'Approved'));
 assert.throws(()=>decideLeave(d,d.leave[1].id,'Approved'),/Coverage conflict/);
 const before=d.team[1].leaveBalanceHours;decideLeave(d,d.leave[1].id,'Declined');assert.equal(d.team[1].leaveBalanceHours,before);
 const stats=roleMetrics(d,{week:'2026-11-16'});assert.equal(stats.reduce((n,r)=>n+r.sent,0),d.outreach.filter(x=>x.week==='2026-11-16'&&x.status==='Sent').length);
 for(const row of stats){assert.equal(row.sent,row.manual+row.automated);assert(row.meetings<=row.replies);assert(row.replies<=row.sent);assert(row.won<=row.closed);}
 const empty=roleMetrics(d,{week:'2020-01-01'});assert(empty.every(x=>x.replyRate===null&&x.winRate===null));
 const filtered=roleMetrics(d,{week:'2026-11-16',team:'Growth sales',source:'Inbound',segment:'Enterprise'});assert(filtered.every(x=>x.person.department==='Growth sales'&&x.messages.every(m=>m.source==='Inbound'&&m.segment==='Enterprise')));
 assert.throws(()=>simulateAutomation(d,d.automations[2].id),/Resume/);
 const a=d.automations[0],old=automationSummary(d,a.id);const run=simulateAutomation(d,a.id);assert.deepEqual(run,{sent:3,skipped:0});assert.equal(automationSummary(d,a.id).sent,old.sent+3);assert.deepEqual(simulateAutomation(d,a.id),{sent:0,skipped:0});
 const suppress=simulateAutomation(d,d.automations[1].id);assert.equal(suppress.sent,0);assert.equal(suppress.skipped,3);
 assert(d.runLog.some(x=>x.reason==='Replied'));assert(d.runLog.some(x=>x.reason==='Duplicate'));assert(d.runLog.some(x=>x.reason==='Meeting booked'));
 const ids=new Set(d.team.map(t=>t.id));assert(d.leave.every(l=>ids.has(l.personId)));assert(d.outreach.every(m=>ids.has(m.ownerId)));
}
console.log('PASS: eight industries — leave decisions, conflicts, capacity, metric denominators, cohort filters, paused runs, stop conditions and idempotent simulation.');
