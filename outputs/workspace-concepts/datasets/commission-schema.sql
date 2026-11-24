CREATE TABLE commission_plan (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), id TEXT NOT NULL, name TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0), rate_percent REAL NOT NULL CHECK(rate_percent BETWEEN 0 AND 100),
 bonus_pence INTEGER NOT NULL CHECK(bonus_pence>=0), threshold_pence INTEGER NOT NULL CHECK(threshold_pence>=0),
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE commission_team_rule (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), id TEXT NOT NULL, name TEXT NOT NULL,
 discount_limit REAL NOT NULL CHECK(discount_limit BETWEEN 0 AND 100), rep_share REAL NOT NULL CHECK(rep_share BETWEEN 0 AND 100),
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE commission_line (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, account_id TEXT NOT NULL, payee TEXT NOT NULL,
 plan_id TEXT NOT NULL, team_id TEXT NOT NULL, gross_pence INTEGER NOT NULL CHECK(gross_pence>=0),
 discount_percent REAL NOT NULL CHECK(discount_percent BETWEEN 0 AND 100),
 cash_pence INTEGER NOT NULL CHECK(cash_pence>=0 AND cash_pence<=gross_pence-ROUND(gross_pence*discount_percent/100)),
 refund_pence INTEGER NOT NULL CHECK(refund_pence BETWEEN 0 AND cash_pence),
 rep_share_override REAL CHECK(rep_share_override BETWEEN 0 AND 100),
 reviewed_refund_pence INTEGER CHECK(reviewed_refund_pence=refund_pence),
 approved_revision INTEGER, approved_pence INTEGER CHECK(approved_pence>=0), version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),
 CHECK((approved_revision IS NULL)=(approved_pence IS NULL)),
 PRIMARY KEY(workspace_id,id),
 FOREIGN KEY(workspace_id,account_id) REFERENCES account(workspace_id,id),
 FOREIGN KEY(workspace_id,plan_id) REFERENCES commission_plan(workspace_id,id),
 FOREIGN KEY(workspace_id,team_id) REFERENCES commission_team_rule(workspace_id,id)
);
CREATE TABLE commission_inquiry (
 workspace_id TEXT NOT NULL, line_id TEXT NOT NULL, number INTEGER NOT NULL CHECK(number>0),
 reason TEXT NOT NULL, evidence_reference TEXT NOT NULL, note TEXT NOT NULL, raised_by TEXT NOT NULL, opened_at TEXT NOT NULL,
 plan_revision INTEGER NOT NULL CHECK(plan_revision>0), original_rep_pence INTEGER NOT NULL CHECK(original_rep_pence>=0),
 status TEXT NOT NULL CHECK(status IN ('Open','Resolved')), decision TEXT, decision_reference TEXT, decision_note TEXT,
 resolved_by TEXT, resolved_at TEXT, reviewed_rep_pence INTEGER CHECK(reviewed_rep_pence>=0),
 CHECK(status='Open' OR (decision IS NOT NULL AND decision_reference IS NOT NULL AND decision_note IS NOT NULL AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL AND reviewed_rep_pence IS NOT NULL)),
 PRIMARY KEY(workspace_id,line_id,number), FOREIGN KEY(workspace_id,line_id) REFERENCES commission_line(workspace_id,id)
);
CREATE UNIQUE INDEX one_open_commission_inquiry ON commission_inquiry(workspace_id,line_id) WHERE status='Open';
CREATE TABLE commission_activity (
 workspace_id TEXT NOT NULL REFERENCES workspace(id), sequence INTEGER NOT NULL, action TEXT NOT NULL, revision INTEGER NOT NULL, at TEXT NOT NULL,
 kind TEXT, actor TEXT, line_id TEXT, rep_before_pence INTEGER, rep_after_pence INTEGER,
 total_pence INTEGER, status TEXT, reason TEXT, evidence_reference TEXT, note TEXT,
 PRIMARY KEY(workspace_id,sequence),
 FOREIGN KEY(workspace_id,line_id) REFERENCES commission_line(workspace_id,id)
);
CREATE TABLE commission_approval_cleared (
 workspace_id TEXT NOT NULL, sequence INTEGER NOT NULL, line_id TEXT NOT NULL,
 PRIMARY KEY(workspace_id,sequence,line_id),
 FOREIGN KEY(workspace_id,sequence) REFERENCES commission_activity(workspace_id,sequence),
 FOREIGN KEY(workspace_id,line_id) REFERENCES commission_line(workspace_id,id)
);
CREATE UNIQUE INDEX commission_line_customer ON commission_line(workspace_id,id,account_id);
CREATE UNIQUE INDEX opportunity_customer ON opportunity(workspace_id,id,account_id);
CREATE UNIQUE INDEX invoice_customer ON invoice(workspace_id,id,account_id);
CREATE TABLE invoiced_order (
 workspace_id TEXT NOT NULL, invoice_id TEXT NOT NULL, account_id TEXT NOT NULL, order_id TEXT NOT NULL,
 PRIMARY KEY(workspace_id,invoice_id),
 FOREIGN KEY(workspace_id,invoice_id,account_id) REFERENCES invoice(workspace_id,id,account_id),
 FOREIGN KEY(workspace_id,order_id,account_id) REFERENCES opportunity(workspace_id,id,account_id)
);
CREATE TABLE commission_source (
 workspace_id TEXT NOT NULL, line_id TEXT NOT NULL, account_id TEXT NOT NULL, opportunity_id TEXT NOT NULL,
 evidence_reference TEXT NOT NULL CHECK(length(trim(evidence_reference))>0), reviewed_value_pence INTEGER NOT NULL,
 PRIMARY KEY(workspace_id,line_id),
 FOREIGN KEY(workspace_id,line_id,account_id) REFERENCES commission_line(workspace_id,id,account_id),
 FOREIGN KEY(workspace_id,opportunity_id,account_id) REFERENCES opportunity(workspace_id,id,account_id)
);
CREATE VIEW commission_statement AS
WITH terms AS (
 SELECT c.*,p.rate_percent,p.bonus_pence,p.threshold_pence,t.discount_limit,COALESCE(c.rep_share_override,t.rep_share) AS rep_share,
 c.gross_pence-CAST(ROUND(c.gross_pence*c.discount_percent/100) AS INTEGER) AS net_pence
 FROM commission_line c JOIN commission_plan p ON (p.workspace_id,p.id)=(c.workspace_id,c.plan_id)
 JOIN commission_team_rule t ON (t.workspace_id,t.id)=(c.workspace_id,c.team_id)
), earnings AS (
 SELECT terms.*,MAX(0,net_pence-refund_pence) AS retained_pence FROM terms
), amounts AS (
 SELECT earnings.*,CAST(ROUND(retained_pence*rate_percent/100) AS INTEGER)
   +CASE WHEN retained_pence>=threshold_pence THEN bonus_pence ELSE 0 END AS total_pence FROM earnings
), credit AS (
 SELECT amounts.*,CAST(ROUND(total_pence*rep_share/100) AS INTEGER) AS rep_pence FROM amounts
)
SELECT workspace_id,id,account_id,payee,net_pence,retained_pence,total_pence,rep_pence,total_pence-rep_pence AS partner_pence,
 CASE WHEN net_pence=0 OR cash_pence<net_pence OR discount_percent>discount_limit
  OR (refund_pence>0 AND COALESCE(reviewed_refund_pence,0)<>refund_pence)
  OR EXISTS(SELECT 1 FROM commission_inquiry q WHERE (q.workspace_id,q.line_id)=(credit.workspace_id,credit.id) AND q.status='Open')
 THEN 'On hold' WHEN approved_revision IS NOT NULL THEN 'Approved' ELSE 'Ready for approval' END AS status FROM credit;

