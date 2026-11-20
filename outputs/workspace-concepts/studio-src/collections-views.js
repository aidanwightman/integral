import {COLLECTION_DAY,COLLECTION_ACTIONS,collectionAttentionDue,collectionDueDate,collectionAvailableActions,collectionOpenAmount,collectionState,outstandingPromise} from './collections-model.js';
import {escapeHTML,compact,studioButton} from './visuals.js';

export const collectionMoney=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:2}).format(pence/100);

export function collectionsDesk(d,s){
  const esc=escapeHTML,customers=d.invoices.filter(r=>collectionOpenAmount(r)),suppliers=d.bills.filter(r=>collectionOpenAmount(r));
  const sumOpen=rows=>rows.reduce((n,r)=>n+collectionOpenAmount(r),0);
  const totals=[['Customer receivables',compact(sumOpen(customers)),customers.length+' open invoices'],
    ['Customer invoices overdue',compact(sumOpen(customers.filter(r=>collectionDueDate(r)<COLLECTION_DAY))),'Past their invoice due date'],
    ['Supplier payables',compact(sumOpen(suppliers)),suppliers.length+' outstanding bills'],
    ['Supplier bills due',compact(sumOpen(suppliers.filter(r=>r.due<=COLLECTION_DAY))),'Due by 20 November 2026']];
  const filter=s.collectionFilter||'All open records';
  function table(records,supplier){
    const match=r=>filter==='All open records'||(filter==='Promised to pay'&&!!outstandingPromise(r))||(filter==='Disputed'&&!!r.collection?.dispute)||
      (filter==='Action due'&&collectionAttentionDue(r)<=COLLECTION_DAY)||(filter==='Past invoice due date'&&(collectionDueDate(r))<COLLECTION_DAY);
    const rows=records.filter(match).sort((a,b)=>collectionAttentionDue(a).localeCompare(collectionAttentionDue(b)));
    return `<section class="panel role-panel"><div class="panel-head"><div><h2>${supplier?'Outstanding supplier bills':'Unpaid customer invoices'}</h2><p>${supplier?'Review queries, payment holds and supplier due dates.':'Review balances, promises and customer follow-ups.'}</p></div></div><div class="panel-body">${rows.length?`<div class="table-scroll"><table><thead><tr><th>Invoice</th><th>${supplier?'Supplier':'Customer'}</th><th>Outstanding</th><th>Due date</th><th>Status</th><th>Next action / owner</th></tr></thead><tbody>${rows.map(r=>{
      const source=supplier?r.supplier:d.accounts.find(a=>a.id===r.accountId)?.name;
      const event=d.domain.find(x=>x.id===r.eventId);
      const plan=r.collection,latest=plan?.history.at(-1),status=collectionState(r);
      return `<tr><td>${studioButton('record',esc(r.number),'text-button',`data-id="${esc(r.id)}"`)}</td><td>${esc(source)}${event?`<small class="finance-context">${esc(event.name)}</small>`:''}</td><td>${collectionMoney(collectionOpenAmount(r))}</td><td>${esc(collectionDueDate(r))}</td><td><span class="pill ${['Disputed','Promise overdue','Overdue','Follow-up due'].includes(status)?'warn':''}">${esc(status)}</span>${supplier?`<small class="finance-context">${esc(r.status)}</small>`:''}</td><td>${esc(latest?.nextAction || (supplier?'Review supplier bill':'Review customer balance'))}<small class="finance-context">${esc(plan?.owner||r.financeOwner)} · ${esc(plan?.nextDue||collectionDueDate(r))}</small></td></tr>`;
    }).join('')}</tbody></table></div>`:'<p class="empty">No records match this filter.</p>'}</div></section>`;
  }
  return `<div class="stat-grid">${totals.map(([label,value,note])=>`<section class="stat"><div class="stat-label">${esc(label)}</div><div class="stat-value">${esc(value)}</div><div class="stat-note">${esc(note)}</div></section>`).join('')}</div>
  <label class="role-filter">Queue filter<select data-role-filter="collectionFilter">${['All open records','Action due','Past invoice due date','Promised to pay','Disputed'].map(f=>`<option ${f===filter?'selected':''}>${f}</option>`).join('')}</select></label>
  <div class="stack finance-queues">${table(customers,false)}${table(suppliers,true)}</div>`;
}

