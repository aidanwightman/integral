import {saveContactAddressEntry} from './address-confirmation.js';
import {escapeHTML, studioButton} from './visuals.js';
import {crmReviewContact, crmSaveContact, crmReadInbound, crmLogInbound, crmBeginDraft, crmSaveDraft, crmSendDraft, crmContactMethod, crmRecordMethodCheck} from './contact-model.js';
import {callHistory,scheduledCallPanel,samProductOverview} from './calling-views.js';
import {emailCanBeUsed} from './email-address.js';
import {contactEmailField} from './email-lookup.js';
import {signaturePhoneCandidate} from './email-signature.js';

const contactSessions = new WeakMap();
function crmScreen(d) {
  if (!contactSessions.has(d)) contactSessions.set(d, {mode: 'record'});
  return contactSessions.get(d);
}
const crmEsc = escapeHTML;
const crmBtn = (action, label, attrs = '') => studioButton('crm-' + action, label, 'small', attrs);
function crmField(key, label, value = '', type = 'text', required = false) {
  return `<label>${label}<input name="${key}" type="${type}" value="${crmEsc(value)}" ${required ? 'required' : ''}></label>`;
}
const crmOptions = (items, selected) => items.map(item => `<option value="${crmEsc(item.id)}" ${item.id === selected ? 'selected' : ''}>${crmEsc(item.name)}</option>`).join('');
const crmSubmit = label => `<button class="primary" type="submit">${label}</button>`;
const crmFormActions = label => `<div class="crm-actions">${crmSubmit(label)}${crmBtn('close', 'Cancel')}</div>`;
const crmCurrent = (d,s) => d.contacts.find(c=>c.id===s.callContact) || d.contacts[0];
const crmMeta = (label, value) => `<div><dt>${label}</dt><dd>${crmEsc(value || '—')}</dd></div>`;

const crmUtc = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'UTC'});
export function crmRecordTime(value, empty='No date recorded') {
  const time = new Date(value);
  return value && Number.isFinite(time.getTime())
    ? `<time datetime="${crmEsc(time.toISOString())}">${crmEsc(crmUtc.format(time))} UTC</time>`
    : crmEsc(empty);
}
function crmCheckForm(contact, method, value) {
  const label=method==='email'?'email address':'phone number';
  return `<details class="crm-check-editor"><summary>Record ${method} check</summary>
    <form data-crm-form="method-check" data-contact="${crmEsc(contact.id)}" data-method="${method}">
      <input type="hidden" name="method" value="${method}"><input type="hidden" name="value" value="${crmEsc(value)}">
      <div class="crm-fields">
        <label>Check result<select name="result" required><option value="">Choose a result</option><option value="verified">Verified this ${label}</option><option value="unconfirmed">Could not confirm</option></select></label>
        <label>Source<select name="source" required><option value="">Choose a source</option><option>Contact confirmation</option><option>Company directory</option><option>Colleague confirmation</option><option>Other documented source</option></select></label>
        <label class="crm-wide">When checked (${crmEsc(Intl.DateTimeFormat().resolvedOptions().timeZone)})<input type="datetime-local" name="checkedAt"><span class="crm-check-hint">Leave blank if you checked just now.</span></label>
        <label class="crm-wide">Evidence<textarea name="evidence" rows="2" maxlength="500" placeholder="What did you check, and what did you learn?" required></textarea></label>
      </div><button type="submit" class="small primary">Save ${method} check</button>
      <p class="crm-check-error" role="alert"></p>
    </form></details>`;
}
export function crmMethodPanel(d,contact,method,native=false) {
  const info=crmContactMethod(contact,method);
  const label=method==='email'?'Email':'Phone';
  const additionalVerification=info.lastVerifiedAt && (info.source!==info.verificationSource || info.evidence!==info.verificationEvidence || info.sourceMessageId!==info.verificationMessageId);
  const showEvidence=(source,evidence,messageId)=>{
    const sourceEmail=messageId && d.crmEmails?.find(message=>message.id===messageId && message.contactId===contact.id);
    const link=sourceEmail?`<button type="button" class="crm-source-email" data-do="${native?'contact-source-email':'followup-contact'}" data-message="${crmEsc(sourceEmail.id)}">View source email</button>`:'';
    return [source,evidence].filter(Boolean).map(crmEsc).join(' · ')+link;
  };
  const savedEmail=native && method==='email' && emailCanBeUsed(contact);
  let interaction='';
  if(native){
    if(method==='email'&&!savedEmail)interaction=`<dl class="crm-method-entry">${contactEmailField(d,contact)}</dl>`;
    else if(method==='phone'&&!info.value)interaction=crmBtn('edit','Add phone number');
    if(info.value)interaction+=crmCheckForm(contact,method,info.value);
  }else{
    const title=info.value?'Record '+method+' check':'Add '+(method==='email'?'email address':'phone number');
    interaction=`<button type="button" class="outcome-source" data-do="followup-contact" data-method="${method}">${title}</button>`;
  }
  return `<section class="crm-method" data-method-panel="${method}" aria-labelledby="crm-${method}-title">
    <div class="crm-method-heading"><h3 id="crm-${method}-title">${label}</h3><span class="crm-method-status" data-status="${crmEsc(info.status)}">${crmEsc(info.status)}</span></div>
    <p class="crm-method-value" ${savedEmail?'data-saved-email tabindex="-1"':''}>${crmEsc(info.value || (method==='email'?'No saved email address':'No saved phone number'))}</p>
    <dl class="crm-method-dates"><div><dt>Last checked</dt><dd>${crmRecordTime(info.lastCheckedAt,'No check recorded')}</dd></div>
    <div><dt>Last verified</dt><dd>${crmRecordTime(info.lastVerifiedAt,'No verification recorded')}</dd></div>
    ${info.changedAt?'<div><dt>Value changed</dt><dd>'+crmRecordTime(info.changedAt)+'</dd></div>':''}
    ${info.lastCheckedAt?'<div class="crm-method-evidence"><dt>Check evidence</dt><dd>'+showEvidence(info.source,info.evidence,info.sourceMessageId)+'</dd></div>':''}
    ${info.recordedAt && info.recordedAt!==info.lastCheckedAt?'<div><dt>Check entered</dt><dd>'+crmRecordTime(info.recordedAt)+'</dd></div>':''}
    ${additionalVerification?'<div class="crm-method-evidence"><dt>Verification evidence</dt><dd>'+showEvidence(info.verificationSource,info.verificationEvidence,info.verificationMessageId)+'</dd></div>':''}</dl>
    ${interaction}</section>`;
}

