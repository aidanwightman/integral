-- The CRM and accounting records keep their existing primary keys.
CREATE TABLE collection_case (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL,
 invoice_id TEXT, supplier_bill_id TEXT, event_id TEXT, finance_owner_id TEXT,
 invoice_due_date TEXT, supplier_invoice_number TEXT,
 PRIMARY KEY(workspace_id,id),
 CHECK ((invoice_id IS NOT NULL AND invoice_id=id AND supplier_bill_id IS NULL AND supplier_invoice_number IS NULL)
     OR (supplier_bill_id IS NOT NULL AND supplier_bill_id=id AND invoice_id IS NULL AND invoice_due_date IS NULL)),
 FOREIGN KEY(workspace_id,invoice_id) REFERENCES invoice(workspace_id,id),
 FOREIGN KEY(workspace_id,supplier_bill_id) REFERENCES supplier_bill(workspace_id,id),
 FOREIGN KEY(workspace_id,event_id) REFERENCES experience(workspace_id,id),
 FOREIGN KEY(workspace_id,finance_owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE collection_followup (
 workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
 action TEXT NOT NULL CHECK(action IN ('reminder','chase','promise','dispute','resolve','followup','query')),
 occurred_at TEXT NOT NULL, channel TEXT, note TEXT NOT NULL, next_action TEXT NOT NULL,
 owner_id TEXT NOT NULL, next_due_date TEXT NOT NULL,
 PRIMARY KEY(workspace_id,case_id,revision),
 FOREIGN KEY(workspace_id,case_id) REFERENCES collection_case(workspace_id,id),
 FOREIGN KEY(workspace_id,owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE INDEX collection_due_by_owner ON collection_followup(workspace_id,owner_id,next_due_date);
CREATE TABLE collection_payment_promise (
 workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, revision INTEGER NOT NULL,
 promised_date TEXT NOT NULL, promised_pence INTEGER NOT NULL CHECK(promised_pence>0),
 paid_at_promise_pence INTEGER NOT NULL CHECK(paid_at_promise_pence>=0), current_promise INTEGER NOT NULL CHECK(current_promise IN (0,1)),
 PRIMARY KEY(workspace_id,case_id,revision),
 FOREIGN KEY(workspace_id,case_id,revision) REFERENCES collection_followup(workspace_id,case_id,revision)
);
CREATE UNIQUE INDEX collection_one_current_promise ON collection_payment_promise(workspace_id,case_id) WHERE current_promise=1;
CREATE TABLE collection_dispute (
 workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, opened_revision INTEGER NOT NULL, resolved_revision INTEGER,
 PRIMARY KEY(workspace_id,case_id,opened_revision), UNIQUE(workspace_id,case_id,resolved_revision),
 CHECK(resolved_revision IS NULL OR resolved_revision>opened_revision),
 FOREIGN KEY(workspace_id,case_id,opened_revision) REFERENCES collection_followup(workspace_id,case_id,revision),
 FOREIGN KEY(workspace_id,case_id,resolved_revision) REFERENCES collection_followup(workspace_id,case_id,revision)
);
CREATE UNIQUE INDEX collection_one_open_dispute ON collection_dispute(workspace_id,case_id) WHERE resolved_revision IS NULL;
CREATE TABLE collection_reminder_draft (
 workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, revision INTEGER NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
 PRIMARY KEY(workspace_id,case_id,revision),
 FOREIGN KEY(workspace_id,case_id,revision) REFERENCES collection_followup(workspace_id,case_id,revision)
);
CREATE TABLE opportunity_stage_definition (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), ordinal INTEGER NOT NULL CHECK(ordinal>=0), stage TEXT NOT NULL,
 PRIMARY KEY(workspace_id,stage), UNIQUE(workspace_id,ordinal)
);
CREATE TABLE opportunity_stage_requirement (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, stage TEXT NOT NULL, evidence TEXT NOT NULL,
 PRIMARY KEY(workspace_id,opportunity_id,stage),
 FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id),
 FOREIGN KEY(workspace_id,stage) REFERENCES opportunity_stage_definition(workspace_id,stage)
);
CREATE TABLE opportunity_stage_hold (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, requested_stage TEXT NOT NULL, reason TEXT NOT NULL,
 PRIMARY KEY(workspace_id,opportunity_id),
 FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id),
 FOREIGN KEY(workspace_id,requested_stage) REFERENCES opportunity_stage_definition(workspace_id,stage)
);
CREATE TABLE opportunity_invitation (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, meeting_url TEXT, calendar_reference TEXT,
 response TEXT NOT NULL CHECK(response IN ('Not recorded','Awaiting reply','Accepted','Declined','Chasing')),
 chase_owner_id TEXT, chase_due TEXT, evidence_revision INTEGER NOT NULL CHECK(evidence_revision>=0),
 PRIMARY KEY(workspace_id,opportunity_id),
 CHECK(response='Not recorded' OR calendar_reference IS NOT NULL),
 CHECK(response<>'Chasing' OR (chase_owner_id IS NOT NULL AND chase_due IS NOT NULL)),
 FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id),
 FOREIGN KEY(workspace_id,chase_owner_id) REFERENCES team_member(workspace_id,id)
);
CREATE TABLE opportunity_stage_activity (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, ordinal INTEGER NOT NULL CHECK(ordinal>0),
 action TEXT NOT NULL CHECK(action IN ('Stage held','Stage evidence updated','Stage changed')),
 stage TEXT NOT NULL, occurred_at TEXT NOT NULL, actor TEXT NOT NULL, detail TEXT NOT NULL,
 PRIMARY KEY(workspace_id,opportunity_id,ordinal),
 FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id),
 FOREIGN KEY(workspace_id,stage) REFERENCES opportunity_stage_definition(workspace_id,stage)
);
