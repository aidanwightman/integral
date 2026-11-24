import {handoffOpportunity} from '../../outputs/workspace-concepts/studio-src/model.js';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {INDUSTRIES} from '../../outputs/workspace-concepts/studio-src/data.js';
import {requestApproval,decideApproval} from '../../outputs/workspace-concepts/studio-src/approval-model.js';
import {financeExceptionAction} from '../../outputs/workspace-concepts/studio-src/finance-exceptions-model.js';
import {logCompletedCall, startCall, connectCall, endCall, logCall, addCallNote} from '../../outputs/workspace-concepts/studio-src/calling.js';
import {commissionAction, ensureCommissions} from '../../outputs/workspace-concepts/studio-src/commissions-model.js';
import {crmLogInbound,crmRecordMethodCheck} from '../../outputs/workspace-concepts/studio-src/contact-model.js';
const fixtures=fileURLToPath(new URL('../../outputs/workspace-concepts/datasets/',import.meta.url));
const temporary=mkdtempSync(join(tmpdir(),'studio-finance-sqlite-'));
const options={encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}};
const python = process.env.PYTHON || 'python3';
try{
  for(const {id} of INDUSTRIES)copyFileSync(join(fixtures,id+'.json'),join(temporary,id+'.json'));
  const eventsPath=join(temporary,'events.json'),d=JSON.parse(readFileSync(eventsPath,'utf8'));
  const r=requestApproval(d,'sales','customer',{name:'Quay Events',segment:'Growth',region:'UK',reason:'Review trading references.'});
  decideApproval(d,'leadership',r.id,1,'denied','Missing registration.');
  requestApproval(d,'sales','customer',{requestId:r.id,version:2,name:'Quay Events Ltd',segment:'Growth',region:'UK',reason:'Registration verified.'});
  decideApproval(d,'leadership',r.id,3,'approved');
  const terms=d.approvalRequests.find(r=>r.type==='sale'),deal=d.opportunities.find(o=>o.id===terms.targetId),gross=deal.valuePence;
  decideApproval(d,'saleslead',terms.id,1,'approved');
  const discounted=requestApproval(d,'sales','discount',{targetId:deal.id,reason:'Multi-event booking.',discountPercent:'12.35'});
  decideApproval(d,'saleslead',discounted.id,1,'approved');
  const to=d.team.find(t=>t.department.includes('sales') && t.name!==deal.owner);
  handoffOpportunity(d,deal.id,'saleslead',{ownerId:to.id,reason:'Coordinate the November programme.'},0,deal.owner);
  const first=d.financeExceptions.find(c=>c.source.reference==='BANK-6417'),invoice=d.invoices.find(i=>first.source.memo.includes(i.number));
  financeExceptionAction(d,'finance',first.id,1,'match',{accountId:invoice.accountId,invoiceId:invoice.id,evidence:'Checked customer remittance.'});
  const unidentified=d.financeExceptions.find(c=>c.source.reference==='BANK-6422');
  financeExceptionAction(d,'finance',unidentified.id,1,'unapplied',{accountId:r.accountId,followUp:'2026-11-23',evidence:'Customer identified, order pending.'});
  const contact=d.contacts[0], owner=contact.ownerId;
  crmLogInbound(d,{sender:contact.email,subject:'Direct line',body:'Please use this number.\nSam Carter\nDirect: '+contact.phone,received:'2026-01-10T10:00:00Z',messageId:'direct-line@example.com'});
  crmRecordMethodCheck(d,contact.id,{method:'phone',value:contact.phone,result:'verified',source:'Customer reply',evidence:'Sam confirmed his direct number.',checkedAt:'2026-01-12T10:00:00Z',sourceMessageId:d.crmEmails[0].id});
  crmRecordMethodCheck(d,contact.id,{method:'phone',value:contact.phone,result:'unconfirmed',source:'Callback',evidence:'Reception could not confirm the direct number.',checkedAt:'2026-01-15T09:00:00Z'});
  const older=d.contacts[2];
  older.emailEvidence={address:older.email.toUpperCase(),at:'2026-01-12T10:00:00Z',verifiedAt:'2026-01-10T09:00:00Z',
    source:'Customer call',detail:'Confirmed the address during the call.'};
  const replaced=d.contacts[3];
  replaced.emailEvidence={...older.emailEvidence,address:'outdated@example.com'};
  const opportunity=d.opportunities.find(item=>item.accountId===contact.accountId);
  const {call:setup}=logCompletedCall(d,{
    contactId:contact.id,ownerId:owner,opportunityId:opportunity.id,direction:'Outbound',
    endedAt:'2026-01-02T10:00:00Z',durationSeconds:420,purpose:'Setup call',outcome:'Callback requested',
    notes:'Buyer asked to see the proposal.',nextStep:'Present the proposal.',scheduledAt:'2099-01-06T15:30',
    scheduledPurpose:'Pitch call',scheduledOwnerId:owner
  });
  const pitch=startCall(d,contact.id,setup.nextCallTaskId);
  connectCall(d,pitch.id);endCall(d,pitch.id);
  logCall(d,pitch.id,{outcome:'Not interested',notes:'Buyer declined the proposal.',pitchResult:'Declined',buyerFeedback:'No budget this quarter.'});
  addCallNote(d,pitch.id,{contactId:contact.id,authorId:owner,kind:'Additional note',body:'Budget review moved.',revision:0});
  const line=ensureCommissions(d).deals.find(row=>row.accountId===opportunity.accountId);
  commissionAction(d,'commission-source',line.id,{opportunity:opportunity.id,reference:'Signed schedule 14'},'finance');
  writeFileSync(eventsPath,JSON.stringify(d));
  const out=join(temporary,'sample.sqlite'),buildArgs=[join(fixtures,'build-database.py'),'--data-dir',temporary,'--output',out];
  execFileSync(python,buildArgs,options);
  const verify=`
import sqlite3,sys
db=sqlite3.connect(sys.argv[1]);db.execute('PRAGMA foreign_keys=ON')
one=lambda sql,*args: db.execute(sql,args).fetchone()[0]
assert one("SELECT COUNT(*) FROM approval_event WHERE workspace_id='events' AND request_id=?",sys.argv[2])==4
assert one("SELECT customer_name FROM approval_event WHERE workspace_id='events' AND request_id=? AND revision=1",sys.argv[2])=='Quay Events'
assert one("SELECT customer_name FROM approval_event WHERE workspace_id='events' AND request_id=? AND revision=3",sys.argv[2])=='Quay Events Ltd'
assert one("SELECT COUNT(*) FROM customer_onboarding WHERE workspace_id='events' AND status='Active customer'")==1
assert one("SELECT effective_status FROM approval_request WHERE workspace_id='events' AND id=?",sys.argv[4])=='changed'
assert one("SELECT effective_status FROM approval_request WHERE workspace_id='events' AND id=?",sys.argv[5])=='approved'
assert one("SELECT net_pence FROM opportunity_pricing WHERE workspace_id='events' AND opportunity_id=?",sys.argv[6])==int(sys.argv[8])
assert db.execute("SELECT previous_pence,net_pence,discount_bps FROM discount_review_snapshot WHERE workspace_id='events' AND request_id=? ORDER BY revision",(sys.argv[5],)).fetchall()==[(int(sys.argv[7]),int(sys.argv[8]),1235)]*2
assert one("SELECT value_pence FROM opportunity WHERE workspace_id='events' AND id=?",sys.argv[6])==int(sys.argv[8])
assert one("SELECT owner_id FROM opportunity WHERE workspace_id='events' AND id=?",sys.argv[6])==sys.argv[9]
assert one("SELECT handoff_note FROM opportunity_owner_change WHERE workspace_id='events' AND to_owner_id=?",sys.argv[9])=='Coordinate the November programme.'
assert one("SELECT COUNT(*) FROM workflow_receipt WHERE workspace_id='events'")==2
assert one("SELECT open_count FROM period_open_statement_exceptions WHERE workspace_id='events' AND period='2026-11'")==2
assert one("SELECT opening_cash_pence FROM workspace WHERE id='events'")==int(sys.argv[3])
assert one("SELECT COUNT(*) FROM finance_exception x JOIN workflow_receipt r ON r.workspace_id=x.workspace_id AND r.id=x.receipt_id WHERE x.workspace_id='events' AND x.status='Unapplied' AND r.invoice_id IS NULL")==1
def rejects(stmt):
    try:db.execute(stmt)
    except sqlite3.IntegrityError:return
    raise AssertionError('Expected constraint failure: '+stmt)
rejects("UPDATE finance_exception SET account_id='agency-a0' WHERE workspace_id='events' AND status='Reconciled'")
rejects("UPDATE finance_exception SET account_id='events-a3' WHERE workspace_id='events' AND status='Reconciled'")
rejects("UPDATE bank_transaction SET reference='BANK-6417' WHERE workspace_id='events' AND reference='BANK-6422'")
assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
evidence=db.execute("""SELECT e.check_result,e.last_checked_at,e.last_verified_at,m.original_message_id,m.subject,m.body
  FROM contact_method_evidence e JOIN contact_email_message m
  ON (m.workspace_id,m.contact_id,m.id)=(e.workspace_id,e.contact_id,e.verification_message_id)
  WHERE e.workspace_id='events' AND e.contact_id='events-contact0' AND e.method='phone'""").fetchone()
assert evidence[:5]==('unconfirmed','2026-01-15T09:00:00.000Z','2026-01-10T10:00:00.000Z','direct-line@example.com','Direct line'),evidence
assert 'Sam Carter' in evidence[5]
legacy=db.execute("SELECT last_checked_at,last_verified_at FROM contact_method_evidence WHERE workspace_id='events' AND contact_id='events-contact2' AND method='email'").fetchone()
assert legacy==('2026-01-12T10:00:00Z','2026-01-10T09:00:00Z'),legacy
assert one("SELECT COUNT(*) FROM contact_method_evidence WHERE workspace_id='events' AND contact_id='events-contact3' AND method='email'")==0
row=db.execute("""SELECT first.purpose, task.status, scheduled.owner_id, later.purpose, later.business_outcome,
  later.pitch_result, later.buyer_feedback, note.body
  FROM scheduled_call scheduled JOIN sales_task task ON (task.workspace_id,task.id)=(scheduled.workspace_id,scheduled.task_id)
  JOIN call_session first ON (first.workspace_id,first.id)=(scheduled.workspace_id,scheduled.source_call_id)
  JOIN call_session later ON (later.workspace_id,later.id,later.scheduled_task_id)=(scheduled.workspace_id,scheduled.completed_call_id,task.id)
  JOIN call_note note ON (note.workspace_id,note.call_id)=(later.workspace_id,later.id)
  WHERE first.workspace_id='events' AND first.id=?""",(sys.argv[10],)).fetchone()
assert row==('Setup call','Complete',sys.argv[11],'Pitch call','Not interested','Declined','No budget this quarter.','Budget review moved.'),row
trace=db.execute("""SELECT s.opportunity_id, s.evidence_reference, a.actor, a.kind, l.version
  FROM commission_source s JOIN commission_line l ON (l.workspace_id,l.id)=(s.workspace_id,s.line_id)
  JOIN commission_activity a ON (a.workspace_id,a.line_id)=(l.workspace_id,l.id)
  WHERE s.workspace_id='events' AND s.line_id=?""",(sys.argv[12],)).fetchone()
assert trace==(sys.argv[13],'Signed schedule 14','finance','commission-source',1),trace
rejects("UPDATE commission_source SET account_id='events-a1' WHERE workspace_id='events' AND account_id<>'events-a1'")
`;
  execFileSync(python,['-c',verify,out,r.id,String(d.openingCashPence),terms.id,discounted.id,deal.id,String(gross),String(deal.valuePence),to.id,setup.id,owner,line.id,opportunity.id],options);
  const original=readFileSync(out);
  d.financeExceptions[0].history[0].role='invalid';writeFileSync(eventsPath,JSON.stringify(d));
  assert.throws(()=>execFileSync(python,buildArgs,{...options,stdio:'pipe'}));
  assert(original.equals(readFileSync(out)),'Failed import must retain the prior database');
  console.log('PASS: source exports build atomically with resolved approvals, exact bank allocations, unallocated receipts, scoped keys and immutable history snapshots.');
}finally{rmSync(temporary,{recursive:true,force:true});}
