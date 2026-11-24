import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../../outputs/workspace-concepts/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*'use strict';([\s\S]+?)readHash\(\);render\(\);\s*<\/script>/)[1];
const context = vm.createContext({
  assert, structuredClone, URL, setTimeout() {},
  localStorage: {getItem() {}, setItem() {}},
  document: {
    addEventListener() {}, querySelector() { return {}; },
    getElementById() {},
    createElement() { return {dataset: {}}; }, head: {appendChild() {}}, documentElement: {dataset: {}}
  },
  window: {addEventListener() {}}
});
vm.runInContext(script, context);
vm.runInContext(`
  toast=()=>{};
  const order=S.orders.find(o=>o.stage==='Draft');
  const pkg=S.packages.find(p=>p.eventId===order.eventId && p.status==='Active' && !oHas(p));
  function oHas(p){return order.items.some(line=>line.packageId===p.id)}
  pkg.capacity=soldOf(pkg)+10;
  const initialTotal=total(order), initialDemand=pendingOf(pkg), initialSold=soldOf(pkg);
  const reason='Customer requested additional places.';
  const submit=(qty)=>submitOrderLine(order,pkg.id,qty,reason,null);
  requestReview('order',order.id);
  const original=recordReview('order',order.id);
  assert.match(odDetail(order,[]),/data-order-line=/);
  assert.match(pkDetail(pkg,[]),/data-order-picker=/);
  for(const quantity of [0,-1,0.5,11])assert.throws(()=>submit(quantity));
  assert.throws(()=>submitOrderLine(order,pkg.id,1,'',''),/reason/);
  assert.throws(()=>submitOrderLine(order,pkg.id,1,reason,'other'),/evidence/);
  assert.throws(()=>orderLineQuote(order,S.packages.find(p=>p.eventId!==order.eventId).id,1),/active item/);
  assert.equal(total(order),initialTotal);
  submit(2);
  assert.equal(original.status,'Superseded');
  assert.equal(total(order),initialTotal+2*pkg.price);
  assert.equal(pendingOf(pkg),initialDemand+2);
  assert.equal(soldOf(pkg),initialSold);
  assert.equal(order.lineChanges[0].reason,reason);
  assert.match(orderLineHistory(order),/Added by You/);
  const savedPrice=pkg.price;
  pkg.price+=500;
  submit(1);
  assert.equal(order.items.filter(line=>line.packageId===pkg.id).length,1);
  assert.equal(total(order),initialTotal+3*savedPrice);
  assert.throws(()=>submit(8),/Only 7/);

  order.stage='Confirmed';_ix=null;
  const before=total(order),soldBefore=soldOf(pkg),taskCount=S.tasks.length;
  submit(2);
  const request=recordReview('order-line',order.id);
  assert.match(orderItemEditor(order),/awaiting/);
  assert.match(orderLineRequestEvidence(request),/Order total/);
  assert.equal(total(order),before);
  assert.throws(()=>submit(1),/awaiting review/);
  reviewDecision(request.id,'Approved');assert.equal(request.status,'Pending');
  UI.me=request.approver;
  pkg.capacity=soldBefore;
  reviewDecision(request.id,'Approved');assert.equal(request.status,'Pending');
  pkg.capacity=soldBefore+5;
  reviewDecision(request.id,'Approved');
  reviewDecision(request.id,'Approved');
  assert.equal(request.status,'Approved');
  assert.equal(total(order),before+2*savedPrice);
  assert.equal(soldOf(pkg),soldBefore+2);
  assert.equal(S.tasks.length,taskCount+(savedPrice?1:0));
  assert.match(orderLineHistory(order),/Approved request/);
  assert.ok(orderLineHistory(order).includes('Requested by '+request.requestedBy+' · Approved by '+request.decidedBy));
  UI.me='You';order.stage='In delivery';
  submit(1);
  const rejected=recordReview('order-line',order.id);
  UI.me=rejected.approver;
  reviewDecision(rejected.id,'Rejected','Delivery cut-off passed.');
  assert.equal(total(order),before+2*savedPrice);
  assert.match(orderLineHistory(order),/Delivery cut-off/);
  order.stage='Completed';
  assert.throws(()=>submit(1),/complete/);
  assert.doesNotMatch(orderItemEditor(order),/<form/);
`, context);
console.log('Order item additions, linked evidence, stock, approvals, invoice follow-up and closed orders passed.');
