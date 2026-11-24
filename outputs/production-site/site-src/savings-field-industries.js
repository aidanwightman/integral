// Independent fictional GBP examples. The first three costs are monthly. Changeover is paid once at renewal.
const SAVINGS_FIELD_INDUSTRIES = {
  construction: {
    label: 'Construction & general contracting',
    choices: [
      {
        id: 'site-variations', label: 'Tracking site changes in two places', category: 'software',
        findingTitle: 'Follow a drawing change through to approval',
        finding: 'When a drawing changes, link the site query, subcontractor price and approved variation on the project record. The site manager can see which version the client authorised.',
        time: 'Time spent finding the current drawing, copying a change into the second tracker and checking who approved it.',
        spend: 'Check the separate change tracker at renewal. A project platform priced by annual construction volume can cost the same with fewer users.',
        nextStep: 'Pick one variation and find the query, price and approval. Test whether the project team can still retrieve all three after retiring the extra tracker.',
        example: {
          description: 'A contractor runs 12 live projects. Its core project platform costs £6,000 a month and a second change register costs £300 per project per month. It keeps the core platform, budgets £700 a month to run the connection, and spends £12,000 migrating and checking drawings, variations and approval history.',
          effort: {work: 'site changes', monthlyCount: 120, beforeMinutes: 18, afterMinutes: 9},
          costs: {currentSpend: 9600, retainedSpend: 6000, replacementSpend: 700, transitionCost: 12000}
        }
      },
      {
        id: 'tender-follow-up', label: 'Chasing tenders and revised quotes', category: 'automation',
        findingTitle: 'Give the estimator the latest tender and reply date',
        finding: 'Attach the issued quote to the opportunity, assign the estimator and set the agreed follow-up. A revised price, client reply or tender award should stop the old reminder.',
        time: 'Estimator time spent finding the latest revision and checking whether the client has already replied.',
        spend: 'Compare the quote-chasing subscription against the mailbox and sending costs you will keep. An earlier decision from a client is a separate benefit.',
        example: {
          description: 'An estimating team spends £220 a month on a reminder tool and £60 on its mailbox. It keeps the mailbox, budgets £30 a month to run reminders and pays £600 to connect its tender register.',
          effort: {work: 'tender follow-ups', monthlyCount: 30, beforeMinutes: 12, afterMinutes: 6},
          costs: {currentSpend: 280, retainedSpend: 60, replacementSpend: 30, transitionCost: 600}
        }
      },
      {
        id: 'progress-claims', label: 'Rekeying subcontractor payment applications', category: 'automation',
        findingTitle: 'Give accounts the approved amount for this period',
        finding: 'Link each application to the subcontract and billing period. Show previous payments, approved work and retention together for the quantity surveyor to review before accounts posts the bill.',
        time: 'Minutes the surveyor and accounts spend matching claim lines and re-entering the approved amount, including corrections.',
        spend: 'Look for a duplicate invoice-entry service. Keep the accounting system and the cost of handling disputed claims in the comparison.',
        nextStep: 'Choose an application with retention. Ask the surveyor and accounts to trace the approved figure into the ledger, including a correction or rejected line.',
        example: {
          description: 'A contractor pays £180 a month for accounts software and £300 for invoice entry. It keeps accounts, allows £90 a month for imports and exception handling, and spends £1,200 setting up the approval handover.',
          effort: {work: 'payment applications', monthlyCount: 24, beforeMinutes: 24, afterMinutes: 12},
          costs: {currentSpend: 480, retainedSpend: 180, replacementSpend: 90, transitionCost: 1200}
        }
      },
      {
        id: 'site-enquiries', label: 'Missing new enquiries while the team is on site', category: 'automation',
        findingTitle: 'Separate a site call from a new enquiry',
        finding: 'An AI receptionist can capture the postcode and scope for an estimator, or put an existing-project caller through to the site contact. The estimator confirms the survey slot.',
        time: 'Time the site team spends returning missed calls, finding the right project contact and arranging survey callbacks.',
        spend: 'Price the same mix of calls, minutes and live transfers against the answering-service bill. Keep the phone line and cover for urgent calls.',
        example: {
          description: 'A builder spends £400 a month on answering cover and £40 on its line. It keeps the line, budgets £160 a month for AI calls and human cover at the same volume, and pays £720 for setup.',
          effort: {work: 'site and survey calls', monthlyCount: 100, beforeMinutes: 6, afterMinutes: 3},
          costs: {currentSpend: 440, retainedSpend: 40, replacementSpend: 160, transitionCost: 720}
        }
      }
    ]
  },
  electrical: {
    label: 'Electrical contractors',
    choices: [
      {
        id: 'certificates', label: 'Re-entering job details for electrical certificates', category: 'software',
        findingTitle: 'Carry the site details into the right form',
        finding: 'Reuse the job address and client details. The electrician still records the test results and issues the appropriate certificate or inspection report. Link the issued document back to the job.',
        time: 'Time spent copying job details and filing the issued document. Measure the electrician’s inspection and testing separately.',
        spend: 'Compare the duplicate forms subscription with the cost of keeping the certification system, field access and the document archive.',
        nextStep: 'Follow one new installation certificate and one existing-installation condition report from job sheet to customer copy. Check who can issue each document.',
        example: {
          description: 'An electrical contractor with 80 field users pays £3,200 a month for its certification system and £25 per user per month for a duplicate forms app. It keeps certification access, adds £400 a month for syncing and support, and spends £6,000 mapping forms, testing permissions and preserving issued certificates.',
          effort: {work: 'certificate records', monthlyCount: 320, beforeMinutes: 10, afterMinutes: 5},
          costs: {currentSpend: 5200, retainedSpend: 3200, replacementSpend: 400, transitionCost: 6000}
        }
      },
      {
        id: 'call-outs', label: 'Answering call-outs while electricians are working', category: 'automation',
        findingTitle: 'Get urgent calls to the duty electrician',
        finding: 'An AI receptionist can take a callback number, site address and description. Follow your emergency handover procedure for reported danger. Routine requests can go to the office for a slot.',
        time: 'Minutes electricians and office staff spend returning missed calls and passing urgent calls to the duty rota.',
        spend: 'Check out-of-hours cover, connected minutes and live handoffs. Include the cost of keeping a person available when the duty electrician cannot answer.',
        example: {
          description: 'An electrical firm pays £480 a month for cover and £45 for its line. It keeps the line and budgets £210 a month for AI minutes and staffed overflow. Setting up and testing the rota costs £900.',
          effort: {work: 'call-out enquiries', monthlyCount: 90, beforeMinutes: 6, afterMinutes: 3},
          costs: {currentSpend: 525, retainedSpend: 45, replacementSpend: 210, transitionCost: 900}
        }
      },
      {
        id: 'quote-approval', label: 'Chasing electrical quotes by text and email', category: 'automation',
        findingTitle: 'Stop chasing when the customer accepts a quote',
        finding: 'Tie reminders to the current quote and its expiry date. When the customer accepts, pass the agreed work and materials to scheduling and cancel the chase.',
        time: 'Office time spent checking quote status, sending reminders and telling the electrician which version the customer accepted.',
        spend: 'Check which quoting features the job-management plan includes and what it charges per text. Keep the field licences needed for the job.',
        example: {
          description: 'A team spends £135 a month on its job app, £130 on a reminder add-on and £15 on texts. It keeps the job app and texts, spends £20 a month running the new reminders and pays £420 for setup.',
          effort: {work: 'electrical quote follow-ups', monthlyCount: 60, beforeMinutes: 8, afterMinutes: 4},
          costs: {currentSpend: 280, retainedSpend: 150, replacementSpend: 20, transitionCost: 420}
        }
      }
    ]
  },
  events: {
    label: 'Events companies',
    choices: [
      {
        id: 'door-list', label: 'Maintaining a second event guest list', category: 'software',
        findingTitle: 'Give the door team one current guest list',
        finding: 'Bring registrations, cancellations and ticket transfers into the check-in list. A door supervisor can resolve duplicate names and tickets already scanned.',
        time: 'Staff time updating guest lists after refunds or transfers and resolving mismatches at the door.',
        spend: 'Check registration and check-in features you already pay for. Separate organiser-paid fees from fees paid by ticket buyers, and free admissions from paid tickets.',
        nextStep: 'Reconcile one event’s ticket sales, refunds and check-ins. Identify who actually paid each fee before dropping a guest-list app.',
        example: {
          description: 'Across eight venues, an organiser sells an average of 5,000 tickets a month and absorbs £10,000 in monthly ticketing fees. Its extra door-list software costs £300 per venue per month. It keeps the ticketing fees and included check-in service, adds £500 a month for syncing and support, and spends £6,000 on rollout.',
          effort: {work: 'guest-list changes', monthlyCount: 400, beforeMinutes: 4, afterMinutes: 2},
          costs: {currentSpend: 12400, retainedSpend: 10000, replacementSpend: 500, transitionCost: 6000}
        }
      },
      {
        id: 'crew-schedule', label: 'Updating crew on revised call times', category: 'software',
        findingTitle: 'Send crew the latest call sheet',
        finding: 'Let the producer change the load-in time once, send the revision to the assigned crew and see who acknowledged it. Give freelance crew just the access their role needs.',
        time: 'Producer time spent circulating revised call sheets and finding out which crew members have seen them.',
        spend: 'Check platform fees, paid planner logins and free crew access separately. A freelancer who only receives the call sheet may have no licence cost to remove.',
        nextStep: 'Pick a show with a late time change. Find the producer who can edit it and the crew who need to acknowledge it, then compare the two scheduling bills.',
        example: {
          description: 'Thirty producers schedule 200 crew across several venues. The main planning platform costs £3,600 a month. A second rota charges £80 per producer per month. The company keeps its main plan and crew access, spends £400 a month on notifications and support, and pays £8,400 once to transfer schedules and test delivery.',
          effort: {work: 'crew schedule changes', monthlyCount: 180, beforeMinutes: 12, afterMinutes: 6},
          costs: {currentSpend: 6000, retainedSpend: 3600, replacementSpend: 400, transitionCost: 8400}
        }
      },
      {
        id: 'venue-enquiries', label: 'Handling venue and group-booking calls', category: 'automation',
        findingTitle: 'Give the coordinator a date, headcount and callback',
        finding: 'An AI receptionist can collect the event date, expected headcount and access needs. The coordinator can check capacity, existing holds and the deposit before confirming the booking.',
        time: 'Minutes the coordinator spends answering repeat questions, finding dates and calling back for missing booking details.',
        spend: 'Compare peak-season call volumes, repeat callers and human transfers with your reception bill. Keep the diary and any deposit-processing fees you still need.',
        example: {
          description: 'Across busy and quiet months, a venue averages £350 a month for overflow answering and £50 for its phone line. It keeps the line, budgets £140 a month for AI and live overflow, and pays £720 for setup.',
          effort: {work: 'venue enquiries', monthlyCount: 70, beforeMinutes: 9, afterMinutes: 5},
          costs: {currentSpend: 400, retainedSpend: 50, replacementSpend: 140, transitionCost: 720}
        }
      }
    ]
  },
  services: {
    label: 'Field service businesses',
    choices: [
      {
        id: 'service-reports', label: 'Paying twice for job sheets and service reports', category: 'software',
        findingTitle: 'Keep one signed service report with each visit',
        finding: 'Technicians can record parts, test readings and the customer’s sign-off on the job sheet. A dispatcher can retrieve the original signed report when the customer calls.',
        time: 'Minutes spent entering a visit twice, checking missing signatures and finding an earlier service report.',
        spend: 'Compare the duplicate forms licences with the field-service plan, offline access, document storage and support you still need.',
        nextStep: 'Take a signed report from a visit completed offline. Check that it syncs, keeps its original record and can be retrieved before cancelling the forms contract.',
        example: {
          description: 'Eighty technicians across five depots use a £4,800 monthly field-service platform. A separate forms service charges £45 per technician per month. After testing offline signatures, the firm keeps the main plan, budgets £650 a month for document storage and support, and spends £10,200 migrating and checking the archive.',
          effort: {work: 'service reports', monthlyCount: 800, beforeMinutes: 9, afterMinutes: 5},
          costs: {currentSpend: 8400, retainedSpend: 4800, replacementSpend: 650, transitionCost: 10200}
        }
      },
      {
        id: 'visit-reminders', label: 'Coordinating repeat maintenance visits', category: 'automation',
        findingTitle: 'Keep each visit on the right contract',
        finding: 'Track the service agreement, technician and next visit together. When a customer rearranges, move that visit and its reminder while keeping the contract’s billing schedule.',
        time: 'Dispatcher time spent confirming access, rearranging visits and updating both the technician and customer.',
        spend: 'Check whether your plan bills for jobs, users or texts. One contract can generate many visits and a different number of invoices.',
        nextStep: 'Take one maintenance contract and compare its scheduled visits, completed jobs, texts and invoices against the provider’s actual billing units.',
        example: {
          description: 'A service firm spends £180 a month on job management and £150 on a reminder tool. It keeps job management, budgets £35 a month for messaging and support, and pays £660 to connect the timetable.',
          effort: {work: 'maintenance visits', monthlyCount: 120, beforeMinutes: 6, afterMinutes: 3},
          costs: {currentSpend: 330, retainedSpend: 180, replacementSpend: 35, transitionCost: 660}
        }
      },
      {
        id: 'service-intake', label: 'Taking service requests while technicians are out', category: 'automation',
        findingTitle: 'Check coverage before offering a visit',
        finding: 'An AI receptionist can check the postcode, ask which asset needs attention and find an available appointment. Send urgent work or a request outside the service area to a dispatcher.',
        time: 'Minutes dispatchers spend gathering the postcode and asset details, checking coverage and handling callbacks.',
        spend: 'Compare the same calls across busy and quiet weeks. Your provider might charge for minutes, calls or distinct callers. Include transfers and human overflow.',
        example: {
          description: 'A service firm spends £430 a month on answering cover and £50 on its line. It keeps the line, allows £170 a month for voice usage and human cover, and spends £720 linking reception to dispatch.',
          effort: {work: 'service requests', monthlyCount: 140, beforeMinutes: 9, afterMinutes: 5},
          costs: {currentSpend: 480, retainedSpend: 50, replacementSpend: 170, transitionCost: 720}
        }
      },
      {
        id: 'service-invoices', label: 'Copying completed visits into invoices', category: 'automation',
        findingTitle: 'Turn the engineer’s job sheet into an invoice draft',
        finding: 'Link the completed visit, used parts and customer sign-off to the draft. Accounts checks contract cover, extra charges and return visits before sending it.',
        time: 'Accounts time spent copying parts and labour from signed job sheets, including time to review warranty exceptions.',
        spend: 'Compare any paid rekeying service with the cost of running and checking an import. Keep the accounts subscription and existing payment fees.',
        nextStep: 'Trace a billable repair and a return visit covered by the original job. Check that only the approved charge reaches the invoice.',
        example: {
          description: 'A repair firm spends £100 a month on accounts software and £230 on invoice entry. It keeps accounts, allows £70 a month for imports and exceptions, and pays £840 to map its job sheets.',
          effort: {work: 'completed job sheets', monthlyCount: 75, beforeMinutes: 12, afterMinutes: 6},
          costs: {currentSpend: 330, retainedSpend: 100, replacementSpend: 70, transitionCost: 840}
        }
      }
    ]
  }
};