CREATE TABLE opportunity_commission_package (
 workspace_id TEXT NOT NULL, opportunity_id TEXT NOT NULL, plan_id TEXT NOT NULL,
 PRIMARY KEY(workspace_id,opportunity_id),
 FOREIGN KEY(workspace_id,opportunity_id) REFERENCES opportunity(workspace_id,id),
 FOREIGN KEY(workspace_id,plan_id) REFERENCES commission_plan(workspace_id,id)
);
CREATE VIEW opportunity_commission_forecast AS
WITH estimates AS (
 SELECT o.workspace_id,o.id AS opportunity_id,o.owner_id,o.close_month,o.value_pence,o.probability,p.id AS plan_id,
 CASE WHEN p.id IS NOT NULL THEN CAST(ROUND(o.value_pence*p.rate_percent/100) AS INTEGER)
    +CASE WHEN o.value_pence>=p.threshold_pence THEN p.bonus_pence ELSE 0 END END AS potential_pence
 FROM opportunity o
 LEFT JOIN opportunity_commission_package cp ON (cp.workspace_id,cp.opportunity_id)=(o.workspace_id,o.id)
 LEFT JOIN commission_plan p ON (p.workspace_id,p.id)=(cp.workspace_id,cp.plan_id)
 WHERE o.probability<1
)
SELECT estimates.*, CAST(ROUND(potential_pence*probability) AS INTEGER) AS weighted_pence FROM estimates;
