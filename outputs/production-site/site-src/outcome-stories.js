/* Six bounded practice stories; external effects remain simulated. */
(function(){
 const host=document.getElementById('outcome-stories');if(!host)return;
 const stories=[
  ['sales','followup','Sales','Sales follow-up','Send a follow-up after a positive call.','Missing email: repair the record before continuing.'],
  ['finance','receivable','Finance · collections','Partial payment','Allocate a receipt and assign the remaining dispute.','A repeated receipt reference must not be allocated again.'],
  ['finance','payable','Finance · approvals','Payment approval','Match the invoice and approve received goods.','An unresolved exception stays visible; authorised is not paid.'],
  ['people','coverage','People & HR','Leave & coverage','Check cover, approve leave and restore cancelled days.','Check overlapping cover; cancellation must restore balance once.'],
  ['operations','delivery','Operations','Delivery handoff','Resolve blockers and confirm the finance handoff.','A missing dependency must block acceptance.'],
  ['leadership','leadership','Leadership','Management review','Review current records and assign an action owner.','Refresh stale records before reviewing.']
 ];
 const grid=host.querySelector('.outcome-story-grid');
 stories.forEach(([role,id,label,title,outcome,exception],index)=>{
  const card=document.createElement('article');card.className='outcome-story';
  const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=String(index+1).padStart(2,'0')+' / '+label;
  const h=document.createElement('h3');h.textContent=title;
  const p=document.createElement('p');p.textContent=outcome;
  const detail=document.createElement('p');detail.className='outcome-exception';const strong=document.createElement('strong');strong.textContent='Exception';detail.append(strong,document.createTextNode(exception));
  const a=document.createElement('a');a.className='outcome-launch';a.textContent='Try workflow';a.setAttribute('aria-label','Try workflow: '+title);a.href=DEMO_URL+`#studio/agency/${role}/${selectedLook()}/outcomes/${id}`;
  window.addEventListener('data-saver-design-change',()=>{a.href=DEMO_URL+`#studio/agency/${role}/${selectedLook()}/outcomes/${id}`;});
  const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='→';a.append(arrow);
  a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openWorkspace(role,'agency','outcomes',a,id);});
  card.append(eyebrow,h,p,detail,a);grid.append(card);
 });
})();
