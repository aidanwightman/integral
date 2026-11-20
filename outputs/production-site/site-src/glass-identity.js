/* Append after appearances.js. No iframe reloads, no data or annotation mutations. */
(()=>{
 const html=document.documentElement,controls=document.querySelector('.appearance-controls'),header=document.querySelector('.site-header');
 if(!controls||!header)return;
 const launcher=document.createElement('button');launcher.type='button';launcher.className='glass-design-launcher';launcher.innerHTML='<svg class="control-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg><span>Display settings</span><svg class="control-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';launcher.setAttribute('aria-expanded','false');controls.id=controls.id||'glass-design-controls';launcher.setAttribute('aria-controls',controls.id);header.insertBefore(launcher,controls);
 const clarity=document.createElement('button');clarity.type='button';clarity.className='glass-clarity-control';clarity.textContent='Clarity';controls.append(clarity);
 const nav=header.querySelector('nav');
 const menu=document.createElement('button');menu.type='button';menu.className='glass-mobile-menu';menu.textContent='Menu';menu.setAttribute('aria-expanded','false');
 function closeMenu(returnFocus=false){html.dataset.glassMenu='false';menu.setAttribute('aria-expanded','false');if(returnFocus)menu.focus({preventScroll:true});}
 if(nav){nav.id=nav.id||'glass-main-navigation';menu.setAttribute('aria-controls',nav.id);header.insertBefore(menu,nav);menu.addEventListener('click',()=>{const open=html.dataset.glassMenu!=='true';close();html.dataset.glassMenu=String(open);menu.setAttribute('aria-expanded',String(open));});nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});}

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
 // Keep the open studio in viewport coordinates as the header changes shape.
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
  updatePanelOrigin();
 }
 function updatePanelOrigin(){
  if(topLayer)return;
  const box=header.getBoundingClientRect();
  controls.style.setProperty('--studio-origin-x',(box.left+header.clientLeft)+'px');
  controls.style.setProperty('--studio-origin-y',(box.top+header.clientTop)+'px');
 }
 window.addEventListener('resize',()=>{
  if(!controls.hidden)positionStudio();
  if(html.dataset.glassMenu==='true'&&!menu.getClientRects().length)closeMenu();
 });
 function close(returnFocus=false){
  if(returnFocus)launcher.focus({preventScroll:true});
  if(topLayer&&controls.matches(':popover-open'))controls.hidePopover();
  html.dataset.glassTools='false';launcher.setAttribute('aria-expanded','false');controls.hidden=true;
 }
 close();
 launcher.addEventListener('click',()=>{
  if(!controls.hidden){close();return;}
  closeMenu();
  html.dataset.glassTools='true';launcher.setAttribute('aria-expanded','true');
  positionStudio();controls.hidden=false;
  if(topLayer)controls.showPopover();
  controls.querySelector('#site-design').focus({preventScroll:true});
 });

 // Different designs wrap copy and workspace cards at different heights.
 // Keep the landmark the visitor was reading at the same point in the viewport.
 let landmarks=[];
 window.addEventListener('data-saver-design-changing',()=>{
  if(controls.hidden||window.scrollY===0)return;
  const readingLine=window.innerHeight/3;
  landmarks=Array.from(document.querySelectorAll('main h1,main h2,main h3,main summary,.demo-tools,.workspace-snapshot,.outcome-stories,.tour-onboarding,.site-footer'))
   .filter(node=>node.getClientRects().length)
   .map(node=>({node,top:node.getBoundingClientRect().top}))
   .sort((a,b)=>Math.abs(a.top-readingLine)-Math.abs(b.top-readingLine));
 });
 window.addEventListener('data-saver-design-change',()=>{
  const anchor=landmarks.find(({node})=>node.isConnected&&node.getClientRects().length);
  landmarks=[];
  if(anchor)window.scrollBy({top:anchor.node.getBoundingClientRect().top-anchor.top,behavior:'instant'});
  if(!controls.hidden)updatePanelOrigin();
 });
 document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(html.dataset.glassTools==='true'){close(true);event.preventDefault();}else if(html.dataset.glassMenu==='true'){closeMenu(true);event.preventDefault();}});
 function dismissOutside(event){
  if(!controls.hidden&&!controls.contains(event.target)&&!launcher.contains(event.target))close();
  if(html.dataset.glassMenu==='true'&&nav&&!nav.contains(event.target)&&!menu.contains(event.target))closeMenu();
 }
 document.addEventListener('focusin',dismissOutside);
 document.addEventListener('click',dismissOutside);
 const onScroll=()=>header.classList.toggle('glass-header-compact',window.scrollY>72);window.addEventListener('scroll',onScroll,{passive:true});onScroll();
 // Show Clarity only in the appearances that support it.
 function syncIdentity(){const glass=['glass','forest'].includes(html.dataset.design);clarity.hidden=!glass;if(!glass&&document.activeElement===clarity)controls.querySelector('#site-mode')?.focus({preventScroll:true});}
 syncIdentity();new MutationObserver(syncIdentity).observe(html,{attributes:true,attributeFilter:['data-design']});
})();