function crmEntry(d, screen) {
  const v = screen.draft || {};
  const incoming = screen.incoming;
  const selected = v.accountId || '';
  const hasExact = screen.matches?.some(m=>m.exact);
  const matchList = screen.matches?.length ? `<section class="crm-match" aria-label="Duplicate review"><h3>Review matching contacts</h3>${screen.matches.map(m=>`<div class="crm-match-row"><span><strong>${crmEsc(m.name)}</strong> · ${crmEsc(m.reasons.join(', '))}</span>${!incoming || m.savedEmailMatch ? crmBtn('use-match', 'Use existing contact', `data-id="${crmEsc(m.id)}"`) : ''}</div>`).join('')}${hasExact?'': '<label class="crm-check"><input name="override" type="checkbox">I checked the matches. This is a different person.</label>'}</section>` : '';
  return `<section class="panel crm-card"><h2>${incoming?'Create contact for incoming email':screen.editingId?'Edit contact':'Add a contact'}</h2>${incoming?`<p>From ${crmEsc(incoming.sender)} · ${crmEsc(incoming.subject)}</p>`:''}<form data-crm-form="save" data-contact="${crmEsc(screen.editingId || '')}">${screen.editingId ? `<input type="hidden" name="originalEmail" value="${crmEsc(v.originalEmail ?? '')}"><input type="hidden" name="originalPhone" value="${crmEsc(v.originalPhone ?? '')}">` : ''}<div class="crm-fields">
    ${screen.phoneMessageId?`<p class="crm-wide">The phone field has the number from the email signature. Check it before saving. You can record a verification after speaking with the contact.</p>`:''}
    ${crmField('firstName','First name',v.firstName,'text',true)}${crmField('lastName','Last name',v.lastName,'text',true)}
    <label>Company<select name="accountId" required><option value="">Choose a company</option>${crmOptions(d.accounts,selected)}<option value="new" ${selected==='new'?'selected':''}>Add a new company…</option></select></label>
    ${crmField('title','Job title',v.title)}
    <fieldset class="crm-fields crm-wide" data-crm-company ${selected==='new'?'':'hidden'}><legend>New company</legend>${crmField('company','Company name',v.company)}${crmField('domain','Website domain',v.domain)}${crmField('region','Region',v.region)}</fieldset>
    ${incoming?`<label>Email<input type="email" name="email" readonly value="${crmEsc(incoming.sender)}"></label>`:contactEmailField(d,d.contacts.find(person=>person.id===screen.editingId),v)}${crmField('phone','Phone',v.phone,'tel')}
    <label>Record owner<select name="ownerId" required>${crmOptions(d.team,v.ownerId || d.team[0].id)}</select></label>${crmField('timezone','Time zone',v.timezone || 'Europe/London')}
    <label>Lead source<select name="source">${[...new Set(['Manual entry','Incoming email','Referral','Website enquiry','Event',v.source].filter(Boolean))].map(x=>`<option ${x===(incoming?'Incoming email':v.source)?'selected':''}>${crmEsc(x)}</option>`).join('')}</select></label>
    <label class="crm-wide">Business need or context<textarea name="need" rows="2">${crmEsc(v.need || '')}</textarea></label>
    <label class="crm-check"><input name="emailAllowed" type="checkbox" ${v.emailAllowed?'checked':''}> Email follow-up allowed</label>
    <label class="crm-check"><input name="callAllowed" type="checkbox" ${v.callAllowed?'checked':''}> Calls allowed</label>
    </div>${matchList}${crmFormActions(incoming?'Save contact and log email':'Check and save contact')}</form></section>`;
}
function crmEmailForm(d, c, screen) {
  const v = screen.mailDraft || {};
  if(screen.mode==='inbox')return `<section class="panel crm-card"><h2>Log an incoming email</h2>
    <form data-crm-form="receive"><div class="crm-fields">
    ${crmField('sender','Sender email', v.sender, 'email', true)}${crmField('received','Received at (local time)', v.received, 'datetime-local', true)}${crmField('messageId','Message-ID (optional)',v.messageId)}
    <label class="crm-wide">Subject<input name="subject" value="${crmEsc(v.subject || '')}" required></label>
    <label class="crm-wide">Message<textarea name="body" rows="5" required>${crmEsc(v.body || '')}</textarea></label>
    </div><div class="crm-actions">${emailCanBeUsed(c)?crmBtn('sample-signature','Example from '+crmEsc(c.name.split(' ')[0])):''}${crmBtn('sample-message','Example from a new contact')}</div>${crmFormActions('Match sender and log email')}</form></section>`;
  const original = v.replyToId && d.crmEmails?.find(m=>m.id===v.replyToId);
  const call = v.callId && d.calls.find(item=>item.id===v.callId);
  const current = emailCanBeUsed(c) ? c.email : '';
  const mismatch = v.address.trim().toLowerCase() !== current.trim().toLowerCase();
  const canReviewRecipient = !original || original.address.toLowerCase() === current.toLowerCase();
  const sendable = current && c.emailAllowed && !mismatch;
  let reason = '';
  if (!current) reason = 'Save a confirmed address on the contact before sending. You can save the draft now.';
  else if (!c.emailAllowed) reason = 'Email is turned off for this contact. You can still save this draft.';
  else if (mismatch) reason = canReviewRecipient ? 'The saved recipient has changed. Review the new address before sending.' : 'The original sender differs from the current contact address. Start a new email to use the current recipient.';
  return `<section class="panel crm-card"><h2>${original?'Reply to email':call?'Draft call follow-up':'Compose email'}</h2>
    ${original ? `<details class="crm-message"><summary>Original message · ${crmEsc(original.subject)}</summary><p>From ${crmEsc(original.address)}</p><pre>${crmEsc(original.body)}</pre></details>` : ''}
    ${call ? `<p>From the ${crmEsc(call.source.toLowerCase())} call on ${crmEsc(new Date(call.endedAt).toLocaleString('en-GB'))} · ${crmEsc(call.outcome)}</p>` : ''}
    <form data-crm-form="mail-editor" data-draft="${crmEsc(v.id)}"><div class="crm-fields">
      <p class="crm-wide">To <strong>${crmEsc(c.name)}</strong> · ${crmEsc(v.address || 'Awaiting address')}</p>
      ${reason ? `<p class="crm-wide">${crmEsc(reason)}</p>` : ''}
      ${mismatch && current && canReviewRecipient ? `<button type="submit" name="action" value="update-recipient" formnovalidate>Use ${crmEsc(current)}</button>` : ''}
      <label class="crm-wide">Subject<input name="subject" value="${crmEsc(v.subject)}" required></label>
      <label class="crm-wide">Message<textarea name="body" rows="6" required>${crmEsc(v.body)}</textarea></label>
    </div><div class="crm-actions"><button type="submit" name="action" value="save-draft" formnovalidate>Save draft</button><button type="submit" name="action" value="send-draft" class="primary" ${sendable?'':'disabled'}>Send in demo</button>${crmBtn('close','Cancel')}</div></form></section>`;
}
function crmContactMail(d,c) {
  return [...(d.crmEmails || []), ...d.emailOutbox].filter(m => m.contactId === c.id);
}

