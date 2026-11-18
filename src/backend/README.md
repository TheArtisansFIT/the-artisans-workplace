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
