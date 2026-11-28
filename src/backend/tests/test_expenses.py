"""Tests for the UC-09 / UC-10 / UC-11 expense API.

UC-09 Record shared expense        -> POST /api/groups/<group_id>/expenses
UC-10 View expense details         -> GET  /api/groups/<group_id>/expenses/<expense_id>
UC-11 Edit / Delete expense        -> PUT  /api/groups/<group_id>/expenses/<expense_id>
                                    -> DELETE /api/groups/<group_id>/expenses/<expense_id>
"""

import pytest
from bson.int64 import Int64

from backend.store import MongoExpenseStore, MongoGroupStore


def create_expense(client, payload, headers):
    return client.post(
        "/api/groups/grp_test/expenses", json=payload, headers=headers
    )


def test_mongo_expense_document_uses_database_schema():
    expense = {
        "id": "exp_test",
        "groupId": "grp_test",
        "description": "Dinner",
        "amount": 150000,
        "date": "2026-10-25",
        "paidBy": "usr_creditor",
        "participantIds": ["usr_debtor", "usr_creditor"],
        "createdBy": "usr_creator",
        "createdAt": "2026-10-25T19:42:00+00:00",
        "locked": False,
    }

    document = MongoExpenseStore._to_expense_document(expense)

    assert document["description"] == "Dinner"
    assert document["total_amount"] == 150000
    assert isinstance(document["total_amount"], Int64)
    assert document["creator_id"] == "usr_creator"
    assert document["creditor_id"] == "usr_creditor"
    assert document["group_id"] == "grp_test"
    assert document["_id"] == "exp_test"
    assert "id" not in document
    assert "amount" not in document
    assert "created_by" not in document
    assert "paid_by" not in document


def test_mongo_group_documents_include_validator_ids():
    group = {
        "id": "grp_test",
        "name": "Test group",
        "description": "",
        "creatorId": "usr_test",
        "maxMember": 50,
        "createdAt": "2026-10-25T19:42:00+00:00",
    }
    membership = {
        "id": "mem_test",
        "groupId": "grp_test",
        "userId": "usr_test",
        "role": "Organizer",
        "status": "Active",
        "createdAt": "2026-10-25T19:42:00+00:00",
    }
    invitation = {
        "id": "inv_test",
        "joinCode": "abc123",
        "groupId": "grp_test",
        "durationDays": 7,
        "createdAt": "2026-10-25T19:42:00+00:00",
    }

    group_document = MongoGroupStore._to_group_document(group)
    membership_document = MongoGroupStore._to_membership_document(membership)
    invitation_document = MongoGroupStore._to_invitation_document(invitation)

    assert group_document["_id"] == "grp_test"
    assert "id" not in group_document
    assert membership_document["_id"] == "mem_test"
    assert "id" not in membership_document
    assert invitation_document["_id"] == "inv_test"
    assert "id" not in invitation_document


def test_create_expense_uc09(client, auth_headers, expense_payload):
    response = create_expense(client, expense_payload, auth_headers)
    assert response.status_code == 201

    body = response.get_json()
    expense = body["expense"]
    assert expense["id"].startswith("exp_")
    assert expense["groupId"] == "grp_test"
    assert expense["description"] == "Dinner at B\u00e1nh X\u1ecfo 46A"
    assert expense["amount"] == 150000
    assert expense["date"] == "2026-10-25"
    assert expense["paidBy"] == "usr_test"
    assert expense["participantIds"] == ["usr_test", "usr_other"]
    assert expense["createdBy"] == "usr_test"
    assert expense["createdAt"]
    assert expense["locked"] is False

    obligations = body["expense"]["obligations"]
    assert len(obligations) == 1
    obligation = obligations[0]
    assert obligation["expenseId"] == expense["id"]
    assert obligation["debtorId"] == "usr_other"
    assert obligation["creditorId"] == "usr_test"
    assert obligation["amount"] == 75000
    assert obligation["status"] == "unpaid"
    assert obligation["createdAt"]


def test_create_expense_split_distributes_remainder(client, auth_headers, expense_payload):
    payload = dict(
        expense_payload,
        amount=100000,
        participantIds=["usr_test", "usr_other"],
        paidBy="usr_other",
    )
    response = create_expense(client, payload, auth_headers)
    assert response.status_code == 201
    obligations = response.get_json()["expense"]["obligations"]
    amounts = {o["debtorId"]: o["amount"] for o in obligations}
    # usr_other paid, so only usr_test owes a share.
    assert amounts == {"usr_test": 50000}


def test_create_expense_payer_can_be_another_member(client, auth_headers, expense_payload):
    payload = dict(expense_payload, paidBy="usr_other")
    response = create_expense(client, payload, auth_headers)
    assert response.status_code == 201
    expense = response.get_json()["expense"]
    assert expense["paidBy"] == "usr_other"
    obligations = response.get_json()["expense"]["obligations"]
    assert len(obligations) == 1
    assert obligations[0]["debtorId"] == "usr_test"
    assert obligations[0]["creditorId"] == "usr_other"


def test_create_expense_rejects_validation_errors(
    client, auth_headers, expense_payload
):
    cases = [
        ({**expense_payload, "description": ""}, "description"),
        ({**expense_payload, "amount": 0}, "amount"),
        ({**expense_payload, "amount": -5}, "amount"),
        ({**expense_payload, "date": "25-10-2026"}, "date"),
        ({**expense_payload, "paidBy": "usr_stranger"}, "paidBy"),
        (
            {**expense_payload, "participantIds": ["usr_stranger"]},
            "participantIds",
        ),
        ({**expense_payload, "participantIds": []}, "participantIds"),
    ]
    for payload, field in cases:
        response = create_expense(client, payload, auth_headers)
        assert response.status_code == 400, payload
        body = response.get_json()
        assert body["error"]["code"] == "validation_error"
        assert field in body["error"]["fields"], (payload, body)


