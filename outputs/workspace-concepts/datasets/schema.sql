-- Data Saver sample schema. SQLite 3. Composite foreign keys isolate each workspace.
-- This is a design demonstrator, not a production access-control system.
PRAGMA foreign_keys = ON;
CREATE TABLE workspace (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, industry TEXT NOT NULL,
 currency TEXT NOT NULL DEFAULT 'GBP' CHECK(currency='GBP'),
 opening_cash_pence INTEGER NOT NULL, monthly_cost_pence INTEGER NOT NULL CHECK(monthly_cost_pence>=0)
);
CREATE TABLE team_member (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), id TEXT NOT NULL,
 name TEXT NOT NULL, role_title TEXT NOT NULL, capacity_hours INTEGER NOT NULL CHECK(capacity_hours>=0),
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,name)
);
CREATE TABLE account (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), id TEXT NOT NULL,
 name TEXT NOT NULL, segment TEXT NOT NULL, region TEXT NOT NULL, owner_id TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE opportunity (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL,
 name TEXT NOT NULL, value_pence INTEGER NOT NULL CHECK(value_pence>=0),
 stage TEXT NOT NULL, probability REAL NOT NULL CHECK(probability BETWEEN 0 AND 1),
 close_month INTEGER NOT NULL CHECK(close_month BETWEEN 1 AND 6), owner_id TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id),
 FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE invoice (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, number TEXT NOT NULL,
 total_pence INTEGER NOT NULL CHECK(total_pence>=0), paid_pence INTEGER NOT NULL CHECK(paid_pence BETWEEN 0 AND total_pence),
 due_month INTEGER NOT NULL CHECK(due_month BETWEEN 1 AND 6), overdue_days INTEGER NOT NULL CHECK(overdue_days>=0),
 status TEXT NOT NULL CHECK(status IN ('Paid','Open','Overdue')),
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,number),
 FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE work_item (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, owner_id TEXT NOT NULL,
 title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Queued','Active','Review','Complete')),
 progress INTEGER NOT NULL CHECK(progress BETWEEN 0 AND 100), start_week INTEGER NOT NULL CHECK(start_week>=0),
 duration_weeks INTEGER NOT NULL CHECK(duration_weeks>0), weekly_hours INTEGER NOT NULL CHECK(weekly_hours>=0), dependency TEXT,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id),
 FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE cash_history (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), month_index INTEGER NOT NULL, month_label TEXT NOT NULL,
 receipts_pence INTEGER NOT NULL, costs_pence INTEGER NOT NULL, budget_pence INTEGER NOT NULL,
 PRIMARY KEY(workspace_id,month_index)
);
CREATE TABLE project (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
 deliverable TEXT NOT NULL, budget_pence INTEGER NOT NULL CHECK(budget_pence>=0), margin_percent REAL NOT NULL CHECK(margin_percent BETWEEN 0 AND 100), milestone_date TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE vacancy (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
 salary_band TEXT NOT NULL, shortlisted INTEGER NOT NULL CHECK(shortlisted>=0), fee_percent REAL NOT NULL CHECK(fee_percent BETWEEN 0 AND 100), start_date TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE asset (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
 asset_type TEXT NOT NULL, service_date TEXT NOT NULL, condition TEXT NOT NULL, visits INTEGER NOT NULL CHECK(visits>=0),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE stock_item (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
 sku TEXT NOT NULL, on_hand INTEGER NOT NULL CHECK(on_hand>=0), reorder_point INTEGER NOT NULL CHECK(reorder_point>=0), lead_days INTEGER NOT NULL CHECK(lead_days>=0),
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,sku), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE property (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
 units INTEGER NOT NULL CHECK(units>0), occupancy_percent REAL NOT NULL CHECK(occupancy_percent BETWEEN 0 AND 100), lease_review_date TEXT NOT NULL, annual_rent_pence INTEGER NOT NULL CHECK(annual_rent_pence>=0),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE membership (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
 tier TEXT NOT NULL, member_count INTEGER NOT NULL CHECK(member_count>=0), renewal_date TEXT NOT NULL, engagement_percent REAL NOT NULL CHECK(engagement_percent BETWEEN 0 AND 100),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE subscription (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
 plan TEXT NOT NULL, seats INTEGER NOT NULL CHECK(seats>=0), renewal_date TEXT NOT NULL, usage_percent REAL NOT NULL CHECK(usage_percent BETWEEN 0 AND 100),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE experience (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
 capacity INTEGER NOT NULL CHECK(capacity>0), registered INTEGER NOT NULL CHECK(registered BETWEEN 0 AND capacity), event_date TEXT NOT NULL, venue TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE INDEX invoice_by_account ON invoice(workspace_id,account_id);
CREATE INDEX opportunity_by_stage ON opportunity(workspace_id,stage);
CREATE INDEX work_by_owner ON work_item(workspace_id,owner_id);
CREATE VIEW account_receivables AS
 SELECT a.workspace_id,a.id,a.name,COALESCE(SUM(i.total_pence-i.paid_pence),0) AS outstanding_pence
 FROM account a LEFT JOIN invoice i ON i.workspace_id=a.workspace_id AND i.account_id=a.id
 GROUP BY a.workspace_id,a.id,a.name;
CREATE VIEW team_allocation AS
 SELECT t.workspace_id,t.id,t.name,t.capacity_hours,COALESCE(SUM(CASE WHEN w.status!='Complete' THEN w.weekly_hours ELSE 0 END),0) AS allocated_hours
 FROM team_member t LEFT JOIN work_item w ON w.workspace_id=t.workspace_id AND w.owner_id=t.id
 GROUP BY t.workspace_id,t.id,t.name,t.capacity_hours;

-- Role workflow extension. All examples remain synthetic.
CREATE TABLE employee_profile (
 workspace_id TEXT NOT NULL, person_id TEXT NOT NULL, department TEXT NOT NULL,
 tenure_months INTEGER NOT NULL CHECK(tenure_months>=0), leave_balance_hours INTEGER NOT NULL CHECK(leave_balance_hours>=0), manager TEXT NOT NULL,
 PRIMARY KEY(workspace_id,person_id), FOREIGN KEY(workspace_id,person_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE leave_request (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, person_id TEXT NOT NULL,
 start_date TEXT NOT NULL, end_date TEXT NOT NULL CHECK(end_date>=start_date), status TEXT NOT NULL CHECK(status IN ('Pending','Approved','Declined')),
 leave_type TEXT NOT NULL, requested_at TEXT NOT NULL, decision_by TEXT,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,person_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE employee_task (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, person_id TEXT NOT NULL, kind TEXT NOT NULL, task TEXT NOT NULL, due_date TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('Open','Complete')), owner TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,person_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE automation (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, owner_id TEXT NOT NULL, trigger_text TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('Active','Paused')), schedule TEXT NOT NULL, version INTEGER NOT NULL CHECK(version>0),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE automation_step (
 workspace_id TEXT NOT NULL, automation_id TEXT NOT NULL, position INTEGER NOT NULL, instruction TEXT NOT NULL,
 PRIMARY KEY(workspace_id,automation_id,position), FOREIGN KEY(workspace_id,automation_id) REFERENCES automation(workspace_id,id)
);
CREATE TABLE sequence_enrolment (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, automation_id TEXT NOT NULL, account_id TEXT NOT NULL, owner_id TEXT NOT NULL,
 eligibility TEXT NOT NULL, processed INTEGER NOT NULL CHECK(processed IN (0,1)),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,automation_id) REFERENCES automation(workspace_id,id),
 FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id), FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE outreach_event (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, owner_id TEXT NOT NULL, account_id TEXT NOT NULL, automation_id TEXT,
 review_week TEXT NOT NULL, source TEXT NOT NULL, segment TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Sent','Failed','Suppressed')),
 replied INTEGER NOT NULL CHECK(replied IN (0,1)), meeting INTEGER NOT NULL CHECK(meeting IN (0,1)), personalised INTEGER NOT NULL CHECK(personalised IN (0,1)),
 reason TEXT NOT NULL, response_hours INTEGER,
 CHECK(meeting<=replied), CHECK(status='Sent' OR (replied=0 AND meeting=0)),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id),
 FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id), FOREIGN KEY(workspace_id,automation_id) REFERENCES automation(workspace_id,id)
);
CREATE TABLE closed_result (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, owner_id TEXT NOT NULL, account_id TEXT NOT NULL,
 close_week TEXT NOT NULL, source TEXT NOT NULL, segment TEXT NOT NULL, outcome TEXT NOT NULL CHECK(outcome IN ('Won','Lost')),
 value_pence INTEGER NOT NULL CHECK(value_pence>=0), cycle_days INTEGER NOT NULL CHECK(cycle_days>=0), reason TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE supplier_bill (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), id TEXT NOT NULL, supplier TEXT NOT NULL, amount_pence INTEGER NOT NULL CHECK(amount_pence>=0),
 due_date TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Needs review','Approved')), category TEXT NOT NULL, PRIMARY KEY(workspace_id,id)
);
CREATE TABLE business_risk (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), id TEXT NOT NULL, team TEXT NOT NULL, title TEXT NOT NULL, impact TEXT NOT NULL,
 owner TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Open','Reviewed')), PRIMARY KEY(workspace_id,id)
);
CREATE TABLE pipeline_context (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, days_in_stage INTEGER NOT NULL CHECK(days_in_stage>=0), next_step_due TEXT NOT NULL,
 forecast_category TEXT NOT NULL CHECK(forecast_category IN ('Pipeline','Best case','Commit','Closed')),
 PRIMARY KEY(workspace_id,opportunity_id), FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id)
);
CREATE VIEW sales_activity_summary AS
 SELECT workspace_id,owner_id,review_week,COUNT(*) AS attempts,
 SUM(CASE WHEN status='Sent' THEN 1 ELSE 0 END) AS sent,
 SUM(replied) AS replies,SUM(meeting) AS meetings
 FROM outreach_event GROUP BY workspace_id,owner_id,review_week;

-- Calling workbench schema: technical call state and business outcome are distinct.
CREATE TABLE sales_contact (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, owner_id TEXT NOT NULL,
 name TEXT NOT NULL, title TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
 email_allowed INTEGER NOT NULL CHECK(email_allowed IN (0,1)), call_allowed INTEGER NOT NULL CHECK(call_allowed IN (0,1)),
 timezone TEXT NOT NULL, business_need TEXT NOT NULL, last_touch TEXT NOT NULL, queue_status TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id),
 FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE after_call_rule (
 workspace_id TEXT NOT NULL, automation_id TEXT NOT NULL, outcome_trigger TEXT NOT NULL,
 missing_email_action TEXT NOT NULL CHECK(missing_email_action IN ('wait','task')),
 subject TEXT NOT NULL, template_body TEXT NOT NULL, create_task INTEGER NOT NULL CHECK(create_task IN (0,1)),
 advance_queue INTEGER NOT NULL CHECK(advance_queue IN (0,1)),
 PRIMARY KEY(workspace_id,automation_id), FOREIGN KEY(workspace_id,automation_id) REFERENCES automation(workspace_id,id)
);
CREATE TABLE call_session (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, contact_id TEXT NOT NULL, owner_id TEXT NOT NULL,
 technical_state TEXT NOT NULL CHECK(technical_state IN ('Ringing','Connected','Wrap-up','Logged')),
 connected INTEGER NOT NULL CHECK(connected IN (0,1)), business_outcome TEXT, notes TEXT NOT NULL, next_step TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,contact_id) REFERENCES sales_contact(workspace_id,id),
 FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE call_followup_job (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, call_id TEXT NOT NULL, contact_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('Queued','Paused','Waiting for email','Sent','Suppressed','Cancelled','Replied')),
 reason TEXT NOT NULL, rule_version INTEGER NOT NULL, subject_snapshot TEXT NOT NULL, body_snapshot TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,call_id),
 FOREIGN KEY(workspace_id,call_id) REFERENCES call_session(workspace_id,id), FOREIGN KEY(workspace_id,contact_id) REFERENCES sales_contact(workspace_id,id)
);
CREATE TABLE call_email_outbox (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, call_id TEXT NOT NULL, job_id TEXT NOT NULL,
 recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,call_id),
 FOREIGN KEY(workspace_id,call_id) REFERENCES call_session(workspace_id,id), FOREIGN KEY(workspace_id,job_id) REFERENCES call_followup_job(workspace_id,id)
);
CREATE TABLE sales_task (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, contact_id TEXT NOT NULL, title TEXT NOT NULL,
 due_date TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Open','Complete','Stopped on reply')), source TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,contact_id) REFERENCES sales_contact(workspace_id,id)
);
CREATE TABLE sales_meeting (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, contact_id TEXT NOT NULL, title TEXT NOT NULL, starts_at TEXT NOT NULL, status TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,contact_id) REFERENCES sales_contact(workspace_id,id)
);
CREATE TABLE sales_quote (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, contact_id TEXT NOT NULL, amount_pence INTEGER NOT NULL CHECK(amount_pence>0), status TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,contact_id) REFERENCES sales_contact(workspace_id,id)
);