function crmLastInteraction(d,c) {
  let latest;
  function consider(at, label) {
    const time = Date.parse(at);
    if (Number.isFinite(time) && (!latest || time > latest.time)) latest = {at, time, label};
  }
  const mail=crmContactMail(d,c);
  for (const m of mail) {
    consider(m.at,(m.direction==='Incoming'?'Email received':'Email sent')+' · '+m.subject);
  }
  for (const call of d.calls) {
    if (call.contactId===c.id && call.status==='Logged') consider(call.endedAt,call.source+' call · '+call.outcome);
  }
  for (const event of d.salesActivity) {
    if (event.type!=='Reply received (demo)') continue;
    const original=mail.find(m=>m.id===event.recordId);
    if (original) consider(event.at,'Reply received · '+original.subject);
  }
  const overview=d.outcomePractice?.cases?.followup;
  if (c.id===d.id+'-contact0' && overview?.attempts===1) {
    consider(overview.history.find(event=>event.action==='send')?.at,'Practice email sent · '+(overview.sentMessage?.subject || 'Product overview'));
    const receipt=overview.followupRecordData?.receipt;
    if (receipt?.contactId===c.id) consider(receipt.at,'Customer confirmation recorded · '+receipt.channel);
  }
  return latest;
}

function crmProfileActivity(d,c) {
  const last=crmLastInteraction(d,c);
  const open=d.salesTasks.filter(task=>task.contactId===c.id && task.status==='Open');
  const calls=open.filter(task=>task.kind==='Scheduled call' && Number.isFinite(Date.parse(task.scheduledAt)))
    .sort((a,b)=>Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt));
  const now=Date.now(), upcoming=calls.find(task=>Date.parse(task.scheduledAt)>=now);
  const call=upcoming || calls[0];
  const owner=call && d.team.find(person=>person.id===call.ownerId);
  const tasks=open.filter(task=>task.kind!=='Scheduled call')
    .sort((a,b)=>(a.due || '9999').localeCompare(b.due || '9999'));
  const task=tasks[0];
  const previousNote=!last && c.lastTouch && c.lastTouch!=='No recent conversation';
  const previous=last ? crmEsc(last.label)+'<br>'+crmRecordTime(last.at)
    : previousNote ? crmEsc(c.lastTouch)+'<br>No date recorded' : 'No dated interaction recorded';
  const booking=call ? crmEsc([call.purpose || call.title,owner?.name].filter(Boolean).join(' · '))+'<br>'+(upcoming?'':'Overdue · ')+crmRecordTime(call.scheduledAt)
    : 'No call scheduled';
  const due=task?.due ? 'Due <time datetime="'+crmEsc(task.due)+'">'+crmEsc(task.due)+'</time>' : 'No due date recorded';
  return `<dl class="crm-details crm-profile-facts" aria-label="Contact activity summary">
    <div><dt>${previousNote?'Previous contact note':'Last interaction'}</dt><dd>${previous}</dd></div>
    <div><dt>Next scheduled call</dt><dd>${booking}</dd></div>
    <div><dt>Next open task${tasks.length>1?' ('+tasks.length+' open)':''}</dt><dd>${task?crmEsc(task.title)+'<br>'+due:'No open tasks'}</dd></div></dl>`;
}

