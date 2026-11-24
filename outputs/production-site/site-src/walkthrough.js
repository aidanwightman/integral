(()=>{
 const $=id=>document.getElementById(id);let question=0,active=null,step=0,profile=null,walkthroughTrigger=null,reopenTraining=false;const fields=['tour-industry','tour-level','tour-function'];
 function syncChoice(id){
   const label=$(id+'-text');
   label.textContent=$(id).selectedOptions[0].textContent;
   label.hidden=false;
 }
 for(const id of fields){
   const refresh=()=>syncChoice(id);
   $(id).oninput=refresh;
   $(id).onchange=refresh;
   refresh();
 }
 const senior=()=>['manager','executive'].includes(profile.level);
 function questionView(){syncChoice(fields[question]);document.querySelectorAll('[data-question]').forEach(x=>x.hidden=Number(x.dataset.question)!==question);$('tour-progress').textContent=`Question ${question+1} of 3`;$('tour-meter').value=question+1;$('tour-back').hidden=question===0;$('tour-next').textContent=question===2?'Find my walkthroughs →':'Continue →';}
 $('tour-back').onclick=()=>{question=Math.max(0,question-1);questionView();$(fields[question]).focus()};
 $('tour-next').onclick=()=>{if(!$(fields[question]).reportValidity())return;if(question<2){question++;questionView();$(fields[question]).focus()}else recommend()};
 $('tour-profile').onsubmit=e=>{e.preventDefault();$('tour-next').click()};
 function tourHeading(ready){
   $('tour-section-title').textContent=ready?'Your walkthroughs':'Practise a CRM workflow';
   $('tour-section-intro').textContent=ready?'Choose a guided practice or explore the workspace.':'Choose a business and role for a guided CRM demo.';
 }
 function recommend() {
   tourHeading(true);
   profile = {industry:$('tour-industry').value, level:$('tour-level').value, role:$('tour-function').value};
   $('tour-profile').hidden = true;
   document.querySelector('.tour-onboarding').hidden = true;
   $('tour-progress').textContent = 'Your walkthroughs are ready';
   $('tour-results').hidden = false;
   $('tour-match-title').textContent = $('tour-function').selectedOptions[0].textContent;
   const business = profile.industry === 'other' ? 'Consulting sample business' : $('tour-industry').selectedOptions[0].textContent;
   $('tour-match-note').textContent = business + ' · ' + $('tour-level').selectedOptions[0].textContent;

   const recommendations = [
     [profile.role, 'Daily work'],
     ['training', 'Team training']
   ];
   if (senior()) recommendations.push(['workforce', 'Leadership']);

   const list = $('tour-recommendations');
   list.replaceChildren();
   for (const [id,category] of recommendations) {
     const guide = TOUR_DATA[id];
     const button = document.createElement('button');
     button.type = 'button';
     button.className = 'tour-route';
     button.ariaLabel = 'Start guide: ' + guide.name;
     const label = document.createElement('span');
     label.className = 'tour-route-label';
     const categoryLabel = document.createElement('span');
     categoryLabel.className = 'tour-category';
     categoryLabel.textContent = category + ' · ' + guide.steps.length + ' steps';
     const name = document.createElement('strong');
     name.textContent = guide.name;
     label.append(categoryLabel, name);

     const summary = document.createElement('span');
     summary.className = 'tour-route-summary';
     summary.id = 'tour-summary-' + id;
     summary.textContent = guide.summary;
     button.setAttribute('aria-describedby',summary.id);
     const action = document.createElement('span');
     action.className = 'tour-action';
     action.textContent = 'Start guide';
     button.append(label, summary, action);
     button.onclick = () => start(id, button);
     list.append(button);
   }
   $('tour-results').scrollIntoView({block:'start'});
   $('tour-match-title').focus({preventScroll:true});
 }
 $('tour-edit').onclick=()=>{tourHeading(false);$('tour-results').hidden=true;document.querySelector('.tour-onboarding').hidden=false;$('tour-profile').hidden=false;question=0;questionView();$(fields[question]).focus()};
 function route(id){const d=TOUR_DATA[id],role=id==='workforce'?'operations':id==='training'?profile.role:id;openWorkspace(role,profile.industry==='other'?'agency':profile.industry,d.view,walkthroughTrigger||document.activeElement);}
 $('tour-explore').onclick=()=>{active=null;$('resume-guide').hidden=true;walkthroughTrigger=$('tour-explore');route(profile.role);$('tour-coach').hidden=true;};
 function guideToggle(open){
   const button=$('resume-guide');button.hidden=false;button.textContent=open?'Hide guide':'Show guide';
   button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-controls',$('training-panel').hidden?'tour-coach':'training-panel');
 }
 function start(id,trigger){walkthroughTrigger=trigger;active=id;step=0;reopenTraining=false;route(id);$('tour-coach').hidden=false;$('training-panel').hidden=true;guideToggle(true);render();$('coach-step-title').focus({preventScroll:true});window.dispatchEvent(new Event('data-saver-guide-open'));}
 function render(){if(!active)return;const d=TOUR_DATA[active],done=step===d.steps.length,s=d.steps[Math.min(step,d.steps.length-1)];$('coach-title').textContent=d.name;$('coach-context').textContent=$('tour-level').selectedOptions[0].textContent+' · '+({starter:'Learn the record, then practise with a coach.',practitioner:'Focus on exceptions and repeatable handoffs.',manager:'Connect the workflow to coaching and team capacity.',executive:'Inspect the baseline, ownership and measurable outcomes.'}[profile.level]);$('coach-count').textContent=done?'Practice review':`Step ${step+1} of ${d.steps.length}`;$('coach-step-title').textContent=done?'Ready to try it independently?':s[0];$('coach-instruction').textContent=done?'You’ve reached the end of the guide. Ask a coach to review a sample outcome, or tailor and download a training plan.':$('training-pace').value==='compact'?s[0]+'. Use the cheat sheet for details.':s[1];$('coach-tip').textContent=done?'Progress through the guide is self-directed; the product has not assessed competence.':s[2];$('coach-prev').disabled=step===0;$('coach-next').textContent=done?'Restart practice ↻':'Next step →';}
 $('coach-next').onclick=()=>{step=step===TOUR_DATA[active].steps.length?0:step+1;render();$('coach-step-title').focus()};$('coach-prev').onclick=()=>{step=Math.max(0,step-1);render()};$('coach-close').onclick=closeCoach;
 function closeCoach(){ reopenTraining=!$('training-panel').hidden;$('training-panel').hidden=true;$('tour-coach').hidden=true;const target=walkthroughTrigger?.isConnected?walkthroughTrigger:!$('tour-results').hidden?$('tour-edit'):$(fields[question]);if(workspaceDialog.open&&active){guideToggle(false);$('resume-guide').setAttribute('aria-controls',reopenTraining?'training-panel':'tour-coach');$('resume-guide').focus()}else target.focus(); }
 $('resume-guide').onclick=()=>{
   if(!active||!workspaceDialog.open)return;
   if(!$('tour-coach').hidden||!$('training-panel').hidden){closeCoach();return;}
   $('training-panel').hidden=!reopenTraining;$('tour-coach').hidden=reopenTraining;guideToggle(true);
   if(reopenTraining)$('training-close').focus();else {render();$('coach-step-title').focus();}
 };
 function closeTraining(){ $('training-panel').hidden=true;if(active){$('tour-coach').hidden=false;guideToggle(true);render();$('coach-customise').focus()}else closeCoach(); }
 $('training-close').onclick=closeTraining;
 $('coach-customise').onclick=()=>{$('training-panel').hidden=false;$('tour-coach').hidden=true;$('training-editor').open=true;guideToggle(true);$('training-goal').focus()};$('training-pace').onchange=render;
 const planIds=['training-goal','training-owner','training-review','training-notes','training-pace'];
 try{const p=JSON.parse(localStorage.getItem('data-saver-training-plan')||'null');if(p)planIds.forEach(id=>{if(typeof p[id]==='string')$(id).value=p[id]})}catch{}
 $('training-save').onclick=()=>{try{localStorage.setItem('data-saver-training-plan',JSON.stringify(Object.fromEntries(planIds.map(id=>[id,$(id).value]))));$('training-status').textContent='Saved on this device. Nothing was sent.'}catch{$('training-status').textContent='Device storage is unavailable. Download the plan instead.'}};
 $('training-download').onclick=()=>{const d=active?TOUR_DATA[active]:null;const text=['INTEGRAL — TRAINING PLAN',d?.name||'Custom workflow',profile?JSON.stringify(profile):'',...planIds.map(id=>id.replace('training-','')+': '+$(id).value),...(d?d.steps.map((s,i)=>`${i+1}. ${s[0]}\n${s[1]}\nChecklist: ${s[2]}`):[]),'Completion is self-directed, not a competency assessment.'].join('\n\n');const u=URL.createObjectURL(new Blob([text],{type:'text/plain'}));const a=document.createElement('a');a.href=u;a.download='integral-training-plan.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);$('training-status').textContent='Training plan download requested. Nothing was sent.'};
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('training-panel').hidden){e.preventDefault();closeTraining()}else if(!$('tour-coach').hidden){e.preventDefault();closeCoach()}});
})();
