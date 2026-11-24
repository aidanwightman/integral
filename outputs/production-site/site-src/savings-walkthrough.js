(() => {
  const mount = document.querySelector('[data-savings-content]');
  if (!mount) return;

  const paths = SAVINGS_PATHS;
  const industries = SAVINGS_INDUSTRIES;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
  const sterling = new Intl.NumberFormat('en-GB', {style:'currency', currency:'GBP', minimumFractionDigits:0, maximumFractionDigits:2});
  const percent = new Intl.NumberFormat('en-GB', {style:'percent', maximumFractionDigits:2});
  const money = pence => sterling.format(pence / 100);
  const icons = {
    automation:'<rect x="2.5" y="12" width="7" height="8" rx="2"/><rect x="22.5" y="3" width="7" height="8" rx="2"/><rect x="22.5" y="21" width="7" height="8" rx="2"/><path d="M9.5 16h4.5a3 3 0 0 0 3-3V9a2 2 0 0 1 2-2h3.5M14 16a3 3 0 0 1 3 3v4a2 2 0 0 0 2 2h3.5"/>',
    data:'<ellipse cx="14" cy="7.5" rx="10" ry="4"/><path d="M4 7.5v13c0 2.2 4.5 4 10 4M24 7.5v5M4 14c0 2.2 4.5 4 10 4"/><circle cx="22" cy="21" r="5"/><path d="m26 25 4 4"/>',
    software:'<rect x="8" y="4" width="21" height="17" rx="3"/><path d="M8 10h21M4.5 11A2.5 2.5 0 0 0 2 13.5V25a3 3 0 0 0 3 3h16a2.5 2.5 0 0 0 2.5-2.5M14 15.5h9"/>'
  };

  const arrow = '<span class="sw-arrow" aria-hidden="true">→</span>';
  const heading = (title, intro) => '<header class="sw-step-header"><h2 class="sw-step-title" tabindex="-1">'+escape(title)+'</h2>'+
    (intro?'<p>'+escape(intro)+'</p>':'')+'</header>';
  const button = (action, label, css) => '<button type="button" class="'+css+'" data-sw-action="'+action+'">'+escape(label)+'</button>';
  const back = label => button('back',label,'sw-back');
  const row = (label, value) => '<div><dt>'+escape(label)+'</dt><dd>'+escape(value)+'</dd></div>';
  function measures(item) {
    if(!item.time && !item.spend)return '';
    return '<dl class="sw-measures">'+(item.time?row('Staff time',item.time):'')+
      (item.spend?row('Costs to check',item.spend):'')+'</dl>';
  }

  function categoryScreen() {
    const cards=Object.entries(paths).map(([key,path])=>
      '<button type="button" class="sw-choice" data-category="'+escape(key)+'" data-savings-start="'+escape(key)+'">'+
        '<span class="sw-choice-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" focusable="false">'+icons[key]+'</svg></span>'+
        '<span class="sw-choice-title">'+escape(path.label)+'</span>'+
        '<span class="sw-choice-description">'+escape(path.description)+'</span>'+arrow+'</button>'
    ).join('');
    return heading('Where could you save?')+button('quiz','Choose my business type','sw-start-quiz sw-primary')+
      '<div class="sw-choices">'+cards+'</div>';
  }

  function questionScreen(path) {
    const choices=path.choices.map(choice=>
      '<button type="button" class="sw-choice sw-diagnostic" data-sw-action="diagnose" data-choice="'+escape(choice.id)+'">'+
      '<span class="sw-choice-title">'+escape(choice.label)+'</span>'+arrow+'</button>'
    ).join('');
    return back('All areas')+heading(path.question,path.intro)+'<div class="sw-choices sw-diagnostics">'+choices+'</div>';
  }

  function staffTimeExample(effort) {
    if(!effort)return '';
    const {monthlyCount,beforeMinutes,afterMinutes,work}=effort;
    const freedMinutes=monthlyCount*(beforeMinutes-afterMinutes);
    const hours=Math.floor(freedMinutes/60), minutes=freedMinutes%60;
    const duration=[hours && hours+' '+(hours===1?'hour':'hours'),minutes && minutes+' '+(minutes===1?'minute':'minutes')].filter(Boolean).join(' ');
    return '<section class="sw-time-example"><h4>Staff time in this example</h4><p>'+escape(monthlyCount+' '+work+' per month at '+beforeMinutes+' minutes each before the change and '+afterMinutes+' minutes each afterwards.')+
      '</p><p><strong>'+escape(duration+' freed up per month')+'</strong> for other work.</p></section>';
  }

  function workedExample(description,costs,effort) {
    const {currentSpend,retainedSpend,replacementSpend,transitionCost} =
      Object.fromEntries(Object.entries(costs).map(([key,pounds])=>[key,Math.round(pounds*100)]));
    const before=currentSpend*12, after=(retainedSpend+replacementSpend)*12+transitionCost;
    const saving=before-after;
    return '<dialog class="sw-example-dialog" aria-labelledby="sw-example-title"><div class="sw-example-body">'+
      '<div class="sw-example-head"><h3 class="sw-example-title" id="sw-example-title">Illustrative first-year example</h3>'+
      button('close-example','Close','sw-example-close')+'</div>'+
      '<div class="sw-example-summary"><span>First-year cash saving before our fee</span><strong>'+money(saving)+'</strong>'+
      '<p>'+money(saving/12)+' per month on average'+
      (before?' · '+percent.format(saving/before)+' of the original '+money(before)+' annual cost':'')+'.</p></div>'+
      '<p>'+escape(description)+'</p>'+
      '<dl class="sw-breakdown">'+row('Current cost for 12 months',money(currentSpend)+' × 12 = '+money(before))+
      row('Cost after the change','('+money(retainedSpend)+' kept + '+money(replacementSpend)+' new) × 12 + '+money(transitionCost)+' changeover = '+money(after))+
      row('First-year saving',money(before)+' − '+money(after)+' = '+money(saving))+'</dl>'+
      staffTimeExample(effort)+'<p class="sw-caption">The cash saving includes changeover costs. Any success fee is calculated separately.</p></div></dialog>';
  }

  function demoURL(demo) {
    return DEMO_URL+(demo.example?'?example='+encodeURIComponent(demo.example):'')+
      workspaceURL({industry:'agency',role:demo.role,look:selectedLook(),view:demo.view,outcomeCase:demo.outcomeCase});
  }

  function findingScreen(key,path,choice) {
    const demo=choice.demo;
    const adjacent=Object.entries(paths).filter(([other])=>other!==key).map(([other,category])=>
      '<button type="button" class="sw-link" data-savings-start="'+escape(other)+'">'+escape(path.related?.[other] || category.label)+' '+arrow+'</button>'
    ).join('');
    return back('Back to question')+'<div class="sw-finding">'+heading(choice.findingTitle)+
      '<p>'+escape(choice.finding)+'</p>'+measures(choice)+(choice.nextStep?'<p class="sw-next">'+escape(choice.nextStep)+'</p>':'')+'</div>'+
      '<div class="sw-actions">'+button('call','Book a free call','sw-primary')+button('example','View worked example','sw-example-trigger')+'</div>'+
      '<details class="sw-related"><summary>CRM demo and related workflows</summary><div>'+
      '<a class="sw-link" href="'+escape(demoURL(demo))+'" data-sw-action="demo">'+escape(demo.label)+' '+arrow+'</a>'+adjacent+'</div></details>';
  }

  function quizChoice(action,attribute,id,label) {
    return '<button type="button" class="sw-choice sw-diagnostic" data-sw-action="'+action+'" data-'+attribute+'="'+escape(id)+'">'+
      '<span class="sw-choice-title">'+escape(label)+'</span>'+arrow+'</button>';
  }

  function businessScreen() {
    const options=Object.entries(industries).map(([id,industry])=>quizChoice('industry','industry',id,industry.label)).join('');
    return back('Back to start')+heading('What kind of business do you run?')+'<div class="sw-choices sw-businesses">'+options+'</div>';
  }

  function issueScreen(industry) {
    const options=industry.choices.map(issue=>quizChoice('issue','issue',issue.id,issue.label)).join('');
    return back('Change business type')+heading('Where do you lose the most time or money?',industry.label)+
      '<div class="sw-choices sw-diagnostics">'+options+'</div>';
  }

  function sectorFinding(industry,issue) {
    const category=paths[issue.category];
    return back('Back to priorities')+'<div class="sw-finding">'+heading(issue.findingTitle,industry.label)+
      '<p>'+escape(issue.finding)+'</p>'+measures(issue)+
      (issue.alternative?'<p class="sw-alternative">'+escape(issue.alternative)+'</p>':'')+
      (issue.nextStep?'<div class="sw-next"><h3>First step</h3><p>'+escape(issue.nextStep)+'</p></div>':'')+'</div>'+
      '<div class="sw-actions">'+button('call','Book a free call','sw-primary')+
      (issue.example?button('example','View worked example','sw-example-trigger'):'')+'</div>'+
      (category?'<button type="button" class="sw-link" data-savings-start="'+escape(issue.category)+'">Explore '+escape(category.label.toLowerCase())+' '+arrow+'</button>':'');
  }

  function currentRoute() {
    const [section,key,choiceId,subview]=location.hash.slice(1).split('/');
    if(section==='walkthrough' && key==='business'){
      const industry=Object.hasOwn(industries,choiceId)?industries[choiceId]:null;
      return {section,key,industryId:choiceId,industry,issue:industry?.choices.find(item=>item.id===subview)};
    }
    const path=section==='walkthrough' && Object.hasOwn(paths,key) ? paths[key] : null;
    return {section,key,path,choice:path?.choices.find(item=>item.id===choiceId),subview};
  }

  function focusStep(selector) {
    const target=mount.querySelector(selector);
    if(!target)return;
    target.focus({preventScroll:true});
    const bounds=target.getBoundingClientRect();
    const headerBottom=document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    if(bounds.top<headerBottom || bounds.bottom>window.innerHeight){
      target.scrollIntoView({block:'start',behavior:'instant'});
    }
  }

  let panelResize;
  function render(focus) {
    const {section,key,path,choice,subview,industry,issue}=currentRoute();
    if(choice && subview==='edit')history.replaceState(history.state,'','#walkthrough/'+key+'/'+choice.id);
    let screen,content;
    if(section==='walkthrough' && key==='business'){
      screen=issue?'finding':industry?'issue':'business';
      content=issue?sectorFinding(industry,issue):industry?issueScreen(industry):businessScreen();
    }else{
      screen=choice?'result':path?'inputs':'choose';
      content=choice?findingScreen(key,path,choice):path?questionScreen(path):categoryScreen();
    }
    const shouldAnimate=mount.firstElementChild && typeof mount.animate==='function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousHeight=shouldAnimate?mount.getBoundingClientRect().height:0;
    panelResize?.cancel();
    const example=issue?.example || (choice && (choice.example || {description:path.example,costs:path.costs,effort:path.effort}));
    mount.innerHTML='<div class="sw-step" data-step="'+screen+'"'+(path?' data-category="'+escape(key)+'"':'')+'>'+content+'</div>'+
      (example?workedExample(example.description,example.costs,example.effort):'');
    if(focus || section==='walkthrough')focusStep(focus || '.sw-step-title');
    if(shouldAnimate && (focus || section==='walkthrough')){
      const step=mount.firstElementChild;
      step.animate([{opacity:.65,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:170,easing:'ease-out'});
      const newHeight=mount.getBoundingClientRect().height;
      // Keep a restored choice visible when Back returns focus deep in a list.
      if(!focus?.startsWith('[') && Math.abs(newHeight-previousHeight)>1){
        panelResize=mount.animate([{height:previousHeight+'px',overflow:'clip'},{height:newHeight+'px',overflow:'clip'}],
          {duration:230,easing:'cubic-bezier(.22,.75,.25,1)'});
      }
    }
  }

  function navigate(hash,focus,replace=false) {
    if(location.hash!==hash){
      const state={...history.state,savingsFrom:location.hash};
      if(replace)history.replaceState(state,'',hash);
      else history.pushState(state,'',hash);
    }
    render(focus);
  }

  let returnFocus='';
  function backTo(hash,focus) {
    if(history.state?.savingsFrom===hash) {
      returnFocus=focus;
      history.back();
    } else navigate(hash,focus,true);
  }

  window.addEventListener('data-saver-design-change',()=>{
    const link=mount.querySelector('[data-sw-action="demo"]');
    const {choice}=currentRoute();
    if(link && choice)link.href=demoURL(choice.demo);
  });
  window.addEventListener('hashchange',event=>{
    if(!location.hash.startsWith('#walkthrough') && !new URL(event.oldURL).hash.startsWith('#walkthrough'))return;
    render(returnFocus);
    returnFocus='';
  });
  for(const link of document.querySelectorAll('a[data-savings-start]')){
    if(Object.hasOwn(paths,link.dataset.savingsStart))link.setAttribute('href','#walkthrough/'+link.dataset.savingsStart);
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-savings-start], [data-sw-action], a[href="#walkthrough"]');
    if(!target || event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    const start=target.dataset.savingsStart;
    if(Object.hasOwn(paths,start)){
      event.preventDefault();
      navigate('#walkthrough/'+start,'.sw-step-title');
      return;
    }
    if(target.getAttribute('href')==='#walkthrough'){
      event.preventDefault();
      navigate('#walkthrough','.sw-step-title');
      // A partially visible panel can show its title while every choice is below the fold.
      if(target.closest('.site-header') && mount.querySelector('.sw-start-quiz')?.getBoundingClientRect().bottom>window.innerHeight){
        mount.querySelector('.sw-step-title')?.scrollIntoView({block:'start',behavior:'instant'});
      }
      return;
    }
    if(!mount.contains(target))return;
    const {key,path,choice,industryId,industry,issue}=currentRoute();
    const categoryRoute='#walkthrough/'+key;
    const businessRoute='#walkthrough/business';
    switch(target.dataset.swAction) {
      case 'back':
        if(issue)backTo(businessRoute+'/'+industryId,'[data-issue="'+issue.id+'"]');
        else if(industry)backTo(businessRoute,'[data-industry="'+industryId+'"]');
        else if(key==='business')backTo('#walkthrough','[data-sw-action="quiz"]');
        else if(choice)backTo(categoryRoute,'[data-choice="'+choice.id+'"]');
        else if(path)backTo('#walkthrough','[data-savings-start="'+key+'"]');
        break;
      case 'quiz':
        navigate(businessRoute,'.sw-step-title');
        break;
      case 'industry':
        if(Object.hasOwn(industries,target.dataset.industry))navigate(businessRoute+'/'+target.dataset.industry,'.sw-step-title');
        break;
      case 'issue':
        if(industry?.choices.some(item=>item.id===target.dataset.issue))navigate(businessRoute+'/'+industryId+'/'+target.dataset.issue,'.sw-step-title');
        break;
      case 'diagnose':
        if(path?.choices.some(item=>item.id===target.dataset.choice))navigate(categoryRoute+'/'+target.dataset.choice,'.sw-step-title');
        break;
      case 'demo':
        if(!choice)break;
        event.preventDefault();
        openWorkspace(choice.demo.role,'agency',choice.demo.view,target,choice.demo.outcomeCase || null,false,choice.demo.example);
        break;
      case 'example': {
        const dialog=mount.querySelector('.sw-example-dialog');
        if(!dialog || dialog.open)break;
        dialog.addEventListener('close',()=>{
          if(target.isConnected)target.focus({preventScroll:true});
        },{once:true});
        dialog.showModal();
        break;
      }
      case 'close-example':
        target.closest('dialog')?.close();
        break;
      case 'call':
        if(issue)openSavingsCall(target,[industry.label+' · '+issue.label,issue.time,issue.spend,issue.nextStep].filter(Boolean).join('\n'));
        else if(choice)openSavingsCall(target,[path.label+' · '+choice.label,choice.time,choice.spend,choice.nextStep || (!choice.time && choice.finding)].filter(Boolean).join('\n'));
        break;
    }
  });
  render();
})();
