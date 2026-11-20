import {escapeHTML} from './visuals.js';
import {emailCanBeUsed} from './email-address.js';
import {addressSourceOptions, contactAddressEvidence} from './address-confirmation.js';
import {contactEmailResearch, researchContactEmail} from './email-research.js';

const wandIcon = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 12-12 3 3L6 24z" transform="translate(0 -2)"/><path d="m12 10 3 3M5 3v4M3 5h4M18 2v5m-2.5-2.5h5M20 16v4m-2-2h4"/></svg>';

// Keep the property editor mounted behind the modal, including text that has not been saved.
export function contactEmailField(d, contact, entry = null) {
  const e = escapeHTML;
  const pending = entry?.suggestedEmail ?? contact?.suggestedEmail ?? '';
  const original = contact?.email || '';
  const saved = emailCanBeUsed(contact);
  if (!entry && saved) return '<div><dt>Email</dt><dd tabindex="-1" data-saved-email>' + e(original) + contactAddressEvidence(d, contact) + '</dd></div>';
  const value = entry ? (entry.email || pending) : (pending || '');
  const inputId = entry ? 'entry-contact-email' : 'record-contact-email';
  const trigger = '<button type="button" class="crm-find-email" data-open-email-lookup data-do="find-email" aria-haspopup="dialog">' + wandIcon + '<span>Find email</span></button>';
  const fieldLabel = '<label for="' + inputId + '">Email</label>';
  const controls = '<div class="crm-email-controls"><input data-email-entry id="' + inputId + '" type="email" autocomplete="off" name="' + (entry ? 'email' : 'address') + '" value="' + e(value) + '" placeholder="Enter email address">' +
    (entry && saved ? '' : trigger) + '</div>';
  const hidden = '<input type="hidden" name="suggestedEmail" value="' + e(pending) + '">';
  const isPending = Boolean(value && pending && value.toLowerCase() === pending.toLowerCase());
  const note = '<p class="crm-email-note tiny" data-email-suggestion-note' + (isPending ? '' : ' hidden') + '>Unverified suggestion. Confirmation is needed before sending.</p>';
  if (entry) return '<div data-email-field>' + fieldLabel + controls + hidden + note + '</div>';
  const review = original ? '<p class="crm-email-note tiny">Previous entry · ' + e(original) + ' · ' + e(contact.emailStatus || 'Needs review') + '</p>' : '';
  const waiting = d.callJobs.some(job => job.contactId === contact.id && job.status === 'Waiting for email');
  const source = '<details class="crm-email-options"><summary>Add confirmation source</summary><div class="crm-fields">' +
    '<label>Confirmation source<select name="sourceId"><option value="">Choose a source</option>' + addressSourceOptions(d, contact.id) + '</select></label>' +
    '<label>Source detail<input name="detail" maxlength="500" placeholder="Where was the address confirmed?"></label></div></details>';
  return '<div data-email-field><dt>' + fieldLabel + '</dt><dd><form data-crm-form="address-entry" data-contact="' + e(contact.id) + '">' +
    controls + hidden + review + note + '<div class="crm-email-tools"' + (value ? '' : ' hidden') + '>' + source +
    (waiting ? '<p class="tiny muted">A waiting follow-up will recheck a saved address.</p>' : '') +
    '<button type="submit" class="small" data-email-save>' + (isPending ? 'Save suggestion' : 'Save email') + '</button></div></form></dd></div>';
}

export function updateContactEmailField(field) {
  const input = field.querySelector('[data-email-entry]');
  const marker = field.querySelector('[name="suggestedEmail"]');
  const value = input.value.trim().toLowerCase();
  const pending = Boolean(value && value === marker.value.trim().toLowerCase());
  field.querySelector('[data-email-suggestion-note]').hidden = !pending;
  const tools = field.querySelector('.crm-email-tools');
  if (!tools) return;
  tools.hidden = !value;
  const source = field.querySelector('[name="sourceId"]').value;
  field.querySelector('[data-email-save]').textContent = source ? 'Save confirmed address' : pending ? 'Save suggestion' : 'Save email';
}

let currentLookup = null;
export function closeContactEmailLookup() {
  if (currentLookup) currentLookup.dismiss(false);
}

