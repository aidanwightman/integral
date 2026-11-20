/* Glass has its own information architecture. Existing data-do=view actions remain intact. */
const glassNavEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GLASS_NAV_SECTIONS=[
 {id:'work',label:'Workspace',short:'Work',icon:'layers',description:'Your daily work',views:['outcomes','salesdesk','approvals','alerts','financeexceptions','dialer','workbench','leave','lifecycle','collections','commissions','control','timeline','capacity','board']},
 {id:'flows',label:'Automations & flows',short:'Flows',icon:'automations',description:'Triggers, journeys and handoffs',views:['automations','callrules','outbox','workflows']},
 {id:'insights',label:'Insights',short:'Insights',icon:'forecast',description:'Performance and forward view',views:['performance','pipelinehealth','forecast','company','overview']},
 {id:'data',label:'Connected records',short:'Data',icon:'records',description:'People, accounts and relationships',views:['contacts','records','graph']}
];
export function glassNavigationGroups(views){
 const available=[...new Set(views)];
 const home=available.includes('company')?'company':available.includes('overview')?'overview':available[0];
 const taken=new Set([home]);
 const groups=GLASS_NAV_SECTIONS.map(section=>({...section,views:section.views.filter(v=>available.includes(v)&&!taken.has(v)).map(v=>(taken.add(v),v))}));
 // Future role views stay reachable without silently dropping out of the navigation.
 groups[0].views.push(...available.filter(v=>!taken.has(v)));
 return {home,groups:groups.filter(g=>g.views.length||g.id==='data')};
}
export function glassNavigation({views,currentView,labels,brandHTML='',domainHTML='',glyph,colorMode='light'}){
 const {home,groups}=glassNavigationGroups(views),esc=glassNavEscape;
 const homeLabel=home==='overview'?'Overview':home==='company'?'Company overview':labels[home]||'Workspace';
 const homeShort=home==='overview'||home==='company'?'Home':home==='leave'?'Time off':'Today';
 function viewButton(view,extraClass='',short=null){const active=currentView===view;return `<button type="button" data-do="view" data-view="${esc(view)}" class="glass-nav-link ${extraClass} ${active?'is-current':''}" ${active?'aria-current="page"':''} title="${esc(labels[view]||view)}">${glyph(view==='overview'?'home':view)}<span>${esc(short||labels[view]||view)}</span>${active?'<span class="glass-nav-current-dot" aria-hidden="true"></span>':''}</button>`;}
 function groupMarkup(group,compact){const active=group.views.includes(currentView);return `<details class="glass-nav-section ${active?'has-current':''}" name="glass-navigation-${compact?'compact':'desktop'}" ${!compact&&active?'open':''}><summary title="${esc(group.description)}"><span class="glass-nav-group-icon">${glyph(group.icon)}</span><span class="glass-nav-group-label">${esc(compact?group.short:group.label)}</span><span class="glass-nav-chevron" aria-hidden="true">⌄</span></summary><div class="glass-nav-links"><div class="glass-nav-panel-heading"><strong>${esc(group.label)}</strong><span>${esc(group.description)}</span></div>${group.views.map(v=>viewButton(v)).join('')}${group.id==='data'&&domainHTML?`<div class="glass-nav-domain">${domainHTML}</div>`:''}</div></details>`;}
 return `<aside class="glass-navigation" data-glass-tone="${colorMode==='dark'?'dark':'light'}" aria-label="Glass workspace navigation"><div class="glass-nav-brand">${brandHTML}</div><nav class="glass-nav-desktop" aria-label="Workspace sections">${viewButton(home,'glass-nav-home',homeLabel)}<div class="glass-nav-section-label">WORKSPACE</div>${groups.map(g=>groupMarkup(g,false)).join('')}</nav><nav class="glass-nav-mobile" aria-label="Compact workspace sections" style="--glass-nav-count:${groups.length+1}">${viewButton(home,'glass-nav-home',homeShort)}${groups.map(g=>groupMarkup(g,true)).join('')}</nav><div class="glass-nav-context"><span class="glass-nav-context-dot" aria-hidden="true"></span><span>Viewing <strong>${esc(labels[currentView]||currentView)}</strong></span></div><div class="glass-nav-foot"><span>One connected workspace.</span><small>Switch sections. Keep your place.</small></div></aside>`;
}
const glassNavigationRoots=new WeakSet();
export function installGlassNavigation(root){
 if(glassNavigationRoots.has(root))return;
 glassNavigationRoots.add(root);
 root.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const menu=event.target?.closest?.('.glass-nav-mobile')?.querySelector('details[open]');if(!menu)return;menu.open=false;menu.querySelector('summary')?.focus();event.preventDefault();});
 root.addEventListener('click',event=>{if(event.target?.closest?.('.glass-nav-mobile'))return;root.querySelectorAll('.glass-nav-mobile details[open]').forEach(menu=>{menu.open=false;});});
}