export function collectionRecordPanel(d,role,r){
  const esc=escapeHTML, c=r.collection||{}, history=c.history||[], available=collectionAvailableActions(r);
  const events=history.slice().reverse().map(h=>`<li><strong>${esc(h.label)}</strong> · ${esc(new Date(h.at).toLocaleDateString('en-GB'))}<p>${h.draft?'<b>Unsent draft · '+esc(h.draft.subject)+'</b><br>':''}${h.channel?esc(h.channel)+' · ':''}${esc(h.note)}</p>${h.promise?`<p>Promised ${collectionMoney(h.promise.amountPence)} by ${esc(h.promise.date)}</p>`:''}<small>${esc(h.nextAction)} · ${esc(h.owner)} · ${esc(h.nextDue)}</small></li>`).join('');
  const event=d.domain.find(x=>x.id===r.eventId);
  const context=event?'<p>Event · '+studioButton('record',esc(event.name),'text-button',`data-id="${esc(event.id)}"`)+'</p>':'';
  let header=`<section class="finance-record"><h3>${r.amountPence!=null?'Supplier follow-up':'Collections follow-up'}</h3>${context}<p>${esc(collectionState(r))} · ${esc(c.owner||r.financeOwner)}${c.nextDue?' · follow up '+esc(c.nextDue):''}</p>`;
  if(c.dispute)header+='<p><strong>Dispute</strong> · '+esc(c.dispute)+'</p>';
  if(outstandingPromise(r))header+=`<p><strong>Payment promise</strong> · ${collectionMoney(outstandingPromise(r))} remaining by ${esc(c.promise.date)}</p>`;
  const customer=d.accounts.find(a=>a.id===r.accountId)?.name||'your team';
  const draft=r.amountPence!=null?'':`Hello ${customer}, invoice ${r.number} has an outstanding balance of ${collectionMoney(collectionOpenAmount(r))}. The due date is ${collectionDueDate(r)}. Could you confirm your expected payment date or send the remittance reference?`;
  const form=role==='finance' && available.length?`<form class="crm-fields finance-followup" data-collection-form="${esc(r.id)}" data-revision="${history.length}" data-finance-draft="${esc(draft)}">
    <label>Action<select name="action" aria-label="Action" data-collection-action>${available.map(k=>`<option value="${k}">${esc(COLLECTION_ACTIONS[k])}</option>`).join('')}</select></label>
    <label>Follow-up owner<select name="owner">${d.team.map(t=>`<option ${(c.owner||r.financeOwner)===t.name?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label>
    <label data-finance-channel ${['query','chase'].includes(available[0])?'':'hidden'}>Contact channel<select name="channel"><option value="">Choose channel</option>${['Email','Phone','Meeting','Internal review'].map(v=>`<option>${v}</option>`).join('')}</select></label>
    <label data-finance-promise hidden>Promised amount (£)<input type="number" step=".01" min=".01" max="${collectionOpenAmount(r)/100}" name="promiseAmount"></label>
    <label data-finance-promise hidden>Promise date<input type="date" name="promiseDate" min="${COLLECTION_DAY}"></label>
    <label class="crm-wide"><span data-finance-note-label>${available[0]==='reminder'?'Reminder message':'Contact outcome or reason'}</span><textarea name="note" rows="3" maxlength="1600" required>${available[0]==='reminder'?esc(draft):''}</textarea></label>
    <label>Next action<input name="nextAction" placeholder="e.g. Confirm remittance" maxlength="180" required></label>
    <label>Follow-up date<input type="date" name="nextDue" min="${COLLECTION_DAY}" value="${esc(c.nextDue>=COLLECTION_DAY?c.nextDue:'')}" required></label>
    <p role="alert" data-finance-error class="crm-wide"></p>
    <div class="row crm-wide"><button type="submit" class="primary" data-finance-save>${available[0]==='reminder'?'Save unsent draft':'Save activity'}</button></div></form>`:'';
  return header+form+(events?`<h4>Follow-up history</h4><ol class="finance-history">${events}</ol>`:'')+'</section>';
}
export function updateCollectionFields(form){
  const action=form.elements.action.value, channel=['query','chase'].includes(action),promise=action==='promise';
  const note=form.elements.note;
  if(action==='reminder' && !note.value)note.value=form.dataset.financeDraft;
  else if(action!=='reminder' && note.value===form.dataset.financeDraft)note.value='';
  form.querySelector('[data-finance-channel]').hidden=!channel;
  for(const el of form.querySelectorAll('[data-finance-promise]')){el.hidden=!promise;el.querySelector('input').disabled=!promise;}
  form.querySelector('[data-finance-note-label]').textContent=action==='reminder'?'Reminder message':action==='dispute'?'Dispute reason':action==='resolve'?'Resolution evidence':'Contact outcome or reason';
  form.querySelector('[data-finance-save]').textContent=action==='reminder'?'Save unsent draft':'Save activity';
}
