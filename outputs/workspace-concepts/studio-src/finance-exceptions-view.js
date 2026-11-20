import {addFinanceLine,financeExceptionAction,financeAvailableReceipts,financeMatchOptions,financeReleasedOrders} from './finance-exceptions-model.js';
import {escapeHTML,studioButton} from './visuals.js';

const finEsc=escapeHTML;
const financeCurrency=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
const finMoney=pence=>financeCurrency.format(pence/100);
const finField=(label,html)=>'<label class="workbench-field">'+finEsc(label)+html+'</label>';
const finOpts=(items,placeholder,selected)=>'<option value="">'+finEsc(placeholder)+'</option>'+items.map(([id,label])=>'<option value="'+finEsc(id)+'"'+(id===selected?' selected':'')+'>'+finEsc(label)+'</option>').join('');
const finRecord=(id,label)=>studioButton('record',finEsc(label),'small','data-id="'+finEsc(id)+'"');
const finSubmit=(value,label,primary=false)=>'<button type="submit" name="action" value="'+value+'" class="'+(primary?'primary':'small')+'">'+finEsc(label)+'</button>';
const finEvidence=()=>finField('Supporting evidence','<textarea name="evidence" rows="2" required maxlength="1600" placeholder="Record the remittance reference, what you checked and who confirmed it."></textarea>');
const finCaseForm=(c,body)=>'<form class="workbench-form finance-case-form" data-finance-exception="action" data-id="'+finEsc(c.id)+'" data-version="'+c.history.length+'">'+body+'</form>';
function finForms(d,c,role) {
  if(['Closed after review','Reconciled'].includes(c.status))return '';
  if(c.status==='Risk hold'){
    if(role!=='leadership')return '<p class="role-callout">Finance director review is required before this receipt can be allocated.</p>';
    return '<h3>Director review</h3>'+finCaseForm(c,finEvidence()+finField('Bank or processor case reference','<input name="externalRef" placeholder="Required when closing the case">')+'<div class="row-actions">'+finSubmit('retain-hold','Keep on hold')+finSubmit('clear-risk','Clear for Finance',true)+finSubmit('close-risk','Close after external disposition')+'</div>');
  }
  if(role!=='finance')return '<p class="muted">Finance owns the next accounting action.</p>';
  const accounts=d.accounts.filter(a=>!c.accountId || a.id===c.accountId);
  const accountPick=()=>finField('Verified customer','<select name="accountId" required>'+finOpts(accounts.map(a=>[a.id,a.name]),'Choose customer',c.accountId)+'</select>');
  const invoices=financeMatchOptions(d,c),orders=financeReleasedOrders(d,c),receipts=financeAvailableReceipts(d,c);
  const distinct=receipts.length?'<label class="check-label"><input type="checkbox" name="distinct"> I checked the statement and this is a separate payment from the existing receipt of the same amount.</label>':'';
  const followUp=finField('Follow-up date','<input type="date" name="followUp" min="'+finEsc(c.source.date)+'" value="'+finEsc(c.followUp)+'" required>');
  const invoiceOptions=invoices.map(i=>[i.id,i.number+' · '+d.accounts.find(a=>a.id===i.accountId)?.name+' · '+finMoney(i.totalPence-i.paidPence)+' open']);
  const detail=(title,form,open=false)=>'<details class="finance-resolution"'+(open?' open':'')+'><summary>'+finEsc(title)+'</summary>'+form+'</details>';
  return '<h3>Resolve receipt</h3>'+
    (receipts.length?detail('Link an already posted receipt',finCaseForm(c,accountPick()+finField('Receipt in register','<select name="receiptId" required>'+finOpts(receipts.map(r=>[r.id,r.reference+' · '+finMoney(r.amountPence)+' · '+(d.invoices.find(i=>i.id===r.invoiceId)?.number || 'Unallocated')]),'Choose recorded receipt')+'</select>')+finField('Review date if unallocated','<input type="date" name="followUp">')+finEvidence()+finSubmit('link-receipt','Link existing receipt'))):'')+
    detail('Match an existing invoice',invoices.length?finCaseForm(c,accountPick()+finField('Invoice','<select name="invoiceId" required>'+finOpts(invoiceOptions,'Choose invoice')+'</select>')+distinct+finEvidence()+finSubmit('match','Confirm match',true)):'<p>No invoice can accept this payment in full.</p>',true)+
    (orders.length?detail('Create the missing invoice from a released order',finCaseForm(c,accountPick()+finField('Released order','<select name="orderId" required>'+finOpts(orders.map(o=>[o.id,o.name+' · '+finMoney(o.valuePence)]),'Choose released order')+'</select>')+finField('Invoice due date','<input name="dueDate" type="date" min="2026-12-01" max="2027-05-31" required>')+'<label class="check-label"><input type="checkbox" name="checked" required> I checked for an existing invoice and verified the order terms.</label>'+distinct+finEvidence()+finSubmit('order-invoice','Raise invoice and allocate receipt'))):'')+
    (c.status==='Unapplied'?'':detail('Record customer credit without an invoice',finCaseForm(c,'<p>Use when the payer is verified and the invoice or order is still missing. The receipt remains unallocated.</p>'+accountPick()+followUp+distinct+finEvidence()+finSubmit('unapplied','Record unapplied receipt')))+
    detail('Chase missing remittance or order evidence',finCaseForm(c,followUp+finEvidence()+finSubmit('chase','Set follow-up'))))+
    detail('Escalate a suspicious receipt',finCaseForm(c,finEvidence()+finSubmit('escalate','Hold for director review')));
}
function finCaseDetail(d,c,role){
  const src=c.source,account=d.accounts.find(a=>a.id===c.accountId),invoice=d.invoices.find(i=>i.id===c.invoiceId),order=d.opportunities.find(o=>o.id===c.orderId);
  const meta=(name,value)=>'<div><dt>'+finEsc(name)+'</dt><dd>'+finEsc(value)+'</dd></div>';
  const history=c.history.map(h=>'<li><strong>'+finEsc(h.action)+'</strong> · '+finEsc(h.role==='leadership'?'Finance director':'Finance')+'<small>'+finEsc(new Date(h.at).toLocaleString('en-GB',{timeZone:'UTC'}))+' UTC</small><p>'+finEsc(h.evidence)+'</p></li>').join('');
  return '<section class="panel finance-exception-panel" aria-label="Transaction detail"><h2 tabindex="-1" data-finance-focus>'+finEsc(src.payer)+'</h2><dl class="finance-source">'+meta('Amount',finMoney(src.amountPence))+meta('Source',src.origin)+meta('Transaction ID',src.reference)+meta('Statement date',src.date)+meta('Status',c.status)+(c.followUp?meta('Follow-up',c.followUp):'')+'</dl><h3>Source evidence</h3><p>'+finEsc(src.memo || 'No statement memo supplied.')+'</p>'+
    (src.risk?'<p><strong>Risk signal</strong> · '+finEsc(src.risk)+'</p>':'')+
    (c.dispositionRef?'<p><strong>External case</strong> · '+finEsc(c.dispositionRef)+'</p>':'')+
    (account || invoice || order?'<div class="row-actions">'+(account?finRecord(account.id,account.name):'')+(invoice?finRecord(invoice.id,invoice.number):'')+(order?finRecord(order.id,order.name):'')+'</div>':'')+
    finForms(d,c,role)+'<details class="finance-resolution"><summary>Activity history ('+c.history.length+')</summary><ol class="finance-case-history">'+history+'</ol></details></section>';
}
function finNewForm(){
  return '<details class="panel finance-exception-panel"><summary>Record incoming transaction</summary><form class="workbench-form finance-case-form" data-finance-exception="new">'+
    finField('Source','<select name="origin"><option>Bank statement</option><option>Processor settlement</option></select>')+
    finField('Source transaction ID','<input required name="reference" maxlength="120">')+finField('Payer as shown','<input required name="payer" maxlength="160">')+
    finField('Statement date','<input required name="date" type="date">')+finField('Amount (£)','<input required name="amount" type="number" min=".01" step=".01">')+
    finField('Statement memo','<input name="memo" maxlength="800">')+finField('Risk signal, if present','<input name="risk" maxlength="800" placeholder="A signal places the receipt on hold">')+
    finSubmit('new','Record for review',true)+'</form></details>';
}
export function financeExceptionsView(d,state) {
  const role=state.role;
  if(!['finance','leadership'].includes(role))return '';
  const cases=d.financeExceptions;
  const chosen=cases.find(c=>c.id===state.financeException) || cases.find(c=>role==='leadership'?c.status==='Risk hold':c.status==='Needs match') || cases[0];
  const row=c=>'<li>'+studioButton('finance-exception-open','<span><strong>'+finEsc(c.source.payer)+'</strong><small>'+finEsc(c.source.reference)+' · '+finEsc(c.source.date)+'</small></span><span>'+finMoney(c.source.amountPence)+'<small>'+finEsc(c.status)+'</small></span>',c===chosen?'active':'','data-id="'+finEsc(c.id)+'"'+(c===chosen?' aria-current="true"':''))+'</li>';
  return '<header class="page-heading"><div><p class="eyebrow">'+(role==='finance'?'Finance':'Company leadership')+'</p><h1>Transaction exceptions</h1><p>Trace incoming money, resolve missing documents and review risk holds.</p></div></header>'+
    '<div class="finance-exceptions"><aside><section class="panel finance-exception-panel"><h2>Statement lines</h2><ul class="finance-case-list">'+cases.map(row).join('')+'</ul></section>'+(role==='finance'?finNewForm():'')+'</aside>'+(chosen?finCaseDetail(d,chosen,role):'')+'</div>';
}
export function submitFinanceException(d,role,form,submitter){
  const values=Object.fromEntries(new FormData(form));
  if(form.dataset.financeException==='new'){
    if(!/^\d+(?:\.\d{1,2})?$/.test(values.amount))throw new Error('Enter the GBP amount to the nearest penny.');
    const c=addFinanceLine(d,role,{...values,amountPence:Math.round(Number(values.amount)*100)});
    return 'Transaction '+c.source.reference+' recorded for review.';
  }
  return financeExceptionAction(d,role,form.dataset.id,form.dataset.version,submitter?.value,values)+'.';
}

export function financeExceptionRecordPanel(d,role,type,id) {
  if(!['finance','leadership'].includes(role))return '';
  const linkField={accounts:'accountId',invoices:'invoiceId',opportunities:'orderId'}[type];
  const cases=(d.financeExceptions || []).filter(c=>linkField && c[linkField]===id);
  if(!cases.length)return '';
  return '<section><h3>Statement transactions</h3>'+cases.map(c=>'<div class="modal-list"><span>'+finEsc(c.source.reference)+' · '+finMoney(c.source.amountPence)+' · '+finEsc(c.status)+'</span>'+studioButton('finance-exception-open','Open transaction','small','data-id="'+finEsc(c.id)+'"')+'</div>').join('')+'</section>';
}
