import {salesEvent,processCallJobs} from './calling.js';
import {contactHasAddress, emailCanBeUsed, matchesAddressSuggestion, setContactAddress, validContactAddress} from './email-address.js';
import {contactMethodChanged, normalizedContactMethod, readContactMethodEvidence, writeContactMethodCheck} from './contact-evidence.js';
import {parseWorkspaceDateTime} from './workspace-date.js';

const crmText = value => String(value ?? '').trim();
const crmFold = value => crmText(value).toLowerCase().replace(/\s+/g, ' ');
const crmEmail = value => crmText(value).toLowerCase();
const crmPhone = value => crmText(value).replace(/[^0-9]/g, '');
const crmNextId = (d, kind) => d.id + '-' + kind + '-' + d.nextSalesId++;

function crmLog(d, contact, action, detail, at) {
  d.activity.unshift({action, detail, at, actor: 'Demo operator', recordId: contact.id, accountId: contact.accountId});
  salesEvent(d, action, contact.id, detail);
}

function crmCompany(d, fields) {
  if (fields.accountId !== 'new') {
    const account = d.accounts.find(a => a.id === fields.accountId);
    if (!account) throw new Error('Select a company.');
    return {account};
  }
  const name = crmText(fields.company);
  const domain = crmEmail(fields.domain).replace(/^www\./, '');
  if (!name || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    throw new Error('Enter the new company name and its website domain, such as northline.example.');
  }
  const existing = d.accounts.find(a => crmFold(a.name) === crmFold(name) || crmEmail(a.domain) === domain);
  if (existing) throw new Error('This company matches ' + existing.name + '. Select the existing company from the list.');
  return {newCompany: {name, domain, onboardingStatus:'Prospect', segment: 'Unclassified', region: crmText(fields.region) || 'Unspecified'}};
}

export function crmReviewContact(d, fields, editingId = null) {
  const firstName = crmText(fields.firstName), lastName = crmText(fields.lastName);
  if (!firstName || !lastName) throw new Error('Enter the first name and last name.');
  if (!d.team.some(t => t.id === fields.ownerId)) throw new Error('Choose a record owner.');
  const existing = editingId ? d.contacts.find(c => c.id === editingId) : null;
  const typed = crmEmail(fields.email ?? existing?.email);
  const marker = crmEmail(fields.suggestedEmail);
  const address = typed || (Object.hasOwn(fields, 'suggestedEmail') ? marker : crmEmail(existing?.suggestedEmail));
  if (address && !validContactAddress(address)) throw new Error('Enter a complete email address or leave it blank.');
  const savedUnchanged = emailCanBeUsed(existing) && address === crmEmail(existing.email);
  const suggestedEmail = !savedUnchanged && matchesAddressSuggestion(existing, address, marker) ? address : '';
  if (suggestedEmail && emailCanBeUsed(existing)) throw new Error('This contact already has a saved address. Review it before saving a suggestion.');
  const email = suggestedEmail ? '' : address;
  const phone = crmText(fields.phone ?? existing?.phone);
  if (phone && (crmPhone(phone).length < 7 || crmPhone(phone).length > 16)) throw new Error('Enter a complete phone number or leave it blank.');
  if (fields.callAllowed && !phone) throw new Error('Add a phone number before enabling calls.');
  const company = crmCompany(d, fields);
  const name = firstName + ' ' + lastName;
  const matches = d.contacts.flatMap(contact => {
    if (contact.id === editingId) return [];
    const reasons = [];
    const addressMatch = contactHasAddress(contact, address);
    const savedMatch = addressMatch && crmEmail(contact.email) === address && !matchesAddressSuggestion(contact, address);
    if (addressMatch) reasons.push(savedMatch ? 'same email' : 'same address on another record (unverified)');
    if (company.account && contact.accountId === company.account.id && crmFold(contact.name) === crmFold(name)) reasons.push('same name and company');
    if (phone && crmPhone(contact.phone) === crmPhone(phone)) reasons.push('same phone');
    return reasons.length ? [{id: contact.id, name: contact.name, reasons, exact: addressMatch, savedEmailMatch: savedMatch}] : [];
  });
  return {company, name, firstName, lastName, email, suggestedEmail, phone, matches};
}

