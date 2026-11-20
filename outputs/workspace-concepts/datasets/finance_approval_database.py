"""Import Studio sign-offs, statement lines, receipt allocations and their audit history."""

def insert_finance_approvals(db, key, data):
    def insert(table, values):
        columns = ','.join('?' for _ in values)
        db.execute(f'INSERT INTO {table} VALUES ({columns})', values)

    opportunities = {row['id']: row for row in data['opportunities']}
    invoices = {row['id']: row for row in data['invoices']}
    lines = {row['id']: row for row in data.get('financeExceptions', [])}
    accounts = {row['id']: row for row in data['accounts']}
    for r in data.get('approvalRequests', []):
        kind, target = r['type'], r['targetId']
        deal = opportunities.get(target) if kind in ('sale', 'discount', 'order') else None
        status = r['status']
        discount = r.get('discount', {})
        price_revision = discount.get('baseRevision', r.get('priceRevision', 0))
        if deal and status == 'approved':
            expected_value = discount['netPence'] if kind == 'discount' else r['valuePence']
            expected_revision = price_revision + (1 if kind == 'discount' else 0)
            if (deal['accountId'] != r['accountId'] or deal['valuePence'] != expected_value
                    or deal.get('pricing', {}).get('revision', 0) != expected_revision):
                status = 'changed'
        insert('approval_request', (
            key, r['id'], kind, r['accountId'], target if deal else None,
            target if kind == 'quote' else None, target if kind == 'delegate' else None,
            r.get('subjectId') if kind == 'delegate' else None, r['requester'], r['reviewer'],
            r.get('reviewerTitle'), r['title'], r['reason'], r['valuePence'], r['status'], status, price_revision,
        ))
        for version, h in enumerate(r['history'], 1):
            customer = h.get('customer', {})
            insert('approval_event', (
                key, r['id'], version, h['at'], h['role'], h['status'], h.get('note', ''),
                h['title'], h['valuePence'], h.get('accountId'), customer.get('name'),
                customer.get('region'), customer.get('segment'),
                h.get('discount', {}).get('baseRevision', h.get('priceRevision', 0)),
            ))
            if kind == 'discount':
                snapshot = h['discount']
                insert('discount_review_snapshot', (
                    key, r['id'], version, snapshot['grossPence'], snapshot['priorPence'],
                    snapshot['rateBps'], snapshot['netPence'],
                ))
    for line in lines.values():
        s = line['source']
        insert('bank_transaction', (
            key, line['id'], s['origin'], s['reference'], s['payer'], s['date'],
            s['amountPence'], s.get('memo', ''), s.get('risk') or None,
        ))
    for r in data['depth'].get('receipts', []):
        invoice_id = r.get('invoiceId')
        account_id = r.get('accountId') or invoices[invoice_id]['accountId']
        source = lines[r['sourceLineId']]['source']['origin'] if r.get('sourceLineId') else 'Manual receipt'
        insert('workflow_receipt', (
            key, r['id'], invoice_id, r['reference'], r['amountPence'], r['status'],
            account_id, source, r.get('bankRef'), r.get('reviewer'),
        ))
    for c in lines.values():
        insert('finance_exception', (
            key, c['id'], c['status'], c.get('accountId'), c.get('invoiceId'), c.get('orderId'),
            c.get('receiptId'), c.get('followUp'), c.get('dispositionRef'), c.get('heldFrom'),
        ))
        for revision, h in enumerate(c['history'], 1):
            insert('finance_exception_event', (
                key, c['id'], revision, h['at'], h['role'], h['action'], h['status'], h['evidence'],
            ))
    for r in accounts.values():
        if r.get('onboardingStatus'):
            insert('customer_onboarding', (key, r['id'], r['onboardingStatus']))
    for r in opportunities.values():
        if 'pricing' in r:
            price = r['pricing']
            insert('opportunity_pricing', (key, r['id'], price['revision'], price['grossPence'],
                                           price['netPence'], price['rateBps']))
        for change in r.get('ownerHistory', []):
            insert('opportunity_owner_change', (
                key, r['id'], change['revision'], change['fromId'], change['toId'],
                change['role'], change['note'], change['at'],
            ))
        if r.get('orderStatus') or r.get('termsStatus'):
            insert('commercial_signoff_state', (key, r['id'], r.get('termsStatus'), r.get('orderStatus')))
