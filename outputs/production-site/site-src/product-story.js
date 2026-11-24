/* Connected CRM examples beneath the savings walkthrough. */
(()=>{
 const demo=document.querySelector('#demo');
 if(!demo)return;
 const section=document.createElement('section');section.className='ps-explainer wrap';section.setAttribute('aria-labelledby','ps-explainer-title');
 section.innerHTML=`
   <header class="ps-explainer-intro">
     <div><p class="eyebrow">Connected workflows</p><h2 id="ps-explainer-title">From enquiry to delivery</h2></div>
     <p>One customer record follows the work. Sales logs the conversation, operations picks up delivery, and finance can trace the invoice back to the order.</p>
   </header>
   <figure class="ps-connection" aria-labelledby="ps-explainer-title">
     <ol class="ps-handoff">
       <li>
         <span class="ps-stage-shape ps-stage-contact" aria-hidden="true"></span>
         <div><h3><a data-stage-role="sales" data-stage-view="contacts" href="${DEMO_URL}#studio/agency/sales/${selectedLook()}/contacts">Contact records</a></h3><p>Review possible duplicates, connect the person to their company and assign an owner.</p><span class="ps-model-label">Person + account</span></div>
       </li>
       <li>
         <span class="ps-stage-shape ps-stage-call" aria-hidden="true"></span>
         <div><h3><a data-stage-role="sales" data-stage-view="dialer" href="${DEMO_URL}#studio/agency/sales/${selectedLook()}/dialer">Calls &amp; follow-up</a></h3><p>Record the outcome and the promised next step so the next colleague can pick it up.</p><span class="ps-model-label">Activity + workflow</span></div>
       </li>
       <li>
         <span class="ps-stage-shape ps-stage-delivery" aria-hidden="true"></span>
         <div><h3><a data-stage-role="operations" data-stage-view="control" href="${DEMO_URL}#studio/agency/operations/${selectedLook()}/control">Delivery &amp; billing</a></h3><p>Link the order, delivery and invoice so each team can see what has been handed over.</p><span class="ps-model-label">Order + delivery + invoice</span></div>
       </li>
     </ol>
     <figcaption class="ps-model-footer">
       <p class="ps-explainer-note">An illustrative connection model. Your records, rules and integrations are mapped with your team.</p>
       <a class="text-link" href="#crm-guides">Choose a CRM guide <span aria-hidden="true">→</span></a>
     </figcaption>
   </figure>`;
 function connectWorkspaceLink(link,role,view){
   function updateWorkspaceLink(){
     link.href=DEMO_URL+'#studio/agency/'+role+'/'+selectedLook()+'/'+view;
   }
   updateWorkspaceLink();
   window.addEventListener('data-saver-design-change',updateWorkspaceLink);
   link.addEventListener('click',event=>{
     if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
     event.preventDefault();
     openWorkspace(role,'agency',view,link);
   });
 }
 section.querySelectorAll('[data-stage-view]').forEach(link=>{
   connectWorkspaceLink(link,link.dataset.stageRole,link.dataset.stageView);
 });
 demo.after(section);
 connectWorkspaceLink(document.getElementById('crm-open-workspace'),'sales','salesdesk');

 const previews=document.getElementById('crm-previews');
 const toggle=document.getElementById('crm-preview-toggle');
 const label=toggle.querySelector('span');
 function showPreviews(show,animate=false){
   previews.toggleAttribute('data-animate',animate);
   previews.hidden=!show;
   previews.inert=!show;
   toggle.setAttribute('aria-expanded',String(show));
   label.textContent=show?'Hide role previews':'Show role previews';
 }
 toggle.hidden=false;
 toggle.addEventListener('click',()=>showPreviews(previews.hidden,true));

 // Open a bookmarked preview before the browser positions its anchor.
 function previewTarget(hash){
   const target=document.getElementById(hash.slice(1));
   return target && previews.contains(target)?target:null;
 }
 function restorePreviewAnchor(){
   const target=previewTarget(location.hash);
   if(!target || !previews.hidden)return;
   showPreviews(true);
   target.scrollIntoView({block:'start'});
 }
 document.addEventListener('click',event=>{
   const link=event.target.closest?.('a[href^="#"]');
   if(link && !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && previewTarget(link.hash))showPreviews(true);
 });
 window.addEventListener('hashchange',restorePreviewAnchor);
 restorePreviewAnchor();
})();