-- Role workbench design records. These are demo templates, not an access-control layer.
CREATE TABLE workflow_case (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, workflow_key TEXT NOT NULL,
 role_key TEXT NOT NULL, source_record_id TEXT NOT NULL, source_label TEXT NOT NULL,
 stage INTEGER NOT NULL CHECK(stage>=0), status TEXT NOT NULL,
 values_json TEXT NOT NULL, PRIMARY KEY(workspace_id,id),
 FOREIGN KEY(workspace_id) REFERENCES workspace(id)
);
CREATE TABLE workflow_event (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, case_id TEXT NOT NULL,
 occurred_at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,case_id) REFERENCES workflow_case(workspace_id,id)
);
CREATE TABLE workflow_handoff (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, case_id TEXT NOT NULL,
 from_role TEXT NOT NULL, to_role TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, note TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,case_id),
 FOREIGN KEY(workspace_id,case_id) REFERENCES workflow_case(workspace_id,id)
);
CREATE TABLE workflow_receipt (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, invoice_id TEXT,
 reference TEXT NOT NULL COLLATE NOCASE, amount_pence INTEGER NOT NULL CHECK(amount_pence>0),
 status TEXT NOT NULL CHECK(status IN ('Allocated','Reconciled','Unapplied')),
 account_id TEXT NOT NULL, source_kind TEXT NOT NULL, bank_reference TEXT, reviewer TEXT,
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,source_kind,reference),
 CHECK((status='Unapplied')=(invoice_id IS NULL)),
 FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id),
 FOREIGN KEY(workspace_id,invoice_id,account_id) REFERENCES invoice(workspace_id,id,account_id)
);
CREATE TABLE workflow_stock_balance (
 workspace_id TEXT PRIMARY KEY, on_hand INTEGER NOT NULL CHECK(on_hand>=0),
 reserved INTEGER NOT NULL CHECK(reserved>=0 AND reserved<=on_hand),
 FOREIGN KEY(workspace_id) REFERENCES workspace(id)
);
CREATE TABLE workflow_output (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, case_id TEXT NOT NULL, output_type TEXT NOT NULL, detail TEXT NOT NULL,
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,case_id) REFERENCES workflow_case(workspace_id,id)
);

