/* Append after appearances.js. No iframe reloads, no data or annotation mutations. */
(()=>{
 const html=document.documentElement,controls=document.querySelector('.appearance-controls'),header=document.querySelector('.site-header');
 if(!controls||!header)return;
 const launcher=document.createElement('button');launcher.type='button';launcher.className='glass-design-launcher';launcher.innerHTML='<svg class="control-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg><span>Display settings</span><svg class="control-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';launcher.setAttribute('aria-expanded','false');controls.id=controls.id||'glass-design-controls';launcher.setAttribute('aria-controls',controls.id);header.insertBefore(launcher,controls);
 const clarity=document.createElement('button');clarity.type='button';clarity.className='glass-clarity-control';clarity.textContent='Clarity';controls.append(clarity);
 const nav=header.querySelector('nav');
 const menu=document.createElement('button');menu.type='button';menu.className='glass-mobile-menu';menu.textContent='Menu';menu.setAttribute('aria-expanded','false');
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 // A second click reverses the current reveal from exactly where it reached.
 function headerPanel(trigger,panel,render){
  let expanded=false,animation=null;
  render(false);
  function settle(){
   if(!expanded)render(false);
   panel.inert=false;
   if(animation){animation.onfinish=null;animation.cancel();animation=null;}
  }
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches&&animation)settle();});
  return {
   get open(){return expanded;},
   set(open,immediate=false){
    if(open===expanded&&!(immediate&&animation))return;
    expanded=open;
    trigger.setAttribute('aria-expanded',String(open));
    panel.inert=!open;
    if(open)render(true);
    if(immediate||reducedMotion.matches||!panel.animate){settle();return;}
    // play() would otherwise rewind to the opposite end before the first painted frame.
    if(animation&&(open?animation.currentTime>=210:animation.currentTime<=0)){settle();return;}
    if(!animation){
    // Display settings can receive input on its first frame. Fade it in place
    // so even an immediate press of Randomise stays under the pointer.
    const frames=panel===controls ? [{opacity:0},{opacity:1}]
      : [{opacity:0,translate:'0 -6px'},{opacity:1,translate:'0 0'}];
    animation=panel.animate(frames,{
      duration:210,easing:'cubic-bezier(.25,.68,.22,1)',fill:'both'
     });
     animation.currentTime=open?0:210;
    }
    animation.onfinish=settle;
    animation.playbackRate=open?1:-1.2;
    animation.play();
   }
  };
 }
 const menuPanel=nav&&headerPanel(menu,nav,open=>{html.dataset.glassMenu=String(open);});
 const positionMenu=()=>{
  if(menuPanel?.open)nav.style.setProperty('--header-menu-height',Math.max(44,window.innerHeight-header.getBoundingClientRect().bottom-18)+'px');
 };
 if(nav){
  nav.id=nav.id||'glass-main-navigation';menu.setAttribute('aria-controls',nav.id);header.insertBefore(menu,nav);
  menu.addEventListener('click',()=>{studioPanel.set(false,true);menuPanel.set(!menuPanel.open);positionMenu();});
  nav.addEventListener('click',event=>{if(event.target.closest('a'))menuPanel.set(false);});
 }

 let clear=html.dataset.glassClarity==='true';
 function applyClarity(value){clear=value;html.dataset.glassClarity=String(value);clarity.setAttribute('aria-pressed',String(value));}
 applyClarity(clear);
 observeGlassClarity(applyClarity);
 function setClarity(value){
  if(typeof value!=='boolean'||value===clear)return;
  applyClarity(value);
  try{localStorage.setItem(glassClarityKey,String(value));}catch{}
 }
 clarity.addEventListener('click',()=>setClarity(!clear));
 window.addEventListener('data-saver-workspace-clarity',event=>setClarity(event.detail));
 // Anchor once on open. Each design has a different header, but the control
 // under the pointer must stay put until the user resizes or reopens the panel.
 const topLayer=typeof controls.showPopover==='function';
 if(topLayer)controls.setAttribute('popover','manual');
 function positionStudio(){
  const headerBox=header.getBoundingClientRect(),launcherBox=launcher.getBoundingClientRect();
  const gap=8;
  const width=Math.min(340,document.documentElement.clientWidth-2*gap);
  const left=Math.max(gap,Math.min(launcherBox.right-width,document.documentElement.clientWidth-width-gap));
  const top=Math.max(gap,Math.min(headerBox.bottom+gap,window.innerHeight-150));
  controls.style.setProperty('--studio-left',left+'px');
  controls.style.setProperty('--studio-top',top+'px');
  controls.style.setProperty('--studio-width',width+'px');
  updatePanelOrigin();
 }
 function updatePanelOrigin(){
  if(topLayer)return;
  const box=header.getBoundingClientRect();
  controls.style.setProperty('--studio-origin-x',(box.left+header.clientLeft)+'px');
  controls.style.setProperty('--studio-origin-y',(box.top+header.clientTop)+'px');
 }
 if(!topLayer)window.addEventListener('data-saver-design-change',()=>{
  if(studioPanel.open)updatePanelOrigin();
 });
 window.addEventListener('resize',()=>{
  if(studioPanel.open)positionStudio();
  if(!menu.getClientRects().length)menuPanel?.set(false,true);
  else positionMenu();
 });
 const studioPanel=headerPanel(launcher,controls,open=>{
  html.dataset.glassTools=String(open);
  if(open){
   positionStudio();controls.hidden=false;
   if(topLayer&&!controls.matches(':popover-open'))controls.showPopover();
  }else{
   if(topLayer&&controls.matches(':popover-open'))controls.hidePopover();
   controls.hidden=true;
  }
 });
 launcher.addEventListener('click',()=>{
  menuPanel?.set(false,true);
  studioPanel.set(!studioPanel.open);
  if(studioPanel.open)controls.querySelector('#site-design').focus({preventScroll:true});
 });

 // Keep the visible paragraph, list item or table row in place when a design reflows.
 let readingAnchors=[],atPageEnd=false;
 window.addEventListener('data-saver-design-changing',()=>{
  readingAnchors=[];atPageEnd=false;
  if(!studioPanel.open||window.scrollY<=1)return;
  atPageEnd=html.scrollHeight-html.clientHeight-window.scrollY<=2;
  if(atPageEnd)return;
  const height=html.clientHeight,width=html.clientWidth;
  const readingLine=Math.min(height-1,Math.max(header.getBoundingClientRect().bottom+12,height/3));
  const panel=controls.getBoundingClientRect();
  let block=null,section=null;
  for(const x of [width*.45,width*.25,width*.75]){
   // On a narrow screen read below the settings popup when there's room.
   const covered=x>=panel.left&&x<=panel.right&&readingLine>=panel.top&&readingLine<=panel.bottom;
   const y=covered&&panel.bottom+12<height?panel.bottom+12:readingLine;
   const hit=document.elementsFromPoint(x,y).find(node=>node.closest('main,.site-footer'));
   if(!hit)continue;
   section ||= hit.closest('section,footer');
   block=hit.closest('p,h1,h2,h3,h4,summary,tr,li,dt,dd,figcaption,button,label');
   if(block)break;
  }
  if(block)section=block.closest('section,footer');
  for(const node of new Set([block,block?.closest('article,details,table,ul,ol,figure'),section])){
   if(node)readingAnchors.push({node,top:node.getBoundingClientRect().top});
  }
 });
 window.addEventListener('data-saver-design-change',()=>{
  if(atPageEnd)window.scrollTo({top:html.scrollHeight,behavior:'instant'});
  else for(const {node,top} of readingAnchors){
   if(!node.isConnected)continue;
   const rect=node.getBoundingClientRect();
   if(!rect.width||!rect.height)continue;
   const delta=rect.top-top;
   if(Math.abs(delta)>0.5)window.scrollBy({top:delta,behavior:'instant'});
   break;
  }
  readingAnchors=[];atPageEnd=false;
 });
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented)return;
  if(studioPanel.open){
   if(CSS.supports('selector(select:open)')&&controls.querySelector('select:open'))return;
   launcher.focus({preventScroll:true});studioPanel.set(false);event.preventDefault();
  }else if(menuPanel?.open){menu.focus({preventScroll:true});menuPanel.set(false);event.preventDefault();}
 });
 function dismissOutside(event){
  if(studioPanel.open&&!controls.contains(event.target)&&!launcher.contains(event.target))studioPanel.set(false);
  if(menuPanel?.open&&!nav.contains(event.target)&&!menu.contains(event.target))menuPanel.set(false);
 }
 document.addEventListener('focusin',dismissOutside);
 document.addEventListener('click',dismissOutside);
 const onScroll=()=>{header.classList.toggle('glass-header-compact',window.scrollY>72);if(studioPanel.open)updatePanelOrigin();positionMenu();};window.addEventListener('scroll',onScroll,{passive:true});onScroll();
 // Show Clarity only in the appearances that support it.
 function syncIdentity(){const glass=['glass','forest'].includes(html.dataset.design);clarity.hidden=!glass;if(!glass&&document.activeElement===clarity)controls.querySelector('#site-mode')?.focus({preventScroll:true});}
 syncIdentity();new MutationObserver(syncIdentity).observe(html,{attributes:true,attributeFilter:['data-design']});
})();
