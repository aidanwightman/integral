import {collectionsAlerts} from './collections-model.js';
import {financeExceptionAlerts} from './finance-exceptions-model.js';
import {commissionAlerts} from './commissions-model.js';
import {peopleDeliveryAlerts} from './operational-exceptions.js';
import {approvalAlerts} from './approval-model.js';
import {invitationAlerts} from './pipeline-invitations.js';
import {escapeHTML,glyph} from './visuals.js';

export function workspaceAlerts(data, role) {
  const meetings = ['sales', 'saleslead', 'leadership'].includes(role) ? invitationAlerts(data) : [];
  return [
    ...meetings.map(item => ({...item, key: 'meeting/' + item.id, kind: item.title.startsWith('Evidence needed') ? 'Stage evidence' : 'Meeting follow-up'})),
    ...approvalAlerts(data, role).map(item => ({...item, key: 'approval/' + item.id, kind: 'Approval', actionLabel:'Open request'})),
    ...peopleDeliveryAlerts(data,role).map(item => ({...item,key: 'work/' + item.id})),
    ...commissionAlerts(data,role).map(item => ({...item,key: 'commission/' + item.id,kind:'Commission',actionLabel:'Review statement'})),
    ...financeExceptionAlerts(data,role).map(item => ({...item,key: 'transaction/' + item.id,kind:'Transaction review',actionLabel:'Review transaction'})),
    ...(role==='finance'?collectionsAlerts(data):[]).map(item => ({...item,key:'collections/'+item.id,kind:'Invoice follow-up',actionLabel:'Open invoice'}))
  ].sort((a,b) => Number(b.severity === 'urgent') - Number(a.severity === 'urgent') || (a.due||'9999').localeCompare(b.due||'9999'));
}

// Compare each role with its own last visit so an incoming decision can surface
// when the user switches desks, even when the request was made on another desk.
export function workspaceAlertTracker(baseline) {
  const signature = item => JSON.stringify([item.key, item.title, item.detail, item.due, item.severity, item.revision]);
  let previous = new Set(baseline.map(signature));
  let active = new Set();
  return {
    update(items, readingQueue) {
      const next = new Set(items.map(signature));
      active = new Set([...active].filter(key => next.has(key)));
      for (const key of next) if (!previous.has(key)) active.add(key);
      previous = next;
      if (readingQueue) active.clear();
      return items.filter(item => active.has(signature(item)));
    },
    dismiss() { active.clear(); }
  };
}

export function workspaceAlertBell(count) {
  const label = 'Alerts, ' + count + (count === 1 ? ' item' : ' items');
  return `<button type="button" class="workspace-alert-bell" data-do="open-alerts" aria-label="${label}" title="${label}">${glyph('alerts')}<span>Alerts</span>${count ? `<b>${count}</b>` : ''}</button>`;
}

export function workspaceAlertView(items,selectedKind='') {
  const counts=new Map();
  for(const item of items)counts.set(item.kind,(counts.get(item.kind)||0)+1);
  const selected=counts.has(selectedKind)?selectedKind:'';
  const visible=selected?items.filter(item=>item.kind===selected):items;
  const options=[...counts].map(([kind,count])=>`<option value="${escapeHTML(kind)}" ${selected===kind?'selected':''}>${escapeHTML(kind)} (${count})</option>`).join('');
  const filter=counts.size>1?`<label class="alert-filter">Show<select id="alert-kind"><option value="">All alerts (${items.length})</option>${options}</select></label>`:'';
  const rows = visible.map(item => {
    const context = [item.owner, item.due && 'Due ' + item.due].filter(Boolean).map(escapeHTML).join(' · ');
    const action = item.actionLabel || (item.opportunityId ? 'Open opportunity' : 'Open request');
    return `<li><div><small class="alert-kind">${item.severity==='urgent'?'<b>Urgent</b> ':''}${escapeHTML(item.kind)}</small><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.detail)}</p>${context ? `<p class="alert-owner">${context}</p>` : ''}</div><button type="button" data-do="open-alert-item" data-id="${escapeHTML(item.key)}">${action}${glyph('arrow')}</button></li>`;
  }).join('');
  return `<header class="page-heading"><div><h1 id="alert-heading" tabindex="-1">Alerts</h1><p>Follow-ups, holds and decisions assigned to this desk.</p></div>${filter}</header>${rows ? `<ul class="workspace-alert-list">${rows}</ul>` : '<div class="card"><h2>You’re up to date</h2><p>Items that need your attention will appear here.</p></div>'}`;
}

export function workspaceAlertNotice(items) {
  if (!items.length) return '';
  const message = items.length === 1 ? items[0].title : items.length + ' updates need your attention';
  return `<aside class="workspace-alert-notice" aria-label="Workspace notification"><span class="notice-symbol">${glyph('alerts')}</span><div><strong role="status">${escapeHTML(message)}</strong><button type="button" class="notice-link" data-do="open-alerts">View alerts ${glyph('arrow')}</button></div><button type="button" data-do="dismiss-alert" aria-label="Dismiss notification">${glyph('close')}</button></aside>`;
}
