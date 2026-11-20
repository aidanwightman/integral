import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../../outputs/workspace-concepts/index.html', import.meta.url), 'utf8');
const classic = html.split('<!-- INDUSTRY_STUDIO_BEGIN -->')[0];
const script = classic.match(/<script>\s*'use strict';([\s\S]+?)readHash\(\);render\(\);\s*<\/script>/)[1];
const store = new Map();
const context = vm.createContext({
  assert, URL, structuredClone,
  localStorage: {getItem() {}, setItem() {}},
  sessionStorage: {getItem: k => store.get(k), setItem: (k,v) => store.set(k,v)},
  document: {addEventListener() {}, getElementById() {}, querySelector() {return {}}, createElement() {return {dataset:{}}}, head: {appendChild() {}}, documentElement:{dataset:{}}},
  window: {addEventListener() {}}, setTimeout() {}
});
vm.runInContext(script, context);
vm.runInContext(`
  toast = () => {};
  const deal = S.deals.find(d=>d.stage==='Negotiation');
  const gross=deal.value;
  const owner=deal.owner;
  const leader=nsDiscountLead(owner);
  const recipient=S.team.map(t=>t[0]).find(n=>n!==owner&&n!==leader);
  const findAlert=id=>northstarAlerts(attention()).find(a=>a.id===id);
  const refreshNotice=()=>{const att=attention();updateNorthstarNotice(att,northstarAlerts(att))};
  UI.me=owner; UI.scope=null; UI.mine=true; UI.route='deals';
  refreshNotice(); assert.equal(nsNotice,null,'No flood on the first visit');
  assert.equal(northstarNetDealValue(deal),gross,'Legacy deals are full price');
  assert.equal(nsDiscountLead('You'),'Mo D.');
  assert.equal(nsDiscountLead('Mo D.'),'You');
  assert.throws(()=>nsRequestDiscount(deal.id,'10.005','note',''),/decimal/);
  assert.throws(()=>nsRequestDiscount(deal.id,'105','note',''),/100/);
  assert.throws(()=>nsRequestDiscount(deal.id,'10','',''),/Explain/);

  requestReview('sale',deal.id);
  const sale=recordReview('sale',deal.id);
  UI.me=sale.approver;reviewDecision(sale.id,'Approved');
  assert.equal(nsTermsApproved(deal),true);
  UI.me=owner;
  const initial=nsRequestDiscount(deal.id,'12.35','Renewal commitment','');
  const pendingKey='ap:'+initial.id;
  assert.equal(initial.approver,leader);
  assert.equal(initial.toBps,1235);
  assert.equal(northstarNetDealValue(deal),gross);
  assert.equal(findAlert(pendingKey),undefined);
  assert.throws(()=>nsRequestDiscount(deal.id,'12.35','Retry',''),/changed/);
  reviewDecision(initial.id,'Approved');
  assert.equal(initial.status,'Pending','Requester cannot approve their own request');
  ACT.dealadvance({id:deal.id});
  assert.equal(deal.stage,'Negotiation','A pending price change blocks sale close even with a prior approval');
  UI.me=leader;
  assert.equal(findAlert(pendingKey).go.id,initial.id);
  refreshNotice();assert.equal(nsNotice.id,pendingKey);
  reviewDecision(initial.id,'Returned','');
  assert.equal(initial.status,'Pending');
  reviewDecision(initial.id,'Returned','Include margin evidence');
  assert.equal(northstarNetDealValue(deal),gross);
  UI.me=owner;assert.match(findAlert('revision:'+initial.id).meta,/margin evidence/);
  assert.throws(()=>nsRequestDiscount(deal.id,'9','stale form',''),/changed/);
  const revised=nsRequestDiscount(deal.id,'9','Revised offer',initial.id);
  assert.equal(findAlert('revision:'+initial.id),undefined);
  UI.me=leader;reviewDecision(revised.id,'Rejected','Below our margin floor');
  UI.me=owner;assert.match(findAlert('revision:'+revised.id).meta,/margin floor/);
  ACT.nsdiscountack({id:revised.id});
  assert.equal(findAlert('revision:'+revised.id),undefined);
  assert.equal(northstarNetDealValue(deal),gross);

  const agreed=nsRequestDiscount(deal.id,'7.05','Confirmed two-year commitment',revised.id);
  const proposal=gross-Math.round(gross*705/10000);
  assert.equal(agreed.proposedNet,proposal);
  assert.equal(agreed.previousNet,gross);
  assert.equal(agreed.ownerAtRequest,owner);
  assert.match(nsDiscountSummary(agreed),/Deal owner at request/);
  UI.me=agreed.approver;reviewDecision(agreed.id,'Approved','');
  assert.equal(agreed.status,'Pending','Price approvals require a decision rationale');
  reviewDecision(agreed.id,'Approved','Verified the margin');
  assert.equal(northstarNetDealValue(deal),proposal);assert.equal(deal.value,gross);
  assert.equal(nsTermsApproved(deal),false,'Old sale approval must be renewed after a price change');
  reviewDecision(agreed.id,'Approved');assert.equal(deal.pricingRevision,1);
  UI.me=owner;
  assert.equal(findAlert('discountdecision:'+agreed.id).go.route,'approvals');
  ACT.nsdiscountack({id:agreed.id});assert.equal(findAlert('discountdecision:'+agreed.id),undefined);

  const makeTask=(who,done)=>({id:'testtask'+S.tasks.length,title:'Call sponsor',dealId:deal.id,due:NOW.toISOString(),owner:who,done});
  const openTask=makeTask(owner,false);S.tasks.push(openTask);
  const othersTask=makeTask(leader,false);S.tasks.push(othersTask);
  const completedTask=makeTask(owner,true);S.tasks.push(completedTask);
  deal.invite={url:'https://meet.example.org/demo',reply:'Awaiting reply',owner,due:'2026-11-17'};
  assert.throws(()=>nsReassignDeal(deal.id,'Unknown','note',owner),/team/);
  assert.throws(()=>nsReassignDeal(deal.id,recipient,'',owner),/reason/);
  assert.throws(()=>nsReassignDeal(deal.id,recipient,'note','wrong'),/changed/);
  nsReassignDeal(deal.id,recipient,'New territory coverage',owner);
  assert.equal(deal.owner,recipient);assert.equal(deal.invite.owner,recipient);
  assert.equal(openTask.owner,recipient);assert.equal(othersTask.owner,leader);assert.equal(completedTask.owner,owner);
  assert.equal(findAlert('handoff:'+deal.id),undefined);
  ACT.nshandoffaccept({id:deal.id});
  assert.equal(deal.ownerHistory.at(-1).accepted,false);
  UI.me=recipient;
  assert.equal(findAlert('handoff:'+deal.id).go.id,deal.id);
  assert.match(nsCommercialHistory(deal),/New territory coverage/);
  assert.match(nsCommercialHistory(deal),/Verified the margin/);
  assert.equal(findAlert('tk:'+openTask.id).owner,recipient);
  ACT.nshandoffaccept({id:deal.id}); assert.equal(findAlert('handoff:'+deal.id),undefined);
  assert.equal(deal.ownerHistory.at(-1).accepted,true);
  requestReview('sale',deal.id);
  const newSale=recordReview('sale',deal.id);
  assert.notEqual(newSale.id,sale.id);assert.equal(newSale.amount,proposal);
  UI.me=newSale.approver;reviewDecision(newSale.id,'Approved');
  assert.equal(nsTermsApproved(deal),true);
  ACT.dealadvance({id:deal.id});assert.equal(deal.stage,'Won');
  assert.throws(()=>nsRequestDiscount(deal.id,'12','closed',agreed.id),/open/);
  assert.throws(()=>nsReassignDeal(deal.id,owner,'closed',recipient),/open/);

  sessionStorage.setItem('ds-northstar-review-v1',JSON.stringify(S));
  const reopened=openSample('events').deals.find(d=>d.id===deal.id);
  assert.equal(reopened.owner,recipient);assert.equal(reopened.approvedDiscountBps,705);
  assert.equal(reopened.ownerHistory.at(-1).accepted,true);
  assert.equal(openSample('events').approvals.find(a=>a.id===agreed.id).reason,'Verified the margin');
  assert.ok(!vNorthstarAlerts(attention()).includes('undefined'));
`, context);
console.log('Northstar passes scoped alerts, independent discount decisions, price-sensitive sale sign-off and audited owner handoffs.');
