import {CALL_OUTCOMES, logCompletedCall, salesEvent, scheduleSalesCall} from './calling.js';
import {parseWorkspaceDateTime} from './workspace-date.js';
/* Synthetic practice ledger. Sam's follow-up links to the workspace's contact and call records. */
const outcomeDefinitions=[
 ['followup','sales','Follow up with Sam Carter','On the setup call, Sam asked you to email him a product overview.','Product overview delivered','Sales representative','dialer',['Add Sam’s email','Send the overview','Check delivery']],
 ['receivable','finance','Partial payment','A short receipt can be mistaken for a settled invoice.','Partial payment allocated','Receivables owner','collections',['Review the bank transaction','Match the customer payment','Assign the disputed balance']],
 ['coverage','people','Leave & coverage','Approval without checking cover leaves work unstaffed.','Leave cancelled; balance restored','People coordinator','leave',['Choose available cover','Approve leave','Cancel and restore once']],
 ['delivery','operations','Delivery handoff','Unresolved scope and unacknowledged handoffs delay billing.','Finance handoff confirmed','Delivery manager','control',['Resolve scope blocker','Record customer acceptance','Finance acknowledges']],
 ['payable','finance','Payment approval','Quantity mismatch and changed bank details can bypass informal approval.','Payment authorised — unpaid','Accounts payable owner','collections',['Verify changed bank details','Match bill to goods receipt','Authorise the payment run']],
 ['leadership','leadership','Management review','Stale snapshots invite confident but unsupported decisions.','Management review recorded','Company leader','company',['Refresh source records','Review evidence and decision']]
];
export const OUTCOME_SCENARIOS=outcomeDefinitions.map(([id,role,title,pain,outcome,owner,sourceView,titles])=>({id,role,title,pain,outcome,owner,sourceView,steps:titles.map((title,i)=>({id:`${id}-${i+1}`,title}))}));
const outcomeSpec=id=>{const s=OUTCOME_SCENARIOS.find(s=>s.id===id);if(!s)throw new Error('Unknown guided practice scenario.');return s;};
const outcomeFixtures={followup:{email:'',deliveries:0,attempts:0,provider:'Not attempted',call:'Positive conversation',next:'Send agreed product overview',receipt:''},receivable:{invoiceId:'INV-104',remittanceInvoice:'INV-104',invoicePence:1200000,receiptPence:1000000,allocatedPence:0,disputedPence:200000,imported:false,reference:'BANK-104',disputeOwner:''},coverage:{balance:80,requested:16,cover:'',approved:false,cancelled:false},delivery:{blocked:true,resolution:'',acceptance:'',financeNote:'',financeAcknowledged:false},payable:{receiptBillId:'BILL-104',billedUnits:100,receivedUnits:80,unitPence:10000,bankVerified:false,approvedPence:0,authorized:false,paidPence:0},leadership:{fresh:false,decision:'',sources:[],savings:null}};
function outcomeSeed(id){
 const firstEvent=id==='followup'
  ?{action:'Setup call logged',detail:'Sam asked for a product overview by email.'}
  :{action:'Practice opened',detail:'Synthetic fixture. No external calls, messages, payments or operational balance changes.'};
 return {id,revision:0,stage:0,status:'Needs action',complete:false,...structuredClone(outcomeFixtures[id]),history:[{at:'2026-11-17T09:00:00.000Z',...firstEvent}]};
}
export function ensureOutcomes(d){if(!d||typeof d!=='object')throw new Error('A dataset is required.');if(!d.outcomePractice)d.outcomePractice={version:1,cases:{}};for(const s of OUTCOME_SCENARIOS)if(!d.outcomePractice.cases[s.id])d.outcomePractice.cases[s.id]=outcomeSeed(s.id);return d.outcomePractice;}
export function resetOutcome(d,id){
 outcomeSpec(id);
 const cases=ensureOutcomes(d).cases;
 if(id==='followup'&&cases[id].followupRecordData){
  for(const [key,rows] of Object.entries(followupLinkedRows(d,cases[id]))){
   if(!rows.length)continue;
   const removed=new Set(rows);
   d[key]=d[key].filter(row=>!removed.has(row));
  }
 }
 cases[id]={...outcomeSeed(id),revision:(cases[id].revision||0)+1};
 return 'This synthetic practice was reset; other scenarios are unchanged.';
}
export const outcomeMoney=p=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:p%100?2:0,maximumFractionDigits:2}).format(p/100);
const outcomeField=(key,label,type='text',options)=>({key,label,type,...(options?{options:options.map(([value,label])=>({value,label}))}:{})});
const outcomeActionDef=(id,label,fields=[],kind='primary')=>({id,label,kind,fields});
const outcomeMetric=(label,value,note)=>({label,value:String(value),note});
const followupStates=['Email needed','Ready to send','Delivery pending','Delivered'];
const followupMessageId='CALL-104/FOLLOWUP';
function followupOverview(email){
 return {to:email,subject:'Product overview',body:'Hi Sam, Integral links each customer call to its next step. Your team can see who owns the pitch, what the buyer asked for and when to follow up. Which part would you like to see on our next call?'};
}
function followupDeliveryEvent(email){
 return {messageId:followupMessageId,recipient:email,receipt:'DEMO-ACK-104'};
}
const followupChannels=['Email','Phone','Meeting'];
function followupContact(d){
 return d.contacts?.find(person=>person.id===d.id+'-contact0');
}
// Keep a booking, any subsequent recorded call, and its generated tasks or messages together.
export function followupLinkedRows(d,current){
 const links=current.followupRecordData,sam=d.id+'-contact0';
 const taskIds=new Set(links?.bookingIds||[]),callIds=new Set(links?.callIds||[]);
 let count;
 do{
  count=taskIds.size+callIds.size;
  for(const call of d.calls||[])if(call.contactId===sam&&taskIds.has(call.scheduledTaskId))callIds.add(call.id);
  for(const task of d.salesTasks||[])if(task.contactId===sam&&callIds.has(task.source))taskIds.add(task.id);
 }while(count!==taskIds.size+callIds.size);
 const salesTasks=(d.salesTasks||[]).filter(t=>t.contactId===sam&&taskIds.has(t.id));
 const calls=(d.calls||[]).filter(call=>call.contactId===sam&&callIds.has(call.id));
 const callJobs=(d.callJobs||[]).filter(job=>job.contactId===sam&&callIds.has(job.callId));
 const emailOutbox=(d.emailOutbox||[]).filter(mail=>mail.contactId===sam&&callIds.has(mail.callId));
 const emailIds=new Set(emailOutbox.map(mail=>mail.id));
 const ids=new Set([...salesTasks,...calls,...callJobs,...emailOutbox].map(row=>row.id));
 const related=event=>ids.has(event.recordId)||(event.recordId===sam&&event.relatedId&&(ids.has(event.relatedId)||(event.followupMessageId===followupMessageId&&event.relatedId===links?.receipt?.id)));
 return {salesTasks,calls,callJobs,emailOutbox,outreach:(d.outreach||[]).filter(row=>emailIds.has(row.id)),salesActivity:(d.salesActivity||[]).filter(related),activity:(d.activity||[]).filter(related)};
}
export function followupRecord(d){
 const c=ensureOutcomes(d).cases.followup,contact=followupContact(d),data=c.followupRecordData;
 const bookings=(d.salesTasks||[]).filter(t=>t.contactId===contact?.id&&data?.bookingIds.includes(t.id));
 const completed=new Set([...data?.callIds||[],...bookings.map(t=>t.completedCallId).filter(Boolean)]);
 const calls=(d.calls||[]).filter(call=>call.contactId===contact?.id&&completed.has(call.id));
 return structuredClone({
  contactId:contact?.id||null,accountId:contact?.accountId||null,ownerId:contact?.ownerId||null,canSchedule:Boolean(contact?.callAllowed),
  messageId:c.stage>=2?followupMessageId:null,ownerOptions:(d.team||[]).map(person=>({value:person.id,label:person.name})),
  timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,contactTimeZone:contact?.timezone,
  channelOptions:followupChannels,outcomeOptions:CALL_OUTCOMES,receipt:data?.receipt||null,
  bookings,calls:calls.map(call=>({...call,bookingId:call.scheduledTaskId||''})),history:c.history
 });
}
function followupApplication(d){
 const c=ensureOutcomes(d).cases.followup,contact=followupContact(d);
 if(!contact)throw new Error('Open the follow-up in Sam’s workspace.');
 if(c.stage<2||c.attempts!==1)throw new Error('Send the product overview before recording its follow-up.');
 return {c,contact};
}
function appendFollowupActivity(c,kind,recordId,action,detail){
 const data=c.followupRecordData??={receipt:null,bookingIds:[],callIds:[]};
 if(kind==='booking')data.bookingIds.push(recordId);
 if(kind==='call')data.callIds.push(recordId);
 c.revision=(c.revision||0)+1;
 c.history.push({id:kind+':'+recordId,recordId,messageId:followupMessageId,at:new Date().toISOString(),action,detail});
 return data;
}
export function recordFollowupReceipt(d,{channel,evidence}={}){
 const {c,contact}=followupApplication(d);
 if(!followupChannels.includes(channel))throw new Error('Choose how Sam confirmed receipt.');
 evidence=outcomeRequired({evidence},'evidence');
 const prior=c.followupRecordData?.receipt;
 if(prior){
  if(prior.channel!==channel||prior.evidence!==evidence)throw new Error('Sam’s confirmation is already recorded. Open the saved evidence.');
  return structuredClone(prior);
 }
 const receipt={id:followupMessageId+'/customer-receipt',messageId:followupMessageId,contactId:contact.id,channel,evidence,at:new Date().toISOString()};
 const detail='Sam confirmed receipt by '+channel.toLowerCase()+'. '+evidence;
 appendFollowupActivity(c,'receipt',receipt.id,'Customer confirmed receipt',detail).receipt=receipt;
 salesEvent(d,'Customer confirmed receipt',contact.id,detail);
 Object.assign(d.salesActivity[0],{followupMessageId,relatedId:receipt.id});
 return structuredClone(receipt);
}
export function scheduleFollowupCall(d,{scheduledAt,ownerId,agenda}={}){
 const {c,contact}=followupApplication(d),date=parseWorkspaceDateTime(scheduledAt);
 agenda=outcomeRequired({agenda},'agenda');
 const when=date.toISOString(),bookings=d.salesTasks.filter(t=>t.contactId===contact.id&&t.ownerId===ownerId&&t.scheduledAt===when);
 const previous=bookings.find(t=>c.followupRecordData?.bookingIds.includes(t.id)&&t.agenda===agenda);
 if(previous)return structuredClone(previous);
 if(bookings.some(t=>t.status==='Open'))throw new Error('This person already has a call booked with Sam at that time.');
 const pad=n=>String(n).padStart(2,'0');
 const local=date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+'T'+pad(date.getHours())+':'+pad(date.getMinutes());
 if(new Date(local).getTime()!==date.getTime())throw new Error('Choose a whole minute with an unambiguous local time.');
 const task=scheduleSalesCall(d,contact.id,{scheduledAt:local,ownerId,agenda,purpose:'Follow-up call'});
 Object.assign(d.salesActivity[0],{followupMessageId,relatedId:task.id});
 task.followupMessageId=followupMessageId;
 task.timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 const localTime=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:task.timeZone,timeZoneName:'short'}).format(date);
 appendFollowupActivity(c,'booking',task.id,'Follow-up call booked',d.team.find(p=>p.id===ownerId).name+' · '+localTime+' · '+agenda);
 return structuredClone(task);
}
export function logFollowupCall(d,{endedAt,ownerId,outcome,notes,bookingId='',durationSeconds,nextStep=''}={}){
 const {c,contact}=followupApplication(d),at=parseWorkspaceDateTime(endedAt).toISOString();
 notes=outcomeRequired({notes},'notes');
 const duration=durationSeconds===undefined&&outcome==='No answer'?0:durationSeconds;
 const previous=d.calls.find(call=>call.contactId===contact.id&&call.source==='Outbound'&&call.endedAt===at&&call.status==='Logged');
 if(previous){
  if(c.followupRecordData?.callIds.includes(previous.id)&&previous.ownerId===ownerId&&previous.outcome===outcome&&previous.notes===notes
   &&previous.nextStep===String(nextStep).trim()&&previous.durationSeconds===Number(duration)&&(previous.scheduledTaskId||'')===bookingId)return structuredClone(previous);
  throw new Error('A call with Sam is already logged at that time. Review that record before adding another.');
 }
 const task=bookingId&&d.salesTasks.find(t=>t.id===bookingId&&t.contactId===contact.id&&c.followupRecordData?.bookingIds.includes(t.id));
 if(bookingId&&(!task||task.status!=='Open'))throw new Error('Choose an open booking from this follow-up.');
 if(task&&d.calls.some(call=>call.scheduledTaskId===task.id&&call.status!=='Logged'))throw new Error('Finish the call already in progress for this booking.');
 const {call}=logCompletedCall(d,{contactId:contact.id,ownerId,direction:'Outbound',endedAt:at,durationSeconds:duration,
  outcome,purpose:'Follow-up call',notes,nextStep,runFollowUp:false});
 call.followupMessageId=followupMessageId;
 if(task){call.scheduledTaskId=task.id;Object.assign(task,{status:'Complete',completedCallId:call.id});}
 appendFollowupActivity(c,'call',call.id,'Completed call logged',outcome+' · '+notes);
 return structuredClone(call);
}
function outcomeSourceCapture(cases){
 const r=cases.receivable,t=cases.delivery;
 return {version:1,receivable:{id:'SRC-AR-104',revision:r.revision||0,invoicePence:r.invoicePence,allocatedPence:r.allocatedPence,disputedPence:r.disputedPence,owner:r.disputeOwner||'Unassigned'},delivery:{id:'SRC-DEL-104',revision:t.revision||0,blocked:t.blocked,acceptance:t.acceptance||'Missing',financeAcknowledged:t.financeAcknowledged,financeNote:t.financeNote||'Pending'}};
}
function outcomeSourceSignature(cases){return JSON.stringify(outcomeSourceCapture(cases));}
function receivableRecords(d,c){
 const alder=d.accounts?.find(account=>account.id===d.id+'-a0'),accountId=alder?.id||d.id+'-a0';
 const party=id=>d.accounts?.find(account=>account.id===id)?.name||(id===accountId?'Alder & Co':'Unknown customer');
 const bank={reference:c.reference,accountId:c.payerAccountId??accountId,payer:c.payerName??'Alder & Co',date:c.bankDate??'2026-11-17',amountPence:c.receiptPence};
 const remittance={reference:c.remittanceReference??'REM-104',accountId:c.remittanceAccountId??accountId,invoiceNumber:c.remittanceInvoice??'INV-104',amountPence:c.remittancePence??c.receiptPence,disputedPence:c.disputedPence};
 const invoice={number:c.invoiceId??'INV-104',accountId:c.invoiceAccountId??accountId,customer:party(c.invoiceAccountId??accountId),totalPence:c.invoicePence,outstandingPence:c.invoicePence-c.allocatedPence};
 const candidates=[invoice,...(d.invoices||[]).filter(i=>i.accountId===bank.accountId&&i.number!==invoice.number&&i.totalPence>i.paidPence).map(i=>({number:i.number,accountId:i.accountId,customer:party(i.accountId),totalPence:i.totalPence,outstandingPence:i.totalPence-i.paidPence}))].filter(i=>i.accountId===bank.accountId&&i.outstandingPence>0);
 // Earlier cases stored the import flag and allocation total without their linked snapshots.
 const receipt=c.receiptRecord||(c.imported?{id:'RCPT-104',...bank}:null);
 const allocation=c.allocation||(c.allocatedPence>0?{receiptId:receipt?.id,bankReference:bank.reference,remittanceReference:remittance.reference,invoiceNumber:invoice.number,customer:invoice.customer,beforePence:invoice.totalPence,amountPence:c.allocatedPence,afterPence:invoice.outstandingPence}:null);
 return {bank,remittance,invoice,candidates,receipt,allocation};
}
export function outcomeSnapshot(d,id){const s=outcomeSpec(id),c=ensureOutcomes(d).cases[id];let summary='',metrics=[],records=[],actions=[];
 let receivable;
 switch(id){
 case 'followup':{
  summary=[
   'Sam gave you this address on the call. Check where he wants the overview sent, then review the email.',
   'Review the email below, then send it to Sam.',
   'You sent the overview, but the email service hasn’t confirmed delivery yet. Check what happened to the email you already sent.',
   `Sam’s mail server accepted the overview sent to ${c.email}. You can now record his response or arrange your next call.`
  ][c.stage];
  records=[
   {label:'Contact',value:'Sam Carter'},
   {label:'Setup call',value:'17 November · Spoke with Sam'},
   {label:'Call note',value:'“Please email me the product overview.”'},
   {label:'Follow-up address',value:c.email||'Waiting for you to confirm'}
  ];
  if(c.stage===0)actions=[outcomeActionDef('validate','Save email address',[{...outcomeField('email','Email from the call','email'),value:'sam.carter@example.com'}])];
  if(c.stage===1)actions=[outcomeActionDef('send','Send overview to Sam')];
  if(c.stage===2)actions=[outcomeActionDef('reconcile','Check delivery status')];
  break;
 }
 case 'receivable':{
  receivable=structuredClone(receivableRecords(d,c));
  const {bank,receipt,remittance,invoice,candidates}=receivable,remaining=invoice.outstandingPence;
  summary=[
   'Import '+bank.payer+'’s '+outcomeMoney(bank.amountPence)+' payment from the bank statement so you can match it to an invoice.',
   bank.payer+' quoted '+remittance.invoiceNumber+' in their remittance. Review the open invoice and apply the receipt.',
   'Assign the disputed '+outcomeMoney(remaining)+' to the colleague who will follow up with '+bank.payer+'.',
   c.disputeOwner+' owns the outstanding '+outcomeMoney(remaining)+' dispute.'
  ][c.stage];
  records=[{label:'Bank transaction reference',value:bank.reference},{label:'Payer',value:bank.payer},{label:'Bank amount',value:outcomeMoney(bank.amountPence)},
    {label:'Receipt number',value:receipt?.id||'Awaiting import'},{label:'Remittance reference',value:remittance.reference},{label:'Invoice quoted by payer',value:remittance.invoiceNumber},
    {label:'Invoice number',value:invoice.number},{label:'Invoice amount',value:outcomeMoney(invoice.totalPence)},{label:'Invoice outstanding',value:outcomeMoney(remaining)},
    {label:'Dispute owner',value:c.disputeOwner||'Unassigned'}];
  if(c.stage===0)actions=[outcomeActionDef('import','Import '+outcomeMoney(c.receiptPence)+' bank receipt')];
  if(c.stage===1){
   const matches=candidates.filter(i=>i.number===remittance.invoiceNumber&&i.accountId===remittance.accountId);
   const options=[['','Choose an invoice'],...candidates.map(i=>[i.number,i.number+' · '+outcomeMoney(i.outstandingPence)+' open'])];
   actions=[outcomeActionDef('allocate','Allocate '+outcomeMoney(receipt.amountPence),[{...outcomeField('invoice','Open invoices for '+bank.payer,'select',options),value:matches.length===1?matches[0].number:'',required:true}])];
  }
  if(c.stage===2)actions=[outcomeActionDef('dispute','Assign dispute follow-up',[outcomeField('owner','Send the dispute to','select',[['','Choose a colleague'],['Kim','Kim · Credit control'],['Lee','Lee · Account management']]),outcomeField('reason','What should they follow up with the customer?')])];
  break;
 }
 case 'coverage':summary=c.stage===0?'16 hours requested. Alex is already on leave; Robin is available and trained for the work.':c.stage===1?'Eligible cover selected. Approval will deduct 16 hours from the practice balance.':c.stage===2?'Leave approved with cover. Cancel to verify that the balance is restored once.':'Cancellation recorded. The original 80-hour practice balance is restored.';metrics=[outcomeMetric('Leave balance',`${c.balance}h`,'Synthetic entitlement'),outcomeMetric('Requested leave','16h','Two demo working days')];records=[{label:'Request',value:'LEAVE-104 · Jordan · 18–19 November'},{label:'Cover',value:c.cover||'Not selected'},{label:'Eligibility',value:'Alex: overlapping leave; Robin: available and trained; Casey: not trained'}];if(c.stage===0)actions=[outcomeActionDef('cover','Check substitute',[outcomeField('cover','Substitute','select',[['','Choose cover'],['Alex','Alex — overlapping leave'],['Robin','Robin — available and trained'],['Casey','Casey — not trained']])])];if(c.stage===1)actions=[outcomeActionDef('approve','Approve 16 hours',[outcomeField('approver','Approving manager')])];if(c.stage===2)actions=[outcomeActionDef('cancel','Cancel approved leave',[outcomeField('reason','Cancellation reason')],'danger')];break;
 case 'delivery':summary=c.stage===0?'Project DEL-104 has an unresolved scope decision. Acceptance and billing handoff are blocked.':c.stage===1?'Scope evidence recorded; customer acceptance is still required.':c.stage===2?'Acceptance evidence recorded. Finance must acknowledge the billing handoff.':'Finance has acknowledged the accepted scope and next billing action. No invoice was issued.';metrics=[outcomeMetric('Open scope blockers',c.blocked?1:0,'Acceptance cannot bypass this'),outcomeMetric('Finance acknowledgement',c.financeAcknowledged?'Recorded':'Pending','Acknowledgement is not payment')];records=[{label:'Delivery',value:'DEL-104 · Website direction'},{label:'Scope evidence',value:c.resolution||'Missing'},{label:'Acceptance',value:c.acceptance||'Missing'},{label:'Finance action',value:c.financeNote||'Not acknowledged'}];if(c.stage===0)actions=[outcomeActionDef('resolve','Resolve scope blocker',[outcomeField('evidence','Agreed scope evidence/reference')])];if(c.stage===1)actions=[outcomeActionDef('accept','Record customer acceptance',[outcomeField('acceptance','Customer acceptance evidence')])];if(c.stage===2)actions=[outcomeActionDef('acknowledge','Record finance acknowledgement',[outcomeField('owner','Finance owner'),outcomeField('note','Reviewed next billing action')])];break;
 case 'payable':{
  const billed=c.billedUnits*c.unitPence,matched=Math.min(c.receivedUnits,c.billedUnits)*c.unitPence,held=billed-matched;
  summary=[
   'The supplier changed its bank details. Record who checked the change using an established contact and how they confirmed it.',
   'The goods receipt confirms '+c.receivedUnits+' of '+c.billedUnits+' billed units. Approve the matched '+outcomeMoney(matched)+' and hold '+outcomeMoney(held)+' for supplier review.',
   'The invoice approver released '+outcomeMoney(c.approvedPence)+'. A separate finance colleague must authorise that amount for the payment run.',
   outcomeMoney(c.approvedPence)+' is authorised for the payment run. The unpaid bill still has '+outcomeMoney(held)+' on hold.'
  ][c.stage];
  metrics=[outcomeMetric('Billed',outcomeMoney(billed),c.billedUnits+' units at '+outcomeMoney(c.unitPence)),outcomeMetric('Approved',outcomeMoney(c.approvedPence),'Matched to goods received'),outcomeMetric('Paid',outcomeMoney(c.paidPence),'No payment instruction issued')];
  records=[{label:'Supplier bill',value:'BILL-104 · '+c.billedUnits+' units · '+outcomeMoney(billed)},
   {label:'Goods receipt',value:'GRN-104 · '+c.receivedUnits+' units received against '+(c.receiptBillId??'BILL-104')},
   {label:'Bank details',value:c.bankVerified?'Verified by '+c.verifier:'Changed · awaiting callback'},
   {label:'Amount held',value:outcomeMoney(held)+' · '+(c.billedUnits-Math.min(c.receivedUnits,c.billedUnits))+' units outside the match'}];
  if(c.stage===0)actions=[outcomeActionDef('verify','Record supplier callback',[outcomeField('verifier','Bank details checked by','select',[['','Choose verifier'],['Kim','Kim · Supplier accounts'],['Morgan','Morgan · Supplier accounts']]),outcomeField('evidence','Who confirmed the change on the trusted number?')])];
  if(c.stage===1)actions=[outcomeActionDef('approve','Approve '+outcomeMoney(matched)+' and hold '+outcomeMoney(held),[outcomeField('approver','Invoice approver','select',[['','Choose approver'],...['Pat','Morgan','Kim'].filter(person=>person.toLowerCase()!==c.verifier?.toLowerCase()).map(person=>[person,person])])])];
  if(c.stage===2)actions=[outcomeActionDef('authorize','Authorise '+outcomeMoney(c.approvedPence)+' for payment',[outcomeField('authorizer','Payment authoriser','select',[['','Choose authoriser'],...['Lee','Pat','Morgan'].filter(person=>![c.verifier,c.approver].some(earlier=>person.toLowerCase()===earlier?.toLowerCase())).map(person=>[person,person])])])];
  break;
 }
 case 'leadership':{
 const fresh=!!c.captured&&c.sourceSignature===outcomeSourceSignature(ensureOutcomes(d).cases),r=c.captured?.receivable,t=c.captured?.delivery;
 const ar=r?`SRC-AR-104 · invoice ${outcomeMoney(r.invoicePence)} · allocated ${outcomeMoney(r.allocatedPence)} · disputed ${outcomeMoney(r.disputedPence)} · owner ${r.owner}`:'SRC-AR-104 · not captured';
 const delivery=t?`SRC-DEL-104 · ${t.blocked?'1 blocker':'0 blockers'} · acceptance: ${t.acceptance} · finance ${t.financeAcknowledged?'acknowledged':'pending'}`:'SRC-DEL-104 · not captured';
 summary=!fresh?'Source records changed or have not been captured. Refresh before reviewing. Any prior decision is retained as historical evidence.':c.complete?'Decision linked to the captured practice records. No savings figure has been invented.':'Current practice records captured. Review the evidence and select the source supporting your decision.';
 metrics=[outcomeMetric('Source freshness',fresh?'Current capture':'Stale — refresh required','Compared with receivable and delivery practice revisions'),outcomeMetric('Captured outstanding',r?outcomeMoney(r.invoicePence-r.allocatedPence):'Not captured','Captured invoice less captured allocation'),outcomeMetric('Captured scope blockers',t?(t.blocked?1:0):'Not captured','Captured delivery state'),outcomeMetric('Verified savings','Not measured','No fabricated savings or causal claim')];
 records=[{label:'Receivables source',value:ar},{label:'Delivery source',value:delivery},{label:'Finance next action',value:t?.financeNote||'Not captured'},{label:'Decision',value:c.decision||'Not reviewed'},{label:'Selected source',value:c.source||'Not selected'},{label:'Decision owner',value:c.decisionOwner||'Not assigned'}];
 if(!fresh)actions=[outcomeActionDef('refresh','Refresh linked practice records')];
 else if(!c.complete)actions=[outcomeActionDef('review','Record evidence-linked decision',[outcomeField('source','Evidence source','select',[['','Choose evidence'],['SRC-AR-104',ar],['SRC-DEL-104',delivery]]),outcomeField('decision','Decision and rationale'),outcomeField('owner','Action owner')])];
 break;}

 }
 const leadershipStale=id==='leadership'&&(!c.captured||c.sourceSignature!==outcomeSourceSignature(ensureOutcomes(d).cases));
 const message=id==='followup'&&c.stage>0?{...(c.sentMessage||followupOverview(c.email)),status:['','Draft','Sent · delivery pending','Delivered'][c.stage]}:undefined;
 return {id,receivable,hasFollowupActivity:id==='followup'&&!!c.followupRecordData,title:s.title,pain:s.pain,outcome:s.outcome,sourceView:s.sourceView,status:leadershipStale?'Stale — refresh required':id==='followup'?followupStates[c.stage]:c.status,stage:leadershipStale?0:c.stage,steps:structuredClone(s.steps),owner:s.owner,summary,metrics,records,actions,message,history:structuredClone(c.history),notice:id==='payable'?'Verification evidence is entered for practice; names are not authenticated approvals.':id==='leadership'?'Source values come from these practice cases. The typed decision review is simulated.':id==='delivery'?'Acceptance evidence is entered for practice, not independently verified.':undefined,complete:c.complete&&!leadershipStale};
}
const outcomeRequired=(input,key)=>{const v=String(input[key]??'').trim();if(!v||v.length>500)throw new Error('Provide '+key+' (1–500 characters).');return v;};
function outcomeRequireStage(c,n){if(c.stage!==n)throw new Error('This action is not available at the current stage.');}
export function outcomeAction(d,id,name,input={}){
 outcomeSpec(id);const store=ensureOutcomes({outcomePractice:d.outcomePractice?structuredClone(d.outcomePractice):undefined}),current=store.cases[id],c=structuredClone(current);let detail='';
 // Safe terminal replays are no-ops: no duplicate ledger entry or history event.
 if((id==='followup'&&name==='reconcile'&&c.complete)||(id==='coverage'&&name==='cancel'&&c.cancelled)||(id==='payable'&&name==='authorize'&&c.authorized))return 'Already recorded; no duplicate effect.';
 if(id==='receivable'&&['import','repeat-import','allocate'].includes(name)){
  const {bank,receipt}=receivableRecords(d,c);
  if(input.reference!==undefined&&String(input.reference).trim()!==bank.reference)throw new Error('The selected bank transaction has changed. Reopen the statement line.');
  if(receipt&&Object.keys(bank).some(field=>receipt[field]!==bank[field]))throw new Error('This bank reference was imported with different transaction details. Review the original receipt.');
  if(name==='repeat-import'&&!receipt)throw new Error('Import the bank transaction first.');
  if(name!=='allocate'&&receipt)return 'Already imported. Bank transaction '+receipt.reference+' has one receipt, '+receipt.id+', for '+outcomeMoney(receipt.amountPence)+'. The invoice balance is still '+outcomeMoney(c.invoicePence-c.allocatedPence)+'.';
 }
 switch(id+':'+name){
 case 'followup:validate':{
  outcomeRequireStage(c,0);
  const email=String(input.email??'').trim();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter Sam’s email address, such as sam.carter@example.com.');
  c.email=email;c.stage=1;detail=`Saved ${email} on Sam’s follow-up.`;break;
 }
 case 'followup:send':{
  outcomeRequireStage(c,1);
  if(followupContact(d)?.emailAllowed===false)throw new Error('Email is paused in Sam’s contact preferences.');
  c.attempts=1;c.messageId=followupMessageId;c.deliveryEvent=followupDeliveryEvent(c.email);
  c.sentMessage=followupOverview(c.email);
  c.provider='Awaiting confirmation';c.stage=2;
  detail=`Sent the product overview to ${c.email}.`;break;
 }
 case 'followup:reconcile':{
  outcomeRequireStage(c,2);
  // The previous demo stored this single fixture's attempt without its message ID.
  const legacy=!Object.hasOwn(c,'messageId')&&!Object.hasOwn(c,'deliveryEvent')&&c.attempts===1&&c.provider==='Unknown — simulated timeout after acceptance';
  const messageId=legacy?followupMessageId:c.messageId;
  const event=legacy?followupDeliveryEvent(c.email):c.deliveryEvent;
  if(c.attempts!==1||!event||!messageId||!event.receipt||event.messageId!==messageId||event.recipient!==c.email||(input.receipt!==undefined&&input.receipt!==event.receipt))throw new Error('There’s no matching delivery update for this email yet. Check again later.');
  c.receipt=event.receipt;c.deliveries=1;c.provider='Delivered';c.stage=3;c.complete=true;
  detail=`Confirmed delivery of the original email to ${event.recipient}.`;break;
 }
 case 'receivable:import':{
  outcomeRequireStage(c,0);
  const {bank}=receivableRecords(d,c);
  if(!bank.reference||!bank.accountId||!Number.isSafeInteger(bank.amountPence)||bank.amountPence<=0)throw new Error('Review the bank reference, payer and incoming amount before importing.');
  c.receiptRecord={id:'RCPT-104',...bank};c.imported=true;c.stage=1;
  detail='Created receipt '+c.receiptRecord.id+' for '+outcomeMoney(bank.amountPence)+' from '+bank.payer+' using bank transaction '+bank.reference+'. The full amount is available to allocate.';
  break;
 }
 case 'receivable:allocate':{
  outcomeRequireStage(c,1);
  const {receipt,invoice,remittance,candidates}=receivableRecords(d,c);
  const selected=String(input.invoice??remittance.invoiceNumber).trim();
  if(!c.imported||!receipt||receipt.accountId!==remittance.accountId||receipt.accountId!==invoice.accountId)throw new Error('The payer, remittance and invoice must belong to the same customer. Review the customer records.');
  if(selected!==remittance.invoiceNumber||selected!==invoice.number||candidates.filter(i=>i.number===selected).length!==1)throw new Error('The remittance quotes '+remittance.invoiceNumber+'. Review the invoice number before allocating its payment.');
  if(c.allocatedPence||!Number.isSafeInteger(receipt.amountPence)||receipt.amountPence<=0||!Number.isSafeInteger(invoice.outstandingPence)||receipt.amountPence>invoice.outstandingPence||receipt.amountPence!==remittance.amountPence)throw new Error('Check the available receipt, remittance amount and outstanding invoice balance.');
  c.allocation={receiptId:receipt.id,bankReference:receipt.reference,remittanceReference:remittance.reference,invoiceNumber:invoice.number,customer:invoice.customer,accountId:invoice.accountId,beforePence:invoice.outstandingPence,amountPence:receipt.amountPence,afterPence:invoice.outstandingPence-receipt.amountPence};
  c.allocatedPence=c.allocation.amountPence;c.stage=2;
  detail='Allocated '+outcomeMoney(c.allocatedPence)+' from '+receipt.id+' to '+invoice.number+'. The outstanding balance fell from '+outcomeMoney(c.allocation.beforePence)+' to '+outcomeMoney(c.allocation.afterPence)+'.';
  break;
 }
 case 'receivable:dispute':outcomeRequireStage(c,2);c.disputeOwner=outcomeRequired(input,'owner');if(!['Kim','Lee'].includes(c.disputeOwner))throw new Error('Choose a colleague who handles customer disputes.');c.reason=outcomeRequired(input,'reason');c.stage=3;c.complete=true;detail=`${c.disputeOwner} will follow up the ${outcomeMoney(c.disputedPence)} dispute. ${c.reason}`;break;
 case 'coverage:cover':outcomeRequireStage(c,0);if(outcomeRequired(input,'cover')!=='Robin')throw new Error(input.cover==='Alex'?'Alex has overlapping leave. Choose available cover.':'Choose a trained and available substitute: Robin.');c.cover='Robin';c.stage=1;detail='Robin checked: available and trained for the requested dates.';break;
 case 'coverage:approve':outcomeRequireStage(c,1);c.approver=outcomeRequired(input,'approver');if(c.cover!=='Robin'||c.balance<c.requested)throw new Error('Cover or balance is no longer eligible.');c.balance-=c.requested;c.approved=true;c.stage=2;detail=`16h approved by ${c.approver}; practice balance is 64h.`;break;
 case 'coverage:cancel':outcomeRequireStage(c,2);c.reason=outcomeRequired(input,'reason');c.balance+=c.requested;c.cancelled=true;c.stage=3;c.complete=true;detail=`Cancellation: ${c.reason}. Restored 16h once; balance 80h.`;break;
 case 'delivery:resolve':outcomeRequireStage(c,0);c.resolution=outcomeRequired(input,'evidence');c.blocked=false;c.stage=1;detail='Scope blocker resolved with evidence: '+c.resolution;break;
 case 'delivery:accept':outcomeRequireStage(c,1);if(c.blocked)throw new Error('Resolve the scope blocker first.');c.acceptance=outcomeRequired(input,'acceptance');c.stage=2;detail='Acceptance evidence recorded: '+c.acceptance;break;
 case 'delivery:acknowledge':outcomeRequireStage(c,2);c.financeOwner=outcomeRequired(input,'owner');c.financeNote=outcomeRequired(input,'note');c.financeAcknowledged=true;c.stage=3;c.complete=true;detail=`Finance owner ${c.financeOwner} acknowledged: ${c.financeNote}. No invoice issued.`;break;
 case 'payable:verify':outcomeRequireStage(c,0);c.verifier=outcomeRequired(input,'verifier');c.verification=outcomeRequired(input,'evidence');c.bankVerified=true;c.stage=1;detail=`Bank change independently reviewed by ${c.verifier}: ${c.verification}`;break;
 case 'payable:approve':{
  outcomeRequireStage(c,1);
  if(!c.bankVerified)throw new Error('Verify the supplier bank change first.');
  if((c.receiptBillId??'BILL-104')!=='BILL-104')throw new Error('The goods receipt belongs to another bill. Review the match.');
  const units=Math.min(c.receivedUnits,c.billedUnits),amount=units*c.unitPence;
  if(!Number.isSafeInteger(units)||units<=0||!Number.isSafeInteger(amount)||amount<=0||input.units!==undefined&&String(input.units).trim()!==String(units))throw new Error('Approve only the units matched to the goods receipt.');
  c.approver=outcomeRequired(input,'approver');
  if(c.approver.toLowerCase()===c.verifier.toLowerCase())throw new Error('Choose an invoice approver other than the bank verifier.');
  c.approvedPence=amount;c.stage=2;
  detail=c.approver+' matched '+units+' units on GRN-104 to BILL-104 and approved '+outcomeMoney(amount)+'. '+outcomeMoney(c.billedUnits*c.unitPence-amount)+' remains held.';
  break;
 }
 case 'payable:authorize':outcomeRequireStage(c,2);c.authorizer=outcomeRequired(input,'authorizer');if([c.approver,c.verifier].some(x=>x.toLowerCase()===c.authorizer.toLowerCase()))throw new Error('Authorization requires a different person from approval and bank verification.');c.authorized=true;c.stage=3;c.complete=true;detail=`${c.authorizer} authorised ${outcomeMoney(c.approvedPence)} for the payment run. No bank instruction was issued.`;break;
 case 'leadership:refresh':if(c.captured&&c.sourceSignature===outcomeSourceSignature(store.cases))throw new Error('The captured records are already current.');c.captured=outcomeSourceCapture(store.cases);c.sourceSignature=outcomeSourceSignature(store.cases);c.fresh=true;c.sources=['SRC-AR-104','SRC-DEL-104'];c.stage=1;c.complete=false;detail='Captured current receivable and delivery practice records with their revisions. Prior decisions remain in history.';break;
 case 'leadership:review':outcomeRequireStage(c,1);if(!c.captured||c.sourceSignature!==outcomeSourceSignature(store.cases))throw new Error('Source records changed. Refresh before reviewing.');if(!c.sources.includes(outcomeRequired(input,'source')))throw new Error('Choose a refreshed source record.');c.decision=outcomeRequired(input,'decision');c.decisionOwner=outcomeRequired(input,'owner');c.source=input.source;c.stage=2;c.complete=true;detail=`${c.decisionOwner} reviewed ${c.source}: ${c.decision}. Savings remain unmeasured. Captured outstanding: ${outcomeMoney(c.captured.receivable.invoicePence-c.captured.receivable.allocatedPence)}; disputed: ${outcomeMoney(c.captured.receivable.disputedPence)}; delivery blockers: ${c.captured.delivery.blocked?1:0}; finance acknowledgement: ${c.captured.delivery.financeAcknowledged?'recorded':'pending'}.`;break;
 default:throw new Error('Unknown practice action.');
 }
 c.status=id==='followup'?followupStates[c.stage]:c.complete?'Complete':'Needs action';
 const at=id==='followup'?new Date().toISOString():new Date(Date.UTC(2026,10,17,9,c.history.length)).toISOString();
 c.history.push({at,action:name,detail});c.revision=(current.revision||0)+1;store.cases[id]=c;d.outcomePractice=store;return detail;
}
