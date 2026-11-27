# SplitNest frontend

SplitNest is a shared-expense manager for small groups. The React application
uses the Flask REST API for account registration, sign-in, sign-out, and bank
details; MongoDB provides persistent account storage.

## Stack

- React 19 + Vite
- JavaScript / JSX
- React Router DOM
- Plain CSS (tokens, reusable components, screen styles)
- Lucide React icons

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app on <http://localhost:5173>. To check the production bundle:

```bash
npm run build
npm run preview
```

## Demo account

The Flask API seeds a sample account: `minh.le@example.com` / `password123`.
Configure MongoDB as described in `src/backend/README.md`, then start the
backend and frontend:

```bash
# terminal 1, from src
python -m flask --env-file ../.env --app backend.app:create_app run

# terminal 2, from the repository root
cd src/frontend
npm run dev
```

Register creates a MongoDB-backed account, duplicate emails are rejected, and
sign-out invalidates the server session. Sessions are stored in
`localStorage` under `splitnest.token` (or `sessionStorage` when “Remember me”
is unchecked), and the user snapshot is stored under `splitnest.session`.

## Screens and routes

| Screen | Route |
| --- | --- |
| Login | `/login` |
| Register | `/register` |
| Group list / dashboard | `/groups` |
| Create group (modal) | `/groups/new` |
| Group workspace: expenses | `/groups/:groupId?tab=expenses` |
| Group workspace: debts & settlements | `/groups/:groupId?tab=debts` |
| Group workspace: members & invite | `/groups/:groupId?tab=members` |
| Expense detail (modal) | `/groups/:groupId/expenses/:expenseId` |
| Add / edit expense (modal) | `/groups/:groupId/expenses/new`, `/groups/:groupId/expenses/:expenseId/edit` |
| Debt detail and repayment (modal) | `/groups/:groupId/debts/:debtId` |
| Join group by invite | `/join/:inviteToken` |
| Profile & bank details | `/profile` |

A reusable demo invite is available at `/join/HoiAn2026`.

## Project structure

```
components/
  groups/     Expense, debt, and member tab content
  layout/     App shell, auth layout, protected routes, brand
  modals/     Route-backed create/edit/detail dialogs
  ui/         Buttons, fields, modals, notices, avatars, QR placeholder
context/      Auth and in-memory data providers
data/         Seed groups, members, expenses, debts, and bank details
pages/        Route-level screens
services/     HTTP, auth, group, expense, debt, member, profile, and storage logic
styles/       Design tokens plus base, layout, component, and screen CSS
utils/        Formatting, selectors, equal splitting, QR placeholder
App.jsx       Route table
main.jsx      App entry point and provider setup
```

## Data and API integration

Authentication, sessions and bank details use the Flask API through
`services/httpClient.js` and `services/authService.js`. Group, expense, debt,
member and profile behavior is isolated in their respective services; those
services currently use `data/seedData.js` as a local mock source.
`context/DataContext.jsx` coordinates UI state and delegates domain operations
to those services. The working copy is persisted in `localStorage` as one record
per group, expense and debt under the `splitnest.data.v2.*` keys, so a refresh
does not discard a demo session and adding one record does not rewrite the
whole data model. Data saved by older builds under `splitnest.data.v1` is
migrated automatically. To reset the demo, clear site data for
`localhost:5173`.

The Vite dev server proxies `/api` to `http://127.0.0.1:5000`. Set
`VITE_API_BASE_URL` to point at a different API origin. Replace the mock
implementations in `groupService.js`, `expenseService.js`,
and `debtService.js` with API calls as the group, expense, debt and history
endpoints are added. VietQR rendering is an illustrative local
placeholder and should be replaced with a valid VietQR payload during that
integration.

## Notes

- The layout is desktop-first with tablet and mobile breakpoints. Wide tables
  scroll inside their own container on small screens.
- Modals are route-backed, so browser back/forward and deep links work.
- Expense editing locks once a repayment request exists, matching the intended
  settlement rules.