export function crmSaveContact(d, fields, {reviewed = false, editingId = null} = {}) {
  const existing = editingId ? d.contacts.find(c => c.id === editingId) : null;
  if (editingId && !existing) throw new Error('This contact is no longer available.');
  if (existing && Object.hasOwn(fields, 'originalEmail') && crmEmail(fields.originalEmail) !== crmEmail(existing.email))
    throw new Error('The saved address changed since you opened this contact. Reopen it to review the current address.');
  if (existing && Object.hasOwn(fields, 'originalPhone') && normalizedContactMethod('phone',fields.originalPhone) !== normalizedContactMethod('phone',existing.phone))
    throw new Error('The phone number changed since you opened this contact. Reopen it to review the current number.');
  const check = crmReviewContact(d, fields, editingId);
  if (check.matches.some(m => m.exact) || (check.matches.length && !reviewed)) throw new Error('Review the matching records before creating a contact.');
  const owner = d.team.find(t => t.id === fields.ownerId);
  const account = check.company.account || {...check.company.newCompany, id: crmNextId(d, 'company'), owner: owner.name};
  const contact = {
    id: existing?.id || crmNextId(d, 'contact'), accountId: account.id, ownerId: owner.id, name: check.name, firstName: check.firstName,
    lastName: check.lastName, email: check.email, phone: check.phone, title: crmText(fields.title),
    timezone: crmText(fields.timezone) || 'Unspecified', need: crmText(fields.need), source: crmText(fields.source) || 'Manual entry',
    emailAllowed: !!fields.emailAllowed, callAllowed: !!fields.callAllowed, queueStatus: fields.callAllowed ? 'Ready' : 'Excluded',
    lastTouch: existing?.lastTouch || 'Record created'
  };
  if (check.suggestedEmail) contact.suggestedEmail = check.suggestedEmail;
  if (check.company.newCompany) d.accounts.push(account);
  if (existing) {
    if (existing.callAllowed === contact.callAllowed) contact.queueStatus=existing.queueStatus;
    const preferencesChanged = existing.emailAllowed !== contact.emailAllowed;
    const addressChanged = existing.email !== contact.email;
    contactMethodChanged(existing,'phone',contact.phone);
    setContactAddress(existing,contact.email);
    if (!check.suggestedEmail && Object.hasOwn(fields,'suggestedEmail')) delete existing.suggestedEmail;
    Object.assign(existing, contact);
    crmLog(d, existing, 'Contact updated', existing.source + ' · ' + account.name, new Date().toISOString());
    if (preferencesChanged || (addressChanged && emailCanBeUsed(existing))) processCallJobs(d);
    return existing;
  }
  d.contacts.push(contact);
  crmLog(d, contact, 'Contact created', contact.source + ' · ' + account.name, new Date().toISOString());
  return contact;
}

export function crmContactMethod(contact, method) {
  return readContactMethodEvidence(contact, method);
}

