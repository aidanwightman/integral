(() => {
  const section = document.getElementById('savings-detail');
  const launch = document.getElementById('tenet-launch');
  const panel = document.getElementById('tenet-panel');
  const heading = document.getElementById('tenet-labs');
  const pricing = [document.getElementById('pricing-title').parentElement, section.querySelector('.faq')];
  const hash = '#tenet-labs';
  let backRequested = false;

  function display(open, focusTarget) {
    section.dataset.tenet = open ? 'open' : 'closed';
    section.setAttribute('aria-labelledby', open ? heading.id : 'pricing-title');
    launch.hidden = open;
    launch.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    pricing.forEach(element => { element.hidden = open; });
    if (!focusTarget) return;
    requestAnimationFrame(() => {
      if (open !== !panel.hidden) return;
      focusTarget.focus({preventScroll:true});
      if (open) section.scrollIntoView({block:'start',behavior:'instant'});
      else focusTarget.scrollIntoView({block:'nearest',behavior:'instant'});
    });
  }

  function restore() {
    const open = location.hash === hash;
    if (open === !panel.hidden) return;
    const restoreLaunch = backRequested || location.hash === '#savings-detail';
    const focusTarget = open ? heading : (restoreLaunch ? launch : null);
    display(open, focusTarget);
    backRequested = false;
  }

  function close() {
    if (panel.hidden || backRequested) return;
    if (history.state?.integralTenetEntry && location.hash === hash) {
      backRequested = true;
      history.back();
    } else {
      history.replaceState(history.state,'','#savings-detail');
      display(false, launch);
    }
  }

  launch.addEventListener('click', () => {
    if (!panel.hidden) return;
    history.pushState({...history.state, integralTenetEntry:true},'',hash);
    display(true, heading);
  });
  document.getElementById('tenet-back').addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || panel.hidden || event.defaultPrevented) return;
    if (!section.contains(document.activeElement) && document.activeElement !== document.body) return;
    event.preventDefault();
    close();
  });
  window.addEventListener('popstate', restore);
  window.addEventListener('hashchange', restore);
  display(location.hash === hash, location.hash === hash ? heading : null);
})();
