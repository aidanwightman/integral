import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the classic workspace's actual action handlers with its seeded business.
const html = fs.readFileSync(new URL('../../outputs/workspace-concepts/index.html', import.meta.url), 'utf8');
const classic = html.split('<!-- INDUSTRY_STUDIO_BEGIN -->')[0];
const script = classic.match(/<script>\s*'use strict';([\s\S]+?)readHash\(\);render\(\);\s*<\/script>/)[1];
const context = vm.createContext({
  assert, URL, structuredClone,
  localStorage: {getItem: () => null, setItem() {}},
  document: {addEventListener() {}, getElementById() {}, querySelector() { return {}; }, createElement() { return {dataset: {}}; }, head: {appendChild() {}}, documentElement: {dataset: {}}},
  window: {addEventListener() {}},
  setTimeout() {}
});

vm.runInContext(script, context);
vm.runInContext(`
  toast = () => {};
  const contact = S.deals.find(d => d.stage === 'Contacted');
  const advance = () => ACT.dealadvance({id: contact.id});
  const alert = () => attention().find(a => a.id === 'invite:' + contact.id);
  advance();
  assert.equal(contact.stage, 'Contacted');
  assert.match(alert().title, /meeting link/);
  contact.invite = {url:'https://meet.northstar.example/sales/42', reply:'Not sent'};
  advance();
  assert.equal(contact.stage, 'Pitched');
  advance();
  assert.equal(contact.stage, 'Pitched');
  Object.assign(contact.invite, {reply:'Awaiting reply', owner:'You', due:'2026-11-15'});
  advance();
  assert.equal(contact.stage, 'Pitched');
  assert.ok(alert().late);
  contact.invite.due = '2026-11-17';
  advance();
  assert.equal(contact.stage, 'Booked');
  assert.equal(alert().owner, 'You');
  contact.invite.reply = 'Declined';
  advance();
  assert.equal(contact.stage, 'Booked');
  contact.invite.reply = 'Accepted';
  assert.equal(alert(), undefined);
  advance();
  assert.equal(contact.stage, 'Proposal sent');

  const sale = S.deals.find(d => d.stage === 'Negotiation');
  ACT.dealadvance({id: sale.id});
  const saleRequest = recordReview('sale', sale.id);
  assert.equal(sale.stage, 'Negotiation');
  ACT.approve({id:saleRequest.id});
  assert.equal(saleRequest.status, 'Pending');
  UI.me = saleRequest.approver;
  ACT.approve({id:saleRequest.id});
  ACT.dealadvance({id: sale.id});
  assert.equal(sale.stage, 'Won');

  const order = S.orders.find(o => o.stage === 'Draft' && seats(o) &&
    o.items.every(line => K(line.packageId).capacity - soldOf(K(line.packageId)) >= line.quantity));
  const confirm = () => ACT.confirm({id:order.id});
  UI.me = 'You';
  confirm();
  const first = recordReview('order', order.id);
  assert.equal(order.stage, 'Draft');
  assert.equal(first.type, 'Delegate order');
  ACT.advance({id:order.id});
  assert.equal(recordReview('order', order.id).id, first.id);
  UI.me = first.approver;
  reviewDecision(first.id, 'Rejected', '');
  assert.equal(first.status, 'Pending');
  reviewDecision(first.id, 'Rejected', 'Verify the seat count');
  assert.equal(first.status, 'Rejected');
  UI.me = first.requestedBy;
  assert.match(attention().find(a => a.id === 'revision:' + first.id).meta, /seat count/);
  confirm();
  const revised = recordReview('order', order.id);
  assert.notEqual(revised.id, first.id);
  assert.ok(!attention().some(a => a.id === 'revision:' + first.id));
  assert.equal(order.stage, 'Draft');
  UI.me = revised.approver;
  ACT.approve({id:revised.id});
  confirm();
  assert.equal(order.stage, 'Confirmed');

  const contactId = S.people[0].id;
  requestReview('customer',contactId);
  const customerRequest = recordReview('customer',contactId);
  assert.equal(P(contactId).onboarding, 'Pending');
  UI.me = customerRequest.approver;
  ACT.approve({id:customerRequest.id});
  assert.equal(P(contactId).onboarding, 'Approved');
`, context);

console.log('Northstar passes meeting evidence, invitation chase, territory sign-off and resubmission checks.');
