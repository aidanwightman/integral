const finRoles={finance:'Finance',leadership:'Finance director'};
const finFinal=new Set(['Reconciled','Closed after review']);
const finClean=v=>String(v??'').trim();
const finKey=v=>finClean(v).toLowerCase();
function finDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const t=new Date(v+'T12:00:00Z');return !Number.isNaN(t.valueOf()) && t.toISOString().slice(0,10)===v;}
function finStamp(c,role,action,evidence) {
  c.history.push({status:c.status,at:new Date().toISOString(),role,action,evidence});
}
export function openFinancePeriodCases(d,period) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))return [];
  return (d.financeExceptions || []).filter(c=>c.source.date.slice(0,7)===period && !finFinal.has(c.status));
}

export function financeExceptionAlerts(d,role) {
  return (d.financeExceptions||[]).filter(c=>!finFinal.has(c.status) && (c.status==='Risk hold'?'leadership':'finance')===role).map(c=>({
    id:c.id,financeExceptionId:c.id,revision:c.history.length,severity:c.status==='Risk hold'?'urgent':'warning',
    title:c.status==='Risk hold'?'Review suspicious receipt':c.status==='Unapplied'?'Allocate customer credit':c.status==='Awaiting evidence'?'Follow up missing remittance':'Investigate unmatched receipt',
    owner:finRoles[role],detail:c.source.payer+' · '+c.source.reference+' · '+c.status,due:c.followUp || undefined
  }));
}
export function addFinanceLine(d,role,input) {
  if(role!=='finance')throw new Error('Finance records statement lines.');
  const reference=finClean(input.reference),payer=finClean(input.payer),date=finClean(input.date),origin=finClean(input.origin);
  if(!payer || !reference || !finDate(date) || !['Bank statement','Processor settlement'].includes(origin))throw new Error('Enter a valid statement date, source transaction ID, payer and source.');
  const amountPence=input.amountPence;
  if(!Number.isSafeInteger(amountPence) || amountPence<=0) throw new Error('Enter a positive GBP amount with up to two decimal places.');
  if(d.financeExceptions.some(c=>c.source.origin===origin && finKey(c.source.reference)===finKey(reference)))throw new Error('This source transaction ID is already in the queue.');
  const risk=finClean(input.risk);
  const c={id:d.id+'-finance-exception-'+(d.financeExceptions.length+1),
    source:{origin,reference,payer,date,amountPence,memo:finClean(input.memo),risk},status:risk?'Risk hold':'Needs match',history:[]};
  finStamp(c,role,risk?'Flagged for review':'Statement line recorded',risk || 'No accounting entry posted.');
  d.financeExceptions.unshift(c);return c;
}
export function initializeFinanceExceptions(d) {
  if(Array.isArray(d.financeExceptions))return d;
  d.financeExceptions=[];
  const invoice=d.invoices.find(i=>i.totalPence>i.paidPence),account=d.accounts.find(a=>a.id===invoice.accountId);
  addFinanceLine(d,'finance',{origin:'Bank statement',reference:'BANK-6417',date:'2026-11-19',payer:account.name,
    amountPence:invoice.totalPence-invoice.paidPence,memo:'Services payment. Remittance advice names '+invoice.number+'.'});
  addFinanceLine(d,'finance',{origin:'Bank statement',reference:'BANK-6422',date:'2026-11-20',payer:'Group Treasury Services',
    amountPence:92500,memo:'Group transfer. No purchasing entity, order number or invoice supplied.'});
  addFinanceLine(d,'finance',{origin:'Processor settlement',reference:'PSP-7831',date:'2026-11-20',payer:'Meridian Purchasing',
    amountPence:241000,memo:'Card settlement batch 1120A.',risk:'The payer differs from the named customer. The request to return funds supplies new bank details.'});
  return d;
}
function financePriorReceipt(d,c) {
  return d.depth.receipts.find(r=>r.sourceLineId===c.id || (!r.sourceLineId && finKey(r.reference)===finKey(c.source.reference)));
}
export function financeAvailableReceipts(d,c) {
  return d.depth.receipts.filter(r=>{
    const accountId=r.accountId || d.invoices.find(i=>i.id===r.invoiceId)?.accountId;
    return !r.sourceLineId && r.amountPence===c.source.amountPence && (!c.accountId || c.accountId===accountId);
  });
}
export function financeMatchOptions(d,c) {
  const prior=financePriorReceipt(d,c),amount=c.source.amountPence;
  return d.invoices.filter(i=>(!c.accountId || i.accountId===c.accountId) && (prior?.invoiceId===i.id || i.totalPence-i.paidPence>=amount));
}
function confirmedAccount(d,id) {
  const a=d.accounts.find(a=>a.id===id);
  if(!a)throw new Error('Identify the paying customer using the remittance evidence.');
  return a;
}
export function financeReleasedOrders(d,c) {
  return d.opportunities.filter(o=>{
    const account=d.accounts.find(a=>a.id===o.accountId);
    const signoff=d.approvalRequests.find(r=>r.type==='order' && r.targetId===o.id);
    return account && (!account.onboardingStatus || account.onboardingStatus==='Active customer') &&
      signoff?.status==='approved' && signoff.valuePence===o.valuePence && signoff.accountId===o.accountId &&
      o.orderStatus==='Released to fulfilment' && o.probability===1 && (!c.accountId || c.accountId===o.accountId) &&
      o.valuePence>=c.source.amountPence && !d.invoices.some(i=>i.orderId===o.id);
  });
}
function financePost(d,c,invoice,account,evidence,values={}) {
  const amount=c.source.amountPence, exact=financePriorReceipt(d,c), prior=values.receipt || exact;
  if(exact && prior!==exact)throw new Error('The source reference already identifies a different receipt. Review the discrepancy.');
  const possible=financeAvailableReceipts(d,c).some(r=>r.accountId===account.id || d.invoices.find(i=>i.id===r.invoiceId)?.accountId===account.id);
  if(!prior && possible && !values.distinct) throw new Error('A posted receipt for this customer has the same amount. Link it, or confirm a separate statement payment.');
  if(prior && (prior.amountPence!==amount || (prior.invoiceId && prior.invoiceId!==invoice?.id) || (prior.accountId && prior.accountId!==account.id)))
    throw new Error('An existing receipt uses this reference with different details. Escalate the discrepancy.');
  if(invoice && (invoice.accountId!==account.id || (prior?.invoiceId!==invoice.id && invoice.totalPence-invoice.paidPence<amount)))
    throw new Error('The invoice must belong to this customer and cover the unallocated amount.');
  if(!invoice && prior?.invoiceId)throw new Error('This payment is already allocated. Match the existing receipt.');
  if(prior && prior.sourceLineId && prior.sourceLineId!==c.id)throw new Error('This receipt is linked to another statement line.');
  const receipt=prior || {id:c.id+'-receipt',reference:c.source.reference,amountPence:amount};
  if(!prior){d.openingCashPence+=amount;d.depth.receipts.push(receipt);}
  if(invoice && !receipt.invoiceId){
    invoice.paidPence+=amount;
    if(invoice.totalPence===invoice.paidPence){invoice.status='Paid';invoice.overdueDays=0;}
    receipt.invoiceId=invoice.id;
  }
  Object.assign(receipt,{accountId:account.id,sourceLineId:c.id,status:invoice?(prior?.status==='Reconciled'?'Reconciled':'Allocated'):'Unapplied'});
  Object.assign(c,{accountId:account.id,invoiceId:invoice?.id,receiptId:receipt.id,status:invoice?'Reconciled':'Unapplied'});
  if(invoice)delete c.followUp;
  finStamp(c,'finance',invoice?'Matched to '+invoice.number:'Recorded unapplied customer credit',evidence);
  d.activity.unshift({recordId:invoice?.id || account.id,accountId:account.id,action:invoice?'Receipt reconciled':'Unapplied receipt recorded',detail:c.source.reference+' · '+evidence,at:c.history.at(-1).at});
}
export function financeExceptionAction(d,role,id,revision,action,values={}) {
  const c=d.financeExceptions.find(x=>x.id===id);
  if(!c || String(revision)!==String(c.history.length))throw new Error('This exception has changed. Review the latest history.');
  if(finFinal.has(c.status))throw new Error('This exception is already closed.');
  const evidence=finClean(values.evidence);
  if(!evidence)throw new Error('Record the supporting evidence or reason for this action.');
  if(c.status==='Risk hold'){
    if(role!=='leadership' || !['clear-risk','retain-hold','close-risk'].includes(action))throw new Error('A finance director must decide the risk hold before Finance can allocate this receipt.');
    if(action==='clear-risk')c.status=c.heldFrom || 'Needs match';
    if(action==='close-risk'){
      if(c.receiptId)throw new Error('An accounting receipt already exists. Keep the hold open for Finance to review the entry.');
      if(!finClean(values.externalRef))throw new Error('Record the bank or processor case reference for disposition.');
      c.dispositionRef=finClean(values.externalRef);c.status='Closed after review';
    }
    finStamp(c,role,{'clear-risk':'Risk cleared for Finance','retain-hold':'Hold retained','close-risk':'Closed with bank or processor disposition'}[action],evidence);
    return c.status;
  }
  if(role!=='finance')throw new Error('Finance owns matching and allocation.');
  if(action==='escalate'){
    c.heldFrom=c.status;c.status='Risk hold';finStamp(c,role,'Escalated to finance director',evidence);return c.status;
  }
  if(action==='chase'){
    if(c.status==='Unapplied')throw new Error('This receipt is already recorded as customer credit.');
    if(!finDate(values.followUp) || values.followUp<c.source.date)throw new Error('Set a follow-up date on or after the transaction date.');
    c.followUp=values.followUp;c.status='Awaiting evidence';finStamp(c,role,'Requested remittance or order evidence',evidence);return c.status;
  }
  if(!['match','link-receipt','unapplied','order-invoice'].includes(action))throw new Error('Choose a valid resolution.');
  const account=confirmedAccount(d,values.accountId);
  if(c.accountId && c.accountId!==account.id)throw new Error('Use the customer already identified for this receipt.');
  if(action==='link-receipt'){
    const prior=financeAvailableReceipts(d,c).find(r=>r.id===values.receiptId);
    if(!prior)throw new Error('Choose an unlinked receipt of the same amount.');
    const invoice=d.invoices.find(i=>i.id===prior.invoiceId);
    if((prior.invoiceId && !invoice) || (prior.accountId || invoice?.accountId)!==account.id)throw new Error('The posted receipt must belong to the verified customer.');
    if(!invoice && (!finDate(values.followUp) || values.followUp<c.source.date))throw new Error('Set the next allocation review date for the unallocated credit.');
    financePost(d,c,invoice,account,evidence,{receipt:prior});
    if(!invoice)c.followUp=values.followUp;
  } else if(action==='unapplied'){
    if(c.receiptId)throw new Error('This receipt is already recorded.');
    if(!finDate(values.followUp) || values.followUp<c.source.date)throw new Error('Set the next allocation review date.');
    financePost(d,c,null,account,evidence,values);
    c.followUp=values.followUp;
  } else if(action==='match'){
    const invoice=d.invoices.find(i=>i.id===values.invoiceId);
    if(!invoice)throw new Error('Choose an existing invoice to match.');
    financePost(d,c,invoice,account,evidence,values);
  } else {
    const order=financeReleasedOrders(d,c).find(o=>o.id===values.orderId && o.accountId===account.id);
    if(!order || !values.checked)throw new Error('Choose a released customer order and confirm that you checked for an existing invoice.');
    const dueDate=finClean(values.dueDate);
    if(!finDate(dueDate) || dueDate<'2026-12-01' || dueDate>'2027-05-31')throw new Error('Choose the agreed due date inside the December to May forecast.');
    const dueMonth=(Number(dueDate.slice(5,7))%12)+1;
    const financeOwner=d.team[6].name;
    const eventId=d.id==='events'?d.domain.find(x=>x.accountId===account.id)?.id:undefined;
    const invoice={id:c.id+'-invoice',orderId:order.id,accountId:account.id,number:'INV-ORD-'+c.id.split('-').at(-1),totalPence:order.valuePence,paidPence:0,dueMonth,dueDate,financeOwner,...(eventId?{eventId}:{}),overdueDays:0,status:'Open'};
    financePost(d,c,invoice,account,evidence,values);
    d.invoices.push(invoice);c.orderId=order.id;
  }
  return c.status;
}
