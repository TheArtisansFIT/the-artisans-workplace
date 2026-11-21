# SplitNest

SplitNest is a shared expense tracker for groups. This repository contains its project documentation and Flask backend. The backend skeleton (WBS 5.1.1) exposes a health endpoint that verifies the Flask app is running.

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

From the `src` directory, start the development server.

```sh
cd src
python -m flask --app backend.app:create_app run
```

With Flask running, open `http://127.0.0.1:5000/health` in your browser or run this command in another terminal.

```sh
curl -i http://127.0.0.1:5000/health
```

The endpoint returns HTTP `200 OK` and this JSON response.

```json
{"status": "ok"}
```

## Run tests

From the repository root, with the virtual environment active, install the test dependencies and run the suite.

```sh
python -m pip install -r src/backend/requirements-dev.txt
python -m pytest
```

The suite uses Flask's test client and runs without starting a server.

## Account API (UC-01, UC-02, UC-03)

The backend now implements registration, sign-in, sign-out and the bank details
shown on the Profile screen. Development uses an in-memory user store, and the
sample account `minh.le@example.com` / `password123` is seeded on startup.

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
| `MONGO_URI` / `MONGODB_URI` | unset | Use the MongoDB Atlas `users` collection instead of memory |
| `MONGO_DB_NAME` | `splitnest` | Database name for MongoDB |
| `SEED_DEMO_USER` | `true` | Create the sample account when it is missing |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |

During local development the Vite server proxies `/api` to
`http://127.0.0.1:5000`, so the frontend can use relative API URLs.
