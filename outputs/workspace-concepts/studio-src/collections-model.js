export const COLLECTION_DAY='2026-11-20';
export const COLLECTION_ACTIONS={
  reminder:'Prepare reminder draft',chase:'Log completed chase',promise:'Record promise to pay',
  dispute:'Open dispute',resolve:'Resolve dispute',followup:'Schedule follow-up',query:'Log supplier or internal query'
};
const collectionTrim=v=>String(v??'').trim();
function collectionDate(value){
  const n=Date.parse(value+'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(n) && new Date(n).toISOString().slice(0,10)===value;
}
function collectionOffsetDay(days){return new Date(Date.parse(COLLECTION_DAY+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);}
export function collectionOpenAmount(record){
  return Math.max(0,(record.totalPence??record.amountPence)-(record.paidPence||0));
}
export function collectionDueDate(r){
  if(r.dueDate || r.due)return r.dueDate||r.due;
  if(r.overdueDays)return collectionOffsetDay(-r.overdueDays);
  if(Number.isInteger(r.dueMonth))return new Date(Date.UTC(2026,10+r.dueMonth,20)).toISOString().slice(0,10);
  return '';
}
export function initializeCollections(d){
  d.invoices.forEach((r,i)=>{
    r.dueDate||=collectionDueDate(r);
    r.financeOwner||=d.team[(i%2)+6].name;
    if(d.id==='events')r.eventId||=d.domain.find(x=>x.accountId===r.accountId)?.id;
  });
  d.bills.forEach((r,i)=>{
    r.number||='SUP-'+(701+i);
    r.financeOwner||=d.team[4+i%2].name;
    if(d.id==='events')r.eventId||=d.domain[i%d.domain.length].id;
  });
  if(d.id==='events'){
    const examples=[
      [d.invoices[6], 'promise','The event sponsor confirmed a part payment for the venue deposit.','Check the promised remittance.'],
      [d.invoices[12],'dispute','The sponsor queried the second delegate package on the invoice.','Check the signed delegate allocation.'],
      [d.bills[1],'query','The venue coordinator requested a copy of the agreed catering schedule.','Chase the venue coordinator for the schedule.']
    ];
    for(const [r,action,note,nextAction] of examples){
      if(!r||r.collection||!collectionOpenAmount(r))continue;
      const lastDay='2026-11-16';
      recordCollectionAction(d,'finance',r.id,{action,note,nextAction,owner:r.financeOwner,channel:'Email',
        nextDue:action==='promise'?'2026-11-19':'2026-11-20',promiseDate:'2026-11-19',promiseAmount:'100'},0,lastDay);
      r.collection.history[0].at=lastDay+'T10:00:00Z';d.activity[0].at=r.collection.history[0].at;
    }
  }
  return d;
}
export function collectionSource(d,id){
  return d.invoices.find(r=>r.id===id) || d.bills.find(r=>r.id===id);
}
export function collectionState(r,today=COLLECTION_DAY){
  const c=r.collection||{};
  if(!collectionOpenAmount(r))return 'Settled';
  if(c.dispute)return 'Disputed';
  if(outstandingPromise(r))return c.promise.date<today?'Promise overdue':'Promised to pay';
  if(c.nextDue && c.nextDue<=today)return 'Follow-up due';
  if(collectionDueDate(r) && collectionDueDate(r)<today)return 'Overdue';
  return 'Open';
}
export function collectionAvailableActions(r,today=COLLECTION_DAY){
  if(!collectionOpenAmount(r))return [];
  const supplier=r.amountPence!=null;
  const actions=supplier?['query','followup']:['chase','followup','promise'];
  if(!supplier && !(outstandingPromise(r) && r.collection.promise.date>=today))actions.unshift('reminder');
  if(!r.collection?.dispute)return [...actions,'dispute'];
  return [...(supplier?['query']:['chase']),'followup','resolve'];
}
export function recordCollectionAction(d,role,id,input,revision,today=COLLECTION_DAY){
  if(role!=='finance')throw new Error('Use the Finance desk to update collection follow-ups.');
  const r=collectionSource(d,id);
  if(!r)throw new Error('Invoice not found.');
  if(!collectionOpenAmount(r))throw new Error('This invoice is settled.');
  const c=r.collection||{history:[]};
  const action=collectionTrim(input.action),note=collectionTrim(input.note),owner=collectionTrim(input.owner),nextDue=collectionTrim(input.nextDue);
  const nextAction=collectionTrim(input.nextAction);
  const channel=['chase','query'].includes(action)?collectionTrim(input.channel):'';
  const promiseDate=action==='promise'?collectionTrim(input.promiseDate):'';
  const amountText=action==='promise'?collectionTrim(input.promiseAmount):'';
  const signature=JSON.stringify([action,note,owner,nextAction,nextDue,channel,promiseDate,amountText,today]);
  const rev=c.history.length;
  if(!Number.isInteger(Number(revision)) || String(revision??'').trim()==='')throw new Error('Reopen the record to load its current revision.');
  if((rev!==Number(revision) && c.history[Number(revision)]?.signature===signature) || c.history.at(-1)?.signature===signature)return {record:r,duplicate:true};
  if(rev!==Number(revision))throw new Error('This invoice changed. Reopen it before saving.');
  if(!collectionAvailableActions(r,today).includes(action))throw new Error('This action is unavailable for the current invoice state.');
  if(!d.team.some(t=>t.name===owner))throw new Error('Choose the person responsible for the next action.');
  if(!collectionDate(nextDue)||nextDue<today)throw new Error('Choose a follow-up date today or later.');
  if(!nextAction)throw new Error('Describe the next action for the assigned owner.');
  if(!note)throw new Error('Add the message, outcome or reason for this action.');
  if(['chase','query'].includes(action) && !['Email','Phone','Meeting','Internal review'].includes(channel))throw new Error('Choose how you contacted the customer, supplier or colleague.');
  const amountPence=Math.round(Number(amountText)*100);
  if(action==='promise'){
    if(!collectionDate(promiseDate)||promiseDate<today||nextDue<promiseDate)throw new Error('Choose a promise date today or later and a follow-up on or after it.');
    if(!/^\d+(\.\d{1,2})?$/.test(amountText)||!Number.isSafeInteger(amountPence)||amountPence<=0||amountPence>collectionOpenAmount(r))throw new Error('Enter a promise amount up to the outstanding balance.');
  }
  const event={action,label:COLLECTION_ACTIONS[action],owner,nextAction,nextDue,note,channel,at:new Date().toISOString(),signature};
  if(action==='dispute'){
    c.dispute=note;delete c.promise;
    if(r.paymentAuthorisation)r.paymentAuthorisation.status='On hold for supplier dispute';
  }
  if(action==='resolve')delete c.dispute;
  if(action==='promise'){c.promise={date:promiseDate,amountPence,paidAtPromise:r.paidPence||0};event.promise={...c.promise};}
  if(action==='reminder')event.draft={subject:'Reminder for invoice '+r.number,body:note};
  c.owner=owner;c.nextDue=nextDue;c.history.push(event);r.collection=c;
  d.activity.unshift({action:event.label,recordId:id,accountId:r.accountId||null,detail:[r.number,channel,note,'Follow up '+nextDue+' · '+owner].filter(Boolean).join(' · '),at:event.at,actor:'Finance'});
  return {record:r,duplicate:false};
}
export function outstandingPromise(r){
  const p=r.collection?.promise;
  return p?Math.max(0,Math.min(collectionOpenAmount(r),p.amountPence-Math.max(0,(r.paidPence||0)-p.paidAtPromise))):0;
}
export function collectionAttentionDue(r,today=COLLECTION_DAY){
  const c=r.collection||{};
  return outstandingPromise(r) && c.promise.date<today?c.promise.date:c.nextDue||collectionDueDate(r);
}
export function collectionsAlerts(d,today=COLLECTION_DAY){
  return [...d.invoices,...d.bills].flatMap(r=>{
    if(!collectionOpenAmount(r))return [];
    const c=r.collection||{},supplier=r.amountPence!=null, due=collectionAttentionDue(r,today);
    const overduePromise=outstandingPromise(r)>0 && c.promise.date<today;
    if(!due || due>today)return [];
    const title=overduePromise?'Review overdue payment promise':c.dispute?'Follow up disputed '+(supplier?'supplier bill':'invoice'):
      c.nextDue?'Invoice follow-up due':supplier?'Supplier invoice due':'Customer invoice due';
    const source=supplier?r.supplier:d.accounts.find(a=>a.id===r.accountId)?.name;
    return [{id:'collections-'+r.id,recordId:r.id,title,detail:[r.number,source,c.history?.at(-1)?.nextAction].filter(Boolean).join(' · '),owner:c.owner||r.financeOwner,due,
      severity:overduePromise || due<today?'urgent':'warning',revision:c.history?.length||0}];
  });
}
export function approveCollectionBill(d,id){
  const bill=d.bills.find(r=>r.id===id);
  if(!bill)throw new Error('Supplier invoice not found.');
  if(bill.collection?.dispute)throw new Error('Resolve the supplier dispute before payment review.');
  if(bill.status==='Approved')return false;
  bill.status='Approved';
  d.activity.unshift({action:'Supplier invoice approved for payment review',recordId:id,detail:bill.number,at:new Date().toISOString()});
  return true;
}
