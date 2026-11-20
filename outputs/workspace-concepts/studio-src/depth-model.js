import {openFinancePeriodCases} from './finance-exceptions-model.js';
import {DEPTH_WORKFLOWS} from './depth-data.js';
import {businessDays,availability} from './role-model.js';
import {reallocate,handoffOpportunity} from './model.js';
export const DEPTH_DATE='2026-11-16';
const depthSpec=c=>DEPTH_WORKFLOWS.find(w=>w.id===c.workflow);
const depthPerson=(d,id)=>d.team.find(t=>t.id===id);
function depthAudit(d,c,action,detail,actor){const item={id:d.id+'-event-'+(++d.depth.serial),at:new Date().toISOString(),actor:actor||'Demo operator',action,detail};c.history.unshift(item);d.activity.unshift({action:'Journey: '+action,recordId:c.id,actor:item.actor,detail,at:item.at});return item;}
export function depthRecord(d,c){return [...d.accounts,...d.opportunities,...d.invoices,...d.work,...d.team,...d.leave,...d.bills,...d.risks].find(r=>r.id===c.recordId);}
export function depthFields(d,c,input={}){const step=depthSpec(c).steps[c.stage];if(!step)return;for(const f of step.fields)if(Object.hasOwn(input,f.key))c.values[f.key]=f.type==='checkbox'?input[f.key]===true:String(input[f.key]).slice(0,2000);}
export function depthValidation(d,c){const spec=depthSpec(c),step=spec.steps[c.stage],v=c.values,errors=[];
 if(!step)return ['This journey has no remaining step.'];
 for(const f of step.fields){const value=v[f.key];if(f.type==='checkbox'){if(value!==true)errors.push(f.label+' must be confirmed.');continue;}
 if(value===undefined||String(value).trim()===''){errors.push(f.label+' is required.');continue;}
 if(f.type==='number'){const n=Number(value);if(!Number.isFinite(n)||(f.min!==undefined&&n<f.min)||(f.max!==undefined&&n>f.max)||(f.integer&&!Number.isInteger(n)))errors.push(f.label+' must be '+(f.integer?'a whole number ':'a number ')+(f.min!==undefined?'from '+f.min:'')+(f.max!==undefined?' to '+f.max:'')+'.');}
 if(f.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value))errors.push(f.label+' must be a valid date.');
 if(f.type==='month'&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))errors.push(f.label+' must be YYYY-MM.');
 if(f.options&&!f.options.includes(value))errors.push(f.label+' has an invalid choice.');
 if(['person','seller'].includes(f.type)&&!d.team.some(t=>t.id===value&&(f.type!=='seller'||t.department.includes('sales'))))errors.push(f.label+' must be a current eligible colleague.');
 }
 const r=depthRecord(d,c);
 if(spec.id==='close' && ['reconcile','signoff'].includes(step.id)){
  const pending=openFinancePeriodCases(d,v.period);
  if(pending.length)errors.push(v.period+' has '+pending.length+' open statement '+(pending.length===1?'exception':'exceptions')+'. Resolve '+pending.map(row=>row.source.reference).join(', ')+' in Transaction exceptions before signing off this period.');
 }
 if(spec.id==='coverage'){
  if(!r||r.status!=='Pending'&&step.id!=='notify')errors.push('The linked request is no longer pending. Review its current status.');
  if(step.id==='cover'&&v.cover){if(v.cover===r.personId)errors.push('The requester cannot be their own cover.');if(d.leave.some(l=>l.personId===v.cover&&['Pending','Approved'].includes(l.status)&&l.start<=r.end&&l.end>=r.start))errors.push('The cover colleague has overlapping leave. Choose someone available.');}
  if(step.id==='approve'){if(d.leave.some(l=>l.personId===v.cover&&['Pending','Approved'].includes(l.status)&&l.start<=r.end&&l.end>=r.start))errors.push('Cover is no longer available. Return to the coverage step.');if(businessDays(r.start,r.end)*8>depthPerson(d,r.personId).leaveBalanceHours)errors.push('Insufficient leave balance.');}
 }
 if(spec.id==='receivable'&&step.id==='receipt'){
  const amount=Number(v.amount)*100;if(!Number.isSafeInteger(Math.round(amount))||Math.abs(amount-Math.round(amount))>1e-6)errors.push('Receipt amount must use at most two decimal places.');
  if(amount>r.totalPence-r.paidPence)errors.push('Receipt exceeds the remaining invoice balance. Use a separate overpayment process.');
  if(v.receiptRef && d.financeExceptions?.some(c=>c.source.reference.toLowerCase()===v.receiptRef.trim().toLowerCase()))errors.push('This statement line is tracked in Transaction exceptions. Resolve its review and allocation there.');
  if(v.receiptRef&&d.depth.receipts.some(x=>x.reference.toLowerCase()===v.receiptRef.trim().toLowerCase()))errors.push('Receipt reference already allocated. Do not post it again.');
 }
 if(spec.id==='payable' && ['approve','authorise'].includes(step.id) && r.collection?.dispute)errors.push('Resolve the supplier invoice dispute before authorisation.');
 if(spec.id==='payable'&&step.id==='approve'&&v.preparer?.trim().toLowerCase()===v.approver?.trim().toLowerCase())errors.push('Preparer and approver must be different people.');
 if(spec.id==='payable'&&step.id==='authorise'&&v.preparer?.trim().toLowerCase()===v.authoriser?.trim().toLowerCase())errors.push('Payment authoriser must differ from the preparer.');
 if(spec.id==='stock'&&step.id==='reserve'&&Number(v.reserveQty)>d.depth.stock.onHand-d.depth.stock.reserved)errors.push('Insufficient physical stock available to reserve.');
 if(spec.id==='coaching'&&step.id==='cohort'&&Number(v.replies)>Number(v.sent))errors.push('Replies cannot exceed delivered messages.');
 if(spec.id==='initiative'&&step.id==='feasibility'){if(Number(v.budget)>Number(v.ceiling))errors.push('Requested budget exceeds the funding envelope.');if(Number(v.hours)>Number(v.available))errors.push('Required hours exceed committed capacity.');}
 if(spec.id==='territory'&&step.id==='handover'&&v.effective>DEPTH_DATE)errors.push('Effective date is after the demo date. This demo does not schedule future reassignment.');
 if(spec.id==='delivery'&&step.id==='accept'&&r.issue)errors.push('The linked work item has an unresolved dependency.');
 return errors;
}
function depthEffect(d,c,effect){const v=c.values,r=depthRecord(d,c),artifact=(type,detail)=>c.artifacts.push({id:c.id+'-'+type,type,detail});
 switch(effect){
 case 'inbound':artifact('Qualified enquiry',`${v.identity}; owner ${depthPerson(d,v.owner).name}; next: ${v.nextAction}`);break;
 case 'renewal':artifact('Renewal decision',`${v.outcome}; next: ${v.nextAction}`);break;
 case 'proposal':artifact('Accepted proposal',`£${Number(v.amount).toFixed(2)}; acceptance ${v.acceptance}; approval ${v.approver}`);break;
 case 'leave':{const hours=businessDays(r.start,r.end)*8;r.status='Approved';r.decisionBy='Demo manager';r.coverPersonId=v.cover;r.coveragePlan=v.coveragePlan;depthPerson(d,r.personId).leaveBalanceHours-=hours;c.leaveDeducted=hours;artifact('Leave approval',`${hours}h deducted; cover ${depthPerson(d,v.cover).name}`);break;}
 case 'onboard':{const task=d.lifecycle.find(t=>t.personId===c.recordId&&t.kind==='Onboarding');if(task)task.status='Complete';artifact('Readiness sign-off',v.evidence);break;}
 case 'receipt':{const amount=Math.round(Number(v.amount)*100);r.paidPence+=amount;d.openingCashPence+=amount;if(r.paidPence===r.totalPence){r.status='Paid';r.overdueDays=0;}const receipt={id:c.id+'-receipt',invoiceId:r.id,reference:v.receiptRef.trim(),amountPence:amount,status:'Allocated'};d.depth.receipts.push(receipt);artifact('Receipt allocation',`${receipt.reference}: £${(amount/100).toFixed(2)}; £${((r.totalPence-r.paidPence)/100).toFixed(2)} remains`);break;}
 case 'reconcile':{const receipt=d.depth.receipts.find(x=>x.id===c.id+'-receipt');if(!receipt)throw new Error('Allocate a receipt before reconciliation.');receipt.status='Reconciled';receipt.bankRef=v.bankRef;receipt.reviewer=v.approver;artifact('Reconciliation',`${v.bankRef}; reviewed by ${v.approver}`);break;}
 case 'bill':r.status='Approved';r.matchEvidence=v.matchEvidence;artifact('Bill approval',`Matched PO ${v.purchaseOrder}, receipt ${v.receipt}; approved by ${v.approver}`);break;
 case 'authorise':r.paymentAuthorisation={batch:v.batchRef,by:v.authoriser,status:'Authorised only — unpaid'};artifact('Payment authorisation',`${v.batchRef}; unpaid; no cash movement`);break;
 case 'dependency':reallocate(d,r.id,depthPerson(d,v.owner).name);r.issue='';r.resolutionEvidence=v.evidence;artifact('Dependency resolution',v.evidence);break;
 case 'delivery':{const hours=r.status==='Complete'?0:r.hours;r.status='Complete';r.acceptance=v.acceptance;const owner=d.team.find(t=>t.name===r.owner);if(owner)owner.allocated=Math.max(0,owner.allocated-hours);artifact('Accepted completion',`${v.acceptance}; ${hours}h allocation released`);break;}
 case 'stockReceive':d.depth.stock.onHand+=Number(v.quantity);d.depth.stock.movements.push({type:'Receipt',quantity:Number(v.quantity),reference:v.receiptRef,caseId:c.id});artifact('Stock receipt',`${v.quantity} units; ${v.receiptRef}`);break;
 case 'stockReserve':d.depth.stock.reserved+=Number(v.reserveQty);d.depth.stock.movements.push({type:'Reservation',quantity:Number(v.reserveQty),reference:v.orderRef,caseId:c.id});artifact('Reservation',`${v.reserveQty} units; ${v.orderRef}`);break;
 case 'stockDispatch':d.depth.stock.reserved-=Number(v.reserveQty);d.depth.stock.onHand-=Number(v.reserveQty);d.depth.stock.movements.push({type:'Dispatch',quantity:Number(v.reserveQty),reference:v.dispatchRef,caseId:c.id});artifact('Dispatch',`${v.reserveQty} units; ${v.dispatchRef}`);break;
 case 'forecast':r.forecastCategory=v.category;r.next=v.nextAction;r.nextStepDue=v.nextDate;r.reviewedCloseDate=v.closeDate;artifact('Forecast judgement',`${v.category}; expected close ${v.closeDate}`);break;
 case 'forecastSubmit':c.forecastSnapshot={opportunityId:r.id,valuePence:r.valuePence,category:r.forecastCategory,owner:r.owner,period:v.period,targetPence:Math.round(Number(v.target)*100),submittedBy:v.approver,at:new Date().toISOString()};artifact('Forecast submission',`${v.period}: ${v.category}, £${(r.valuePence/100).toFixed(2)}; owner ${v.approver}`);break;
 case 'territory':if(r.owner!==depthPerson(d,v.owner).name)handoffOpportunity(d,r.id,'saleslead',{ownerId:v.owner,reason:v.credit},r.ownerHistory?.length || 0,r.owner);r.next=v.nextAction;artifact('Ownership change',`${r.owner}; ${v.credit}`);break;
 case 'risk':r.status='Reviewed';r.mitigation=v.decision;r.residual=v.residual;r.owner=depthPerson(d,v.owner).name;artifact('Risk review',`${v.result}; residual: ${v.residual}`);break;
 }
}
export function depthAction(d,s,action,input={}){
 if(!action.startsWith('depth-'))return null;
 if(action==='depth-select'){const c=d.depth.cases.find(x=>x.id===input.id&&x.role===s.role);if(!c)throw new Error('Journey not found for this function.');s.depthCase=c.id;return 'Journey opened.';}
 if(action==='depth-handoff'){const h=d.depth.handoffs.find(x=>x.id===input.id&&x.toRole===s.role);if(!h||!['Pending','Correction required'].includes(h.status))throw new Error('This handoff is no longer pending.');if(!input.note?.trim())throw new Error('Record the receiving team’s next action before accepting.');const correction=h.status==='Correction required';h.status=correction?'Correction acknowledged':'Accepted';h.acceptedNote=input.note.trim();const c=d.depth.cases.find(x=>x.id===h.caseId);depthAudit(d,c,correction?'Handoff correction acknowledged':'Handoff accepted',`${h.toRole}: ${h.acceptedNote}`,'Demo receiving owner');return correction?'Handoff correction acknowledged with a next action.':'Handoff accepted with a recorded next action.';}
 const c=d.depth.cases.find(x=>x.id===(input.id||s.depthCase)&&x.role===s.role)||d.depth.cases.find(x=>x.role===s.role),spec=depthSpec(c),step=spec.steps[c.stage];
 if(!c)throw new Error('Journey not found.');
 const note=String(input.note||'').trim();
 if(action==='depth-cancel-leave'){
  const r=depthRecord(d,c);if(c.workflow!=='coverage'||!c.leaveDeducted||r.status!=='Approved'||c.status==='Cancelled')throw new Error('Only this journey’s approved leave can be cancelled once.');if(!note)throw new Error('A cancellation reason is required.');
  depthPerson(d,r.personId).leaveBalanceHours+=c.leaveDeducted;r.status='Cancelled';c.status='Cancelled';for(const h of d.depth.handoffs.filter(h=>h.caseId===c.id)){h.status=h.status==='Accepted'?'Correction required':'Withdrawn';}depthAudit(d,c,'Leave cancelled',`${note}; ${c.leaveDeducted}h restored`);return 'Leave cancelled; balance restored and handoff marked for correction or withdrawn.';
 }
 if(action==='depth-reopen'){
  if(c.status!=='Rejected')throw new Error('Only a rejected review can be reopened.');if(!note)throw new Error('Record the revision reason before reopening.');
  c.status='Active';c.blocker=null;c.error='';depthAudit(d,c,'Rejected review reopened',note,step.owner);return 'Reopened at the rejected step. Previously posted outputs are preserved.';
 }
 if(action==='depth-reject'){
  if(!step||c.status!=='Active')throw new Error('Only an active review can be rejected.');if(!note)throw new Error('Record why the current review is rejected.');
  c.status='Rejected';c.blocker=note;depthAudit(d,c,'Review rejected',note,step.owner);return 'Review rejected. No new output or handoff created.';
 }
 if(['Complete','Cancelled','Rejected'].includes(c.status))throw new Error('This journey is closed; its completed actions cannot run twice.');
 depthFields(d,c,input.values);
 if(action==='depth-block'||action==='depth-return'){
  if(!note)throw new Error('Describe the exception or requested change.');c.status=action==='depth-block'?'Blocked':'Needs changes';c.blocker=note;depthAudit(d,c,c.status,note,step.owner);return c.status+' recorded. No downstream action ran.';
 }
 if(action==='depth-resolve'){
  if(!['Blocked','Needs changes'].includes(c.status))throw new Error('There is no exception to resolve.');if(!note)throw new Error('Resolution evidence is required.');depthAudit(d,c,'Resubmitted',note,step.owner);c.status='Active';c.blocker=null;return 'Returned to review. Validate and complete the step separately.';
 }
 if(action==='depth-back'){
  if(c.stage===0||spec.steps[c.stage-1].effect)throw new Error('A posted action cannot be undone by editing an earlier step.');c.stage--;c.status='Active';c.blocker=null;depthAudit(d,c,'Returned to previous review',note||'Recheck supporting inputs');return 'Previous review reopened.';
 }
 if(action==='depth-step'){
  if(c.status!=='Active')throw new Error('Resolve or resubmit the exception before continuing.');const errors=depthValidation(d,c);if(errors.length){c.error=errors.join(' ');throw new Error(c.error);}c.error='';
  depthEffect(d,c,step.effect);depthAudit(d,c,step.action,step.fields.map(f=>f.label+': '+(f.type==='checkbox'?'Confirmed':['person','seller'].includes(f.type)?depthPerson(d,c.values[f.key]).name:c.values[f.key])).join('\n'),step.owner);c.stage++;
  if(c.stage===spec.steps.length){c.status='Complete';if(!d.depth.handoffs.some(h=>h.caseId===c.id))d.depth.handoffs.unshift({id:c.id+'-handoff',caseId:c.id,fromRole:c.role,toRole:spec.targetRole,view:spec.targetView,title:spec.handoff,recordId:c.recordId,recordLabel:c.recordLabel,status:'Pending',note:c.values.handoffNote||c.values.nextAction||c.values.evidence||spec.summary});return 'Journey completed. A linked receiving-team handoff is ready.';}
  return 'Step recorded. Linked records and evidence updated.';
 }
 return null;
}
