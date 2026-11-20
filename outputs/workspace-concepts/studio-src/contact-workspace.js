import {saveContactAddressEntry} from './address-confirmation.js';
import {escapeHTML, studioButton} from './visuals.js';
import {crmReviewContact, crmSaveContact, crmReadInbound, crmLogInbound, crmBeginDraft, crmSaveDraft, crmSendDraft} from './contact-model.js';
import {callHistory} from './calling-views.js';
import {emailCanBeUsed} from './email-address.js';
import {contactEmailField} from './email-lookup.js';

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

function crmEntry(d, screen) {
  const v = screen.draft || {};
  const incoming = screen.incoming;
  const selected = v.accountId || '';
  const hasExact = screen.matches?.some(m=>m.exact);
  const matchList = screen.matches?.length ? `<section class="crm-match" aria-label="Duplicate review"><h3>Review matching contacts</h3>${screen.matches.map(m=>`<div class="crm-match-row"><span><strong>${crmEsc(m.name)}</strong> · ${crmEsc(m.reasons.join(', '))}</span>${!incoming || m.savedEmailMatch ? crmBtn('use-match', 'Use existing contact', `data-id="${crmEsc(m.id)}"`) : ''}</div>`).join('')}${hasExact?'': '<label class="crm-check"><input name="override" type="checkbox">I checked the matches. This is a different person.</label>'}</section>` : '';
  return `<section class="panel crm-card"><h2>${incoming?'Create contact for incoming email':screen.editingId?'Edit contact':'Add a contact'}</h2>${incoming?`<p>From ${crmEsc(incoming.sender)} · ${crmEsc(incoming.subject)}</p>`:''}<form data-crm-form="save" data-contact="${crmEsc(screen.editingId || '')}">${screen.editingId ? `<input type="hidden" name="originalEmail" value="${crmEsc(v.originalEmail ?? '')}">` : ''}<div class="crm-fields">
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
    </div>${crmBtn('sample-message','Fill with sample email')}${crmFormActions('Match sender and log email')}</form></section>`;
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
function crmTimeline(d,c) {
  const mail = [...(d.crmEmails || []), ...d.emailOutbox]
    .filter(m => m.contactId === c.id)
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const calls = d.calls.filter(x=>x.contactId===c.id);
  const relatedIds = new Set([c.id,...calls.map(x=>x.id),...mail.map(x=>x.id),...d.callJobs.filter(x=>x.contactId===c.id).map(x=>x.id)]);
  const history = d.salesActivity.filter(x=>relatedIds.has(x.recordId));
  const drafts = (d.crmDrafts || []).filter(row=>row.contactId===c.id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const item = m => {
    const original = m.replyToId && mail.find(other=>other.id===m.replyToId);
    return `<details class="crm-message"><summary><strong>${crmEsc(m.subject)}</strong><span>${crmEsc(m.direction==='Incoming'?'Received':m.status || 'Sent (demo)')}</span></summary><p>${crmEsc(m.direction==='Incoming'?'From':'To')} ${crmEsc(m.address || m.to)}${m.at?' · '+crmEsc(new Date(m.at).toLocaleString('en-GB')):''}</p>
      ${original ? `<details><summary>In reply to ${crmEsc(original.subject)}</summary><pre>${crmEsc(original.body)}</pre></details>` : ''}
      ${m.callId ? `<p class="tiny muted">Linked call ${crmEsc(m.callId)}</p>` : ''}
      <pre>${crmEsc(m.body)}</pre>${m.direction==='Incoming'?crmBtn('reply','Reply',`data-id="${crmEsc(m.id)}"`):''}</details>`;
  };
  return `${drafts.length ? `<section class="panel crm-card"><h2>Email drafts</h2>${drafts.map(row=>`<div class="crm-match-row"><span><strong>${crmEsc(row.subject || 'Untitled email')}</strong> · Saved ${crmEsc(new Date(row.updatedAt).toLocaleString('en-GB'))}</span>${crmBtn('resume-draft','Edit draft',`data-id="${crmEsc(row.id)}"`)}</div>`).join('')}</section>` : ''}
    <section class="panel crm-card"><h2>Email history</h2>${mail.map(item).join('') || '<p>No emails logged for this contact.</p>'}</section>
    ${calls.length ? `<section class="panel crm-card"><h2>Calls &amp; notes</h2>${callHistory(d,c)}</section>` : ''}
    <section class="panel crm-card"><h2>Contact activity</h2>${history.length?`<ul class="crm-history">${history.map(a=>`<li><strong>${crmEsc(a.type)}</strong> ${crmEsc(a.detail)}${a.at ? ` <time class="tiny muted" datetime="${crmEsc(a.at)}">${crmEsc(new Date(a.at).toLocaleString('en-GB'))}</time>` : ''}</li>`).join('')}</ul>`:'<p>No activity recorded this session.</p>'}</section>`;
}

export function contactWorkspace(d,s) {
  const screen=crmScreen(d), c=crmCurrent(d,s);
  if(screen.mode==='compose' && screen.composeId!==c.id)crmResetScreen(screen);
  const company=d.accounts.find(a=>a.id===c.accountId), owner=d.team.find(t=>t.id===c.ownerId);
  const record=`<section class="panel crm-card"><h2>${crmEsc(c.name)}</h2><p>${crmEsc([c.title,company?.name].filter(Boolean).join(' · '))}</p>
    <dl class="crm-details">${contactEmailField(d,c)}${crmMeta('Phone',c.phone)}${crmMeta('Owner',owner?.name)}${crmMeta('Time zone',c.timezone)}${crmMeta('Lead source',c.source || 'Sample record')}${crmMeta('Company domain',company?.domain)+crmMeta('Company region',company?.region)}${crmMeta('Contact preferences',[c.callAllowed?'Calls allowed':'Calls off',c.emailAllowed?'Email allowed':'Email off'].join(' · '))}${crmMeta('Business need',c.need)}</dl>
    <div class="crm-actions">${crmBtn('edit','Edit contact')}${crmBtn('compose','Compose email')}${studioButton('call-view','Open dialer','small','data-view="dialer"')}${company?studioButton('record','Company record','small',`data-id="${crmEsc(company.id)}"`):''}</div></section>`;
  return `<div class="page-heading"><div><p class="eyebrow">Sales CRM</p><h1>Contacts &amp; email</h1><p>Manage customer records and correspondence in this demo session.</p></div></div>
    <div class="panel crm-card crm-toolbar"><label>Working contact<select data-crm-select>${crmOptions(d.contacts.map(row=>({id:row.id,name:row.name+' · '+d.accounts.find(a=>a.id===row.accountId)?.name})),c.id)}</select></label><div class="crm-actions">${crmBtn('add','Add contact')}${crmBtn('inbox','Log incoming email')}</div></div>
    <div class="crm-content">${screen.mode==='entry'?crmEntry(d,screen):screen.mode==='compose'||screen.mode==='inbox'?crmEmailForm(d,c,screen):record+crmTimeline(d,c)}</div>`;
}
function crmResetScreen(screen,mode='record') {
  delete screen.editingId; delete screen.matches; delete screen.draft; delete screen.incoming; delete screen.mailDraft; delete screen.composeId; screen.mode=mode;
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
  if(action==='address-entry'){
    if(crmCurrent(d,s).id!==el.dataset.contact) throw new Error('Reopen this contact before recording an address.');
    const result=saveContactAddressEntry(d,el.dataset.contact,Object.fromEntries(new FormData(el)));
    return {entered:'Email saved.',suggested:'Unverified suggestion saved.',confirmed:'Confirmed address and source saved.'}[result];
  }
  if(action==='select'){crmSelect(d,s,el.value);crmResetScreen(screen);return '';}
  if(action==='edit'){
    crmSelectCheck(d);
    const contact=crmCurrent(d,s), parts=contact.name.split(/\s+/);
    crmResetScreen(screen,'entry');screen.editingId=contact.id;
    screen.draft={...contact,originalEmail:contact.email || '',firstName:contact.firstName || parts[0],lastName:contact.lastName || parts.slice(1).join(' '),source:contact.source || 'Manual entry'};
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
    if(screen.incoming)crmLogInbound(d,screen.incoming);
    crmSelect(d,s,contact.id);crmResetScreen(screen);return 'Contact saved.';
  }
  throw new Error('Unknown contact action.');
}