export function crmRecordMethodCheck(d, contactId, {method,value,result,source,evidence,checkedAt,sourceMessageId} = {}) {
  const contact = d.contacts.find(person=>person.id===contactId);
  if (!contact) throw new Error('Open the contact before recording a check.');
  const current = normalizedContactMethod(method, contact[method]);
  if (!current || current !== normalizedContactMethod(method,value)) throw new Error('The saved contact detail changed. Reopen the contact and check its current value.');
  if (!['verified','unconfirmed'].includes(result)) throw new Error('Choose the result of the check.');
  source = crmText(source); evidence = crmText(evidence);
  if (!source || !evidence) throw new Error('Choose a source and describe what you checked.');
  if (result === 'verified') {
    if (method === 'email' && !emailCanBeUsed(contact)) throw new Error('Review or correct the saved address before verifying it.');
    if (method === 'phone' && !/^\+?\d{7,16}(?:x\d+)?$/.test(current)) throw new Error('Save a complete phone number before verifying it.');
  }
  const recordedAt = new Date().toISOString();
  const at = checkedAt ? parseWorkspaceDateTime(checkedAt).toISOString() : recordedAt;
  if (at>recordedAt) throw new Error('The check must have taken place in the past.');
  const message = sourceMessageId && d.crmEmails?.find(m=>m.id===sourceMessageId && m.direction==='Incoming' && m.contactId===contactId);
  if (sourceMessageId && !message) throw new Error('Choose an incoming email logged for this contact.');
  if (message && Date.parse(at)<Date.parse(message.at)) throw new Error('The check must be on or after the source email was received.');
  const check={at,recordedAt,result,source,evidence,...(message?{sourceMessageId:message.id}:{})};
  writeContactMethodCheck(contact,method,check,message?.at || at);
  const action = (method === 'email' ? 'Email' : 'Phone') + (result === 'verified' ? ' verified' : ' checked — unconfirmed');
  crmLog(d,contact,action,contact[method]+' · '+source+' · '+evidence,recordedAt);
  const audit={contactMethod:method,methodValue:current,checkedAt:at,result,...(message?{sourceMessageId:message.id}:{})};
  Object.assign(d.salesActivity[0],audit);
  Object.assign(d.activity[0],audit,{id:d.salesActivity[0].id});
  return crmContactMethod(contact,method);
}

export function crmReadInbound(d, fields) {
  const address = crmEmail(fields.sender), subject = crmText(fields.subject), body = crmText(fields.body);
  if (!validContactAddress(address) || !subject || !body) throw new Error('Enter a sender address, subject and message.');
  const when = new Date(fields.received);
  if (!Number.isFinite(when.getTime())) throw new Error('Choose when the message was received.');
  const at = when.toISOString(), messageId = crmText(fields.messageId);
  const fingerprint = JSON.stringify([address, at, subject, body]);
  const existing = (d.crmEmails || []).find(m => m.direction === 'Incoming' && ((messageId && m.messageId === messageId) || m.fingerprint === fingerprint));
  if (existing && existing.fingerprint !== fingerprint) throw new Error('This message ID is already attached to a different email. Check the original message.');
  const contact = d.contacts.find(c => crmEmail(c.email) === address && !matchesAddressSuggestion(c, address));
  return {contact, existing, email: {direction:'Incoming', address, at, subject, body, messageId, fingerprint}};
}

export function crmLogInbound(d, fields) {
  const {contact, existing, email} = crmReadInbound(d, fields);
  if (existing) return {contactId: existing.contactId, duplicate: true};
  if (!contact) throw new Error('Create or link the sender’s contact record first.');
  const record = {...email, id: crmNextId(d, 'inbound'), contactId: contact.id, accountId: contact.accountId};
  (d.crmEmails ||= []).unshift(record);
  contact.lastTouch = 'Incoming email logged';
  crmLog(d, contact, contact.lastTouch, record.subject, record.at);
  return {contactId: contact.id, duplicate: false};
}

export function crmSendEmail(d, contactId, fields) {
  const contact = d.contacts.find(c => c.id === contactId);
  if (!emailCanBeUsed(contact)) throw new Error('A saved contact email is required.');
  if (!contact.emailAllowed) throw new Error('Email follow-up is disabled for this contact.');
  const subject = crmText(fields.subject), body = crmText(fields.body);
  if (!subject || !body) throw new Error('Enter a subject and a message.');
  const message = {id: crmNextId(d, 'outgoing'), contactId, accountId: contact.accountId, direction:'Outgoing', status:'Sent (demo)', address:contact.email, subject, body, at:new Date().toISOString()};
  (d.crmEmails ||= []).unshift(message);
  contact.lastTouch = 'Email sent (demo)';
  crmLog(d, contact, contact.lastTouch, subject, message.at);
  return message;
}

