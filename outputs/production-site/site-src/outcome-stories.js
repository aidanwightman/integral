/* The starting records and actions correspond to the six synthetic workspace cases. */
(() => {
  const grid = document.querySelector('#outcome-stories .outcome-story-grid');
  if (!grid) return;

  const groups = [
    {
      name: 'Sales & delivery',
      stories: [
        {
          id: 'followup', role: 'sales', title: 'Sales follow-up', record: 'Call record', reference: 'CALL-104',
          heading: 'A follow-up with no email address',
          situation: 'Sam Carter asked for a walkthrough. The call is logged, but the follow-up is waiting for a valid email.',
          steps: ['Check the contact email', 'Send the agreed follow-up', 'Reconcile the receipt after a timeout']
        },
        {
          id: 'delivery', role: 'operations', title: 'Delivery handoff', record: 'Delivery record', reference: 'DEL-104',
          heading: 'A scope change is holding up billing',
          situation: 'The customer’s scope decision is still open. Finance needs evidence of acceptance before it can take over.',
          steps: ['Resolve the scope question', 'Record customer acceptance', 'Confirm the handoff with finance']
        }
      ]
    },
    {
      name: 'Finance',
      stories: [
        {
          id: 'receivable', role: 'finance', title: 'Partial payment', record: 'Customer invoice', reference: 'INV-104',
          heading: 'A £12,000 invoice, a £10,000 receipt',
          situation: 'Alder & Co has paid part of its invoice. The balance is disputed and the bank reference can only be allocated once.',
          steps: ['Import the bank receipt', 'Allocate £10,000 to the invoice', 'Assign the £2,000 dispute to an owner']
        },
        {
          id: 'payable', role: 'finance', title: 'Payment approval', record: 'Supplier invoice', reference: 'BILL-104',
          heading: 'Only 80 of 100 billed units arrived',
          situation: 'The supplier also changed its bank details. The bill is on hold until someone verifies the change and matches the delivery.',
          steps: ['Verify the bank details independently', 'Approve the 80 received units', 'Get a second person to authorise payment']
        }
      ]
    },
    {
      name: 'People & leadership',
      stories: [
        {
          id: 'coverage', role: 'people', title: 'Leave & coverage', record: 'Leave request', reference: 'LEAVE-104',
          heading: 'Two days of leave need cover',
          situation: 'Jordan has requested 16 hours off. One colleague is already away and another lacks the training to cover the work.',
          steps: ['Choose an available, trained colleague', 'Approve the leave request', 'Cancel it and check the restored balance']
        },
        {
          id: 'leadership', role: 'leadership', title: 'Management review', record: 'Management review', reference: '',
          heading: 'A decision based on stale figures',
          situation: 'The management snapshot needs fresh evidence from collections and delivery before a leader can decide who acts next.',
          steps: ['Refresh the underlying records', 'Record the decision, evidence and action owner']
        }
      ]
    }
  ];

  const cases = [];
  function select(active) {
    for (const item of cases) {
      const selected = item === active;
      item.toggle.setAttribute('aria-expanded', String(selected));
      if (selected) item.toggle.setAttribute('aria-disabled', 'true');
      else item.toggle.removeAttribute('aria-disabled');
      item.panel.hidden = !selected;
    }
  }

  for (const group of groups) {
    const section = document.createElement('div');
    section.className = 'outcome-group';
    const category = document.createElement('h4');
    category.className = 'outcome-category';
    category.textContent = group.name;
    section.append(category);

    for (const story of group.stories) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'outcome-toggle';
      toggle.id = 'outcome-toggle-' + story.id;
      toggle.textContent = story.title;
      toggle.setAttribute('aria-controls', 'outcome-case-' + story.id);

      const panel = document.createElement('article');
      panel.id = 'outcome-case-' + story.id;
      panel.className = 'outcome-case';
      panel.dataset.role = story.role;
      panel.setAttribute('aria-labelledby', 'outcome-title-' + story.id);
      const heading = document.createElement('h5');
      heading.id = 'outcome-title-' + story.id;
      heading.textContent = story.heading;
      const record = document.createElement('p');
      record.className = 'outcome-record';
      record.textContent = story.record;
      if (story.reference) {
        const code = document.createElement('span');
        code.textContent = story.reference;
        record.append(code);
      }
      const situation = document.createElement('p');
      situation.className = 'outcome-situation';
      situation.textContent = story.situation;
      const path = document.createElement('ol');
      path.className = 'outcome-path';
      path.setAttribute('role', 'list');
      path.setAttribute('aria-label', 'Workflow steps');
      for (const step of story.steps) {
        const point = document.createElement('li');
        point.textContent = step;
        path.append(point);
      }
      const link = document.createElement('a');
      link.className = 'outcome-launch';
      link.textContent = 'Try workflow';
      link.setAttribute('aria-label', 'Try workflow: ' + story.title);
      const updateLink = () => {
        link.href = DEMO_URL + '#studio/agency/' + story.role + '/' + selectedLook() + '/outcomes/' + story.id;
      };
      updateLink();
      window.addEventListener('data-saver-design-change', updateLink);
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openWorkspace(story.role, 'agency', 'outcomes', link, story.id);
      });
      panel.append(record, heading, situation, path, link);
      section.append(toggle, panel);
      const item = {toggle, panel};
      cases.push(item);
      toggle.addEventListener('click', () => {
        if (!panel.hidden) return;
        select(item);
        // In the stacked layout, closing a previous case can move this control above the viewport.
        const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
        if (toggle.getBoundingClientRect().top < Math.max(0, headerBottom)) {
          toggle.scrollIntoView({block: 'start', behavior: 'instant'});
        }
      });
    }
    grid.append(section);
  }
  select(cases[0]);
})();
