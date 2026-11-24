import {OUTCOME_SCENARIOS,ensureOutcomes,outcomeMoney,outcomeSnapshot,followupRecord} from './outcomes-model.js';
import {crmMethodPanel,crmRecordTime} from './contact-workspace.js';
import {escapeHTML,glyph} from './visuals.js';
const oe=escapeHTML;
const followupEvents={validate:'Email saved',send:'Overview sent',reconcile:'Delivery confirmed'};
const receiptEvents={import:'Bank receipt imported',allocate:'Payment allocated',dispute:'Dispute assigned'};
function renderCaseEvent(entry,id){
 const labels=id==='followup'?followupEvents:id==='receivable'?receiptEvents:{};
 const name=labels[entry.action]||entry.action;
 return `<li><div><strong>${oe(name)}</strong>${crmRecordTime(entry.at)}</div><p>${oe(entry.detail)}</p></li>`;
}
function renderFollowupEmail(message){
 return `<div class="outcome-email"><p><strong>${oe(message.subject)}</strong><span>${oe(message.status)}</span></p><p>To ${oe(message.to)}</p>${message.body?`<p class="outcome-email-body">${oe(message.body)}</p>`:''}</div>`;
}
function outcomeRenderField(field,actionId){
 const id=`outcome-${actionId}-${field.key}`;
 const common=`id="${oe(id)}" aria-labelledby="${oe(id)}-label" data-outcome-field="${oe(field.key)}" name="${oe(field.key)}" ${field.required?'required':''}`;
 let input;
 if(field.type==='select')input=`<select ${common}>${(field.options||[]).map(o=>`<option value="${oe(o.value)}" ${String(o.value)===String(field.value??'')?'selected':''}>${oe(o.label)}</option>`).join('')}</select>`;
 else if(field.type==='textarea')input=`<textarea ${common} rows="3" maxlength="500">${oe(field.value||'')}</textarea>`;
 else input=`<input ${common} type="${oe(field.type||'text')}" value="${oe(field.value??'')}" ${field.type==='number'?'min="0" max="86400" step="1"':''} autocomplete="off">`;
 return `<label class="outcome-field" for="${oe(id)}"><span id="${oe(id)}-label">${oe(field.label)}</span>${input}</label>`;
}
function followupActionButton(action,label,extra=''){
 return `<button type="button" class="outcome-source" data-do="${action}" ${extra}>${oe(label)}</button>`;
}
function followupShortcuts(record,includeRecord=false){
 return `<div class="followup-shortcuts">
  ${includeRecord?followupActionButton('open-sam-followup','Open Sam’s record'):''}
  ${record.receipt?'':followupActionButton('followup-edit','Confirm receipt from Sam','data-kind="receipt"')}
  ${record.canSchedule?followupActionButton('followup-edit','Schedule next call','data-kind="schedule"'):''}
  ${followupActionButton('followup-edit','Log completed call','data-kind="log"')}
 </div>`;
}
function followupEditorForm(record,editor){
 const {kind,bookingId}=editor;
 const booking=record.bookings.find(row=>row.id===bookingId);
 const field=(key,label,type,extras={})=>outcomeRenderField({key,label,type,required:true,...extras},'record-'+kind);
 const list=values=>[{value:'',label:'Choose…'},...values.map(value=>({value,label:value}))];
 const owner=()=>field('ownerId',kind==='schedule'?'Call owner':'Who made the call?','select',{options:record.ownerOptions,value:booking?.ownerId||record.ownerId});
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 const current=new Date();
 const localNow=new Date(current.getTime()-current.getTimezoneOffset()*60000).toISOString().slice(0,16);
 const titles={receipt:'Confirm receipt from Sam',schedule:'Schedule the next call',log:'Log a completed call'};
 let fields,submitLabel;
 if(kind==='receipt'){
  fields=field('channel','How did Sam confirm receipt?','select',{options:list(record.channelOptions)})+
   field('evidence','What did Sam say?','textarea');
  submitLabel='Save confirmation';
 }else if(kind==='schedule'){
  fields=field('scheduledAt',`Call date and time (${zone})`,'datetime-local')+owner()+field('agenda','What will you discuss?','textarea');
  submitLabel='Book call';
 }else{
  const pendingBookings=record.bookings.filter(row=>row.status==='Open');
  const bookingChoice=!booking&&pendingBookings.length?field('bookingId','Which call are you logging?','select',{required:false,options:[
   {value:'',label:'An unscheduled call'},
   ...pendingBookings.map(row=>({value:row.id,label:new Date(row.scheduledAt).toLocaleString()+' · '+row.agenda}))
  ]}):'';
  fields=bookingChoice+field('endedAt',`When did the call end? (${zone})`,'datetime-local',{value:localNow})+owner()+
   field('outcome','Call outcome','select',{options:list(record.outcomeOptions)})+
   field('durationSeconds','Talk time in seconds','number')+field('notes','Call notes','textarea')+
   '<div data-agreed-step hidden>'+field('nextStep','Agreed next step','text',{required:false})+'</div>';
  submitLabel='Save call to Sam’s record';
 }
 return `<section class="outcome-task followup-editor"><h2 id="followup-editor-title" tabindex="-1">${oe(titles[kind])}</h2>
  ${booking?`<p>Scheduled call · ${oe(booking.agenda)}</p>`:''}
  <form data-followup-form="${kind}" data-booking="${oe(bookingId||'')}" aria-labelledby="followup-editor-title">
   <div class="followup-form-fields">${fields}</div>
   <p role="alert" class="outcome-feedback"></p>
   <div class="followup-shortcuts"><button type="submit" class="outcome-action primary">${oe(submitLabel)}</button>
    ${followupActionButton('followup-cancel','Cancel')}</div>
  </form></section>`;
}
function followupRecordPage(d,snapshot,record,state){
 const openBookings=record.bookings.filter(row=>row.status==='Open');
 const name=id=>record.ownerOptions.find(opt=>opt.value===id)?.label||id;
 const receipt=record.receipt;
 const sent=snapshot.stage>=2;
 const message=snapshot.message;
 const contact=d.contacts.find(person=>person.id===record.contactId);
 const caseData=d.outcomePractice.cases.followup;
 const actionTime=action=>snapshot.history.find(event=>event.action===action)?.at;
 const fact=(label,content)=>`<div><dt>${label}</dt><dd>${content}</dd></div>`;
 const addressFacts=fact(sent?'Sent to':'Draft recipient',oe(message?.to||'Email address needed'))+
  fact('Current contact email',oe(contact?.email || 'No saved email address'));
 const providerStatus=snapshot.stage>=3?'Accepted by Sam’s mail server':sent?'Awaiting delivery confirmation':'Draft';
 return `<section class="outcome-practice followup-record" aria-labelledby="followup-record-title">
  ${followupActionButton('followup-back','Back to sales follow-up')}
  <header class="outcome-case-heading"><div><p class="outcome-kicker">Sales follow-up record</p><h1 id="followup-record-title" tabindex="-1">Sam Carter</h1><p>Product overview requested on the setup call</p></div>
   ${followupActionButton('followup-contact','View contact profile')}</header>
  ${state.outcomeFeedback?`<p class="outcome-feedback" role="status">${oe(state.outcomeFeedback)}</p>`:''}
  <div class="outcome-work-grid"><div class="outcome-work-column">
   <section class="outcome-task followup-message"><h2>${oe(message?.subject||'Product overview')}</h2>
    <dl class="followup-facts">${addressFacts}${sent?fact('Sent',crmRecordTime(actionTime('send'))):''}
    ${fact('Email delivery',providerStatus)}
    ${snapshot.stage>=3?fact('Delivery checked',crmRecordTime(actionTime('reconcile'))):''}
    ${fact('Customer confirmation',receipt?'Confirmed by '+oe(receipt.channel.toLowerCase()):'Awaiting word from Sam')}
    ${receipt?fact('Confirmation recorded',crmRecordTime(receipt.at)):''}</dl>
    ${receipt?`<blockquote>${oe(receipt.evidence)}</blockquote>`:''}
    ${message?`<details class="followup-body"><summary>${sent?'Read original email and evidence':'Read email draft'}</summary>${sent?`<dl class="followup-facts">${fact('Message ID',oe(record.messageId||'No ID recorded'))}${caseData.receipt?fact('Mail server receipt',oe(caseData.receipt)):''}</dl>`:''}<p class="followup-message-body">${oe(message.body)}</p></details>`:''}
    ${snapshot.stage===2&&!state.followupEditor?outcomeActionForm(snapshot.actions[0],snapshot):''}
    ${sent?'':followupActionButton('followup-back','Continue preparing the email')}
   </section>
   ${state.followupEditor&&sent?followupEditorForm(record,state.followupEditor):sent?`<section class="outcome-task"><h2>Next actions</h2>${record.canSchedule?'':'<p>Calls are paused in Sam’s contact preferences.</p>'}${followupShortcuts(record)}</section>`:''}
   <section class="outcome-task"><h2>Upcoming calls</h2>${openBookings.length?openBookings.map(row=>`<article class="followup-booking"><strong>${oe(row.agenda)}</strong><p>${crmRecordTime(row.scheduledAt)} · ${oe(name(row.ownerId))}</p>${followupActionButton('followup-edit','Log this call',`data-kind="log" data-booking="${oe(row.id)}"`)}</article>`).join(''):'<p>No calls scheduled.</p>'}</section>
   <section class="outcome-evidence"><h2>Completed calls</h2>
    ${record.calls.map(row=>`<article class="followup-booking"><strong>${oe(row.outcome)}</strong><p>${crmRecordTime(row.endedAt)} · ${oe(name(row.ownerId))}</p><p>${oe(row.notes)}</p>${row.nextStep?`<p>Next step · ${oe(row.nextStep)}</p>`:''}</article>`).join('')}
    <article class="followup-booking"><strong>Setup call</strong><p>Call logged ${crmRecordTime(actionTime('Setup call logged'))}</p><p>Sam asked for a product overview by email.</p></article>
   </section>
  </div><div class="outcome-record-column">
   ${contact?`<section class="outcome-evidence followup-contact-methods"><h2>Current contact details</h2>${crmMethodPanel(d,contact,'email')}${crmMethodPanel(d,contact,'phone')}</section>`:''}
   <section class="outcome-audit"><h2>Activity history</h2><ol>${[...snapshot.history].reverse().map(entry=>renderCaseEvent(entry,'followup')).join('')}</ol></section>
  </div></div></section>`;
}
function outcomeActionForm(action,snapshot){
 const fields=action.fields||[];
 const secondary=action.kind==='secondary'||action.kind==='danger';
 const bank=snapshot.receivable&&['import','allocate','repeat-import'].includes(action.id)?`<input type="hidden" name="reference" data-outcome-field="reference" value="${oe(snapshot.receivable.bank.reference)}">`:'';
 return `<form class="outcome-action-form ${fields.length?'has-fields':''}" data-outcome-form="${oe(action.id)}" aria-label="${oe(action.label)}">${bank}<div class="outcome-fields">${fields.map(f=>outcomeRenderField(f,action.id)).join('')}</div><button type="button" class="outcome-action ${secondary?'outcome-secondary':'primary'} ${action.kind==='danger'?'outcome-danger':''}" data-do="outcome-run" data-action="${oe(action.id)}" data-id="${oe(snapshot.id)}">${oe(action.label)}</button></form>`;
}
const receiptFacts=rows=>'<dl>'+rows.map(([name,value])=>`<div><dt>${oe(name)}</dt><dd>${oe(value)}</dd></div>`).join('')+'</dl>';
function paymentReportButton(){
 return `<button type="button" class="outcome-source" data-do="reconciliation-open" data-ledger="practice">View reconciliation report ${glyph('arrow')}</button>`;
}
function receivableEvidence(snapshot,duplicateFeedback){
 const {bank,receipt,remittance,invoice}=snapshot.receivable;
 const day=new Date(bank.date+'T00:00:00Z');
 const date=Number.isFinite(day.getTime())?day.toLocaleDateString('en-GB',{dateStyle:'medium',timeZone:'UTC'}):'Date unavailable';
 return `<section class="outcome-receipt-source"><h3>Bank statement</h3>${receiptFacts([['Bank transaction reference',bank.reference],['Statement date',date],['Payer',bank.payer],['Amount received',outcomeMoney(bank.amountPence)]])}
  ${receipt?`<div class="outcome-receipt-import"><p>Ledger receipt <strong>${oe(receipt.id)}</strong> links to the bank’s transaction ID <strong>${oe(bank.reference)}</strong>.</p>${outcomeActionForm({id:'repeat-import',label:'Check for duplicate import',kind:'secondary'},snapshot)}<p class="outcome-feedback" data-duplicate-feedback role="status" aria-live="polite" tabindex="-1">${oe(duplicateFeedback)}</p></div>`:''}</section>
  <section class="outcome-receipt-source"><h3>Customer remittance</h3>${receiptFacts([['Remittance reference',remittance.reference],['Invoice quoted',remittance.invoiceNumber],['Payment advised',outcomeMoney(remittance.amountPence)],['Amount disputed',outcomeMoney(remittance.disputedPence)]])}</section>
  <section class="outcome-receipt-source"><h3>Customer invoice</h3>${receiptFacts([['Invoice number',invoice.number],['Bill to',invoice.customer],['Invoice total',outcomeMoney(invoice.totalPence)],['Currently outstanding',outcomeMoney(invoice.outstandingPence)]])}</section>
  ${snapshot.receivable.allocation?'':paymentReportButton()}`;
}
function receiptAllocationResult(allocation){
 if(!allocation)return '';
 return `<section class="outcome-allocation" aria-label="Posted allocation"><h3>Payment applied to ${oe(allocation.invoiceNumber)}</h3><p>${oe(allocation.receiptId)} · ${oe(allocation.customer)}</p>${receiptFacts([['Balance before payment',outcomeMoney(allocation.beforePence)],['Payment applied',outcomeMoney(allocation.amountPence)],['Still outstanding',outcomeMoney(allocation.afterPence)]])}${paymentReportButton()}</section>`;
}
export function outcomeView(d,state){
 ensureOutcomes(d);
 const available=OUTCOME_SCENARIOS.filter(s=>state.role==='leadership'||(state.role==='saleslead'?['followup','leadership'].includes(s.id):s.role===state.role));
 const stories=available.length?available:OUTCOME_SCENARIOS;
 if(!stories.some(s=>s.id===state.outcomeCase))state.outcomeCase=stories[0].id;
 const scenario=stories.find(s=>s.id===state.outcomeCase);
 const snapshot=outcomeSnapshot(d,scenario.id);
 const customerRecord=scenario.id==='followup'?followupRecord(d):null;
 if(customerRecord&&state.followupRecord)return followupRecordPage(d,snapshot,customerRecord,state);
 const resetControl=snapshot.hasFollowupActivity
  ?state.confirmFollowupReset?`<div class="followup-reset-prompt"><p>Remove the calls, bookings and confirmation linked to this demo email and start again?</p><button type="button" data-do="outcome-reset" data-id="followup" class="outcome-reset">Reset this demo</button>${followupActionButton('followup-reset-cancel','Keep record')}</div>`:followupActionButton('followup-reset-request','Reset demo')
  :`<button type="button" data-do="outcome-reset" data-id="${oe(scenario.id)}" class="outcome-reset">Reset demo</button>`;
 const steps=snapshot.steps||scenario.steps||[];
 const stage=Math.max(0,Math.min(Number(snapshot.stage)||0,steps.length));
 const emailPaused=customerRecord&&stage<2&&d.contacts?.find(person=>person.id===customerRecord.contactId)?.emailAllowed===false;
 const done=snapshot.complete?steps.length:stage;
 const feedback=typeof state.outcomeFeedback==='string'?state.outcomeFeedback:state.outcomeFeedback?.message||state.outcomeFeedback?.text||'';
 const duplicateFeedback=snapshot.receivable&&state.outcomeFeedbackAction==='repeat-import'?feedback:'';
 const title=oe(snapshot.title||scenario.title);
 const count=(snapshot.history||[]).length;
 return `<section class="outcome-practice" aria-labelledby="outcome-title">
  <header class="outcome-case-heading">
    <div><p class="outcome-kicker">Workflow demo <span aria-hidden="true">/</span> ${oe(snapshot.owner||scenario.owner)}</p>
    <h1 id="outcome-title" tabindex="-1">${title}</h1><p>${oe(scenario.pain)}</p></div>
    <span class="outcome-status ${snapshot.complete?'is-complete':snapshot.status==='Needs action'?'needs-action':''}">${oe(emailPaused?'Email paused':snapshot.status||'Ready to start')}</span>
  </header>
  ${stories.length>1?`<details class="outcome-picker"><summary>Switch workflow</summary>
    <nav class="outcome-stories" aria-label="Choose a workflow">${stories.map(s=>`<button type="button" data-do="outcome-select" data-id="${oe(s.id)}" aria-pressed="${s.id===scenario.id}" class="outcome-story ${s.id===scenario.id?'is-selected':''}"><span>${oe(s.title)}</span>${s.id===scenario.id?glyph('check'):''}</button>`).join('')}</nav>
  </details>`:''}
  <div class="outcome-progress"><ol aria-label="Workflow steps">${steps.map((step,i)=>`<li class="${i<done?'is-done':i===stage?'is-current':''}" ${!snapshot.complete&&i===stage?'aria-current="step"':''}><span class="outcome-step-marker" aria-hidden="true">${i<done?glyph('check'):i+1}</span><span>${oe(step.title)}</span></li>`).join('')}</ol></div>
  <div class="outcome-work-grid">
    <div class="outcome-work-column">
      <section class="outcome-task" aria-labelledby="outcome-task-title">
        <div class="outcome-task-header"><p class="outcome-kicker">${snapshot.complete?'Result':`Step ${Math.min(stage+1,steps.length)} of ${steps.length}`}</p>
        <h2 id="outcome-task-title" tabindex="-1">${oe(emailPaused?'Email follow-up paused':snapshot.complete?(scenario.outcome||'Complete'):steps[stage]?.title||'Review result')}</h2>
        <p>${oe(emailPaused?'Sam has opted out of email. His contact profile shows his communication preferences.':snapshot.summary||'')}</p></div>
        ${snapshot.message?renderFollowupEmail({...snapshot.message,body:stage===1?snapshot.message.body:''}):''}
        <div class="outcome-feedback" role="status" tabindex="-1" aria-live="polite" aria-atomic="true">${oe(duplicateFeedback?'':feedback)}</div>
        ${snapshot.receivable?receiptAllocationResult(snapshot.receivable.allocation):''}
        ${emailPaused?followupActionButton('followup-contact','View contact profile'):snapshot.actions?.length?`<div class="outcome-actions">${snapshot.actions.map(a=>outcomeActionForm(a,snapshot)).join('')}</div>`:''}
        ${customerRecord&&stage>=2?`<div class="followup-continue">${customerRecord.receipt?`<p>Sam confirmed receipt by ${oe(customerRecord.receipt.channel.toLowerCase())}.</p>`:''}${followupShortcuts(customerRecord,true)}</div>`:''}
        ${snapshot.notice&&!snapshot.notice.startsWith('Guided practice')?`<p class="outcome-notice">${glyph('records')}<span>${oe(snapshot.notice)}</span></p>`:''}
      </section>
      ${snapshot.metrics.length?`<section class="outcome-metrics" aria-label="Results">${snapshot.metrics.map(m=>`<div><span>${oe(m.label)}</span><strong>${oe(m.value)}</strong><small>${oe(m.note||'Practice data')}</small></div>`).join('')}</section>`:''}
    </div>
    <div class="outcome-record-column">
      <aside class="outcome-evidence" aria-labelledby="outcome-evidence-title"><h2 id="outcome-evidence-title">${snapshot.id==='followup'?'From the setup call':'Supporting records'}</h2>
        ${snapshot.receivable?receivableEvidence(snapshot,duplicateFeedback):`<dl>${(snapshot.records||[]).map(r=>`<div><dt>${oe(r.label)}</dt><dd>${oe(r.value)}</dd></div>`).join('')}</dl>`}
      </aside>
      <details class="outcome-audit" ${snapshot.complete?'open':''}><summary>${glyph('records')}<strong>Activity history</strong><span>${count} ${count===1?'event':'events'}</span></summary>
        ${count?`<ol>${[...snapshot.history].reverse().map(h=>renderCaseEvent(h,snapshot.id)).join('')}</ol>`:'<p>No activity yet.</p>'}
        <p class="outcome-empty">Event times and inputs are simulated.</p>
      </details>
    </div>
  </div>
  <footer class="outcome-footer">
    <p class="outcome-boundary">Demo records only. No real messages, payments or changes to workspace balances.</p>
    <div class="outcome-footer-actions">${customerRecord?'':`<button type="button" data-do="view" data-view="${oe(scenario.sourceView)}" data-role="${oe(scenario.role)}" class="outcome-source">Open workspace ${glyph('arrow')}</button>`}${resetControl}</div>
  </footer>
 </section>`;
}
