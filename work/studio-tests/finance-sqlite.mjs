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
const fixtures=fileURLToPath(new URL('../../outputs/workspace-concepts/datasets/',import.meta.url));
const temporary=mkdtempSync(join(tmpdir(),'studio-finance-sqlite-'));
const options={encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}};
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
  writeFileSync(eventsPath,JSON.stringify(d));
  const out=join(temporary,'sample.sqlite'),buildArgs=[join(fixtures,'build-database.py'),'--data-dir',temporary,'--output',out];
  execFileSync('python3',buildArgs,options);
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
`;
  execFileSync('python3',['-c',verify,out,r.id,String(d.openingCashPence),terms.id,discounted.id,deal.id,String(gross),String(deal.valuePence),to.id],options);
  const original=readFileSync(out);
  d.financeExceptions[0].history[0].role='invalid';writeFileSync(eventsPath,JSON.stringify(d));
  assert.throws(()=>execFileSync('python3',buildArgs,{...options,stdio:'pipe'}));
  assert(original.equals(readFileSync(out)),'Failed import must retain the prior database');
  console.log('PASS: source exports build atomically with resolved approvals, exact bank allocations, unallocated receipts, scoped keys and immutable history snapshots.');
}finally{rmSync(temporary,{recursive:true,force:true});}
