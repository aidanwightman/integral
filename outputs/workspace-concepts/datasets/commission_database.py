"""Import the signed-off and disputed commission lines from one Studio snapshot."""


def insert_commissions(db, key, dataset):
    for invoice in dataset["invoices"]:
        if invoice.get("orderId"):
            db.execute("INSERT INTO invoiced_order VALUES (?,?,?,?)",
                       (key, invoice["id"], invoice["accountId"], invoice["orderId"]))
    commission = dataset.get("commissions")
    if not commission:
        return

    def insert(table, values):
        placeholders = ",".join("?" for _ in values)
        db.execute(f"INSERT INTO {table} VALUES ({placeholders})", values)

    for plan in commission["plans"]:
        insert("commission_plan", (key, plan["id"], plan["name"], commission["revision"],
                                   plan["rate"], plan["bonusPence"], plan["thresholdPence"]))
    for opportunity in dataset.get("opportunities", ()):
        plan_id = opportunity.get("commissionPlanId")
        if plan_id:
            insert("opportunity_commission_package", (key, opportunity["id"], plan_id))
    for team in commission["teams"]:
        insert("commission_team_rule", (key, team["id"], team["name"], team["maxDiscount"], team["repShare"]))
    accounts = {account["name"]: account["id"] for account in dataset["accounts"]}
    for line in commission["deals"]:
        account_id = line.get("accountId") or accounts[line["account"]]
        insert("commission_line", (key, line["id"], account_id, line["owner"], line["package"], line["team"],
                                   line["grossPence"], line["discount"], line["cashPence"], line["refundPence"],
                                   line.get("repShareOverride"), line.get("reviewedRefundPence"),
                                   line.get("approvedRevision"), line.get("approvedPence"), line.get("version", 0)))
        source = line.get("source")
        if source:
            insert("commission_source", (key, line["id"], account_id, source["opportunityId"],
                                         source["reference"], source["valuePence"]))
        for inquiry in line.get("inquiries", ()):
            insert("commission_inquiry", (key, line["id"], inquiry["number"], inquiry["reason"],
                    inquiry["reference"], inquiry["note"], inquiry["raisedBy"], inquiry["openedAt"],
                    inquiry["planRevision"], inquiry["originalRepPence"], inquiry["status"],
                    inquiry.get("decision"), inquiry.get("decisionReference"), inquiry.get("decisionNote"),
                    inquiry.get("resolvedBy"), inquiry.get("resolvedAt"), inquiry.get("reviewedRepPence")))
    for sequence, entry in enumerate(commission["history"]):
        insert("commission_activity", (key, sequence, entry["action"], entry["revision"], entry["at"],
                                       entry.get("kind"), entry.get("actor"), entry.get("lineId"),
                                       entry.get("repBefore"), entry.get("repAfter"), entry.get("totalPence"),
                                       entry.get("status"), entry.get("reason"), entry.get("reference"), entry.get("note")))
        for line_id in entry.get("clearedLines", ()):
            insert("commission_approval_cleared", (key, sequence, line_id))
