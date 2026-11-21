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

## Account API (UC-01, UC-02, UC-03)

The backend implements UC-01 registration, UC-02 sign-in, and UC-03 sign-out.
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

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | local development value | Signs session tokens; set this outside local development |
| `SESSION_MAX_AGE_SECONDS` | `604800` (7 days) | Session lifetime |
| `MONGO_URI` / `MONGODB_URI` | unset | MongoDB connection string; required unless explicitly using the memory store |
| `MONGO_DB_NAME` | `splitnest` | Database name for MongoDB |
| `USER_STORE` | unset | Set to `memory` only for temporary, non-persistent local data |
| `SEED_DEMO_USER` | `true` | Create the sample account when it is missing |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |

During local development the Vite server proxies `/api` to
`http://127.0.0.1:5000`, so the frontend can use relative API URLs.