-- Composite references prevent attaching a reviewed payment to a different customer.
CREATE UNIQUE INDEX invoice_record_account ON invoice(workspace_id,id,account_id);
CREATE UNIQUE INDEX opportunity_record_account ON opportunity(workspace_id,id,account_id);
CREATE UNIQUE INDEX contact_record_account ON sales_contact(workspace_id,id,account_id);
CREATE TABLE approval_request (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('sale','discount','quote','order','customer','delegate')),
 account_id TEXT NOT NULL, opportunity_id TEXT, quote_id TEXT, experience_id TEXT, delegate_id TEXT,
 requester_role TEXT NOT NULL CHECK(requester_role IN ('sales','operations')),
 reviewer_role TEXT NOT NULL CHECK(reviewer_role IN ('saleslead','leadership')), reviewer_title TEXT,
 title TEXT NOT NULL, reason TEXT NOT NULL, value_pence INTEGER NOT NULL CHECK(value_pence>=0),
 status TEXT NOT NULL CHECK(status IN ('pending','approved','denied')), effective_status TEXT NOT NULL CHECK(effective_status IN ('pending','approved','denied','changed')),
 price_revision INTEGER NOT NULL DEFAULT 0 CHECK(price_revision>=0),
 PRIMARY KEY(workspace_id,id),
 CHECK((kind IN ('sale','discount','order'))=(opportunity_id IS NOT NULL)), CHECK((kind='quote')=(quote_id IS NOT NULL)),
 CHECK((kind='delegate')=(experience_id IS NOT NULL)), CHECK((kind='delegate')=(delegate_id IS NOT NULL)),
 CHECK((kind IN ('sale','discount','quote','delegate'))=(reviewer_role='saleslead')),
 CHECK(kind NOT IN ('sale','discount','quote') OR requester_role='sales'),
 FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id),
 FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id),
 FOREIGN KEY(workspace_id,quote_id) REFERENCES sales_quote(workspace_id,id),
 FOREIGN KEY(workspace_id,experience_id) REFERENCES experience(workspace_id,id),
 FOREIGN KEY(workspace_id,delegate_id,account_id) REFERENCES sales_contact(workspace_id,id,account_id)
);
CREATE UNIQUE INDEX approval_per_opportunity ON approval_request(workspace_id,kind,opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE UNIQUE INDEX approval_per_customer ON approval_request(workspace_id,account_id) WHERE kind='customer';
CREATE UNIQUE INDEX approval_per_quote ON approval_request(workspace_id,quote_id) WHERE kind='quote';
CREATE UNIQUE INDEX approval_per_delegate ON approval_request(workspace_id,experience_id,delegate_id) WHERE kind='delegate';
CREATE TABLE approval_event (
 workspace_id TEXT NOT NULL, request_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 occurred_at TEXT NOT NULL, actor_role TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','denied')),
 note TEXT NOT NULL, title TEXT NOT NULL, value_pence INTEGER NOT NULL CHECK(value_pence>=0), account_id TEXT,
 customer_name TEXT, customer_region TEXT, customer_segment TEXT,
 price_revision INTEGER NOT NULL DEFAULT 0 CHECK(price_revision>=0),
 PRIMARY KEY(workspace_id,request_id,revision), CHECK(status!='denied' OR length(trim(note))>0),
 FOREIGN KEY(workspace_id,request_id) REFERENCES approval_request(workspace_id,id),
 FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE discount_review_snapshot (
 workspace_id TEXT NOT NULL, request_id TEXT NOT NULL, revision INTEGER NOT NULL,
 gross_pence INTEGER NOT NULL CHECK(gross_pence>0), previous_pence INTEGER NOT NULL CHECK(previous_pence>=0),
 discount_bps INTEGER NOT NULL CHECK(discount_bps BETWEEN 1 AND 10000), net_pence INTEGER NOT NULL CHECK(net_pence>=0),
 CHECK(net_pence=(gross_pence*(10000-discount_bps)+5000)/10000), CHECK(previous_pence<>net_pence),
 PRIMARY KEY(workspace_id,request_id,revision),
 FOREIGN KEY(workspace_id,request_id,revision) REFERENCES approval_event(workspace_id,request_id,revision)
);
CREATE TABLE opportunity_pricing (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 gross_pence INTEGER NOT NULL CHECK(gross_pence>0), net_pence INTEGER NOT NULL CHECK(net_pence>=0),
 discount_bps INTEGER NOT NULL CHECK(discount_bps BETWEEN 1 AND 10000),
 CHECK(net_pence=(gross_pence*(10000-discount_bps)+5000)/10000),
 PRIMARY KEY(workspace_id,opportunity_id), FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id)
);
CREATE TABLE opportunity_owner_change (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 from_owner_id TEXT NOT NULL, to_owner_id TEXT NOT NULL, actor_role TEXT NOT NULL CHECK(actor_role IN ('sales','saleslead','leadership')),
 handoff_note TEXT NOT NULL CHECK(length(trim(handoff_note))>0), occurred_at TEXT NOT NULL,
 PRIMARY KEY(workspace_id,opportunity_id,revision), CHECK(from_owner_id<>to_owner_id),
 FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id),
 FOREIGN KEY(workspace_id,from_owner_id) REFERENCES team_member(workspace_id,id),
 FOREIGN KEY(workspace_id,to_owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE bank_transaction (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), id TEXT NOT NULL,
 source_kind TEXT NOT NULL CHECK(source_kind IN ('Bank statement','Processor settlement')), reference TEXT NOT NULL COLLATE NOCASE,
 payer TEXT NOT NULL, statement_date TEXT NOT NULL, amount_pence INTEGER NOT NULL CHECK(amount_pence>0),
 memo TEXT NOT NULL, risk_signal TEXT,
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,source_kind,reference)
);
CREATE UNIQUE INDEX receipt_record_account ON workflow_receipt(workspace_id,id,account_id);
CREATE UNIQUE INDEX receipt_record_invoice ON workflow_receipt(workspace_id,id,account_id,invoice_id);
CREATE TABLE finance_exception (
 workspace_id TEXT NOT NULL, bank_transaction_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('Needs match','Risk hold','Awaiting evidence','Unapplied','Reconciled','Closed after review')),
 account_id TEXT, invoice_id TEXT, order_id TEXT, receipt_id TEXT, follow_up_date TEXT, disposition_reference TEXT, held_from TEXT,
 PRIMARY KEY(workspace_id,bank_transaction_id), UNIQUE(workspace_id,receipt_id),
 CHECK(status!='Reconciled' OR (account_id IS NOT NULL AND invoice_id IS NOT NULL AND receipt_id IS NOT NULL)),
 CHECK(status!='Unapplied' OR (account_id IS NOT NULL AND invoice_id IS NULL AND receipt_id IS NOT NULL)),
 CHECK(status!='Closed after review' OR disposition_reference IS NOT NULL),
 FOREIGN KEY(workspace_id,bank_transaction_id) REFERENCES bank_transaction(workspace_id,id),
 FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id),
 FOREIGN KEY(workspace_id,invoice_id,account_id) REFERENCES invoice(workspace_id,id,account_id),
 FOREIGN KEY(workspace_id,order_id,account_id) REFERENCES opportunity(workspace_id,id,account_id),
 FOREIGN KEY(workspace_id,receipt_id,account_id) REFERENCES workflow_receipt(workspace_id,id,account_id),
 FOREIGN KEY(workspace_id,receipt_id,account_id,invoice_id) REFERENCES workflow_receipt(workspace_id,id,account_id,invoice_id)
);
CREATE TABLE finance_exception_event (
 workspace_id TEXT NOT NULL, bank_transaction_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
 occurred_at TEXT NOT NULL, actor_role TEXT NOT NULL CHECK(actor_role IN ('finance','leadership')), action TEXT NOT NULL,
 status TEXT NOT NULL, evidence TEXT NOT NULL CHECK(length(trim(evidence))>0),
 PRIMARY KEY(workspace_id,bank_transaction_id,revision),
 FOREIGN KEY(workspace_id,bank_transaction_id) REFERENCES finance_exception(workspace_id,bank_transaction_id)
);
CREATE VIEW period_open_statement_exceptions AS
 SELECT b.workspace_id,substr(b.statement_date,1,7) AS period,count(*) AS open_count,sum(b.amount_pence) AS open_pence
 FROM bank_transaction b JOIN finance_exception f ON b.workspace_id=f.workspace_id AND b.id=f.bank_transaction_id
 WHERE f.status NOT IN ('Reconciled','Closed after review') GROUP BY b.workspace_id,substr(b.statement_date,1,7);
CREATE TABLE customer_onboarding (
 workspace_id TEXT NOT NULL, account_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('Prospect','Pending sign-off','Active customer','Changes requested')),
 PRIMARY KEY(workspace_id,account_id), FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id)
);
CREATE TABLE commercial_signoff_state (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, terms_status TEXT, order_status TEXT,
 PRIMARY KEY(workspace_id,opportunity_id), FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id)
);
