import {contactMethodChanged} from './contact-evidence.js';

export function validContactAddress(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value || '').trim());
}

export function emailCanBeUsed(contact) {
  return validContactAddress(contact?.email) &&
    !/inferred|guess|suggest|unverified|invalid|bounc|undeliverable|failed|unknown|catch[- ]all|accept[- ]all/i.test(contact.emailStatus || '');
}

function normalizedContactAddress(address) {
  return String(address || '').trim().toLowerCase();
}

export function contactHasAddress(contact, address) {
  const value = normalizedContactAddress(address);
  const aliases = Array.isArray(contact.emailAliases) ? contact.emailAliases : [];
  return Boolean(value) && [contact.email, contact.suggestedEmail, ...aliases].some(item => normalizedContactAddress(item) === value);
}

export function matchesAddressSuggestion(contact, address, selectedSuggestion) {
  const value = normalizedContactAddress(address);
  if (!value) return false;
  if ([selectedSuggestion, contact?.suggestedEmail].some(item => normalizedContactAddress(item) === value)) return true;
  return normalizedContactAddress(contact?.email) === value && /inferred|guess|suggest|unverified/i.test(contact?.emailStatus || '');
}

export function setContactAddress(contact, address) {
  contactMethodChanged(contact, 'email', address);
  if ((contact.email || '').trim().toLowerCase() !== address.toLowerCase()) {
    delete contact.emailEvidence;
    delete contact.emailStatus;
  }
  contact.email = address;
  if (address) delete contact.suggestedEmail;
}
