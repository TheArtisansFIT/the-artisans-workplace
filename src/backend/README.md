# SplitNest

SplitNest is a shared expense tracker for groups. This repository contains its project documentation, React frontend, and Flask API.

## Prerequisites

- Python 3.10 or newer with `pip`

## Backend setup

Run the following commands from the repository root.

```sh
python -m venv .venv
```

Activate the virtual environment using the command for your shell.

| Shell | Command |
| --- | --- |
| Windows PowerShell | `.\.venv\Scripts\Activate.ps1` |
| macOS or Linux | `source .venv/bin/activate` |

Install the backend dependencies.

```sh
python -m pip install -r src/backend/requirements.txt
```

## Run locally

Copy `.env.example` to `.env` in the repository root, then set `MONGO_URI` to
your MongoDB connection string. For MongoDB Atlas, create a database user, allow
the backend host in Network Access, and replace the example URI; URL-encode
special characters in the username or password. The backend pings MongoDB and
creates a unique index on user email before it starts. It will fail fast if the
database is missing or unreachable instead of silently switching to temporary
storage. User records are mapped to the collection's validated snake_case
fields (`display_name`, `hashed_password`, and `created_at`) and mapped back to
the API's camelCase fields.

From the `src` directory, start the development server.

```sh
cd src
python -m flask --env-file ../.env --app backend.app:create_app run
```

With Flask running, open `http://127.0.0.1:5000/health` in your browser or run this command in another terminal.

```sh
curl -i http://127.0.0.1:5000/health
```

The endpoint returns HTTP `200 OK` and reports which store is active. With
MongoDB configured, it returns `{"status":"ok","storage":"mongodb"}`.

```json
{"status": "ok", "storage": "mongodb"}
```

## Run tests

From the repository root, with the virtual environment active, install the test dependencies and run the suite.

```sh
python -m pip install -r src/backend/requirements-dev.txt
python -m pytest
```

The suite uses Flask's test client and an in-memory test store, so it runs
without starting MongoDB or the API server.

## Account API (UC-01 to UC-04)

The backend implements UC-01 registration, UC-02 sign-in, UC-03 sign-out, and
UC-04 bank details.
Accounts are stored in MongoDB when `MONGO_URI` is configured. Registration
normalizes email addresses, rejects duplicates, hashes passwords, and
authenticates the user immediately. Sign-in verifies the saved password hash.
Sign-out invalidates the server-side session; if the request fails, the
frontend keeps the session and reports the error instead of claiming the user
was signed out. The sample account `minh.le@example.com` / `password123` is
seeded on startup unless `SEED_DEMO_USER=false`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account and return a session token |
| `POST` | `/api/auth/login` | Sign in with email and password |
| `POST` | `/api/auth/logout` | End the current session |
| `GET` | `/api/auth/me` | Return the signed-in profile |
| `GET` | `/api/users/me` | Return the signed-in profile |
| `PUT` / `PATCH` | `/api/users/me/bank-details` | Save or edit bank details |
| `DELETE` | `/api/users/me/bank-details` | Remove saved bank details |

Protected routes expect `Authorization: Bearer <token>`. Passwords are stored
with Werkzeug password hashes, and the token is signed with `SECRET_KEY`.

Registration request:

```json
{
  "displayName": "Minh",
  "email": "minh@example.com",
  "password": "password123"
}
```

Successful registration and sign-in responses:

```json
{
  "token": "<signed token>",
  "user": {
    "id": "usr_…",
    "displayName": "Minh",
    "email": "minh@example.com",
    "memberSince": "2026-11-21",
    "bankDetails": null
  }
}
```

Bank details request:

```json
{
  "bankName": "Vietcombank",
  "accountNumber": "0123456789",
  "accountHolder": "LE QUANG MINH"
}
```

Errors use a consistent shape, with field messages when validation fails:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Please correct the highlighted fields.",
    "fields": {"password": "Use at least 6 characters."}
  }
}
```

## Group API (UC-05)

`POST /api/groups` creates a private group for the signed-in user. The creator
is recorded as the active organizer, and an initial invitation is created in
the same operation. Group data is stored in the `groups`, `group_memberships`,
and `group_invitations` collections.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/groups` | Create a private group |

The request accepts a required `name` (2-100 characters) and an optional
`description` (up to 200 characters).

```json
{
  "name": "Da Lat trip 2026",
  "description": "A long weekend with shared food and coffee."
}
```

Successful response:

```json
{
  "group": {
    "id": "grp_…",
    "name": "Da Lat trip 2026",
    "description": "A long weekend with shared food and coffee.",
    "creatorId": "usr_…",
    "maxMember": 50,
    "createdAt": "2026-11-24T10:00:00+00:00",
    "memberIds": ["usr_…"],
    "invitation": {
      "joinCode": "4f2c9a1b7d",
      "durationDays": 7,
      "createdAt": "2026-11-24T10:00:00+00:00",
      "expiresAt": "2026-12-01T10:00:00+00:00"
    }
  }
}
```

The response does not include any user's bank details. Protected group routes
expect `Authorization: Bearer <token>`.

## Group invitations and members (UC-06 to UC-08)

