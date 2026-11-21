from flask.testing import FlaskClient


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def save_bank_details(client: FlaskClient, token: str, **overrides):
    payload = {
        "bankName": "Vietcombank",
        "accountNumber": "0123456789",
        "accountHolder": "LE QUANG MINH",
        **overrides,
    }
    return client.put(
        "/api/users/me/bank-details",
        json=payload,
        headers=auth_header(token),
    )


def test_bank_details_require_authentication(client: FlaskClient) -> None:
    response = client.put(
        "/api/users/me/bank-details",
        json={
            "bankName": "Vietcombank",
            "accountNumber": "0123456789",
            "accountHolder": "LE QUANG MINH",
        },
    )

    assert response.status_code == 401


def test_user_can_save_and_view_bank_details(
    client: FlaskClient, register_user
) -> None:
    session = register_user()
    token = session["token"]

    saved = save_bank_details(client, token)

    assert saved.status_code == 200
    assert saved.get_json()["user"]["bankDetails"] == {
        "bankName": "Vietcombank",
        "accountNumber": "0123456789",
        "accountHolder": "LE QUANG MINH",
    }

    me = client.get("/api/users/me", headers=auth_header(token))
    assert me.get_json()["user"]["bankDetails"]["bankName"] == "Vietcombank"


def test_user_can_edit_bank_details(client: FlaskClient, register_user) -> None:
    token = register_user()["token"]

    save_bank_details(client, token)
    response = save_bank_details(client, token, bankName="MB Bank")

    assert response.status_code == 200
    assert response.get_json()["user"]["bankDetails"]["bankName"] == "MB Bank"


def test_bank_details_are_saved_as_a_complete_set(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    response = save_bank_details(client, token, accountHolder="")

    assert response.status_code == 400
    fields = response.get_json()["error"]["fields"]
    assert fields == {"accountHolder": "Enter the account holder name."}


def test_bank_details_reject_short_account_number(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]

    response = save_bank_details(client, token, accountNumber="123")

    assert response.status_code == 400
    assert "accountNumber" in response.get_json()["error"]["fields"]


def test_user_can_remove_bank_details(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]
    save_bank_details(client, token)

    response = client.delete(
        "/api/users/me/bank-details", headers=auth_header(token)
    )

    assert response.status_code == 200
    assert response.get_json()["user"]["bankDetails"] is None
    assert client.get(
        "/api/users/me", headers=auth_header(token)
    ).get_json()["user"]["bankDetails"] is None


def test_bank_details_cannot_be_edited_after_sign_out(
    client: FlaskClient, register_user
) -> None:
    token = register_user()["token"]
    client.post("/api/auth/logout", headers=auth_header(token))

    response = save_bank_details(client, token)

    assert response.status_code == 401
