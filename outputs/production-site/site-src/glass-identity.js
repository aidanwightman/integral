/* Append after appearances.js. No iframe reloads, no data or annotation mutations. */
(()=>{
 const html=document.documentElement,controls=document.querySelector('.appearance-controls'),header=document.querySelector('.site-header');
 if(!controls||!header)return;
 const launcher=document.createElement('button');launcher.type='button';launcher.className='glass-design-launcher';launcher.innerHTML='<svg class="control-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg><span>Display settings</span><svg class="control-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';launcher.setAttribute('aria-expanded','false');controls.id=controls.id||'glass-design-controls';launcher.setAttribute('aria-controls',controls.id);header.insertBefore(launcher,controls);
 const clarity=document.createElement('button');clarity.type='button';clarity.className='glass-clarity-control';clarity.textContent='Clarity';clarity.setAttribute('aria-pressed','false');controls.append(clarity);
 const nav=header.querySelector('nav');
 const menu=document.createElement('button');menu.type='button';menu.className='glass-mobile-menu';menu.textContent='Menu';menu.setAttribute('aria-expanded','false');
 function closeMenu(returnFocus=false){html.dataset.glassMenu='false';menu.setAttribute('aria-expanded','false');if(returnFocus)menu.focus();}
 if(nav){nav.id=nav.id||'glass-main-navigation';menu.setAttribute('aria-controls',nav.id);header.insertBefore(menu,nav);menu.addEventListener('click',()=>{const open=html.dataset.glassMenu!=='true';close();html.dataset.glassMenu=String(open);menu.setAttribute('aria-expanded',String(open));});nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});}

 let clear=false;try{const shared=localStorage.getItem('data-saver-glass-clarity');clear=shared===null?JSON.parse(localStorage.getItem('data-saver-glass-material-v1')||'null')?.clarity===true:shared==='true';}catch{}
 function applyClarity(){html.dataset.glassClarity=String(clear);clarity.setAttribute('aria-pressed',String(clear));}applyClarity();
 function setClarity(value){
  if(typeof value!=='boolean'||value===clear)return;
  clear=value;applyClarity();
  try{localStorage.setItem('data-saver-glass-clarity',String(clear));}catch{}
 }
 clarity.addEventListener('click',()=>setClarity(!clear));
 window.addEventListener('data-saver-workspace-clarity',event=>setClarity(event.detail));
 function positionStudio(){const h=header.getBoundingClientRect(),b=launcher.getBoundingClientRect();controls.style.right=Math.max(8,h.right-b.right)+'px';}
 window.addEventListener('resize',()=>requestAnimationFrame(positionStudio));
 function close(returnFocus=false){html.dataset.glassTools='false';launcher.setAttribute('aria-expanded','false');controls.hidden=true;if(returnFocus)launcher.focus();}
 close();
 launcher.addEventListener('click',()=>{const open=html.dataset.glassTools!=='true';closeMenu();html.dataset.glassTools=String(open);launcher.setAttribute('aria-expanded',String(open));controls.hidden=!open;if(open){positionStudio();controls.querySelector('#site-mode')?.focus();}});
 document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(html.dataset.glassTools==='true'){close(true);event.preventDefault();}else if(html.dataset.glassMenu==='true'){closeMenu(true);event.preventDefault();}});
 document.addEventListener('click',event=>{if(!controls.contains(event.target)&&!launcher.contains(event.target))close();if(nav&&!nav.contains(event.target)&&!menu.contains(event.target))closeMenu();});
 const onScroll=()=>header.classList.toggle('glass-header-compact',window.scrollY>72);window.addEventListener('scroll',onScroll,{passive:true});onScroll();
 // Keep the studio open while comparing identities; only Glass exposes clarity.
 function syncIdentity(){requestAnimationFrame(positionStudio);const glass=['glass','forest'].includes(html.dataset.design);clarity.hidden=!glass;if(!glass&&document.activeElement===clarity)controls.querySelector('#site-mode')?.focus();}
 syncIdentity();new MutationObserver(syncIdentity).observe(html,{attributes:true,attributeFilter:['data-design']});
})();
