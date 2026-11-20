import {escapeHTML,gbp,studioButton} from './visuals.js';

export function quoteHandoffAction(d, role, action, id, values) {
  const quote = d.quotes.find(item => item.id === id);
  if (quote?.status !== 'Accepted (demo)') throw new Error('Choose an accepted quote.');
  const previous = quote.handoff;
  const version = previous?.history.length || 0;
  if (Number(values.version) !== version) throw new Error('The handoff has already changed. Review its latest status.');

  let next, note, status;
  if (action === 'quote-handoff-send') {
    if (role !== 'sales' || (previous && previous.status !== 'Returned')) throw new Error('Only a new or returned handoff can be sent from Sales.');
    const owner = d.team.find(person => person.id === values.ownerId && person.department === 'Delivery');
    if (!owner) throw new Error('Choose a delivery owner.');
    const due = values.due || '';
    const parsed = new Date(due + 'T12:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== due) throw new Error('Choose a valid delivery date.');
    const scope = values.scope?.trim(), criteria = values.criteria?.trim();
    if (!scope || !criteria) throw new Error('Enter the agreed scope and measurable acceptance criteria.');
    next = {ownerId: owner.id, due, scope, criteria};
    status = 'Awaiting operations';
    note = previous ? 'Revised handoff sent to operations.' : 'Handoff sent to operations.';
  } else {
    if (!['quote-handoff-accept','quote-handoff-return'].includes(action) || role !== 'operations' || previous?.status !== 'Awaiting operations') throw new Error('Choose a handoff awaiting operations review.');
    status = action === 'quote-handoff-accept' ? 'Accepted by operations' : 'Returned';
    note = values.note?.trim() || '';
    if (status === 'Returned' && !note) throw new Error('Explain what Sales needs to change.');
    next = previous;
  }
  const at = new Date().toISOString();
  const event = {at, role, status, note, ...(action === 'quote-handoff-send' ? next : {})};
  quote.handoff = {...next, status, history: [...(previous?.history || []), event]};
  d.activity.unshift({at, recordId: quote.id, action: 'Delivery handoff: '+status, actor: role, detail: note});
  return action === 'quote-handoff-send' ? note : status === 'Returned' ? 'Returned to Sales with your reason.' : 'Operations accepted the handoff.';
}

const handoffText = escapeHTML;

function quotePacket(d, quote, role) {
  const h = quote.handoff;
  const contact = d.contacts.find(c => c.id === quote.contactId);
  const account = d.accounts.find(a => a.id === contact?.accountId);
  const ownerName = id => d.team.find(t => t.id === id)?.name || 'Unassigned';
  const version = h?.history.length || 0;
  const latest = h?.history.at(-1);
  const button = (suffix,label,primary=false) => studioButton('quote-handoff-'+suffix,label,primary?'primary small':'small',`data-id="${handoffText(quote.id)}" data-version="${version}"`);
  let fields = '';
  if (role === 'sales' && (!h || h.status === 'Returned')) {
    const owners = d.team.filter(t => t.department === 'Delivery').map(t => `<option value="${handoffText(t.id)}"${t.id === h?.ownerId ? ' selected' : ''}>${handoffText(t.name)}</option>`).join('');
    fields = `<div class="workbench-form"><label class="workbench-field">Delivery owner<select name="ownerId"><option value="">Choose an owner</option>${owners}</select></label>
      <label class="workbench-field">Delivery due<input name="due" type="date" value="${handoffText(h?.due)}"></label>
      <label class="workbench-field">Agreed scope<textarea name="scope" rows="2" placeholder="What will be delivered?">${handoffText(h?.scope)}</textarea></label>
      <label class="workbench-field">Acceptance criteria<textarea name="criteria" rows="2" placeholder="How will the customer confirm it is complete?">${handoffText(h?.criteria)}</textarea></label>
      ${button('send',h?'Resubmit to operations':'Send to operations',true)}</div>`;
  } else if (h) {
    fields = `<p><strong>Delivery owner</strong> ${handoffText(ownerName(h.ownerId))} · <strong>Due</strong> ${handoffText(h.due)}</p>
      <p><strong>Agreed scope</strong> ${handoffText(h.scope)}</p><p><strong>Acceptance criteria</strong> ${handoffText(h.criteria)}</p>`;
    if (role === 'operations' && h.status === 'Awaiting operations') fields += `
      <label class="workbench-field">Review note <small>Required for a return</small><textarea name="note" rows="2"></textarea></label>
      <div class="row-actions">${button('accept','Accept handoff',true)} ${button('return','Return to Sales')}</div>`;
  }
  const history = h ? `<details><summary>Handoff history (${version})</summary><ol>${h.history.map(e => `<li><time datetime="${handoffText(e.at)}">${handoffText(new Date(e.at).toLocaleString('en-GB',{timeZone:'UTC'}))} UTC</time> · ${handoffText(e.role)} · <strong>${handoffText(e.status)}</strong>${e.note ? ' — '+handoffText(e.note) : ''}${e.scope ? `<p>${handoffText(ownerName(e.ownerId))} · due ${handoffText(e.due)}<br>Scope: ${handoffText(e.scope)}<br>Acceptance: ${handoffText(e.criteria)}</p>` : ''}</li>`).join('')}</ol></details>` : '';
  return `<details class="role-request" data-quote-packet="${handoffText(quote.id)}"><summary><strong>${handoffText(account?.name)} · ${gbp(quote.amountPence)}</strong> · ${handoffText(h?.status || 'Ready to hand off')}</summary>
    <p>${handoffText(contact?.name)} · Quote ${handoffText(quote.id)}</p>${h?.status === 'Returned' ? `<p role="note"><strong>Reason for return</strong> ${handoffText(latest.note)}</p>` : ''}
    ${fields}${history}</details>`;
}

export function quoteHandoffPanel(d, role) {
  const quotes = d.quotes.filter(q => q.status === 'Accepted (demo)' && (role === 'sales' || q.handoff));
  const sales = role === 'sales';
  const link = studioButton('jump-role',sales?'Open delivery control':'Open Sales desk','small',sales?'data-role="operations" data-view="control"':'data-role="sales" data-view="salesdesk"');
  return `<section class="panel role-panel"><div class="panel-head"><div><h2>${sales?'Delivery handoffs':'Sales handoffs'}</h2><p>${sales?'Send the accepted scope to its delivery owner.':'Review what Sales agreed with the customer.'}</p></div>${link}</div>
    <div class="panel-body">${quotes.map(q=>quotePacket(d,q,role)).join('') || '<p class="empty">'+(sales?'Accepted quotes appear here.':'Send an accepted quote from the Sales desk to see it here.')+'</p>'}</div></section>`;
}