export function openContactEmailLookup(d, trigger) {
  closeContactEmailLookup();
  const field = trigger.closest('[data-email-field]');
  const input = field.querySelector('[data-email-entry]');
  const form = input.form;
  const saved = d.contacts.find(c => c.id === form.dataset.contact);
  const editing = form.dataset.crmForm === 'save';
  const values = editing ? Object.fromEntries(new FormData(form)) : null;
  const contact = editing ? {...saved, id:saved?.id || '', name:[values.firstName, values.lastName].filter(Boolean).join(' ').trim(),
    firstName:values.firstName.trim(), lastName:values.lastName.trim(), title:values.title, accountId:values.accountId} : saved;
  if (!contact) return;
  const company = d.accounts.find(a => a.id === contact.accountId);
  const dialog = document.createElement('dialog');
  dialog.className = 'crm-lookup-dialog';
  dialog.setAttribute('data-email-lookup-dialog', '');
  dialog.setAttribute('aria-labelledby', 'find-contact-email-title');
  dialog.innerHTML = '<header class="crm-lookup-head"><span class="crm-wand-mark" aria-hidden="true">' + wandIcon + '</span><div><h2 id="find-contact-email-title" tabindex="-1" autofocus>Find email</h2><p>' +
    escapeHTML([contact.name, company?.name].filter(Boolean).join(' · ')) + '</p></div><button type="button" data-close-lookup aria-label="Close">×</button></header>' +
    '<p class="crm-lookup-status" role="status" aria-live="polite"></p><div class="crm-lookup-body"></div>' +
    '<footer class="crm-lookup-footer"><button type="button" data-manual-entry>Enter email manually</button></footer>';
  trigger.closest('.crm-content').append(dialog);
  const body = dialog.querySelector('.crm-lookup-body');
  const status = dialog.querySelector('[role="status"]');
  let timer;
  let revision = 0;
  function dismiss(restore = true, target = trigger) {
    if (currentLookup?.dialog !== dialog) return;
    currentLookup = null;
    revision++;
    clearTimeout(timer);
    if (dialog.open) dialog.close();
    dialog.remove();
    if (restore && target.isConnected) target.focus();
  }
  function run() {
    const runId = ++revision;
    const started = performance.now();
    body.setAttribute('aria-busy','true');
    body.innerHTML = '<div class="crm-lookup-loading" aria-hidden="true"><span class="crm-lookup-spinner"></span><p>Checking saved company records…</p></div>';
    status.textContent = 'Checking saved company records…';
    // Let the browser paint first. The demo keeps its checking state briefly legible.
    timer = setTimeout(() => {
      if (runId !== revision || !dialog.open) return;
      let html, announcement;
      try {
        if (!contact.name || (editing && (!contact.firstName || !contact.lastName || !company))) {
          html = '<p>Enter the contact’s name and choose an existing company to compare address patterns.</p>';
          announcement = 'Name and company information needed.';
        } else {
          const result = researchContactEmail(d, contact);
          html = contactEmailResearch(d, contact, result);
          const available = Object.values(result.groups || {}).some(group => group.candidate);
          announcement = available ? 'Lookup complete. Review the suggested addresses.' : 'Lookup complete. No usable suggestion.';
        }
      } catch {
        html = '<p>The lookup could not finish.</p><button type="button" data-retry-lookup>Retry lookup</button>';
        announcement = 'Lookup could not finish. You can retry or enter the address manually.';
      }
      timer = setTimeout(() => {
        if (runId !== revision || !dialog.open) return;
        body.innerHTML = html;
        body.setAttribute('aria-busy','false');
        status.textContent = announcement;
      }, Math.max(0, 650 - (performance.now() - started)));
    }, 0);
  }
  currentLookup = {dialog, dismiss};
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('close', () => dismiss());
  dialog.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close-lookup')) dismiss();
    if (button.hasAttribute('data-manual-entry')) dismiss(true, input);
    if (button.hasAttribute('data-retry-lookup')) { dialog.querySelector('h2').focus(); run(); }
    if (button.hasAttribute('data-use-suggestion')) {
      input.value = button.dataset.useSuggestion;
      field.querySelector('[name="suggestedEmail"]').value = input.value;
      updateContactEmailField(field);
      dismiss(true, input);
    }
  });
  dialog.showModal();
  run();
}