function crmTimeline(d,c) {
  const mail = crmContactMail(d,c).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const calls = d.calls.filter(x=>x.contactId===c.id);
  const relatedIds = new Set([c.id,...calls.map(x=>x.id),...mail.map(x=>x.id),...d.callJobs.filter(x=>x.contactId===c.id).map(x=>x.id)]);
  const history = d.salesActivity.filter(x=>relatedIds.has(x.recordId));
  const drafts = (d.crmDrafts || []).filter(row=>row.contactId===c.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const item = m => {
    const original = m.replyToId && mail.find(other=>other.id===m.replyToId);
    const candidate=signaturePhoneCandidate(m,c);
    return `<details class="crm-message" data-email-record="${crmEsc(m.id)}"><summary><strong>${crmEsc(m.subject)}</strong><span>${crmEsc(m.direction==='Incoming'?'Received':m.status || 'Sent (demo)')}${m.at?' · '+crmRecordTime(m.at):''}</span></summary><p>${crmEsc(m.direction==='Incoming'?'From':'To')} ${crmEsc(m.address || m.to)}</p>
      ${original ? `<details><summary>In reply to ${crmEsc(original.subject)}</summary><pre>${crmEsc(original.body)}</pre></details>` : ''}
      ${m.callId ? `<p class="tiny muted">Linked call ${crmEsc(m.callId)}</p>` : ''}
      <pre>${crmEsc(m.body)}</pre>
      ${candidate?`<div class="crm-signature-review"><strong>Phone in signature</strong><p>${crmEsc(candidate.value)} · ${candidate.matchesSaved?'Matches the saved number':c.phone?'Saved number: '+crmEsc(c.phone):'No number on file'}</p>${candidate.matchesSaved?'':crmBtn('review-signature','Review phone change',`data-id="${crmEsc(m.id)}"`)}</div>`:''}
      ${m.direction==='Incoming'?crmBtn('reply','Reply',`data-id="${crmEsc(m.id)}"`):''}</details>`;
  };
  return `${drafts.length ? `<section class="panel crm-card"><h2>Email drafts</h2>${drafts.map(row=>`<div class="crm-match-row"><span><strong>${crmEsc(row.subject || 'Untitled email')}</strong> · Saved ${crmEsc(new Date(row.updatedAt).toLocaleString('en-GB'))}</span>${crmBtn('resume-draft','Edit draft',`data-id="${crmEsc(row.id)}"`)}</div>`).join('')}</section>` : ''}
    <section class="panel crm-card"><h2>Email history</h2>${mail.map(item).join('') || '<p>No emails logged for this contact.</p>'}</section>
    ${calls.length ? `<section class="panel crm-card"><h2>Calls &amp; notes</h2>${callHistory(d,c)}</section>` : ''}
    ${scheduledCallPanel(d,c)}
    <section class="panel crm-card"><h2>Contact activity</h2>${history.length?`<ul class="crm-history">${history.map(a=>`<li><strong>${crmEsc(a.type)}</strong> ${crmEsc(a.detail)}${a.at ? ` <time class="tiny muted" datetime="${crmEsc(a.at)}">${crmEsc(new Date(a.at).toLocaleString('en-GB'))}</time>` : ''}</li>`).join('')}</ul>`:'<p>No activity recorded this session.</p>'}</section>`;
}

export function contactWorkspace(d,s) {
  const screen=crmScreen(d), c=crmCurrent(d,s);
  if(screen.mode==='compose' && screen.composeId!==c.id)crmResetScreen(screen);
  const company=d.accounts.find(a=>a.id===c.accountId), owner=d.team.find(t=>t.id===c.ownerId);
  const record=`<section class="panel crm-card crm-contact-profile"><h2>${crmEsc(c.name)}</h2><p>${crmEsc([c.title,company?.name,c.exampleRecord==='contact-checks'?'Example record':''].filter(Boolean).join(' · '))}</p>
    <div class="crm-methods" aria-label="Current contact methods">${crmMethodPanel(d,c,'email',true)}${crmMethodPanel(d,c,'phone',true)}</div>
    ${crmProfileActivity(d,c)}
    <dl class="crm-details crm-profile-facts">${crmMeta('Owner',owner?.name)}${crmMeta('Time zone',c.timezone)}${crmMeta('Lead source',c.source || 'Sample record')}${crmMeta('Company domain',company?.domain)+crmMeta('Company region',company?.region)}${crmMeta('Contact preferences',[c.callAllowed?'Calls allowed':'Calls off',c.emailAllowed?'Email allowed':'Email off'].join(' · '))}${crmMeta('Business need',c.need)}</dl>
    <div class="crm-actions">${crmBtn('edit','Edit contact')}${crmBtn('compose','Compose email')}${studioButton('call-view','Open dialer','small','data-view="dialer"')}${company?studioButton('record','Company record','small',`data-id="${crmEsc(company.id)}"`):''}</div></section>`;
  return `<div class="page-heading"><div><p class="eyebrow">Sales CRM</p><h1>Contacts &amp; email</h1></div></div>
    <div class="panel crm-card crm-toolbar"><label>Working contact<select data-crm-select>${crmOptions(d.contacts.map(row=>({id:row.id,name:row.name+' · '+d.accounts.find(a=>a.id===row.accountId)?.name})),c.id)}</select></label><div class="crm-actions">${crmBtn('add','Add contact')}${crmBtn('inbox','Log incoming email')}</div></div>
    <div class="crm-content">${screen.mode==='entry'?crmEntry(d,screen):screen.mode==='compose'||screen.mode==='inbox'?crmEmailForm(d,c,screen):record+samProductOverview(d,c)+crmTimeline(d,c)}</div>`;
}
function crmResetScreen(screen,mode='record') {
  delete screen.editingId; delete screen.matches; delete screen.draft; delete screen.incoming; delete screen.mailDraft; delete screen.composeId; delete screen.phoneMessageId; screen.mode=mode;
}
function crmSelect(d,s,id) {
  const active=d.calls.find(c=>['Ringing','Connected','Wrap-up'].includes(c.status));
  if(active && active.contactId!==id) throw new Error('Finish the active call before changing the working contact.');
  s.callContact=id;
}
function crmSelectCheck(d) {
  if(d.calls.some(c=>['Ringing','Connected','Wrap-up'].includes(c.status))) throw new Error('Finish the active call before creating or matching a contact.');
}
function crmValues(form) {
  const values=Object.fromEntries(new FormData(form));
  if (Object.hasOwn(values,'suggestedEmail') && values.email === '') values.suggestedEmail='';
  return {...values,emailAllowed:!!form.elements.emailAllowed?.checked,callAllowed:!!form.elements.callAllowed?.checked};
}
export function crmInteraction(d,s,action,el) {
  const screen=crmScreen(d);
  if(action==='method-check'){
    if(crmCurrent(d,s).id!==el.dataset.contact)throw new Error('Reopen this contact before recording a check.');
    crmRecordMethodCheck(d,el.dataset.contact,Object.fromEntries(new FormData(el)));
    return el.dataset.method==='email'?'Email check recorded.':'Phone check recorded.';
  }
  if(action==='address-entry'){
    if(crmCurrent(d,s).id!==el.dataset.contact) throw new Error('Reopen this contact before recording an address.');
    const result=saveContactAddressEntry(d,el.dataset.contact,Object.fromEntries(new FormData(el)));
    return {entered:'Email saved.',suggested:'Unverified suggestion saved.',confirmed:'Confirmed address and source saved.'}[result];
  }
  if(action==='select'){crmSelect(d,s,el.value);crmResetScreen(screen);return '';}
  if(action==='edit'||action==='review-signature'){
    crmSelectCheck(d);
    const contact=crmCurrent(d,s), parts=contact.name.split(/\s+/);
    const message=action==='review-signature'&&(d.crmEmails||[]).find(row=>row.id===el.dataset.id);
    const candidate=message&&signaturePhoneCandidate(message,contact);
    if(action==='review-signature'&&(!candidate||candidate.matchesSaved))throw new Error('Reopen the incoming email to check the current number.');
    crmResetScreen(screen,'entry');screen.editingId=contact.id;
    screen.draft={...contact,originalEmail:contact.email || '',originalPhone:contact.phone || '',firstName:contact.firstName || parts[0],lastName:contact.lastName || parts.slice(1).join(' '),source:contact.source || 'Manual entry'};
    if(candidate){screen.phoneMessageId=message.id;screen.draft.phone=candidate.value;}
    return '';
  }
  if(['compose','reply','follow-up','resume-draft'].includes(action)){
    const c=crmCurrent(d,s);
    const existing=action==='resume-draft' && (d.crmDrafts || []).find(row=>row.id===el.dataset.id && row.contactId===c.id);
    if(action==='resume-draft' && !existing) throw new Error('This draft is no longer available.');
    const draft=existing ? {...existing} : crmBeginDraft(d,c.id,{
      replyToId:action==='reply'?el.dataset.id:'', callId:action==='follow-up'?el.dataset.id:''
    });
    crmResetScreen(screen,'compose');
    screen.composeId=c.id;screen.mailDraft=draft;s.view='contacts';
    return '';
  }
  if(['close','add','inbox'].includes(action)){
    if(action==='add'||action==='inbox')crmSelectCheck(d);
    crmResetScreen(screen, {close:'record',add:'entry',inbox:'inbox'}[action]);
    return '';
  }
  if(action==='sample-message'){
    screen.mailDraft={sender:'avery@northline.example',received:'2026-11-18T10:30',messageId:'sample-brief-01@northline.example',subject:'Delivery reporting brief',body:'Could you show our team how reporting moves from sales to delivery?'};
    return '';
  }
  if(action==='sample-signature'){
    const person=crmCurrent(d,s);
    if(!emailCanBeUsed(person))throw new Error('Choose a contact with a saved email address.');
    screen.mailDraft={sender:person.email,received:'2026-11-18T10:30',subject:'Direct number for our next call',
      messageId:'sample-signature-'+person.id+'@customer.example',
      body:'Please use my direct line for our next call.\n\nBest,\n'+person.name+'\nDirect: +44 1632 960042'};
    return '';
  }
  if(action==='use-match'){
    crmSelect(d,s,el.dataset.id);
    if(screen.incoming)crmLogInbound(d,screen.incoming);
    crmResetScreen(screen);return 'Existing contact opened.';
  }
  const v=crmValues(el);
  if(['save-draft','send-draft','update-recipient'].includes(action)){
    const contact=crmCurrent(d,s), draft=screen.mailDraft;
    if(!draft || draft.id!==el.dataset.draft || draft.contactId!==contact.id) throw new Error('Reopen the draft on its contact record.');
    Object.assign(draft,{subject:v.subject,body:v.body});
    if(action==='update-recipient'){
      const original=draft.replyToId && d.crmEmails?.find(m=>m.id===draft.replyToId);
      if(!emailCanBeUsed(contact) || (original && original.address.toLowerCase()!==contact.email.toLowerCase()))throw new Error('Review the contact’s saved address.');
      draft.address=contact.email;
      return 'Draft recipient updated.';
    }
    if(action==='save-draft')crmSaveDraft(d,draft);
    else crmSendDraft(d,draft);
    crmResetScreen(screen);
    return action==='save-draft'?'Draft saved on the contact.':'Simulated email added to the contact history.';
  }
  if(action==='receive'){
    const result=crmReadInbound(d,v);
    if(result.existing || result.contact){
      const id=result.existing?.contactId || result.contact.id;crmSelect(d,s,id);
      const saved=crmLogInbound(d,v);crmResetScreen(screen);
      return saved.duplicate?'Message already logged. Existing record opened.':'Incoming email linked to the contact and company.';
    }
    crmSelectCheck(d);crmResetScreen(screen,'entry');
    screen.incoming=v;
    const domain=result.email.address.split('@')[1];
    const company=d.accounts.find(a=>a.domain?.toLowerCase()===domain);
    screen.draft={email:v.sender,source:'Incoming email',accountId:company?.id || '',domain};
    return 'New sender. Add their contact details to finish logging this message.';
  }
  if(action==='save'){
    crmSelectCheck(d);
    if(screen.incoming)v.email=screen.incoming.sender;
    const check=crmReviewContact(d,v,screen.editingId);
    const reviewed=v.override==='on' && check.matches.length>0 && screen.matches?.length===check.matches.length && check.matches.every(m=>screen.matches.some(previous=>previous.id===m.id));
    if(check.matches.some(m=>m.exact) || (check.matches.length && !reviewed)){
      screen.draft=v;screen.matches=check.matches;return 'Review the matching contact records.';
    }
    const contact=crmSaveContact(d,v,{reviewed,editingId:screen.editingId});
    if(screen.phoneMessageId){
      const message=d.crmEmails.find(row=>row.id===screen.phoneMessageId);
      const candidate=message&&signaturePhoneCandidate(message,contact);
      if(candidate?.matchesSaved){
        crmRecordMethodCheck(d,contact.id,{method:'phone',value:contact.phone,result:'unconfirmed',source:'Email signature',
          sourceMessageId:message.id,evidence:'Listed in “'+message.subject+'” from '+message.address+'.'});
      }
    }
    if(screen.incoming)crmLogInbound(d,screen.incoming);
    crmSelect(d,s,contact.id);crmResetScreen(screen);return 'Contact saved.';
  }
  throw new Error('Unknown contact action.');
}
