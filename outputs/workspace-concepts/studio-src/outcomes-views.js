import {OUTCOME_SCENARIOS,ensureOutcomes,outcomeSnapshot} from './outcomes-model.js';
import {escapeHTML,glyph} from './visuals.js';
const oe=escapeHTML;
function outcomeRenderField(field,actionId){
 const id=`outcome-${actionId}-${field.key}`;
 const common=`id="${oe(id)}" data-outcome-field="${oe(field.key)}" name="${oe(field.key)}"`;
 const input=field.type==='select'?`<select ${common}>${(field.options||[]).map(o=>`<option value="${oe(o.value)}" ${String(o.value)===String(field.value??'')?'selected':''}>${oe(o.label)}</option>`).join('')}</select>`:`<input ${common} type="${field.type==='email'?'email':'text'}" value="${oe(field.value??'')}" autocomplete="off">`;
 return `<label class="outcome-field" for="${oe(id)}"><span>${oe(field.label)}</span>${input}</label>`;
}
function outcomeActionForm(action,snapshot,index){
 const fields=action.fields||[];
 const secondary=action.kind==='secondary'||action.kind==='danger';
 return `<form class="outcome-action-form ${fields.length?'has-fields':''}" data-outcome-form="${oe(action.id)}" aria-label="${oe(action.label)}"><div class="outcome-fields">${fields.map(f=>outcomeRenderField(f,action.id)).join('')}</div><button type="button" class="outcome-action ${secondary?'outcome-secondary':'primary'} ${action.kind==='danger'?'outcome-danger':''}" data-do="outcome-run" data-action="${oe(action.id)}" data-id="${oe(snapshot.id)}">${oe(action.label)}${glyph(secondary?'arrow':'check')}</button></form>`;
}
export function outcomeView(d,state){
 ensureOutcomes(d);
 const available=OUTCOME_SCENARIOS.filter(s=>state.role==='leadership'||(state.role==='saleslead'?['followup','leadership'].includes(s.id):s.role===state.role));
 const stories=available.length?available:OUTCOME_SCENARIOS;
 if(!stories.some(s=>s.id===state.outcomeCase))state.outcomeCase=stories[0].id;
 const scenario=stories.find(s=>s.id===state.outcomeCase);
 const snapshot=outcomeSnapshot(d,scenario.id);
 const steps=snapshot.steps||scenario.steps||[];
 const stage=Math.max(0,Math.min(Number(snapshot.stage)||0,steps.length));
 const done=snapshot.complete?steps.length:stage;
 const feedback=typeof state.outcomeFeedback==='string'?state.outcomeFeedback:state.outcomeFeedback?.message||state.outcomeFeedback?.text||'';
 return `<section class="outcome-practice" aria-label="Workflow demo">
  <header class="outcome-intro"><div><p class="outcome-kicker">DEMO</p><h1 id="outcome-title" tabindex="-1">Workflow demos</h1><p>Select a task and complete the steps.</p></div><span class="outcome-simulation">${glyph('layers')} Simulation</span></header>
  <p class="outcome-boundary">Demo records only. No real messages, payments or changes to workspace balances.</p>
  ${stories.length>1?`${stories.length>2?'<details class="outcome-picker"><summary>Switch workflow</summary>':''}<nav class="outcome-stories" aria-label="Choose a workflow">${stories.map(s=>`<button type="button" data-do="outcome-select" data-id="${oe(s.id)}" aria-pressed="${s.id===scenario.id}" class="outcome-story ${s.id===scenario.id?'is-selected':''}"><span>${oe(s.title)}</span>${s.id===scenario.id?glyph('check'):glyph('arrow')}</button>`).join('')}</nav>${stories.length>2?'</details>':''}`:''}
  <div class="outcome-case-heading"><div><p class="outcome-kicker">${oe(snapshot.owner||scenario.owner||'Assigned owner')}</p><h2>${oe(snapshot.title||scenario.title)}</h2><p>${oe(scenario.pain||'')}</p></div><span class="outcome-status ${snapshot.complete?'is-complete':snapshot.status==='Needs action'?'needs-action':''}">${oe(snapshot.status||'Ready to start')}</span></div>
  <div class="outcome-progress"><div class="outcome-progress-label"><strong>${snapshot.complete?'Complete':`Step ${Math.min(stage+1,steps.length)} of ${steps.length}`}</strong><span>${done} of ${steps.length} steps complete</span></div><ol aria-label="Practice progress">${steps.map((step,i)=>`<li class="${i<done?'is-done':i===stage?'is-current':''}" ${!snapshot.complete&&i===stage?'aria-current="step"':''}><span class="outcome-step-marker">${i<done?glyph('check'):i+1}</span><span>${oe(step.title)}</span></li>`).join('')}</ol></div>
  <div class="outcome-feedback" role="status" aria-live="polite" aria-atomic="true">${oe(feedback)}</div>
  <div class="outcome-work-grid"><section class="outcome-task" aria-labelledby="outcome-task-title"><div class="outcome-task-header"><p class="outcome-kicker">${snapshot.complete?'THE RESULT':'NEXT STEP'}</p><h3 id="outcome-task-title" tabindex="-1">${oe(snapshot.complete?(scenario.outcome||'Complete'):steps[stage]?.title||'Review result')}</h3><p>${oe(snapshot.summary||'')}</p></div>${snapshot.notice&&!snapshot.notice.startsWith('Guided practice')?`<p class="outcome-notice">${glyph('records')}<span>${oe(snapshot.notice)}</span></p>`:''}<div class="outcome-actions">${(snapshot.actions||[]).map((a,i)=>outcomeActionForm(a,snapshot,i)).join('')}</div>${snapshot.complete?`<div class="outcome-complete-line">${glyph('check')}<span>Complete. Review the records or open the workspace.</span></div>`:''}</section>
  <aside class="outcome-evidence" aria-label="Supporting records"><p class="outcome-kicker">RECORDS</p><h3>Supporting records</h3><dl>${(snapshot.records||[]).map(r=>`<div><dt>${oe(r.label)}</dt><dd>${oe(r.value)}</dd></div>`).join('')}</dl></aside></div>
  <section class="outcome-metrics" aria-label="Results">${(snapshot.metrics||[]).map(m=>`<div><span>${oe(m.label)}</span><strong>${oe(m.value)}</strong><small>${oe(m.note||'Practice data')}</small></div>`).join('')}</section>
  <details class="outcome-audit" ${snapshot.complete?'open':''}><summary>${glyph('records')}<strong>Activity history</strong><span>${(snapshot.history||[]).length} recorded events</span></summary><p class="outcome-empty">Simulated event times and practice inputs; not a production audit log.</p>${snapshot.history?.length?`<ol>${[...snapshot.history].reverse().map(h=>`<li><div><strong>${oe(h.action)}</strong><time>${oe(h.at)}</time></div><p>${oe(h.detail)}</p></li>`).join('')}</ol>`:'<p class="outcome-empty">No activity yet.</p>'}</details>
  <footer class="outcome-footer"><button type="button" data-do="view" data-view="${oe(scenario.sourceView)}" data-role="${oe(scenario.role)}" class="outcome-source">Open workspace ${glyph('arrow')}</button><button type="button" data-do="outcome-reset" data-id="${oe(scenario.id)}" class="outcome-reset">Reset demo</button></footer>
 </section>`;
}
