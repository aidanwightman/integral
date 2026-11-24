import {MONTHS} from './data.js';
import {ensureCommissions,commissionCalculation,openCommissionForecast,COMMISSION_ISSUES} from './commissions-model.js';
import {escapeHTML} from './visuals.js';
const commissionMoney=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'});
const cmAmount=pence=>commissionMoney.format(pence/100);
const cmEscape=escapeHTML;
function cmField(key,label,value,step='0.01',max='10000000'){return `<label class="commission-field"><span>${cmEscape(label)}</span><input type="number" min="0" max="${max}" step="${step}" data-commission-field="${key}" value="${value}"></label>`;}
function cmSelect(key,label,value,options){return `<label class="commission-field"><span>${cmEscape(label)}</span><select data-commission-field="${key}">${options.map(o=>`<option value="${cmEscape(o.id)}" ${value===o.id?'selected':''}>${cmEscape(o.name)}</option>`).join('')}</select></label>`;}
function cmButton(action,id,label,primary=false,extra=''){return `<button type="button" data-do="commission-${action}" data-id="${cmEscape(id)}" class="${primary?'primary':''}" ${extra}>${label}</button>`;}
function cmExpected(c,deal){return `<input type="hidden" data-commission-field="expected" value="${c.revision}-${deal.version||0}">`;}
function cmStamp(iso){return iso?cmEscape(iso.replace('T',' ').slice(0,16))+' UTC':'';}
function commissionControls(c,deal,result){
 const decision=deal.approved?
  `<label class="commission-field">Reason to reopen<input data-commission-field="note" maxlength="240"></label>${cmButton('reopen',deal.id,'Reopen review')}`:
  cmButton('approve',deal.id,'Approve commission',true,result.eligible?'':'disabled');
 return `<form class="row" onsubmit="return false">${cmExpected(c,deal)}${decision}${cmButton('edit',deal.id,'Edit line')}</form>`;
}
function commissionTrace(d,c,deal,result,role){
 const source=deal.source, opts=d.opportunities.filter(o=>deal.accountId && o.accountId===deal.accountId);
 const linked=source && opts.find(o=>o.id===source.opportunityId);
 const record=(id,label)=>`<button type="button" class="text-button record-link" data-do="record" data-id="${cmEscape(id)}">${cmEscape(label)}</button>`;
 const invoices=linked?(d.invoices||[]).filter(i=>i.orderId===linked.id && i.accountId===deal.accountId):[];
 const events=c.history.filter(h=>h.lineId===deal.id || h.clearedLines?.includes(deal.id));
 const history=events.length?`<ol>${events.map(h=>`<li><strong>${cmEscape(h.action)}</strong>
  <small>${cmStamp(h.at)} · ${cmEscape(h.actor)} · plan v${h.revision}</small>
  ${h.lineId?`<p>${cmEscape(h.status)} · Representative ${cmAmount(h.repBefore)} → ${cmAmount(h.repAfter)} · Total ${cmAmount(h.totalPence)}</p>`:''}
  ${h.reason?`<p>${cmEscape(h.reason)}</p>`:''}
  ${h.note?`<p>${[h.reference,h.note].filter(Boolean).map(cmEscape).join(' · ')}</p>`:''}</li>`).join('')}</ol>`:'<p>No line decisions recorded.</p>';
 const options=[{id:'',name:'Choose a deal'},...opts.map(o=>({id:o.id,name:o.name+' · '+o.id+' · '+cmAmount(o.valuePence)}))];
 const form=role==='finance' && opts.length?`<form class="commission-evidence" onsubmit="return false">${cmExpected(c,deal)}
  ${cmSelect('opportunity','Source deal or order',linked?.id||'',options)}
  <label class="commission-field">Supporting document or transaction reference<input maxlength="180" data-commission-field="reference" value="${cmEscape(source?.reference)}"></label>
  ${cmButton('source',deal.id,'Verify source')}</form>`:'';
 const evidence=linked?`<p>${record(linked.id,linked.name)} · ${cmEscape(linked.id)} · ${cmEscape(linked.orderStatus||linked.stage)}</p>
  <p>Source value when linked ${cmAmount(source.valuePence)} · Current deal value ${cmAmount(linked.valuePence)} · Evidence ${cmEscape(source.reference)}</p>
  ${invoices.length?`<p>Order invoices: ${invoices.map(i=>record(i.id,i.number)).join(' · ')}</p>`:''}`:
  `<p>${source?'Linked deal unavailable for this customer.':'No source deal or order linked.'} Earnings use the entered amounts on statement line ${cmEscape(deal.id)}.</p>`;
 return `<details class="commission-trace"><summary>Source and calculation · ${cmEscape(deal.id)}</summary>
   ${evidence}${form}<h3>Calculation inputs</h3><dl>
   ${[['List price',cmAmount(deal.grossPence)],['Discount',cmAmount(deal.grossPence-result.net)+' ('+deal.discount+'%)'],['Cash received',cmAmount(deal.cashPence)],['Refund',cmAmount(deal.refundPence)],['Revenue after refunds',cmAmount(result.retained)],['Representative share',(deal.repShareOverride??result.team.repShare)+'% · '+(deal.repShareOverride!=null?'Finance correction':'Team rule')]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><h3>Line decisions</h3>${history}</details>`;
}
function commissionInquiryView(c,deal,role,focus){
 const esc=cmEscape, items=deal.inquiries||[], open=items.find(item=>item.status==='Open');
 const finance=role==='finance',canRaise=['sales','saleslead','leadership'].includes(role);
 const evidence=(caption)=>`<label class="commission-field">Evidence reference<input data-commission-field="reference" maxlength="180" placeholder="Order, credit note or statement line"></label><label class="commission-field">${caption}<textarea data-commission-field="note" maxlength="1600" rows="2"></textarea></label>`;
 const form=(body)=>`<form class="commission-evidence" onsubmit="return false">${cmExpected(c,deal)}${body}</form>`;
 const trail=items.map(i=>`<li><strong>${esc(i.reason)} · ${esc(i.status)}</strong><p>Raised by ${esc(i.raisedBy)} · ${cmStamp(i.openedAt)} · plan v${i.planRevision}</p><p>${esc(i.note)} · ${esc(i.reference)}</p>${i.decision?`<p>${esc(i.decision)} · ${esc(i.resolvedBy)} · ${cmStamp(i.resolvedAt)}</p><p>${esc(i.decisionNote)} · ${esc(i.decisionReference)}</p><p>Rep credit at submission ${cmAmount(i.originalRepPence)} · after review ${cmAmount(i.reviewedRepPence)}</p>`:''}</li>`).join('');
 let body='';
 if(open && finance){
   const decisions=['Confirm calculation',...(open.reason==='Credit split'?['Correct split']:[])];
   body=form(`<input type="hidden" data-commission-field="number" value="${open.number}">${cmSelect('decision','Decision','',decisions.map(v=>({id:v,name:v})))}${open.reason==='Credit split'?cmField('split','Rep share if correcting this line (%)',deal.repShareOverride ?? '', '0.01','100'):''}${evidence('Finance decision note')}${cmButton('resolve',deal.id,'Resolve inquiry',true)}`);
 }else if(!open && canRaise){
   body=form(cmSelect('reason','Reason','',COMMISSION_ISSUES.map(v=>({id:v,name:v})))+evidence('What should Finance check?')+cmButton('query',deal.id,'Send to Finance',true));
 }
 if(finance && deal.refundPence>0 && deal.reviewedRefundPence!==deal.refundPence){
   body+=form('<strong>Refund adjustment · '+cmAmount(deal.refundPence)+'</strong>'+evidence('How was the credit note checked?')+cmButton('refund-review',deal.id,'Verify refund adjustment'));
 }
 if(!body && !trail)return '';
 const heading=open?'Open inquiry · '+open.reason:items.length?'Commission inquiries':finance?'Review refund':'Question this commission';
 return `<details class="commission-inquiry" data-commission-inquiry="${deal.id}" ${focus?'open':''}><summary>${esc(heading)}</summary>${trail?'<ol>'+trail+'</ol>':''}${body}</details>`;
}
function commissionForecastPanel(d,state,role){
 const month=Number(state.commissionForecastMonth??1), owner=state.commissionForecastOwner||'';
 const f=openCommissionForecast(d,{month,owner}),assign=['finance','leadership'].includes(role);
 const field=(id,label,options,selected)=>`<label>${label}<select id="${id}">${options.map(([value,text])=>`<option value="${cmEscape(value)}" ${String(value)===String(selected)?'selected':''}>${cmEscape(text)}</option>`).join('')}</select></label>`;
 const months=[[0,'All months'],...MONTHS.map((m,i)=>[i+1,m+' '+(i===0?'2026':'2027')])];
 const owners=[['','All owners'],...[...new Set(d.opportunities.filter(o=>o.probability<1).map(o=>o.owner))].map(name=>[name,name])];
 const plans=[{id:'',name:'Unassigned'},...d.commissions.plans];
 const rows=f.rows.map(({opportunity:o,plan,projected,weighted})=>`<tr>
   <td><button type="button" class="text-button" data-do="record" data-id="${cmEscape(o.id)}">${cmEscape(o.name)}</button><small>${cmEscape(o.owner)} · ${cmEscape(o.stage)} · ${MONTHS[o.closeMonth-1]}</small></td>
   <td>${cmAmount(o.valuePence)}<small>${Math.round(o.probability*100)}% probability</small></td>
   <td>${assign?`<form onsubmit="return false"><input type="hidden" data-commission-field="previous" value="${cmEscape(plan?.id)}">${cmSelect('package','Commission package',plan?.id||'',plans)}${cmButton('assign-package',o.id,'Apply package')}</form>`:cmEscape(plan?.name||'Unassigned')}</td>
   <td>${projected===null?'—':cmAmount(projected)}</td><td>${weighted===null?'—':cmAmount(weighted)}</td></tr>`).join('');
 return `<details class="panel commission-forecast" ${state.commissionForecastOpen?'open':''}><summary><strong>Pipeline commission forecast</strong></summary>
  <p>Estimates use the current deal value, package rate and bonus. Each weighted estimate uses the deal’s stage probability.</p>
  <div class="commission-forecast-filters">${field('commission-forecast-month','Expected close',months,month)}${field('commission-forecast-owner','Deal owner',owners,owner)}</div>
  <p><strong>${cmAmount(f.weighted)} weighted commission</strong> · ${f.rows.length} open deals${f.unassigned?' · '+f.unassigned+' without a package':''}</p>
  ${rows?`<div class="table-scroll"><table><thead><tr><th>Opportunity</th><th>Deal value</th><th>Package</th><th>If won</th><th>Weighted</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p>No open deals match these filters.</p>'}</details>`;
}
export function commissionView(d,state){
 const role=state.role||'finance', canEdit=['finance','leadership','saleslead'].includes(role);
 const c=ensureCommissions(d),rows=c.deals.map(deal=>({deal,result:commissionCalculation(c,deal)}));
 const total=rows.reduce((n,x)=>n+x.result.total,0),eligible=rows.filter(x=>x.result.eligible).reduce((n,x)=>n+x.result.total,0),approved=rows.filter(x=>x.deal.approved).reduce((n,x)=>n+x.result.total,0);
 return `<section class="commission-workspace"><header class="page-heading"><div><p class="eyebrow">FINANCE · NOVEMBER 2026</p><h1>Commissions</h1><p>Review earnings, resolve holds and approve the statement.</p></div><span class="pill">Plan v${c.revision} · Demo</span></header><div class="stat-grid">${[['Calculated',total],['Eligible',eligible],['Approved for review',approved],['On hold',total-eligible]].map(([label,value])=>`<section class="stat"><div class="stat-label">${label}</div><div class="stat-value">${cmAmount(value)}</div></section>`).join('')}</div><p class="footnote">Separate demo records · GBP before tax · approval never sends a payment.</p>${commissionForecastPanel(d,state,role)}<section class="panel"><div class="panel-head"><div><h2>Commission statement</h2><p>Revenue after refunds × package rate + qualifying deal bonus. The team rule splits the total.</p></div></div><div class="commission-deals">${rows.map(({deal:r,result:x})=>`<article class="commission-deal" data-commission-line="${r.id}" tabindex="-1"><header><div>${r.accountId?`<button type="button" class="text-button record-link" data-do="record" data-id="${cmEscape(r.accountId)}">${cmEscape(r.account)}</button>`:`<strong>${cmEscape(r.account)}</strong>`}<p>${r.id} · ${cmEscape(r.owner)} · ${x.team.name}</p></div><span class="pill ${!x.eligible?'warn':r.approved?'good':''}">${r.approved?'Approved':x.eligible?'Ready for approval':'On hold'}</span></header><div class="commission-calculation"><div><span>Net price</span><strong>${cmAmount(x.net)}</strong><small>${r.discount}% discount</small></div><div><span>${cmEscape(x.plan.name)} · ${x.plan.rate}%</span><strong>${cmAmount(x.base)}</strong><small>${cmAmount(x.retained)} after refunds</small></div><div><span>Deal bonus</span><strong>${cmAmount(x.bonus)}</strong><small>Threshold ${cmAmount(x.plan.thresholdPence)}</small></div><div><span>Total commission</span><strong>${cmAmount(x.total)}</strong><small>Rep ${cmAmount(x.rep)} · Partner ${cmAmount(x.partner)}</small></div></div><p class="commission-reason">${x.holds.length?cmEscape(x.holds.join(' · ')):`Payment complete · within ${x.team.maxDiscount}% discount limit`}</p>${canEdit?commissionControls(c,r,x):''}${commissionTrace(d,c,r,x,role)}${commissionInquiryView(c,r,role,state.commissionFocus===r.id)}${canEdit && state.commissionEdit===r.id?`<form class="commission-editor" onsubmit="return false">${cmExpected(c,r)}<h3>Edit ${r.id}</h3><div class="commission-fields">${cmSelect('package','Package',r.package,c.plans)}${cmSelect('team','Team',r.team,c.teams)}${cmField('gross','List price (£)',r.grossPence/100)}${cmField('discount','Discount (%)',r.discount,'0.01','100')}${cmField('cash','Cash received (£)',r.cashPence/100)}${cmField('refund','Refund (£)',r.refundPence/100)}</div><p>Changing an amount, package or team clears this line’s approval. Refunds stay on hold for adjustment review.</p><div class="row">${cmButton('save',r.id,'Save changes',true)}${cmButton('cancel',r.id,'Cancel')}</div></form>`:''}</article>`).join('')}</div></section>${canEdit?`<details class="panel commission-rules"><summary><strong>Package & team rules</strong><span>Edit rates, bonuses and splits</span></summary><p>These are sample rules, not a recommended compensation policy. A rule change creates a new demo revision and clears every approval.</p><h3>Package rules</h3><div class="commission-rule-grid">${c.plans.map(p=>`<form onsubmit="return false"><h4>${cmEscape(p.name)}</h4>${cmField('rate','Commission (%)',p.rate,'0.01','100')}${cmField('threshold','Deal bonus threshold (£)',p.thresholdPence/100)}${cmField('bonus','Deal bonus (£)',p.bonusPence/100)}${cmButton('plan',p.id,'Save package')}</form>`).join('')}${['finance','leadership'].includes(role)?`<form onsubmit="return false"><h4>New commission package</h4><label class="commission-field">Name<input maxlength="60" data-commission-field="name"></label>${cmField('rate','Commission (%)','','0.01','100')}${cmField('threshold','Deal bonus threshold (£)',0)}${cmField('bonus','Deal bonus (£)',0)}${cmButton('new-package','','Create package')}</form>`:''}</div><h3>Team rules</h3><div class="commission-rule-grid">${c.teams.map(t=>`<form onsubmit="return false"><h4>${t.name}</h4>${cmField('maxDiscount','Maximum discount (%)',t.maxDiscount,'0.01','100')}${cmField('repShare','Rep share (%)',t.repShare,'0.01','100')}<p>Remaining share goes to the partner. Rounded to pennies; the total is preserved.</p>${cmButton('team',t.id,'Save team')}</form>`).join('')}</div></details>`:''}<details class="panel commission-history"><summary><strong>Activity history</strong><span>${c.history.length} events</span></summary>${c.history.length?`<ol>${c.history.map(h=>`<li>${cmEscape(h.action)} <small>${cmEscape(h.at.slice(11,19))}</small></li>`).join('')}</ol>`:'<p>No changes yet.</p>'}</details></section>`;
}
