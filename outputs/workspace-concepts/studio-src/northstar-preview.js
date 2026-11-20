// Keep the original workspace mounted while the independent Events CRM is open.
export function installNorthstarPreview({dialog,url,fallbackHash,onReturn,onHome}){
  const frame=dialog.querySelector('iframe');
  const back=dialog.querySelector('[data-northstar-back]');
  const hash='#northstar-events';
  let trigger=null;
  let goingBack=false;
  let frameStarted=false;
  let homeAfterClose=false;
  function show(){
    if(dialog.open)return;
    if(!frameStarted){
      const target=new URL(url,document.baseURI);
      target.searchParams.set('embed','northstar');
      // A new iframe history entry would consume Back before the preview hash in Safari.
      frame.contentWindow.location.replace(target.href);
      frameStarted=true;
    }else{
      frame.contentWindow.postMessage({type:'data-saver-reset-text-size'},location.protocol==='file:'?'*':location.origin);
    }
    dialog.showModal();
    back.focus({preventScroll:true});
  }
  function finish(){
    if(!dialog.open)return;
    dialog.close();
    goingBack=false;
    if(homeAfterClose){homeAfterClose=false;onHome?.();}
    else {
      // Fragment navigation restores its own focus after popstate dispatch.
      requestAnimationFrame(()=>{
        if(dialog.open)return;
        if(onReturn)onReturn(trigger);
        else trigger?.focus({preventScroll:true});
      });
    }
  }
  function open(from){
    if(dialog.open)return;
    if(from)trigger=from;
    if(location.hash!==hash)history.pushState({...history.state,northstarPreview:true},'',hash);
    show();
  }
  function close(home=false){
    if(!dialog.open || goingBack)return;
    homeAfterClose=home;
    if(location.hash===hash && history.state?.northstarPreview){
      goingBack=true;
      history.back();
    }else finish();
  }
  function restore(explicit=false){
    if(!explicit && location.hash!==hash)return;
    if(history.state?.northstarPreview && location.hash===hash){show();return;}
    // A shared preview URL has no in-page return entry yet.
    if(location.hash===hash){
      history.replaceState(history.state,'',fallbackHash() || location.pathname+location.search);
    }
    open();
  }
  window.addEventListener('popstate',()=>{
    if(location.hash!==hash){finish();return;}
    if(!history.state?.northstarPreview)history.replaceState({...history.state,northstarPreview:true},'',hash);
    show();
  });
  back.addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  window.addEventListener('message',event=>{
    const sameOrigin=event.origin===location.origin || (location.protocol==='file:' && event.origin==='null');
    if(!dialog.open || event.source!==frame.contentWindow || !sameOrigin)return;
    if(event.data?.type==='data-saver-northstar-close')close();
    if(event.data?.type==='data-saver-northstar-home')close(true);
  });
  return {open,close,restore,isOpen:()=>dialog.open};
}
