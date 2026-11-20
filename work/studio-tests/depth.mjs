import assert from 'node:assert/strict';
import {dataset,INDUSTRIES} from '../../outputs/workspace-concepts/studio-src/data.js';
import {DEPTH_WORKFLOWS} from '../../outputs/workspace-concepts/studio-src/depth-data.js';
import {depthAction,depthRecord,depthValidation} from '../../outputs/workspace-concepts/studio-src/depth-model.js';
import {depthExamples} from '../../outputs/workspace-concepts/studio-src/depth-examples.js';
import {addFinanceLine,financeExceptionAction,openFinancePeriodCases} from '../../outputs/workspace-concepts/studio-src/finance-exceptions-model.js';
import {cashForecast,metrics} from '../../outputs/workspace-concepts/studio-src/model.js';
const pick=(d,id)=>d.depth.cases.find(c=>c.workflow===id);
const act=(d,c,action,values={},note='')=>depthAction(d,{role:c.role,depthCase:c.id},action,{id:c.id,values,note});
function advance(d,c,values={}){return act(d,c,'depth-step',{...depthExamples(d,c),...values});}
function finish(d,c){while(c.status!=='Complete')advance(d,c);}
function clearPeriod(d,period){
 for(const line of openFinancePeriodCases(d,period)){
  if(line.status==='Risk hold'){
   financeExceptionAction(d,'leadership',line.id,line.history.length,'close-risk',{evidence:'Processor verified settlement reversal against its case record.',externalRef:'R-99'});
  }else{
   const invoice=d.invoices.find(i=>i.totalPence-i.paidPence>=line.source.amountPence);
   financeExceptionAction(d,'finance',line.id,line.history.length,'match',{accountId:invoice.accountId,invoiceId:invoice.id,evidence:'Customer supplied remittance and confirmed the payment allocation.'});
  }
 }
}
let journeys=0;
for(const industry of INDUSTRIES){
 for(const spec of DEPTH_WORKFLOWS){const d=dataset(industry.id),c=pick(d,spec.id);
  // Missing fields cannot mutate business data or advance the workflow.
  const before=JSON.stringify({cash:d.openingCashPence,invoices:d.invoices,leave:d.leave,work:d.work});
  assert.throws(()=>act(d,c,'depth-step'),/required|confirmed/);assert.equal(c.stage,0);
  assert.equal(before,JSON.stringify({cash:d.openingCashPence,invoices:d.invoices,leave:d.leave,work:d.work}));
  // Explicit failure and requested changes both require an evidence-based resubmission.
  act(d,c,'depth-block',{},'Provider unavailable; assign coordinator.');assert.equal(c.status,'Blocked');
  assert.throws(()=>advance(d,c),/Resolve/);assert.throws(()=>act(d,c,'depth-resolve'),/evidence/);
  act(d,c,'depth-resolve',{},'Coordinator confirmed recovery evidence.');
  act(d,c,'depth-return',{},'Reviewer requests more context.');assert.equal(c.status,'Needs changes');
  act(d,c,'depth-resolve',{},'Missing context added and reviewed.');
  act(d,c,'depth-reject',{},'Review declined pending revised evidence.');assert.equal(c.status,'Rejected');assert.throws(()=>advance(d,c),/closed/);act(d,c,'depth-reopen',{},'Revised evidence received for a new review.');
  if(spec.id==='close') {
   assert.throws(()=>advance(d,c),/open statement exceptions/);
   clearPeriod(d,'2026-11');
  }
  finish(d,c);assert.equal(c.stage,spec.steps.length);assert.equal(c.status,'Complete');
  assert.equal(d.depth.handoffs.filter(h=>h.caseId===c.id).length,1);
  const snapshot=JSON.stringify(d);assert.throws(()=>act(d,c,'depth-step'),/closed/);assert.equal(JSON.stringify(d),snapshot);
  const h=d.depth.handoffs[0];assert.throws(()=>depthAction(d,{role:h.toRole},'depth-handoff',{id:h.id}),/next action/);
  depthAction(d,{role:h.toRole},'depth-handoff',{id:h.id,note:'Receiving owner will review the linked evidence tomorrow.'});assert.equal(h.status,'Accepted');
  assert.throws(()=>depthAction(d,{role:h.toRole},'depth-handoff',{id:h.id,note:'Again'}),/no longer/);
  assert(c.history.length>=spec.steps.length+5);journeys++;
 }
}
{
 const d=dataset('agency'),c=pick(d,'coverage'),r=depthRecord(d,c),p=d.team.find(t=>t.id===r.personId),balance=p.leaveBalanceHours;
 assert.throws(()=>advance(d,c,{cover:r.personId}),/own cover/);
 assert.throws(()=>advance(d,c,{cover:d.team[0].id}),/overlapping leave/);
 finish(d,c);assert.equal(r.status,'Approved');assert.equal(p.leaveBalanceHours,balance-24);
 act(d,c,'depth-cancel-leave',{},'Trip cancelled.');assert.equal(r.status,'Cancelled');assert.equal(p.leaveBalanceHours,balance);assert.equal(d.depth.handoffs[0].status,'Withdrawn');
 assert.throws(()=>act(d,c,'depth-cancel-leave',{},'Again'),/once/);assert.equal(p.leaveBalanceHours,balance);
}
{
 const d=dataset('agency'),c=pick(d,'receivable'),r=depthRecord(d,c),beforeCash=d.openingCashPence,beforePaid=r.paidPence,end=cashForecast(d).at(-1).cash;advance(d,c);
 assert.throws(()=>advance(d,c,{amount:String(r.totalPence/100+1)}),/exceeds/);assert.equal(d.openingCashPence,beforeCash);
 assert.throws(()=>advance(d,c,{amount:'1.234'}),/decimal/);
 advance(d,c,{amount:'100'});assert.equal(d.openingCashPence,beforeCash+10000);assert.equal(r.paidPence,beforePaid+10000);assert.equal(cashForecast(d).at(-1).cash,end);
 advance(d,c);assert.equal(d.depth.receipts[0].status,'Reconciled');assert.equal(d.openingCashPence,beforeCash+10000);
 const duplicate=structuredClone(c);duplicate.id+='-duplicate';duplicate.stage=1;duplicate.status='Active';d.depth.cases.push(duplicate);assert.throws(()=>advance(d,duplicate,{amount:'10'}),/already allocated/);
}
{
 const d=dataset('agency'),c=pick(d,'payable'),cash=d.openingCashPence;advance(d,c);assert.throws(()=>advance(d,c,{approver:'Demo AP operator'}),/different/);advance(d,c);assert.throws(()=>advance(d,c,{authoriser:'Demo AP operator'}),/differ/);advance(d,c);assert.equal(d.openingCashPence,cash);assert.equal(depthRecord(d,c).paymentAuthorisation.status,'Authorised only — unpaid');
}
{
 const d=dataset('agency'),c=pick(d,'stock');advance(d,c);assert.equal(d.depth.stock.onHand,10);assert.throws(()=>advance(d,c,{reserveQty:'11'}),/Insufficient/);advance(d,c);assert.equal(d.depth.stock.reserved,3);advance(d,c);assert.equal(d.depth.stock.onHand,7);assert.equal(d.depth.stock.reserved,0);assert.equal(d.depth.stock.movements.length,3);
}
{
 const d=dataset('agency'),c=pick(d,'delivery'),r=depthRecord(d,c),hours=metrics(d).allocated;finish(d,c);assert.equal(r.status,'Complete');assert.equal(metrics(d).allocated,hours-r.hours);assert.equal(d.team.reduce((n,t)=>n+t.allocated,0),metrics(d).allocated);
}
{
 const d=dataset('agency'),c=pick(d,'forecast-review');finish(d,c);const snapshot=structuredClone(c.forecastSnapshot);depthRecord(d,c).valuePence+=10000;assert.deepEqual(c.forecastSnapshot,snapshot);
}
{
 const d=dataset('agency'),c=pick(d,'initiative');advance(d,c);assert.throws(()=>advance(d,c,{budget:'25000'}),/envelope/);assert.throws(()=>advance(d,c,{hours:'120'}),/capacity/);
 const coach=pick(d,'coaching');assert.throws(()=>advance(d,coach,{sent:'10'}),/from 20/);assert.throws(()=>advance(d,coach,{replies:'41'}),/exceed/);
 const close=pick(d,'close');assert.throws(()=>advance(d,close,{unmatched:'1'}),/to 0/);
}
console.log(`PASS: ${journeys} complete journeys across eight businesses; missing data, block/return/recovery, handoffs, idempotence, leave reversal, partial receipt cash invariance, duplicate receipts, approval separation, stock conservation, delivery hours and forecast snapshot checks.`);

{
 const d=dataset('agency'),c=pick(d,'close');
 advance(d,c,{period:'2026-10'});
 advance(d,c);
 const late=addFinanceLine(d,'finance',{origin:'Bank statement',date:'2026-10-29',reference:'LATE-OCT',payer:'Unidentified entity',amountPence:21001,memo:'Imported after initial review.'});
 assert.throws(()=>advance(d,c),/LATE-OCT/);assert.equal(c.stage,2);assert.equal(d.depth.handoffs.filter(h=>h.caseId===c.id).length,0);
 assert.equal(openFinancePeriodCases(d,'2026-10')[0],late);
 clearPeriod(d,'2026-10');
 assert.equal(openFinancePeriodCases(d,'2026-11').length,3);
 advance(d,c);assert.equal(c.status,'Complete');
}
