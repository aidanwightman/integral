// Fictional costs in pounds. The first three costs are monthly, and changeover is paid once.
const SAVINGS_RECEPTION_EXAMPLE = {
  description: 'A firm spends £520 a month on its phone line and answering service. At renewal it keeps the £45 line. For the same call traffic it budgets £145 a month for voice processing, transfers, support and human overflow, plus £840 once for setup.',
  effort: {work: 'incoming calls', monthlyCount: 180, beforeMinutes: 4, afterMinutes: 2},
  costs: {currentSpend: 520, retainedSpend: 45, replacementSpend: 145, transitionCost: 840}
};
const SAVINGS_CRM_SEATS_EXAMPLE = {
  description: 'A business pays £100 a month for each of 60 CRM seats, plus £4,000 a month for reporting and workflow add-ons. Its access review finds 36 unused seats. At renewal it keeps 24 seats and replaces the add-ons. It budgets £1,000 a month to run and support the replacement and £7,200 once to move and test the reports and workflows.',
  costs: {currentSpend: 10000, retainedSpend: 2400, replacementSpend: 1000, transitionCost: 7200}
};
const SAVINGS_SALES_EXAMPLES = {
  linkedin: {
    description: 'A team pays £360 a month for its CRM and LinkedIn licences and £180 for a task manager. It keeps the licences, allows £30 a month to run reminders in the CRM and spends £600 setting them up.',
    effort: {work: 'LinkedIn follow-ups', monthlyCount: 60, beforeMinutes: 8, afterMinutes: 5},
    costs: {currentSpend: 540, retainedSpend: 360, replacementSpend: 30, transitionCost: 600}
  },
  whatsapp: {
    description: 'A sales desk pays £140 a month for its WhatsApp provider and message usage, plus £190 for a separate routing tool. It keeps the provider at the same volume, budgets £40 a month for routing and pays £720 to set it up.',
    effort: {work: 'WhatsApp enquiries', monthlyCount: 120, beforeMinutes: 6, afterMinutes: 4},
    costs: {currentSpend: 330, retainedSpend: 140, replacementSpend: 40, transitionCost: 720}
  },
  pitch: {
    description: 'An agency spends £400 a month on its CRM and mailboxes and £450 on sequencing. It keeps the CRM and mailboxes, budgets £80 a month for follow-up delivery and support, and pays £840 once for setup.',
    effort: {work: 'post-pitch follow-ups', monthlyCount: 36, beforeMinutes: 16, afterMinutes: 8},
    costs: {currentSpend: 850, retainedSpend: 400, replacementSpend: 80, transitionCost: 840}
  },
  quote: {
    description: 'A supplier pays £160 a month for quoting software and £130 for quote reminders. It keeps its quoting software, allows £25 a month for reminders and support, and pays £480 to connect changes in quote status.',
    effort: {work: 'quote follow-ups', monthlyCount: 80, beforeMinutes: 7, afterMinutes: 4},
    costs: {currentSpend: 290, retainedSpend: 160, replacementSpend: 25, transitionCost: 480}
  },
  noshow: {
    description: 'A sales team pays £140 a month for booking calendars and £90 for a rescheduling add-on. It keeps the calendars, allows £25 a month to run reminders and pays £360 to connect attendance to its CRM.',
    effort: {work: 'missed demos', monthlyCount: 12, beforeMinutes: 10, afterMinutes: 5},
    costs: {currentSpend: 230, retainedSpend: 140, replacementSpend: 25, transitionCost: 360}
  },
  multichannel: {
    description: 'A team pays £240 a month for its CRM and channels and £260 for a separate sequencing service. At renewal it keeps the CRM and channels, budgets £75 a month for coordination and support, and pays £900 for setup.',
    effort: {work: 'buyer replies across channels', monthlyCount: 90, beforeMinutes: 7, afterMinutes: 3},
    costs: {currentSpend: 500, retainedSpend: 240, replacementSpend: 75, transitionCost: 900}
  },
  email: {
    description: 'A team pays £80 a month for its mailboxes and £110 for follow-up emails. It keeps the mailboxes, budgets £25 a month for sending and support, and pays £360 to connect its CRM.',
    effort: {work: 'follow-up emails', monthlyCount: 100, beforeMinutes: 9, afterMinutes: 5},
    costs: {currentSpend: 190, retainedSpend: 80, replacementSpend: 25, transitionCost: 360}
  }
};
const SAVINGS_PATHS = {
  automation: {
    label: 'Automations',
    description: 'Time and cost of AI reception, LinkedIn, WhatsApp and email.',
    question: 'Which task takes the most time or costs you the most?',
    intro: 'Pick a task to compare staff hours, tool fees and the cost of running an automation.',
    related: {data:'Check contact details before a follow-up',software:'Compare the tools you pay to send follow-ups'},
    choices: [
      {
        id: 'reception', label: 'Answering calls and returning voicemails',
        findingTitle: 'Give each caller a booking or a callback',
        finding: 'An AI receptionist can ask what the caller needs, check a connected diary and send the details to the right person. Give urgent requests and callers who ask for a person a live handover.',
        time: 'Minutes spent answering routine questions, replaying voicemails and calling back. Include calls a person still needs to handle.',
        spend: 'Compare answering cover with the phone line, AI call charges, transfers and human cover for the same calls.',
        example: SAVINGS_RECEPTION_EXAMPLE,
        demo: {label: 'Explore a call record', role: 'sales', view: 'dialer'}
      },
      {
        id: 'linkedin', label: 'Following up on LinkedIn',
        findingTitle: 'Remember what you promised in a LinkedIn conversation',
        finding: 'A rep can note the buyer’s request in the CRM, or use LinkedIn’s approved CRM Sync where supported. The CRM prepares a task and draft. The rep checks the thread, edits the reply and sends it in LinkedIn.',
        time: 'How long reps spend finding earlier promises and setting reminders. Allow time for each rep to review and send the reply.',
        spend: 'A separate reminder subscription, the CRM and any LinkedIn licences needed for the integration.',
        example: SAVINGS_SALES_EXAMPLES.linkedin,
        demo: {label: 'View contact records', role: 'sales', view: 'contacts'}
      },
      {
        id: 'phone', label: 'Logging phone calls and setting reminders',
        findingTitle: 'Turn a call outcome into a dated reminder',
        finding: 'A supported phone service can supply the call time and duration. The rep records who answered, what was agreed and when to call back.',
        time: 'Minutes per call spent copying details and setting a reminder, plus time spent correcting missing outcomes.',
        spend: 'Call-logging add-ons, dialler seats and the number rental and call charges you will keep.',
        nextStep: 'Trace one callback from your phone log to the CRM. Compare the cost of the logging tool with the telephony charges you will keep.',
        example: {
          description: 'A team spends £180 a month on calls and £110 on a call-logging add-on. It keeps its phone service, budgets £30 a month to run and maintain the connection, and pays £480 for setup.',
          effort: {work: 'call logs', monthlyCount: 160, beforeMinutes: 5, afterMinutes: 2},
          costs: {currentSpend: 290, retainedSpend: 180, replacementSpend: 30, transitionCost: 480}
        },
        demo: {label: 'View the call log', role: 'sales', view: 'dialer'}
      },
      {
        id: 'email', label: 'Emailing after calls or enquiries',
        findingTitle: 'Link the email to the promise you made',
        finding: 'A call outcome can prepare the agreed follow-up. One record can show the recipient, their email preference, what was sent and whether they replied.',
        time: 'Time per email spent finding call notes, composing the recap and checking for a reply before chasing.',
        spend: 'Compare the follow-up subscription with mailbox licences, sending fees and the cost of running the connection.',
        example: SAVINGS_SALES_EXAMPLES.email,
        demo: {label: 'View contact email history', role: 'sales', view: 'contacts'}
      },
      {
        id: 'whatsapp', label: 'Replying to WhatsApp sales enquiries',
        findingTitle: 'Reply to the enquiry while the WhatsApp window is open',
        finding: 'On WhatsApp Business Platform, a rep can answer an opted-in buyer in their own words within 24 hours of the buyer’s last message. Later outreach needs an approved template for that purpose. An opt-out stops WhatsApp outreach.',
        time: 'Minutes spent assigning conversations, checking when the buyer last wrote and handing unanswered enquiries to another rep.',
        spend: 'Compare inbox and routing subscriptions. Include provider and template-message charges for the same destinations and volume.',
        example: SAVINGS_SALES_EXAMPLES.whatsapp,
        demo: {label: 'Explore contact preferences', role: 'sales', view: 'contacts'}
      },
      {
        id: 'pitch', label: 'Sending the recap and calling back after a pitch',
        findingTitle: 'Send what the buyer asked for and keep the callback',
        finding: 'A rep records the buyer’s question and promised material, checks the recap email and assigns the agreed callback. A reply or new meeting pauses the chase so the rep can respond.',
        time: 'Time after each pitch spent finding the promised material, drafting the recap and arranging the callback.',
        spend: 'Sequencing seats, CRM licences, mailboxes and dialler usage. Check which charge would end at renewal.',
        example: SAVINGS_SALES_EXAMPLES.pitch,
        demo: {label: 'View sales calls', role: 'sales', view: 'dialer'}
      },
      {
        id: 'quote', label: 'Following up on a revised or accepted quote',
        findingTitle: 'Follow up on the quote the buyer actually has',
        finding: 'Tie the reminder to the issued quote number and revision. A new price replaces the earlier reminder. Acceptance closes the chase and gives the order or delivery team the accepted version.',
        time: 'Minutes spent checking revisions, chasing decisions and correcting reminders that went out after acceptance.',
        spend: 'Quote-reminder add-ons, the quoting system that stores the accepted version and any message delivery charges.',
        example: SAVINGS_SALES_EXAMPLES.quote,
        demo: {label: 'Explore the sales desk', role: 'sales', view: 'salesdesk'}
      },
      {
        id: 'noshow', label: 'Rebooking a missed sales demo',
        findingTitle: 'Offer a new time after a missed meeting',
        finding: 'After the rep confirms the buyer missed the demo, prepare one rescheduling invitation. Link the replacement calendar booking to the deal and cancel the old reminder when the buyer rebooks.',
        time: 'Time spent checking attendance and exchanging messages to find a new slot. Record any time already reserved for the demo separately.',
        spend: 'Scheduling licences, a rescheduling add-on and the cost of sending reminders.',
        example: SAVINGS_SALES_EXAMPLES.noshow,
        demo: {label: 'View scheduled calls', role: 'sales', view: 'dialer'}
      },
      {
        id: 'multichannel', label: 'Stopping email, call and message chases',
        findingTitle: 'Stop the chase when another channel gets a reply',
        finding: 'Before each step, check the buyer’s latest reply, meeting and contact preferences. A reply pauses the sequence for its owner. An opt-out cancels the affected outreach, including steps already queued.',
        time: 'Time reps spend checking different inboxes, cancelling queued calls and untangling duplicate follow-ups.',
        spend: 'Sequencing and connector subscriptions, plus the CRM, mailbox, phone and messaging services your team still uses.',
        example: SAVINGS_SALES_EXAMPLES.multichannel,
        demo: {label: 'Explore contact preferences', role: 'sales', view: 'contacts'}
      },
      {
        id: 'handoff', label: 'Chasing another team for an update',
        findingTitle: 'Give the receiving team a record to act on',
        finding: 'An accepted delivery can create a finance task with the evidence attached. Both teams can see who owns the next step.',
        time: 'Time the operations team spends forwarding delivery evidence and the finance team spends finding it or asking for it again.',
        spend: 'Workflow subscriptions, paid connectors and the accounting system finance uses to approve the next step.',
        nextStep: 'Follow one delivery into finance. Count the repeated entries and reminder charges, then check what still needs a person to approve it.',
        example: {
          description: 'A supplier spends £200 a month on its accounting system and £170 on a separate handover tool. It keeps accounts, budgets £45 a month for the connection and support, and pays £600 to link delivery evidence.',
          effort: {work: 'delivery handovers', monthlyCount: 60, beforeMinutes: 12, afterMinutes: 6},
          costs: {currentSpend: 370, retainedSpend: 200, replacementSpend: 45, transitionCost: 600}
        },
        demo: {label: 'Try a delivery handoff', role: 'operations', view: 'outcomes', outcomeCase: 'delivery'}
      }
    ],
    example: 'A team spends £600 a month on follow-ups. It keeps £240 of sending costs, adds £180 for running the workflow and spends £720 setting it up.',
    effort: {work: 'customer follow-ups', monthlyCount: 100, beforeMinutes: 9, afterMinutes: 5},
    costs: {
      currentSpend: 600,
      retainedSpend: 240,
      replacementSpend: 180,
      transitionCost: 720
    }
  },
  data: {
    label: 'Wasted data',
    description: 'Contact details buried in email signatures and replies.',
    question: 'Where are you spending most on contact data?',
    intro: 'Before buying another lookup, check the company records and emails you’re authorised to use. A signature can suggest a new number. A direct reply or call can confirm it.',
    related: {automation:'Turn confirmed contact details into a follow-up',software:'Compare subscriptions that sell you the same data'},
    choices: [
      {
        id: 'missing', label: 'Finding missing email addresses',
        findingTitle: 'Check the evidence you already have',
        finding: 'A delivery receipt tells you a mail server accepted the email. A customer who replies and confirms the address gives you evidence to save against that contact.',
        nextStep: 'Review ten recent paid lookups. Mark which addresses already had a reliable source and which still needed outside research.',
        demo: {label: 'Explore contact records', role: 'sales', view: 'contacts'}
      },
      {
        id: 'signature', label: 'Updating details from email signatures',
        findingTitle: 'Review the new number in the signature',
        finding: 'A signature can suggest a new direct line. Keep the original email, review the change and record when the contact confirms it by phone or reply.',
        nextStep: 'Open a recent customer reply. Compare its signature with the saved record, then record the source and confirmation date for the detail that changed.',
        demo: {label: 'Review a sample email signature', role: 'sales', view: 'contacts', example:'incoming-signature'}
      },
      {
        id: 'stale', label: 'Checking old emails and phone numbers',
        findingTitle: 'See when each detail was last confirmed',
        finding: 'A dated confirmation helps a rep judge an old number or address. Keep a later unsuccessful check visible so another rep can follow it up.',
        nextStep: 'Pick ten recently checked contacts. Compare the source, last confirmed date and newest result for each detail. Count the checks you genuinely could have avoided.',
        demo: {label: 'Open a record with dated checks', role: 'sales', view: 'contacts', example:'contact-checks'}
      },
      {
        id: 'repeat', label: 'Paying to find the same details twice',
        findingTitle: 'Reuse a sourced detail while it is current',
        finding: 'Two teams may be buying the same lookup. Matching the person and company first lets both teams review earlier evidence and spot details that have changed.',
        nextStep: 'Compare one credit statement with the CRM. Find repeat purchases and check whether removing them would actually lower your bill at renewal.',
        demo: {label: 'Review a contact’s history', role: 'sales', view: 'contacts'}
      }
    ],
    example: 'A team spends £480 a month on contact data. It keeps £300 of paid sources, adds £60 for ongoing checks and spends £360 preparing its records.',
    costs: {
      currentSpend: 480,
      retainedSpend: 300,
      replacementSpend: 60,
      transitionCost: 360
    }
  },
  software: {
    label: 'Redundant software',
    description: 'Unused CRM seats and tools that do the same job.',
    question: 'Which part of your software bill would you review first?',
    intro: 'Compare your bills with the work people actually do in each tool. See which seats you need, which subscriptions overlap and what it would cost to run a replacement.',
    related: {automation:'Explore workflow automation',data:'Check which contact data you already have'},
    choices: [
      {
        id: 'seats', label: 'CRM seats we may no longer need',
        findingTitle: 'Match each paid seat to the work it supports',
        finding: 'A rep who edits deals and a colleague who reads reports may need different access. A seat reduction saves cash from the date the supplier lowers the charge.',
        nextStep: 'Compare your invoice with the seat list and each role’s tasks. Check the minimum commitment and earliest date the bill can fall.',
        example: SAVINGS_CRM_SEATS_EXAMPLE,
        demo: {label: 'See the sales workspace', role: 'sales', view: 'salesdesk'}
      },
      {
        id: 'reception-bill', label: 'What our AI receptionist costs',
        findingTitle: 'Compare the bill for the same mix of calls',
        finding: 'Answering plans can charge by call or unique caller. An owned setup can still incur number rental, voice processing, transferred minutes and human cover. Compare both against the same call log.',
        time: 'Staff minutes on live handovers, callbacks and correcting bookings across the same call log.',
        spend: 'Check included calls or minutes, overages and the cost of staffed overflow during peak hours.',
        nextStep: 'Take a recent bill and call log. Count repeat callers, transfers and calls a person had to finish. Check the renewal date and price that workload both ways.',
        example: {
          description: 'Six branches handle 2,000 calls and 8,000 connected minutes a month. They spend £600 a month on phone lines and £5,400 on managed answering. At renewal they keep the lines and budget £2,400 a month for AI voice, transfers, support and staffed overflow at the same volume and hours. Setup costs £7,200.',
          effort: {work: 'incoming calls', monthlyCount: 2000, beforeMinutes: 3, afterMinutes: 2},
          costs: {currentSpend: 6000, retainedSpend: 600, replacementSpend: 2400, transitionCost: 7200}
        },
        demo: {label: 'See how a call is logged', role: 'sales', view: 'dialer'}
      },
      {
        id: 'middleware', label: 'Connectors that move data between tools',
        findingTitle: 'Price one integration you could run yourself',
        finding: 'You could keep Salesforce and replace a paid connector with your own integration. Where the supported APIs allow it, it can run on your device or server.',
        nextStep: 'Pick one connection between your sales and data tools. Check Salesforce access, API charges and the cost of running and maintaining it yourself.',
        example: {
          description: 'Four integrations move 120,000 records a month between sales, accounts and reporting. The business spends £6,000 a month on the systems and API access it keeps, plus £4,800 on middleware it can cancel. It allows £1,400 a month for hosting, monitoring and support, and £12,000 once to rebuild and test all four connections.',
          costs: {currentSpend: 10800, retainedSpend: 6000, replacementSpend: 1400, transitionCost: 12000}
        },
        demo: {label: 'Trace a delivery into finance', role: 'operations', view: 'outcomes', outcomeCase: 'delivery'}
      },
      {
        id: 'owned', label: 'Replacing a CRM with one we own',
        findingTitle: 'Price the customer records and workflows you need',
        finding: 'You own the CRM code Integral builds for you and can run it without an Integral per-user subscription. Outside services you keep have their own fees and licences.',
        nextStep: 'List the roles, sales tools, data sources and integrations your team needs. Price the move, hosting and support alongside the first renewal you could cancel.',
        example: {
          description: 'An 80-person team pays £150 per CRM user each month and £2,000 a month for email and identity services. It can end the CRM contract once its sales records, permissions and workflows pass acceptance. It keeps email and identity, budgets £3,200 a month for hosting, backups and support, and pays £36,000 once for the build, migration and training.',
          costs: {currentSpend: 14000, retainedSpend: 2000, replacementSpend: 3200, transitionCost: 36000}
        },
        demo: {label: 'Explore a sales workspace', role: 'sales', view: 'salesdesk'}
      },
      {
        id: 'overlap', label: 'Two subscriptions doing similar work',
        findingTitle: 'Find the feature that keeps the second tool open',
        finding: 'Two tools may hold the same customer records, yet only one handles an essential approval or report. Test that job before pricing a cancellation.',
        nextStep: 'Choose a pair of tools and follow one record through both. Check exports, the replacement workflow and the cancellation date against the contracts.',
        example: {
          description: 'A team’s £6,000 monthly project platform already includes client reporting. It also pays for 50 reporting seats at £60 each per month. After clients confirm they can still see their reports, the team drops those seats, adds £650 a month for report delivery and support, and spends £8,400 moving templates and history.',
          costs: {currentSpend: 9000, retainedSpend: 6000, replacementSpend: 650, transitionCost: 8400}
        },
        demo: {label: 'Explore a connected workflow', role: 'finance', view: 'outcomes', outcomeCase: 'receivable'}
      }
    ],
    example: SAVINGS_CRM_SEATS_EXAMPLE.description,
    costs: SAVINGS_CRM_SEATS_EXAMPLE.costs
  }
};
