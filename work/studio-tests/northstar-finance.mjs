import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../../outputs/workspace-concepts/index.html', import.meta.url), 'utf8');
const classic = html.split('<!-- INDUSTRY_STUDIO_BEGIN -->')[0];
const script = classic.match(/<script>\s*'use strict';([\s\S]+?)readHash\(\);render\(\);\s*<\/script>/)[1];
const context = vm.createContext({
  assert, URL, structuredClone,
  FormData: class {
    constructor(form) { this.fields = form.fields; }
    get(name) { return this.fields[name]; }
  },
  localStorage: {getItem: () => null, setItem() {}},
  document: {
    addEventListener() {}, getElementById() {}, querySelector: () => ({}),
    createElement: () => ({dataset: {}}), head: {appendChild() {}}, documentElement: {dataset: {}}
  },
  window: {addEventListener() {}}, setTimeout() {}
});
vm.runInContext(script, context);
vm.runInContext(`
  nsFinanceDefaults();
  const book = S.commissionBook;
  const all = {period:'all', owner:'', missing:false};
  const forecast = () => nsFinanceTotals(nsFinanceRows(all));
  const form = (nsFinance, id, fields) => ({dataset:{nsFinance, id, rev:String(book.revision)}, fields});
  const rows = nsFinanceRows(all);
  assert.equal(rows.length, S.deals.filter(d => d.stage !== 'Lost').length);
  assert(rows.every(r => Number.isInteger(r.commission) && Number.isInteger(r.weighted)));
  const source = rows.find(r => !r.won && r.bps === 600);
  const deal = source.deal;
  const row = () => nsFinanceRows(all).find(r => r.deal === deal);
  const net = row().net;
  deal.approvedDiscountBps = 1250;
  assert.equal(row().net, Math.round(net * .875));
  assert.equal(row().weighted, Math.round(row().net * deal.prob));
  deal.owner = 'Priya S.';
  assert(nsFinanceRows({...all,owner:'Priya S.'}).some(r => r.deal === deal));
  assert(!nsFinanceRows({...all,owner:'Marco T.'}).some(r => r.deal === deal));
  assert(nsFinanceRows({...all,period:'2000-01'}).length === 0);

  const before = forecast();
  const planned = form('plan','cp1',{name:'Sponsorship',rate:'9.25'});
  assert.throws(() => nsFinanceEdit(form('plan','new',{name:'Sponsorship',rate:'3'})),/already/);
  assert.throws(() => nsFinanceEdit(form('plan','cp1',{name:'Sponsorship',rate:'101'})),/rate/);
  const change = nsFinanceEdit(planned);
  const preview = nsFinanceTotals(nsFinanceRows(all,change.override));
  assert(nsSaveFinance(change));
  assert.deepEqual(forecast(),preview);
  assert(preview.projection > before.projection);
  assert.equal(preview.wonCommission,before.wonCommission);
  assert.equal(preview.won,before.won);
  assert.throws(() => nsFinanceEdit(planned),/changed/);
  const unchanged = book.revision;
  assert.equal(nsSaveFinance(nsFinanceEdit(form('plan','cp1',planned.fields))),false);
  assert.equal(book.revision,unchanged);

  nsSaveFinance(nsFinanceEdit(form('plan','new',{name:'Regional sales',rate:'7.75'})));
  const newPlan = book.plans.find(p => p.name === 'Regional sales');
  const orderedLines = JSON.stringify(S.orders.map(o => o.items));
  const pkg = source.pkg;
  const terms = nsFinanceEdit(form('package',pkg.id,{price:'15999.45',plan:newPlan.id}));
  const packagePreview = nsFinanceTotals(nsFinanceRows(all,terms.override));
  assert(nsSaveFinance(terms));
  assert.equal(pkg.price,1599945);
  assert.equal(row().bps,775);
  assert.equal(row().gross,deal.value);
  assert.equal(JSON.stringify(S.orders.map(o => o.items)),orderedLines);
  assert.deepEqual(forecast(),packagePreview);
  assert.equal(forecast().wonCommission,before.wonCommission);
  deal.commissionPackageId = '';
  assert(nsFinanceRows({...all,missing:true}).some(r => r.deal === deal && !r.commission));
  const exception = () => attention().find(a => a.id === 'commission:'+deal.id);
  assert.equal(exception().go.id,deal.id);
  assert.equal(exception().go.route,'deals');
  deal.commissionPackageId = pkg.id;
  assert.equal(exception(),undefined);
  deal.commissionPackageId = '';
  UI.me = 'Priya S.';
  assert.equal(exception(),undefined);
  assert.throws(() => nsFinanceEdit(form('plan','new',{name:'Test',rate:'2'})),/Finance or Leadership/);
  assert(nsFinanceRows(all).every(r => r.owner === UI.me));
`, context);
console.log('Northstar commission terms, role scopes, net forecasts, historical wins and order prices passed.');
