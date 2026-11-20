/* Content-led mosaic: grouped task launchers and a deliberately asymmetric overview. */
export function bentoShell({page,data,role,state,viewLabels,e,b,glyph,brand,alertControl=''}){
 const groups=[['Start here','home',['overview','company','salesdesk','pipelinehealth']],['Tasks','workbench',['workbench','dialer','leave','collections','control','lifecycle','board','timeline']],['Automations','automations',['automations','callrules','outbox','workflows']],['Reports & data','graph',['forecast','capacity','performance','graph','records']]];
 const viewButton = view => b('view', e(viewLabels[view]), state.view === view ? 'active' : '',
   `data-view="${view}" ${state.view === view ? 'aria-current="page"' : ''}`);
 const used=new Set();
 const nav=groups.map(([name,icon,views],i)=>{
  const items=views.filter(v=>role.views.includes(v));items.forEach(v=>used.add(v));if(!items.length)return '';
  return `<details class="bento-launcher bento-tone-${i}" ${items.includes(state.view)?'open':''}><summary>${glyph(icon)}<span>${name}</span><span class="bento-launch-count">${items.length}</span></summary><nav aria-label="${name}">${items.map(viewButton).join('')}</nav></details>`;
 }).join('');
 const rest=role.views.filter(v=>!used.has(v));
 return `<div class="frame bento-workspace"><header class="bento-top">${brand()}${alertControl}</header><div class="bento-launchpad" aria-label="Workspace sections">${nav}${rest.length?`<details class="bento-launcher" ${rest.includes(state.view)?'open':''}><summary>More tools</summary><nav>${rest.map(viewButton).join('')}</nav></details>`:''}</div>${page}</div>`;
}
export function bentoOverview({statGrid,chart,agenda,details,e,role}){
 return `<div class="bento-overview">${statGrid}<div class="bento-feature-grid"><section class="bento-next"><p class="eyebrow">Priorities</p><h2>Next actions</h2><div class="bento-next-list">${agenda}</div></section><div class="bento-evidence">${chart}</div><div class="bento-detail">${details}</div></div></div>`;
}
