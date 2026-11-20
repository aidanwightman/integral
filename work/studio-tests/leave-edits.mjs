import assert from 'node:assert/strict';
import {dataset,INDUSTRIES} from '../../outputs/workspace-concepts/studio-src/data.js';
import {editLeaveDates,decideLeave,leaveApprovalIssues} from '../../outputs/workspace-concepts/studio-src/role-model.js';
for(const {id} of INDUSTRIES){
 const d=dataset(id),request=d.leave.find(l=>l.personId===d.team[6].id),person=d.team[6],balance=person.leaveBalanceHours;
 const original=JSON.stringify(d);for(const dates of [['2026-02-30','2026-03-04'],['2026-12-03','2026-12-01'],['2026-12-05','2026-12-06']]){assert.throws(()=>editLeaveDates(d,request.id,...dates));assert.equal(JSON.stringify(d),original);}
 editLeaveDates(d,request.id,'2026-12-07','2026-12-08');assert.equal(person.leaveBalanceHours,balance);assert.equal(request.status,'Pending');
 decideLeave(d,request.id,'Approved');assert.equal(person.leaveBalanceHours,balance-16);
 editLeaveDates(d,request.id,'2026-12-07','2026-12-07');assert.equal(person.leaveBalanceHours,balance-8);
 const count=d.activity.length;editLeaveDates(d,request.id,'2026-12-07','2026-12-07');assert.equal(person.leaveBalanceHours,balance-8);assert.equal(d.activity.length,count);
 editLeaveDates(d,request.id,'2026-12-07','2026-12-09');assert.equal(person.leaveBalanceHours,balance-24);
 const before=JSON.stringify(d);assert.throws(()=>editLeaveDates(d,request.id,'2026-12-01','2027-11-01'),/balance/);assert.equal(JSON.stringify(d),before);assert.throws(()=>decideLeave(d,request.id,'Approved'));assert.equal(JSON.stringify(d),before);
 assert(leaveApprovalIssues(d,d.leave[1]).some(x=>x.includes('Coverage conflict')));
 const isolated=dataset(id);assert.equal(isolated.team[6].leaveBalanceHours,balance);
}
console.log('PASS leave dates: eight industries, pending/approved edits, balance deltas, invalid atomicity, unchanged dates, repeat approval, conflicts, isolated fixtures.');
