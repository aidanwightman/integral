const northstarDialog=document.getElementById('northstar-preview');
const northstarSite=installNorthstarPreview({
  dialog:northstarDialog,
  url:northstarDialog.dataset.url,
  fallbackHash:()=>'#demo',
  onReturn(trigger){
    if(workspaceDialog.open){
      frame.focus();
      frame.contentWindow.postMessage({type:'data-saver-northstar-return'},location.protocol==='file:'?'*':location.origin);
    }else (trigger||document.querySelector('.glass-design-launcher'))?.focus({preventScroll:true});
  },
  onHome(){
    if(workspaceDialog.open)closeWorkspace();
    const home=document.querySelector('.site-header .wordmark');
    workspaceTrigger=home;
    home.click();
    home.focus({preventScroll:true});
  }
});
function launchNorthstarFromSite(trigger){
  const fromStudio=workspaceDialog.open;
  northstarDialog.querySelector('[data-northstar-back]').textContent=fromStudio?'← Back to workspace':'← Back to site';
  northstarSite.open(trigger);
}
window.addEventListener('data-saver-open-northstar',event=>launchNorthstarFromSite(event.detail?.trigger));
window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow || !workspaceDialog.open || northstarSite.isOpen())return;
  if(event.origin!==location.origin && !(location.protocol==='file:' && event.origin==='null'))return;
  if(event.data?.type==='data-saver-open-northstar')launchNorthstarFromSite(frame);
});
northstarSite.restore();
