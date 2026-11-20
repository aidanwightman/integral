/* Glass-only shell. Integrate by rendering this instead of the legacy fake desktop. */
import {glassNavigation,installGlassNavigation} from './glass-navigation.js';
import {glassClarityKey,glassMaterialKey,readGlassPreferences,observeGlassClarity} from './glass-preferences.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function glassIdentityShell({content,views,currentView,labels,brandHTML,domainHTML,glyph,alertControl='',title='Your workspace'}){
 return `<div class="glass-identity" data-glass-mode="light"><header class="glass-command-bar"><div><span class="glass-command-kicker">YOUR CONNECTED WORKSPACE</span><strong>${escape(title)}</strong></div><div class="glass-command-tools">${alertControl}<div class="glass-command-actions"><button type="button" data-glass-action="mode" aria-pressed="false" aria-label="Switch workspace to dark mode">Dark mode</button></div></div></header><div class="window-body">${glassNavigation({views,currentView,labels,brandHTML,domainHTML,glyph})}<main class="page" id="studio-main" tabindex="-1">${content}</main></div></div>`;
}
const installed=new WeakMap();
export function setGlassPreferences(root,preferences){
 return installed.get(root)?.(preferences);
}
export function installGlassIdentity(root,onClarityChange){
 if(installed.has(root))return;installGlassNavigation(root);
 let {mode,clarity}=readGlassPreferences();
 const apply=()=>{
  root.querySelectorAll('[data-glass-action="clarity"]').forEach(button=>button.setAttribute('aria-pressed',String(clarity)));
  root.querySelectorAll('.glass-identity').forEach(shell=>{
   shell.dataset.glassMode=mode;
   shell.dataset.glassClarity=String(clarity);
   shell.style.colorScheme=mode;
   shell.querySelectorAll('.glass-navigation').forEach(nav=>nav.dataset.glassTone=mode);
   shell.querySelectorAll('[data-glass-action="mode"]').forEach(button=>{
    button.textContent=mode==='dark'?'Light mode':'Dark mode';
    button.setAttribute('aria-pressed',String(mode==='dark'));
    button.setAttribute('aria-label',`Switch workspace to ${mode==='dark'?'light':'dark'} mode`);
   });
  });
 };
 const setPreferences=({mode:nextMode,clarity:nextClarity},persist=true)=>{
  const effectiveMode=['light','dark'].includes(nextMode)?nextMode:mode;
  const effectiveClarity=typeof nextClarity==='boolean'?nextClarity:clarity;
  if(mode===effectiveMode&&clarity===effectiveClarity)return;
  mode=effectiveMode;clarity=effectiveClarity;apply();
  if(!persist)return;
  try{
   localStorage.setItem(glassMaterialKey,JSON.stringify({mode,clarity}));
   localStorage.setItem(glassClarityKey,String(clarity));
  }catch{}
 };
 observeGlassClarity(value=>setPreferences({clarity:value},false));
 installed.set(root,setPreferences);
 root.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-glass-action]');
  if(!button||!root.contains(button))return;
  if(button.dataset.glassAction==='mode')setPreferences({mode:mode==='dark'?'light':'dark'});
  if(button.dataset.glassAction==='clarity'){setPreferences({clarity:!clarity});onClarityChange?.(clarity);}
 });
 // App rerenders replace the scene; only child-list mutations need synchronization.
 const observer=new MutationObserver(apply);observer.observe(root,{childList:true});apply();
 return ()=>observer.disconnect();
}
