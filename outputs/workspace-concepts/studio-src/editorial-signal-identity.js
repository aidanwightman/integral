/** Original publication and command-desk shells. No state, event listeners or data mutations. */
export function editorialSignalGroups(views){
  const available=[...new Set(views)];
  const definitions=[['Daily work',['salesdesk','dialer','outbox','leave','lifecycle','collections','control','workbench']],['Planning & insight',['company','performance','pipelinehealth','board','forecast','capacity','timeline']],['Systems & records',['automations','callrules','workflows','graph','records']]];
  const used=new Set(['overview']);
  const groups=definitions.map(([title,keys])=>({title,views:keys.filter(key=>available.includes(key)&&!used.has(key)).map(key=>(used.add(key),key))}));
  const other=available.filter(key=>!used.has(key));
  if(other.length)groups.push({title:'More views',views:other});
  return groups.filter(group=>group.views.length);
}
export function editorialSignalShell({look,page,data,role,viewLabels,state,brand,b,e,glyph,alertControl=''}){
  if(!['editorial','signal'].includes(look))return '';
  const groups=editorialSignalGroups(role.views),label=key=>viewLabels[key]||key;
  const current=label(state.view);
  const button=(key,index,mode)=>b('view',mode==='chapter'?`<span class="es-chapter-number" aria-hidden="true">${String(index).padStart(2,'0')}</span><span>${e(label(key))}</span>`:`${glyph(key==='overview'?'home':key)}<span>${e(label(key))}</span>`,`${mode==='chapter'?'es-chapter':'es-app'} ${state.view===key?'active':''}`,`data-view="${e(key)}" aria-label="${e(label(key))}" ${state.view===key?'aria-current="page"':''}`);
  if(look==='editorial'){
    const ordered=['overview',...groups.flatMap(group=>group.views)].filter(key=>role.views.includes(key));
    return `<div class="frame es-publication"><header class="es-masthead"><div class="es-imprint"><strong>${e(data.config.brand)}</strong><span>Connected business / ${e(role.name)}</span></div><div class="es-publication-name">Workspace<span aria-hidden="true">.</span></div><div class="es-edition">${alertControl}</div></header><div class="es-publication-body"><aside class="es-contents"><div class="es-contents-heading">Contents<span>${String(ordered.length).padStart(2,'0')} sections</span></div><nav aria-label="Briefing contents">${ordered.map((key,index)=>button(key,index+1,'chapter')).join('')}</nav><p class="es-source-note">Shared business records.</p></aside><div class="es-reading"><div class="es-running-head"><span>${e(role.name)} / ${e(current)}</span><span>Illustrative data</span></div>${page}</div></div></div>`;
  }
  const domain=data.config.domain||'Business records';
  return `<div class="frame es-command-desk"><header class="es-system-bar">${brand()}${alertControl}</header><div class="es-desk-body"><aside class="es-programs"><div class="es-programs-title">Workspace applications</div><nav aria-label="Workspace applications">${role.views.includes('overview')?button('overview',0,'app'):''}${groups.map(group=>`<details class="es-program-group" ${group.views.includes(state.view)?'open':''}><summary>${e(group.title)}<span>${group.views.length}</span></summary><div>${group.views.map(key=>button(key,0,'app')).join('')}</div></details>`).join('')}</nav><div class="es-desk-records">${b('domain',glyph('records')+`<span>${e(domain)}</span>`,'es-domain')}<small>Connected industry records</small></div></aside><section class="es-active-application" aria-label="${e(current)} application"><header class="es-application-bar"><span>${glyph(state.view==='overview'?'home':state.view)}<strong>${e(current)}</strong></span><span class="es-window-context">${e(role.name)}</span></header>${page}</section></div><footer class="es-task-strip"><span><i aria-hidden="true"></i>${e(current)}</span><span>Sample activity · Nov 2026</span><span>Local demo / no external actions</span></footer></div>`;
}