def test_create_expense_requires_group_membership(
    client, auth_headers, expense_payload
):
    response = client.post(
        "/api/groups/grp_missing/expenses", json=expense_payload, headers=auth_headers
    )
    assert response.status_code == 404


def test_create_expense_requires_auth(client, expense_payload):
    response = create_expense(client, expense_payload, {})
    assert response.status_code == 401


def test_list_expenses(client, auth_headers, expense_payload):
    create_expense(client, expense_payload, auth_headers)
    response = client.get("/api/groups/grp_test/expenses", headers=auth_headers)
    assert response.status_code == 200
    body = response.get_json()
    assert len(body["expenses"]) == 1
    assert body["expenses"][0]["description"] == expense_payload["description"]

    response = client.get("/api/groups/grp_missing/expenses", headers=auth_headers)
    assert response.status_code == 404


def test_get_expense_detail_uc10(client, auth_headers, expense_payload):
    created = create_expense(client, expense_payload, auth_headers)
    expense_id = created.get_json()["expense"]["id"]

    response = client.get(
        f"/api/groups/grp_test/expenses/{expense_id}", headers=auth_headers
    )
    assert response.status_code == 200
    body = response.get_json()
    expense = body["expense"]
    assert expense["id"] == expense_id
    assert "obligations" in body["expense"]
    assert len(body["expense"]["obligations"]) == 1
    assert body["expense"]["obligations"][0]["status"] == "unpaid"


def test_get_expense_not_found(client, auth_headers):
    response = client.get(
        "/api/groups/grp_test/expenses/exp_missing", headers=auth_headers
    )
    assert response.status_code == 404


def test_update_expense_uc11_by_creator(client, auth_headers, expense_payload):
    created = create_expense(client, expense_payload, auth_headers)
    expense_id = created.get_json()["expense"]["id"]

    response = client.put(
        f"/api/groups/grp_test/expenses/{expense_id}",
        json={"description": "Updated dinner", "amount": 200000},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.get_json()
    expense = body["expense"]
    assert expense["description"] == "Updated dinner"
    assert expense["amount"] == 200000
    assert expense["date"] == expense_payload["date"]
    assert expense["paidBy"] == expense_payload["paidBy"]
    assert len(body["expense"]["obligations"]) == 1
    assert body["expense"]["obligations"][0]["amount"] == 100000


def test_update_expense_rejects_non_creator(
    client, auth_headers, other_auth_headers, expense_payload
):
    created = create_expense(client, expense_payload, auth_headers)
    expense_id = created.get_json()["expense"]["id"]

    response = client.put(
        f"/api/groups/grp_test/expenses/{expense_id}",
        json={"description": "Hacked"},
        headers=other_auth_headers,
    )
    assert response.status_code == 403


def test_update_expense_rejects_validation(
    client, auth_headers, expense_payload
):
    created = create_expense(client, expense_payload, auth_headers)
    expense_id = created.get_json()["expense"]["id"]

    response = client.put(
        f"/api/groups/grp_test/expenses/{expense_id}",
        json={"amount": -100},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "amount" in response.get_json()["error"]["fields"]


def test_delete_expense_uc11_by_creator(client, auth_headers, expense_payload):
    created = create_expense(client, expense_payload, auth_headers)
    expense_id = created.get_json()["expense"]["id"]

    response = client.delete(
        f"/api/groups/grp_test/expenses/{expense_id}", headers=auth_headers
    )
    assert response.status_code == 204

    response = client.get(
        f"/api/groups/grp_test/expenses/{expense_id}", headers=auth_headers
    )
    assert response.status_code == 404


def test_delete_expense_rejects_non_creator(
    client, auth_headers, other_auth_headers, expense_payload
):
    created = create_expense(client, expense_payload, auth_headers)
    expense_id = created.get_json()["expense"]["id"]

    response = client.delete(
        f"/api/groups/grp_test/expenses/{expense_id}", headers=other_auth_headers
    )
    assert response.status_code == 403


def test_create_expense_keeps_zero_share_obligation(client, auth_headers, expense_payload):
    # 1 dong split between two members: the payer takes the remainder and the
    # other participant's share is 0, but an obligation is still created.
    payload = dict(expense_payload, amount=1, paidBy="usr_test")
    response = create_expense(client, payload, auth_headers)
    assert response.status_code == 201
    obligations = response.get_json()["expense"]["obligations"]
    assert len(obligations) == 1
    assert obligations[0]["debtorId"] == "usr_other"
    assert obligations[0]["amount"] == 0


def test_mongo_obligation_document_uses_database_schema():
    obligation = {
        "id": "obg_test",
        "expenseId": "exp_test",
        "debtorId": "usr_debtor",
        "creditorId": "usr_creditor",
        "amount": 75000,
        "status": "unpaid",
        "createdAt": "2026-10-25T19:42:00+00:00",
    }

    document = MongoExpenseStore._to_obligation_document(obligation)

    assert document["_id"] == "obg_test"
    assert document["share_amount"] == 75000
    assert isinstance(document["share_amount"], Int64)
    assert document["status"] == "Outstanding"
    assert "amount" not in document
    assert "debtor_id" in document and "creditor_id" in document

    restored = MongoExpenseStore._to_obligation(document)
    assert restored["status"] == "unpaid"
    assert restored["amount"] == 75000


def test_delete_expense_not_found(client, auth_headers):
    response = client.delete(
        "/api/groups/grp_test/expenses/exp_missing", headers=auth_headers
    )
    assert response.status_code == 404
