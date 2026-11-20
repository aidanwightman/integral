/* Original product illustration. Synthetic sample states, not live business activity. */
(()=>{
 const hero=document.querySelector('.hero'),old=hero?.querySelector('.hero-aside');
 if(!hero||!old||hero.querySelector('.ps-hero'))return;
 const visual=document.createElement('figure');visual.className='ps-hero';visual.setAttribute('aria-labelledby','ps-title');
 visual.innerHTML=`<div class="ps-window-bar"><span class="ps-window-mark" aria-hidden="true">i.</span><strong>Customer activity</strong><span class="ps-sample">Illustrative sample</span></div><div class="ps-workspace"><div class="ps-contact"><span class="ps-avatar" aria-hidden="true">SC</span><div><span class="ps-overline">Customer record / AC-104</span><h2 id="ps-title">Sam Carter</h2><p>Alder & Co · Operations director</p></div><span class="ps-record-state">One connected record</span></div><div class="ps-path" aria-label="Illustrated customer journey"><span><i aria-hidden="true">01</i>Person</span><span><i aria-hidden="true">02</i>Call</span><span class="ps-path-active"><i aria-hidden="true">03</i>Follow-up</span><span><i aria-hidden="true">04</i>Order</span><span><i aria-hidden="true">05</i>Delivery</span></div><div class="ps-example-grid"><article class="ps-call"><span class="ps-overline">Conversation logged</span><h3>Call summary</h3><p>Interested in a product walkthrough.</p><div class="ps-evidence"><span>Outcome</span><strong>Positive</strong></div><div class="ps-evidence"><span>Contact email</span><strong>Available</strong></div><span class="ps-stamp">Example trigger</span></article><article class="ps-followup"><div class="ps-rule-heading"><span aria-hidden="true">↗</span><span class="ps-overline">Follow-up</span></div><h3>Follow-up prepared.</h3><p>A positive outcome and a recorded email can start the agreed workflow.</p><div class="ps-message"><span>To Sam Carter</span><strong>Product walkthrough</strong><p>Thanks for your time. Here’s the walkthrough we discussed.</p></div><span class="ps-wait">Missing an email? Keep the action waiting.</span></article></div><div class="ps-role-bar" role="group" aria-label="Preview a role’s perspective"><button type="button" data-ps-role="sales" aria-pressed="true">Sales</button><button type="button" data-ps-role="finance" aria-pressed="false">Finance</button><button type="button" data-ps-role="operations" aria-pressed="false">Operations</button><button type="button" data-ps-role="people" aria-pressed="false">People</button></div><div class="ps-role-detail" aria-live="polite"><span class="ps-role-icon" aria-hidden="true">↗</span><div><strong data-ps-title>Sales activity</strong><p data-ps-detail>Outcome, owner and follow-up stay beside the customer record.</p></div></div></div><figcaption><span>Sample interface · no message is sent</span><a href="#demo">Try the working demo <span aria-hidden="true">↗</span></a></figcaption>`;
 hero.insertBefore(visual,old);hero.classList.add('ps-has-story');old.hidden=true;
 const roles={sales:['Sales activity','Outcome, owner and follow-up stay beside the customer record.'],finance:['Payments & invoices','An order, its invoice and its receipt remain distinct, linked records.'],operations:['Delivery commitments','The owner, dependencies and acceptance criteria travel with the handoff.'],people:['Leave & capacity','Leave, cover and available hours inform who can take the next piece of work.']};
 visual.querySelectorAll('[data-ps-role]').forEach(button=>button.addEventListener('click',()=>{visual.querySelectorAll('[data-ps-role]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));const [title,detail]=roles[button.dataset.psRole];visual.dataset.pendingTitle=title;visual.dataset.pendingDetail=detail;}));
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
       <a class="text-link" href="#walkthrough">Find your walkthrough <span aria-hidden="true">→</span></a>
     </figcaption>
   </figure>`;
 section.querySelectorAll('[data-stage-view]').forEach(link=>{
   const {stageRole:role,stageView:view}=link.dataset;
   window.addEventListener('data-saver-design-change',()=>{
     link.href=DEMO_URL+'#studio/agency/'+role+'/'+selectedLook()+'/'+view;
   });
   link.addEventListener('click',event=>{
     if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
     event.preventDefault();
     openWorkspace(role,'agency',view,link);
   });
 });
 const demo=document.querySelector('#demo');if(demo)demo.before(section);else hero.after(section);
})();
