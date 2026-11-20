"""Import one synthetic workspace's collections and pipeline evidence into SQLite."""


def insert_pipeline_collections(db, key, d):
    """Require preloaded source records and leave the transaction with the caller."""
    people = {member['name']: member['id'] for member in d['team']}

    def add(table, *values):
        params = (key, *values)
        db.execute(f"INSERT INTO {table} VALUES ({','.join('?' for _ in params)})", params)

    def owner_id(name):
        return people[name] if name else None

    stages = d['config']['stages']
    for ordinal, stage in enumerate(stages):
        add('opportunity_stage_definition', ordinal, stage)

    for o in d['opportunities']:
        evidence = o.get('pipelineEvidence', {})
        for ordinal, stage in enumerate(stages):
            value = evidence.get(f'evidence{ordinal}')
            if value:
                add('opportunity_stage_requirement', o['id'], stage, value)
        held = o.get('heldStage')
        if held:
            add('opportunity_stage_hold', o['id'], held['to'], held['reason'])
        if any(evidence.get(k) for k in ('meetingLink', 'inviteRef', 'response', 'chaseOwner', 'chaseDue')):
            add('opportunity_invitation', o['id'], evidence.get('meetingLink') or None,
                evidence.get('inviteRef') or None, evidence.get('response') or 'Not recorded',
                owner_id(evidence.get('chaseOwner')), evidence.get('chaseDue') or None, evidence.get('revision', 0))

    stage_revisions = {}
    for a in reversed(d.get('activity', [])):
        if a['action'] not in ('Stage held', 'Stage evidence updated', 'Stage changed') or not a.get('opportunityId'):
            continue
        opp_id = a['opportunityId']
        revision = stage_revisions.get(opp_id, 0) + 1
        add('opportunity_stage_activity', opp_id, revision, a['action'], a['stage'], a['at'], a['actor'], a['detail'])
        stage_revisions[opp_id] = revision

    for source, records in [('invoice', d['invoices']), ('bill', d['bills'])]:
        for r in records:
            case = r['id']
            invoice = source == 'invoice'
            add('collection_case', case, case if invoice else None, None if invoice else case,
                r.get('eventId'), owner_id(r.get('financeOwner')), r.get('dueDate') if invoice else None,
                None if invoice else r.get('number'))
            collection = r.get('collection', {})
            history = collection.get('history', [])
            active_promise = collection.get('promise')
            current_revision = next((n for n, e in reversed(list(enumerate(history, 1)))
                                     if active_promise and e.get('promise') == active_promise), None)
            dispute_revision = None
            for revision, event in enumerate(history, 1):
                action = event['action']
                add('collection_followup', case, revision, action, event['at'], event.get('channel') or None,
                    event['note'], event['nextAction'], people[event['owner']], event['nextDue'])
                if action == 'promise':
                    p = event['promise']
                    add('collection_payment_promise', case, revision, p['date'], p['amountPence'],
                        p['paidAtPromise'], int(revision == current_revision))
                elif action == 'dispute':
                    if dispute_revision is not None:
                        raise ValueError(f'Unresolved dispute on {case} before revision {revision}')
                    dispute_revision = revision
                elif action == 'resolve':
                    if dispute_revision is None:
                        raise ValueError(f'Dispute resolution without an opening on {case}')
                    add('collection_dispute', case, dispute_revision, revision)
                    dispute_revision = None
                elif action == 'reminder':
                    draft = event['draft']
                    add('collection_reminder_draft', case, revision, draft['subject'], draft['body'])
            if dispute_revision is not None:
                add('collection_dispute', case, dispute_revision, None)