export function crmBeginDraft(d, contactId, {replyToId = '', callId = ''} = {}) {
  const contact = d.contacts.find(person => person.id === contactId);
  if (!contact) throw new Error('Open the contact before composing an email.');
  const original = replyToId && (d.crmEmails || []).find(m => m.id === replyToId && m.contactId === contactId && m.direction === 'Incoming');
  if (replyToId && !original) throw new Error('Open an incoming message from this contact to reply.');
  const call = callId && d.calls.find(item => item.id === callId && item.contactId === contactId && item.status === 'Logged');
  if (callId && !call) throw new Error('Choose a completed call for this contact.');
  const draft = {
    id:crmNextId(d,'draft'), contactId, accountId:contact.accountId, version:0, replyToId, callId,
    address:emailCanBeUsed(contact) ? (original?.address || contact.email) : '', subject:'', body:''
  };
  if (original) draft.subject = /^re:/i.test(original.subject) ? original.subject : 'Re: ' + original.subject;
  if (call) {
    draft.subject = 'Following up on our call';
    draft.body = 'Hi ' + (contact.firstName || contact.name.split(' ')[0]) + ',\n\n' +
      (call.nextStep ? 'We agreed on the following next step.\n' + call.nextStep : 'Thank you for your time.') + '\n\n';
  }
  return draft;
}

function crmCheckDraft(d, draft) {
  if (!draft.id || !d.contacts.some(c => c.id === draft.contactId)) throw new Error('Open a contact and start an email draft.');
  const saved = (d.crmDrafts || []).find(item => item.id === draft.id);
  if ((saved?.version || 0) !== draft.version || (saved && (saved.contactId !== draft.contactId || saved.replyToId !== draft.replyToId || saved.callId !== draft.callId))) {
    throw new Error('The saved draft has changed. Reopen it from the contact to continue.');
  }
  if (draft.replyToId && !(d.crmEmails || []).some(m => m.id === draft.replyToId && m.direction === 'Incoming' && m.contactId === draft.contactId)) {
    throw new Error('The original incoming message is unavailable.');
  }
  if (draft.callId && !d.calls.some(c => c.id === draft.callId && c.contactId === draft.contactId && c.status === 'Logged')) {
    throw new Error('The linked call is unavailable.');
  }
  return saved;
}

export function crmSaveDraft(d, draft) {
  if ((d.crmEmails || []).some(message => message.draftId === draft.id)) throw new Error('This draft has already been sent.');
  const previous = (d.crmDrafts || []).find(row => row.id === draft.id);
  if (previous && [previous.version, previous.version-1].includes(draft.version) &&
      ['contactId','callId','replyToId','subject','body','address'].every(key => previous[key] === draft[key])) return {...previous};
  const saved = crmCheckDraft(d,draft);
  if (!crmText(draft.subject) && !crmText(draft.body)) throw new Error('Add a subject or some message text before saving the draft.');
  const contact = d.contacts.find(person => person.id === draft.contactId);
  const next = {...draft, accountId:contact.accountId, version:draft.version + 1, updatedAt:new Date().toISOString()};
  if (saved) Object.assign(saved,next);
  else (d.crmDrafts ||= []).unshift(next);
  crmLog(d, contact, 'Email draft saved', crmText(draft.subject) || 'Untitled email', next.updatedAt);
  return {...next};
}

export function crmSendDraft(d, draft) {
  const sent = (d.crmEmails || []).find(message => message.draftId === draft.id);
  if (sent) {
    if (sent.contactId === draft.contactId && sent.replyToId === draft.replyToId && sent.callId === draft.callId &&
        crmEmail(sent.address) === crmEmail(draft.address) && sent.subject === crmText(draft.subject) && sent.body === crmText(draft.body)) return sent;
    throw new Error('This draft has already been sent.');
  }
  const saved = crmCheckDraft(d,draft);
  const contact = d.contacts.find(person => person.id === draft.contactId);
  if (!draft.address || crmEmail(draft.address) !== crmEmail(contact.email)) {
    throw new Error('Review the current saved recipient before sending.');
  }
  const original = draft.replyToId && d.crmEmails.find(message => message.id === draft.replyToId);
  if (original && crmEmail(original.address) !== crmEmail(draft.address)) throw new Error('The original sender differs from this address. Compose a new email to the current recipient.');
  const message = crmSendEmail(d,contact.id,draft);
  Object.assign(message,{draftId:draft.id, replyToId:draft.replyToId, threadId:original?.threadId || original?.id || message.id, callId:draft.callId});
  if (saved) d.crmDrafts = d.crmDrafts.filter(item => item.id !== draft.id);
  return message;
}
