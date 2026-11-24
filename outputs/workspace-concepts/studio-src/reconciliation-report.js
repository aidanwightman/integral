import {collectionMoney} from './collections-views.js';
import {outcomeSnapshot} from './outcomes-model.js';
import {escapeHTML,studioButton} from './visuals.js';

const reportEscape=escapeHTML;
const reportAmount=collectionMoney;

function reportFacts(pairs){
  return '<dl class="reconciliation-facts">'+pairs.map(([label,value])=>
    '<div><dt>'+reportEscape(label)+'</dt><dd>'+reportEscape(value)+'</dd></div>'
  ).join('')+'</dl>';
}

export function statementReconciliation(d){
  const rows=d.financeExceptions.map(line=>{
    const receipt=d.depth.receipts.find(r=>r.sourceLineId===line.id || r.id===line.receiptId);
    const invoice=receipt && d.invoices.find(i=>i.id===receipt.invoiceId);
    return {line,receipt,invoice};
  });
  const totals={statement:0,allocated:0,unapplied:0,unposted:0};
  for(const {line,receipt,invoice} of rows){
    totals.statement+=line.source.amountPence;
    if(receipt)totals[invoice?'allocated':'unapplied']+=receipt.amountPence;
    totals.unposted+=line.source.amountPence-(receipt?.amountPence||0);
  }
  const linked=new Set(rows.map(r=>r.receipt?.id));
  return {rows,totals,otherReceipts:d.depth.receipts.filter(r=>!linked.has(r.id))};
}

function statementReport(d){
  const {rows,totals,otherReceipts}=statementReconciliation(d);
  const cases=rows.map(({line,receipt,invoice})=>{
    const source=line.source;
    const open=studioButton('finance-exception-open','Open transaction','small','data-id="'+reportEscape(line.id)+'" aria-label="Open transaction '+reportEscape(source.reference)+'"');
    const invoiceLink=invoice?studioButton('record',reportEscape(invoice.number),'text-button record-link','data-id="'+reportEscape(invoice.id)+'"'):'';
    const amounts=[['Statement amount',reportAmount(source.amountPence)],['Allocated to invoice',reportAmount(invoice?receipt.amountPence:0)]];
    if(receipt)amounts.push(['Receipt reference',receipt.reference]);
    if(invoice)amounts.push(['Invoice outstanding',reportAmount(invoice.totalPence-invoice.paidPence)]);
    else if(receipt)amounts.push(['Unapplied credit',reportAmount(receipt.amountPence)]);
    return '<article class="reconciliation-line"><header><div><h3>'+reportEscape(source.reference)+'</h3><p>'+reportEscape(source.payer)+' · '+reportEscape(source.date)+'</p></div><span class="pill">'+reportEscape(line.status)+'</span></header>'+
      reportFacts(amounts)+
      (source.memo?'<p>'+reportEscape(source.memo)+'</p>':'')+
      (line.followUp?'<p>Next review · '+reportEscape(line.followUp)+'</p>':'')+
      '<footer>'+open+(invoiceLink?'<span>Invoice '+invoiceLink+'</span>':'')+'</footer></article>';
  }).join('');
  const unlinked=otherReceipts.map(receipt=>{
    const invoice=d.invoices.find(i=>i.id===receipt.invoiceId);
    return '<li><strong>'+reportEscape(receipt.reference)+'</strong> · '+reportAmount(receipt.amountPence)+' · '+reportEscape(receipt.status)+
      (receipt.bankRef?' · Bank reference '+reportEscape(receipt.bankRef):'')+
      (invoice?' · '+studioButton('record',reportEscape(invoice.number),'text-button record-link','data-id="'+reportEscape(invoice.id)+'"'):'')+'</li>';
  }).join('');
  return '<section class="panel reconciliation-summary"><h2>Statement totals</h2><p>'+rows.length+' imported statement '+(rows.length===1?'line':'lines')+' for '+reportEscape(d.config.brand)+'.</p>'+
    reportFacts([['Statement amount',reportAmount(totals.statement)],['Allocated to invoices',reportAmount(totals.allocated)],['Unapplied credit',reportAmount(totals.unapplied)],['Without a posted receipt',reportAmount(totals.unposted)]])+
    '</section><section class="panel reconciliation-lines"><h2>Statement lines</h2>'+cases+'</section>'+
    (unlinked?'<section class="panel reconciliation-lines"><h2>Other recorded receipts</h2><p>These register entries have no linked line in the statement totals above.</p><ul>'+unlinked+'</ul></section>':'');
}

function partialPaymentReport(d){
  const snapshot=outcomeSnapshot(d,'receivable');
  const {bank,remittance,receipt,invoice,allocation}=snapshot.receivable;
  const amount=allocation?.amountPence||0;
  const disposition=allocation?'Allocated to '+invoice.number:receipt?'Available to allocate':'Awaiting import';
  const workflow=studioButton('reconciliation-workflow','Open partial payment','small');
  const owner=d.outcomePractice.cases.receivable.disputeOwner;
  return '<section class="panel reconciliation-summary"><h2>Partial payment</h2><p>'+reportEscape(bank.payer)+' · '+reportEscape(bank.date)+'</p>'+
    reportFacts([['Bank transaction',reportAmount(bank.amountPence)],['Receipts recorded',receipt?'1':'0'],['Allocated to invoice',reportAmount(amount)],['Available to allocate',reportAmount((receipt?.amountPence||0)-amount)]])+
    '</section><section class="panel reconciliation-lines"><div class="reconciliation-heading"><h2>Payment and invoice</h2><span class="pill">'+reportEscape(disposition)+'</span></div>'+
    reportFacts([['Bank reference',bank.reference],['Remittance reference',remittance.reference],['Receipt number',receipt?.id||'Awaiting import'],['Invoice number',invoice.number],['Invoice total',reportAmount(invoice.totalPence)],['Invoice outstanding',reportAmount(invoice.outstandingPence)]])+
    (allocation?'<p>The payer disputes '+reportAmount(remittance.disputedPence)+'. '+(owner?'Assigned to '+reportEscape(owner)+'.':'A follow-up owner is needed.')+'</p>':'')+
    workflow+'</section>';
}

export function reconciliationReport(d,state){
  const practice=state.reconciliationLedger==='practice';
  const scopes=[['statement','Workspace statement'],['practice','Partial payment demo']];
  const controls=scopes.map(([key,label])=>studioButton('reconciliation-open',label,'small','data-ledger="'+key+'" aria-pressed="'+(practice===(key==='practice'))+'"')).join('');
  return '<header class="page-heading"><div><p class="eyebrow">Finance</p><h1 tabindex="-1" id="reconciliation-title">Reconciliation report</h1></div></header>'+
    '<div class="reconciliation-report"><div class="row-actions reconciliation-scope" role="group" aria-label="Report source">'+controls+'</div>'+
    (practice?partialPaymentReport(d):statementReport(d))+'</div>';
}
