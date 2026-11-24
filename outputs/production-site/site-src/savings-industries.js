// Examples describe a hypothetical renewal at the start of the comparison year.
// The first three costs are monthly GBP amounts. Changeover is paid once.
const SAVINGS_INDUSTRIES = {
  ...SAVINGS_FIELD_INDUSTRIES,
  sales: {
    label: 'Sales team or agency',
    choices: [
      {
        id: 'linkedin', label: 'Remembering LinkedIn conversations and promised replies', category: 'automation',
        findingTitle: 'Put the promised LinkedIn reply on the rep’s task list',
        finding: 'When a buyer asks for a case study, the rep records the promise or uses LinkedIn’s approved CRM Sync where supported. A dated task holds a draft. The rep opens the thread, reviews the wording and sends it in LinkedIn.',
        time: 'Rep time spent locating the thread and case study, recording the promise and reviewing the reply before sending.',
        spend: 'Check the separate reminder subscription. Keep the CRM and any LinkedIn licences the team needs for the approved integration.',
        example: SAVINGS_SALES_EXAMPLES.linkedin
      },
      {
        id: 'whatsapp', label: 'Replying to WhatsApp leads before the window closes', category: 'automation',
        findingTitle: 'Give the WhatsApp enquiry and its reply window to one rep',
        finding: 'Record the buyer’s opt-in and last inbound message. On WhatsApp Business Platform, a rep can write a personal reply within 24 hours of that message. Outside the window, outreach needs an appropriate approved template. An opt-out stops it.',
        time: 'Time reps spend assigning chats, checking consent and finding out whether another rep has already answered.',
        spend: 'Compare your shared-inbox and routing bills. Keep applicable provider and template-message charges for the same volume and destinations.',
        example: SAVINGS_SALES_EXAMPLES.whatsapp
      },
      {
        id: 'callbacks', label: 'Sending the pitch recap and making the promised call', category: 'automation',
        findingTitle: 'Keep the promise made in the pitch',
        finding: 'Record the figures the buyer requested and when they want a call. Prepare the recap for review, keep one sent copy and assign the callback. If the buyer replies first, the owner can update the next action.',
        time: 'Time after a pitch spent reconstructing notes, preparing the recap and agreeing who will make the callback.',
        spend: 'Compare sequencing seats with the CRM, mailbox delivery and dialler costs the team will keep.',
        example: SAVINGS_SALES_EXAMPLES.pitch
      },
      {
        id: 'quote', label: 'Chasing the wrong version of a quote', category: 'automation',
        findingTitle: 'Retire the old quote reminder when the price changes',
        finding: 'Link the follow-up to the issued quote revision. Replace the task when a new price goes out. When the buyer accepts, give the order owner the agreed version and close the sales chase.',
        time: 'Minutes reps spend finding the latest price and stopping reminders on quotes the buyer has already accepted.',
        spend: 'Review quote-reminder add-ons, quoting licences and message delivery. Keep the system that records the accepted version.',
        example: SAVINGS_SALES_EXAMPLES.quote
      },
      {
        id: 'noshow', label: 'Rescheduling missed demos without chasing twice', category: 'automation',
        findingTitle: 'Give the buyer one way to rebook a missed demo',
        finding: 'The meeting owner confirms the no-show and checks for an existing rebooking. If there is none, prepare one rescheduling invitation. A new booking closes the chase and updates the deal.',
        time: 'Time spent confirming attendance, offering another slot and cancelling duplicate reminders after the buyer rebooks.',
        spend: 'Compare the sales calendar, a dedicated rescheduling add-on and the cost of sending reminders. Count paid subscriptions separately from potential recovered sales.',
        example: SAVINGS_SALES_EXAMPLES.noshow
      },
      {
        id: 'multichannel', label: 'Stopping the sequence when a buyer replies elsewhere', category: 'automation',
        findingTitle: 'Let one reply stop the rest of the chase',
        finding: 'A buyer replies on WhatsApp while an email and call task are queued. Pause the sequence, assign their reply and show the next owner what happened. A request to stop all contact cancels outreach across channels.',
        time: 'Minutes reps spend checking other inboxes and removing outstanding reminders when a buyer replies.',
        spend: 'Compare sequencing subscriptions and connectors with the CRM, mailbox, phone and messaging fees you still need.',
        example: SAVINGS_SALES_EXAMPLES.multichannel
      },
      {
        id: 'credits', label: 'Paying to look up the same contacts', category: 'data',
        findingTitle: 'Check the record before buying another lookup',
        finding: 'Match the person and company first. Show where each contact detail came from and when it was checked. Buy a fresh lookup when the evidence is missing or out of date.',
        spend: 'Prospecting subscriptions, enrichment credits and recurring credit top-ups. Unused credits may expire at renewal.',
        nextStep: 'Compare one credit statement with the records it updated. Identify repeated lookups and the smallest package the team could actually switch to.',
        example: {
          description: 'At renewal, a team keeps a smaller data package, drops its recurring top-up and adds checks against contacts already in its CRM.',
          costs: {currentSpend: 620, retainedSpend: 260, replacementSpend: 70, transitionCost: 600}
        }
      },
      {
        id: 'inbound', label: 'Missing inbound calls and demo requests', category: 'automation',
        findingTitle: 'Route a new lead while the caller is still on the line',
        finding: 'An AI receptionist can capture the company and reason for calling, offer the right rep’s available slots and hand a live sales conversation to a person.',
        time: 'Time reps spend returning demo enquiries, matching prospects to accounts and fixing bookings assigned to the wrong owner.',
        spend: 'Answering plans, number rental, calendar routing, voice usage and live overflow.',
        example: SAVINGS_RECEPTION_EXAMPLE
      }
    ]
  },
  consulting: {
    label: 'Consultancy or professional services',
    choices: [
      {
        id: 'staffing', label: 'Staffing work after a proposal is signed', category: 'software',
        findingTitle: 'Turn a signed scope into a staffing plan',
        finding: 'Carry the agreed roles, dates and budget from the proposal into the delivery plan. Let the project lead confirm availability before a tentative booking becomes a commitment.',
        spend: 'CRM seats, project-management subscriptions and separate resource-planning seats.',
        nextStep: 'Trace a signed engagement into the team calendar. Check whether the project system already shows leave, tentative bookings and remaining capacity.',
        example: {
          description: 'A 120-person consultancy pays £5,400 a month for its CRM and project platform, plus £30 per person per month for separate resource planning. Once project leads verify availability and booking permissions in the main platform, it keeps that platform, budgets £750 a month for the link and support, and spends £9,000 on migration and training.',
          costs: {currentSpend: 9000, retainedSpend: 5400, replacementSpend: 750, transitionCost: 9000}
        }
      },
      {
        id: 'invoicing', label: 'Converting approved time into invoices', category: 'automation',
        findingTitle: 'Build the draft invoice from approved time',
        finding: 'Match approved hours and expenses to the client’s rate card and purchase order. Send exceptions back to the project lead and pass the reviewed draft to finance.',
        time: 'Time billing staff spend matching approved hours and expenses to rates, including review of exceptions.',
        spend: 'Timesheet seats, invoicing add-ons and the connector to accounting. The accounting subscription may still be needed.',
        nextStep: 'Take one issued invoice back to the time entries. Mark where someone re-keyed a rate, corrected a project code or approved an exception.',
        example: {
          description: 'A practice keeps its timesheets and accounting system. It can end a separate billing subscription at renewal and run an invoice-drafting workflow instead.',
          effort: {work: 'invoice drafts', monthlyCount: 40, beforeMinutes: 22, afterMinutes: 12},
          costs: {currentSpend: 670, retainedSpend: 310, replacementSpend: 80, transitionCost: 720}
        }
      },
      {
        id: 'retainers', label: 'Keeping track of retainer scope', category: 'data',
        findingTitle: 'See what is left on the retainer before promising more',
        finding: 'Keep the agreed allowance, rollover terms and approved time against the engagement. Flag extra work for client approval before it goes on the invoice.',
        spend: 'Retainer reporting, project accounting seats and client reporting tools.',
        nextStep: 'Pick one retainer and reconcile its last statement with approved time and agreed extras. Check which reporting subscription could end.',
        example: {
          description: 'A small practice retires a client-reporting subscription after its project ledger can produce the same approved retainer statement.',
          costs: {currentSpend: 460, retainedSpend: 250, replacementSpend: 45, transitionCost: 540}
        }
      }
    ]
  },
  trading: {
    label: 'Trading firm',
    choices: [
      {
        id: 'breaks', label: 'Reconciling broker reports at day end', category: 'automation',
        findingTitle: 'Give each unmatched trade to someone to resolve',
        finding: 'Compare an authorised broker statement with the internal blotter. Flag mismatches in fills, allocations, fees or currency for an operations reviewer. Keep the source reports with the sign-off.',
        time: 'Operations time matching broker lines to the blotter and assigning exceptions. Include the reviewer’s investigation and sign-off.',
        spend: 'Broker reporting, reconciliation tools and report distribution. Execution and market-data costs can continue in full.',
        nextStep: 'Start with a closed day and one account. Check that a partial fill and a fee difference reach the reviewer before considering a reporting-tool cancellation.',
        example: {
          description: 'A desk can retire one report-distribution subscription. It keeps its licensed reporting services and pays for a maintained export. The example covers operations reporting only.',
          effort: {work: 'daily broker reconciliations', monthlyCount: 22, beforeMinutes: 45, afterMinutes: 25},
          costs: {currentSpend: 720, retainedSpend: 510, replacementSpend: 80, transitionCost: 840}
        }
      },
      {
        id: 'entitlements', label: 'Understanding the market-data bill', category: 'data',
        findingTitle: 'Match each feed to its licensed use',
        finding: 'A feed displayed to a trader and the same feed consumed by an application can carry different entitlements. Map desks, applications and purposes to the exchange and vendor agreements.',
        spend: 'Exchange data rights, vendor feeds, display access and non-display licences.',
        nextStep: 'Ask the market-data owner to reconcile a vendor invoice with the entitlement inventory. Price a change only after the supplier confirms which charge would end.'
      },
      {
        id: 'execution', label: 'The proprietary execution platform', category: 'software',
        findingTitle: 'Keep the execution platform in the baseline',
        finding: 'Order routing, risk limits, market access and the audit trail may depend on the current platform. Owning a reporting script does not remove those costs.',
        spend: 'Execution software, venue connectivity, market data and support for the trading desk.',
        alternative: 'The easier place to look is often the work around the platform, such as preparing broker reports or assigning reconciliation breaks.',
        nextStep: 'Have the desk and operations owner trace one order through its fills and exceptions. Leave the core platform out of any savings estimate until they confirm a charge can end.'
      }
    ]
  },
  other: {
    label: 'Another type of business',
    choices: [
      {
        id: 'calls', label: 'Answering and routing incoming calls', category: 'automation',
        findingTitle: 'Make sure missed calls reach a person or a diary',
        finding: 'An AI receptionist can capture a request, offer an available appointment or pass a caller to a person. Give every callback an owner.',
        time: 'Staff minutes spent answering repeat questions and returning missed calls, including callbacks that still need a person.',
        spend: 'An answering plan, telephone number, voice usage, booking software and human cover.',
        example: SAVINGS_RECEPTION_EXAMPLE
      },
      {
        id: 'subscriptions', label: 'Paying for overlapping tools', category: 'software',
        findingTitle: 'Find the subscription you could actually cancel',
        finding: 'Pick two tools used for the same job. Check the one task that still needs the second tool, who does it and whether it works in the first.',
        spend: 'User seats, workflow subscriptions, paid connectors and any minimum term.',
        nextStep: 'Put the last bills beside the renewal dates. Ask the person who uses both tools to complete their normal work in the proposed replacement.',
        example: {
          description: 'Five branches pay £5,500 a month for an operations platform plus £50 each for 90 monthly seats in a separate approvals tool. Once branch managers test approval limits and deputy cover in the main platform, the business keeps it, allows £850 a month for support and monitoring, and spends £12,600 moving approval history and training staff.',
          costs: {currentSpend: 10000, retainedSpend: 5500, replacementSpend: 850, transitionCost: 12600}
        }
      },
      {
        id: 'records', label: 'Finding details spread across systems', category: 'data',
        findingTitle: 'Keep the evidence with the record',
        finding: 'A reply can help confirm an email address in use. A signature can suggest a phone number to check. Store each detail with its source and the date it was checked.',
        spend: 'Data subscriptions, verification credits and tools for moving records between systems.',
        nextStep: 'Pick a recently updated contact. Check whether another team bought or entered the same detail again and whether the supplier bill could fall.',
        example: {
          description: 'A business keeps its main data source and drops an extra verification bundle at renewal. It budgets for ongoing checks and the initial cleanup.',
          costs: {currentSpend: 410, retainedSpend: 190, replacementSpend: 55, transitionCost: 540}
        }
      }
    ]
  }
};
