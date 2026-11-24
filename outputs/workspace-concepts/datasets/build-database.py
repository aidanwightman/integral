"""Rebuild a sample SQLite database from the eight synthetic JSON datasets."""
from pathlib import Path
import argparse
import json
import os
import re
import sqlite3
import tempfile

from commission_database import insert_commissions
from collections_pipeline_database import insert_pipeline_collections
from finance_approval_database import insert_finance_approvals

root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--data-dir',type=Path,default=root,help='Directory containing the eight workspace JSON snapshots.')
parser.add_argument('--output',type=Path,default=root/'workspace-templates.sqlite',help='Destination SQLite file.')
args=parser.parse_args()
# Build in memory, then atomically replace only the generated demo database.
db=sqlite3.connect(':memory:')
for schema_file in ['schema.sql','commission-schema.sql','collections-pipeline-schema.sql']:
    db.executescript((root/schema_file).read_text())
def insert(table,values):
    db.execute(f"INSERT INTO {table} VALUES ({','.join('?' for _ in values)})",values)

def insert_contact_evidence(workspace, contact):
    for method in ('email', 'phone'):
        value = contact[method]
        normalized = value.strip().lower()
        if method == 'phone':
            normalized = re.sub(r'(?:extension|ext\.?|x|#)\s*(\d+)$', r'x\1', normalized)
            normalized = re.sub(r'[\s().-]', '', normalized)
            normalized = re.sub(r'^00', '+', normalized)
        record = (contact.get('methodEvidence') or {}).get(method) or {}
        if record.get('value') != normalized:
            record = {}
        confirmed = record.get('verified') or {}
        legacy = contact.get('emailEvidence') or {}
        legacy_checked = {}
        if method == 'email' and normalized and (legacy.get('address') or '').strip().lower() == normalized:
            timestamp = legacy.get('verifiedAt') or legacy.get('at')
            if timestamp and legacy.get('source') and legacy.get('detail'):
                legacy_checked = dict(at=legacy.get('at') or timestamp, result='verified', source=legacy['source'], evidence=legacy['detail'])
                confirmed = confirmed or dict(legacy_checked, at=timestamp, recordedAt=legacy.get('at'))
        checked = record.get('checked') or legacy_checked or confirmed
        if record.get('changedAt') or checked:
            insert('contact_method_evidence', [workspace, contact['id'], method, value, record.get('changedAt'),
                   checked.get('at'), checked.get('result'), checked.get('source'), checked.get('evidence'),
                   checked.get('recordedAt') or checked.get('at'), checked.get('sourceMessageId') or None,
                   confirmed.get('at'), confirmed.get('source'), confirmed.get('evidence'),
                   confirmed.get('recordedAt') or confirmed.get('at'), confirmed.get('sourceMessageId') or None])