These routes implement sharing an invitation, previewing it before joining, and
listing active group members. The frontend still uses seed data for these
screens; wiring to the API is pending.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/groups/{groupId}/invitation` | Organizer fetches the join code, link, and expiry |
| `GET` | `/api/invitations/{joinCode}` | Preview the group for a signed-in user |
| `POST` | `/api/invitations/{joinCode}/join` | Join, rejoin, or confirm an active membership |
| `GET` | `/api/groups/{groupId}/members` | List active members for an active member |

Only an active organizer can fetch a group's invitation. The response supplies
a `joinLink` built from `PUBLIC_APP_URL`; the frontend can encode that link into
a QR code, so the backend does not depend on a QR library.

```json
{
  "invitation": {
    "groupId": "grp_…",
    "joinCode": "4f2c9a1b7d",
    "joinLink": "http://localhost:5173/join/4f2c9a1b7d",
    "durationDays": 7,
    "createdAt": "2026-11-24T10:00:00+00:00",
    "expiresAt": "2026-12-01T10:00:00+00:00",
    "isExpired": false
  }
}
```

Any signed-in user can preview a valid invitation. The preview exposes only the
group name, description, creator, and member count. Unknown and expired codes
both return `404 not_found` without group data.

Joining returns `201` with a new active membership, or `200` when the caller is
already an active member. A former member who rejoins gets a new active
membership while the old `Left`/`Removed` record is preserved. Membership, join,
and member-list responses never include bank details.

The member list is ordered organizer first, then by join time and membership ID.
Only `Active` memberships appear, and emails are included but never bank details:

```json
{
  "members": [
    {
      "membershipId": "mem_…",
      "userId": "usr_…",
      "displayName": "Minh",
      "email": "minh@example.com",
      "role": "Organizer",
      "status": "Active",
      "joinedAt": "2026-11-24T10:00:00+00:00"
    }
  ]
}
```

## Expense API (UC-09 to UC-11)

The expense endpoints let group members record shared expenses, view an
expense's details with each participant's share and repayment obligation, and
edit or delete an expense while it remains unlocked. Expenses are stored in the
`expenses` collection and each non-payer participant's share is stored as a
repayment obligation in the `repayment_obligations` collection. Amounts are
whole VND and are split equally, with leftover đồng assigned one by one in
participant order. A participant with a zero share still gets an obligation.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/groups/<group_id>/expenses` | Record a shared expense (UC-09) |
| `GET` | `/api/groups/<group_id>/expenses` | List a group's expenses |
| `GET` | `/api/groups/<group_id>/expenses/<expense_id>` | View expense details (UC-10) |
| `PUT` | `/api/groups/<group_id>/expenses/<expense_id>` | Edit an expense (UC-11) |
| `DELETE` | `/api/groups/<group_id>/expenses/<expense_id>` | Delete an expense (UC-11) |

The create request accepts a required `description` (up to 120 characters),
`amount` (whole đồng greater than 0), `date` (YYYY-MM-DD), `paidBy` (a group
member), and `participantIds` (at least one group member). Only active members
can read or record expenses. The response includes the expense and its
repayment obligations:

```json
{
  "expense": {
    "id": "exp_…",
    "groupId": "grp_…",
    "description": "Dinner at Bánh Xèo 46A",
    "amount": 150000,
    "date": "2026-10-25",
    "paidBy": "usr_…",
    "participantIds": ["usr_…", "usr_…"],
    "createdBy": "usr_…",
    "createdAt": "2026-10-25T19:42:00+00:00",
    "locked": false,
    "obligations": [
      {
        "id": "obg_…",
        "expenseId": "exp_…",
        "debtorId": "usr_…",
        "creditorId": "usr_…",
        "amount": 75000,
        "status": "unpaid",
        "createdAt": "2026-10-25T19:42:00+00:00"
      }
    ]
  }
}
```

An expense can only be edited or deleted by its creator, and only while it is
unlocked (no repayment request exists for it). Protected routes expect
`Authorization: Bearer <token>`.

In MongoDB, obligation statuses are stored as `Outstanding`, `Pending
Confirmation`, and `Confirmed`; the API maps them to `unpaid`, `pending`, and
`paid`.

## Data model note

Application-generated identifiers are strings (`usr_...`, `grp_...`, and so
on). MongoDB `_id` values and every reference field such as `creator_id`,
`group_id`, `user_id`, `expense_id`, and `debtor_id` must use
`bsonType: "string"` in the collection validators. This matches the string user
IDs already used by `MongoUserStore` and the UUID-style identifiers in the PA3
data model.

The validators were previously inconsistent: some records expected MongoDB
`ObjectId` values while the backend generated string IDs. All reference fields
now use strings. `src/database/initialize.py` refreshes validators on existing
collections with `collMod`; if an existing development database has documents
that violate the new schema, drop and recreate it before rerunning the script.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | local development value | Signs session tokens; set this outside local development |
| `SESSION_MAX_AGE_SECONDS` | `604800` (7 days) | Session lifetime |
| `MONGO_URI` / `MONGODB_URI` | unset | MongoDB connection string; required unless explicitly using the memory store |
| `MONGO_DB_NAME` | `splitnest` | Database name for MongoDB |
| `GROUP_INVITATION_DURATION_DAYS` | `7` | Validity period of a newly created group invitation |
| `GROUP_MAX_MEMBER` | `50` | Member capacity stored when a group is created |
| `PUBLIC_APP_URL` | `http://localhost:5173` | Base URL used to build invitation join links |
| `USER_STORE` | unset | Set to `memory` only for temporary, non-persistent local data |
| `SEED_DEMO_USER` | `true` | Create the sample account when it is missing |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |

During local development the Vite server proxies `/api` to
`http://127.0.0.1:5000`, so the frontend can use relative API URLs.
