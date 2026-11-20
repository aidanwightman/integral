import {salesEvent, saveContactEmail} from './calling.js';
import {escapeHTML} from './visuals.js';
import {contactHasAddress, emailCanBeUsed, matchesAddressSuggestion, setContactAddress, validContactAddress} from './email-address.js';

const addressSources = new Map([
  ['direct', 'Supplied by the contact'],
  ['directory', 'Confirmed in the company directory']
]);

function confirmedAddressSources(d, contactId) {
  const choices = new Map(addressSources);
  for (const call of d.calls) {
    if (call.contactId !== contactId || call.status !== 'Logged' || !call.connected) continue;
    const time = new Date(call.endedAt).toLocaleString('en-GB');
    choices.set(call.id, 'Confirmed on the ' + time + ' call');
  }
  return choices;
}

export function recordConfirmedAddress(d, contactId, fields) {
  const contact = d.contacts.find(person => person.id === contactId);
  if (!contact) throw new Error('Select the contact who supplied the address.');
  const address = String(fields.address || '').trim().toLowerCase();
  const detail = String(fields.detail || '').trim();
  const source = confirmedAddressSources(d, contactId).get(fields.sourceId);
  if (!source || !detail) throw new Error('Choose a source and describe where you found the confirmed address.');
  if (!validContactAddress(address)) throw new Error('Enter the address confirmed by your source.');
  if (contact.email?.toLowerCase() === address && /bounc|undeliverable|invalid|failed/i.test(contact.emailStatus || ''))
    throw new Error('This address has a recorded delivery failure. Enter a corrected address.');
  if (emailCanBeUsed(contact)) {
    const previous = contact.emailEvidence;
    if (contact.email.toLowerCase() === address && previous?.address === address &&
        previous.sourceId === fields.sourceId && previous.detail === detail) return previous;
    throw new Error('This contact already has a saved address. Review the current contact before editing it.');
  }

  // Use the ordinary saved-address path, including duplicate checks and waiting follow-ups.
  const evidence = {address, sourceId: fields.sourceId, source, detail, at: new Date().toISOString(), actor: 'Demo operator'};
  saveContactEmail(d, contactId, address, evidence);
  const description = address + ' · ' + source + ' · ' + detail;
  d.activity.unshift({action: 'Email address confirmed', recordId: contactId, accountId: contact.accountId,
    at: evidence.at, actor: evidence.actor, detail: description});
  salesEvent(d, 'Email address confirmed', contactId, description);
  return evidence;
}

export function saveContactAddressEntry(d, contactId, fields) {
  if (fields.sourceId || String(fields.detail || '').trim()) {
    recordConfirmedAddress(d, contactId, fields);
    return 'confirmed';
  }
  const contact = d.contacts.find(person => person.id === contactId);
  if (!contact) throw new Error('Select the contact before saving the email address.');
  const address = String(fields.address || '').trim().toLowerCase();
  if (!validContactAddress(address)) throw new Error('Enter a complete email address.');
  if (emailCanBeUsed(contact)) {
    if (contact.email.trim().toLowerCase() === address) return contact.emailEvidence ? 'confirmed' : 'entered';
    throw new Error('This contact already has a saved address. Review the contact before editing it.');
  }
  if (d.contacts.some(person => person.id !== contactId && contactHasAddress(person, address)))
    throw new Error('This address is already associated with another contact. Review that record.');
  const existing = (contact.email || '').trim().toLowerCase();
  if (existing === address && /bounc|undeliverable|invalid|failed/i.test(contact.emailStatus || ''))
    throw new Error('This address has a recorded delivery failure. Enter a corrected address.');
  if (matchesAddressSuggestion(contact, address, fields.suggestedEmail)) {
    if (matchesAddressSuggestion(contact, existing)) setContactAddress(contact, '');
    if (contact.suggestedEmail !== address) {
      contact.suggestedEmail = address;
      salesEvent(d, 'Email suggestion saved', contactId, address);
    }
    return 'suggested';
  }
  if (existing === address && !emailCanBeUsed(contact))
    throw new Error('Review the source and status of this address before using it.');
  saveContactEmail(d, contactId, address);
  return 'entered';
}

export function contactAddressEvidence(d, contact) {
  const e = escapeHTML;
  if (emailCanBeUsed(contact)) {
    const evidence = contact.emailEvidence;
    if (!evidence || evidence.address !== contact.email.trim().toLowerCase()) return '';
    return '<p class="tiny">Address source · ' + e(evidence.source) + ' · ' + e(evidence.detail) +
      ' · recorded ' + e(new Date(evidence.at).toLocaleString('en-GB')) + '</p>';
  }
  return '';
}

export function addressSourceOptions(d, contactId) {
  return Array.from(confirmedAddressSources(d, contactId), ([value, label]) =>
    '<option value="' + escapeHTML(value) + '">' + escapeHTML(label) + '</option>').join('');
}
