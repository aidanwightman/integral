/* Valid landing identities; Glass is the first-visit and invalid-state fallback. */
(()=>{const root=document.documentElement,toggle=document.getElementById('site-mode'),select=document.getElementById('site-design'),shuffle=document.getElementById('shuffle-design'),status=document.getElementById('design-status');const designs=['glass','forest','editorial','signal','bento'];let mode='light',design='glass';try{const saved=JSON.parse(localStorage.getItem('data-saver-glass-site-v1')||'null');mode=saved?.mode==='dark'?'dark':'light';if(designs.includes(saved?.design))design=saved.design;}catch{}
function apply(announce=false){root.dataset.design=design;root.dataset.mode=mode;root.dataset.edition='glass';root.style.colorScheme=mode;select.value=design;toggle.textContent=mode==='dark'?'Light mode':'Dark mode';toggle.setAttribute('aria-pressed',String(mode==='dark'));toggle.setAttribute('aria-label',mode==='dark'?'Switch to light mode':'Switch to dark mode');if(announce)status.textContent=select.selectedOptions?.[0]?.textContent||design;window.dispatchEvent(new Event('data-saver-design-change'));try{localStorage.setItem('data-saver-glass-site-v1',JSON.stringify({mode,design}));}catch{}}
window.addEventListener('data-saver-workspace-design',event=>{if(designs.includes(event.detail?.look)&&event.detail.look!==design){design=event.detail.look;apply(true);}});
toggle.addEventListener('click',()=>{mode=mode==='dark'?'light':'dark';apply();});select.addEventListener('change',()=>{
  if(select.value==='northstar'){
    select.value=design;
    const launcher=document.querySelector('.glass-design-launcher');
    if(launcher?.getAttribute('aria-expanded')==='true')launcher.click();
    window.dispatchEvent(new CustomEvent('data-saver-open-northstar',{detail:{trigger:launcher||select}}));
    return;
  }
  design=designs.includes(select.value)?select.value:'glass';apply(true);});shuffle.addEventListener('click',()=>{const others=designs.filter(value=>value!==design);design=others[Math.floor(Math.random()*others.length)];apply(true);});apply();})();