subtables={'agency':'project','recruitment':'vacancy','field':'asset','wholesale':'stock_item','property':'property','membership':'membership','saas':'subscription','events':'experience'}
for key,table in subtables.items():
    d=json.loads((args.data_dir/f'{key}.json').read_text())
    insert('workspace',[key,d['config']['brand'],key,'GBP',d['openingCashPence'],d['monthlyCostPence']])
    team={t['name']:t['id'] for t in d['team']}
    for t in d['team']:insert('team_member',[key,t['id'],t['name'],t['title'],t['capacity']])
    for a in d['accounts']:insert('account',[key,a['id'],a['name'],a['segment'],a['region'],team[a['owner']]])
    for o in d['opportunities']:insert('opportunity',[key,o['id'],o['accountId'],o['name'],o['valuePence'],o['stage'],o['probability'],o['closeMonth'],team[o['owner']]])
    for i in d['invoices']:insert('invoice',[key,i['id'],i['accountId'],i['number'],i['totalPence'],i['paidPence'],i['dueMonth'],i['overdueDays'],i['status']])
    for w in d['work']:insert('work_item',[key,w['id'],w['accountId'],team[w['owner']],w['title'],w['status'],w['progress'],w['startWeek'],w['durationWeeks'],w['hours'],w['issue']])
    for n,h in enumerate(d['history']):insert('cash_history',[key,n,h['month'],h['receiptsPence'],h['costsPence'],h['budgetPence']])
    for x in d['domain']:insert(table,[key,x['id'],x['accountId'],x['name'],x['status'],*x['fields'].values()])
    for t in d['team']:insert('employee_profile',[key,t['id'],t['department'],t['tenureMonths'],t['leaveBalanceHours'],t['manager']])
    for l in d['leave']:insert('leave_request',[key,l['id'],l['personId'],l['start'],l['end'],l['status'],l['type'],l['requestedAt'],l['decisionBy']])
    for l in d['lifecycle']:insert('employee_task',[key,l['id'],l['personId'],l['kind'],l['task'],l['due'],l['status'],l['owner']])
    for a in d['automations']:
        insert('automation',[key,a['id'],a['name'],a['ownerId'],a['trigger'],a['status'],a['schedule'],a['version']])
        for n,step in enumerate(a['steps']):insert('automation_step',[key,a['id'],n,step])
    for en in d['enrolments']:insert('sequence_enrolment',[key,en['id'],en['automationId'],en['accountId'],en['ownerId'],en['state'],int(en['processed'])])
    for m in d['outreach']:insert('outreach_event',[key,m['id'],m['ownerId'],m['accountId'],m['automationId'],m['week'],m['source'],m['segment'],m['status'],int(m['replied']),int(m['meeting']),int(m['personalised']),m['reason'],m['responseHours']])
    for r in d['salesResults']:insert('closed_result',[key,r['id'],r['ownerId'],r['accountId'],r['week'],r['source'],r['segment'],r['outcome'],r['valuePence'],r['cycleDays'],r['reason']])
    for b in d['bills']:insert('supplier_bill',[key,b['id'],b['supplier'],b['amountPence'],b['due'],b['status'],b['category']])
    for r in d['risks']:insert('business_risk',[key,r['id'],r['team'],r['title'],r['impact'],r['owner'],r['status']])
    for o in d['opportunities']:insert('pipeline_context',[key,o['id'],o['daysInStage'],o['nextStepDue'],o['forecastCategory']])
    assert db.execute('SELECT SUM(sent) FROM sales_activity_summary WHERE workspace_id=?',[key]).fetchone()[0]==sum(m['status']=='Sent' for m in d['outreach'])
    for c in d['contacts']:
        insert('sales_contact',[key,c['id'],c['accountId'],c['ownerId'],c['name'],c['title'],c['phone'],c['email'],int(c['emailAllowed']),int(c['callAllowed']),c['timezone'],c['need'],c['lastTouch'],c['queueStatus']])
    for m in d.get('crmEmails', []):
        insert('contact_email_message', [key, m['contactId'], m['id'], m['direction'], m['accountId'], m['address'],
               m['subject'], m['body'], m['at'], m.get('status'), m.get('messageId') or None, m.get('replyToId') or None])
    for c in d['contacts']:
        insert_contact_evidence(key, c)
    r=d['callRule'];insert('after_call_rule',[key,r['automationId'],r['trigger'],r['missingEmail'],r['template'],r['body'],int(r['createTask']),int(r['advanceQueue'])])
    for t in d['salesTasks']:insert('sales_task',[key,t['id'],t['contactId'],t['title'],t['due'],t['status'],t['source']])
    for c in d['calls']:
        insert('call_session', [key,c['id'],c['contactId'],c['ownerId'],c['status'],int(c['connected']),
                               c['outcome'],c['notes'],c['nextStep'],c.get('purpose') or None,c.get('opportunityId') or None,
                               c.get('startedAt'),c.get('endedAt'),c.get('loggedAt'),c.get('durationSeconds'),c.get('scheduledTaskId') or None,
                               c.get('pitchResult') or None,c.get('buyerFeedback') or None])
        for note in c.get('addenda', []):
            insert('call_note', [key,note['id'],c['id'],note['authorId'],note['kind'],note['body'],note['at']])
    for t in d['salesTasks']:
        if t.get('kind') == 'Scheduled call':
            insert('scheduled_call', [key,t['id'],t['purpose'],t['scheduledAt'],t['ownerId'],t.get('opportunityId') or None,
                                      None if t['source'] == 'Manual' else t['source'],t.get('completedCallId'),t.get('agenda','')])
    for j in d['callJobs']:insert('call_followup_job',[key,j['id'],j['callId'],j['contactId'],j['status'],j['reason'],j['version'],j['subject'],j['body']])
    for m in d['emailOutbox']:insert('call_email_outbox',[key,m['id'],m['callId'],m['jobId'],m['to'],m['subject'],m['body'],m['status']])
    for m in d['salesMeetings']:insert('sales_meeting',[key,m['id'],m['contactId'],m['title'],m['date'],m['status']])
    for q in d['quotes']:insert('sales_quote',[key,q['id'],q['contactId'],q['amountPence'],q['status']])
    insert('workflow_stock_balance',[key,d['depth']['stock']['onHand'],d['depth']['stock']['reserved']])
    for c in d['depth']['cases']:insert('workflow_case',[key,c['id'],c['workflow'],c['role'],c['recordId'],c['recordLabel'],c['stage'],c['status'],json.dumps(c['values'])])
    for c in d['depth']['cases']:
        for h in c.get('history', []):
            insert('workflow_event',[key,h['id'],c['id'],h['at'],h['actor'],h['action'],h['detail']])
        for a in c.get('artifacts', []):
            insert('workflow_output',[key,a['id'],c['id'],a['type'],a['detail']])
    for h in d['depth'].get('handoffs', []):
        insert('workflow_handoff',[key,h['id'],h['caseId'],h['fromRole'],h['toRole'],h['title'],h['status'],h.get('note','')])
    insert_finance_approvals(db,key,d)
    insert_pipeline_collections(db,key,d)
    insert_commissions(db,key,d)
    expected=sum(i['totalPence']-i['paidPence'] for i in d['invoices'])
    assert db.execute('SELECT SUM(outstanding_pence) FROM account_receivables WHERE workspace_id=?',[key]).fetchone()[0]==expected
    expected=sum(t['allocated'] for t in d['team'])
    assert db.execute('SELECT SUM(allocated_hours) FROM team_allocation WHERE workspace_id=?',[key]).fetchone()[0]==expected
assert not db.execute('PRAGMA foreign_key_check').fetchall()
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
try:
    db.execute("INSERT INTO invoice VALUES ('agency','invalid','saas-a0','invalid',100,0,1,0,'Open')")
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError('Cross-workspace foreign key was incorrectly accepted')
db.commit()
target=args.output
fd,name=tempfile.mkstemp(prefix=target.stem+'-',suffix='.building.sqlite',dir=target.parent)
os.close(fd)
temp=Path(name)
try:
    with sqlite3.connect(temp) as out:
        db.backup(out)
    out.close()
    temp.chmod(target.stat().st_mode & 0o777 if target.exists() else 0o644)
    os.replace(temp,target)
finally:
    temp.unlink(missing_ok=True)
    db.close()
print('Built 8 workspaces. Foreign keys, integrity, dataset aggregates and cross-workspace rejection passed.')
