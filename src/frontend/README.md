# SplitNest frontend

Frontend skeleton for SplitNest, a shared-expense manager for small groups. It
implements the ten required screens as a navigable React application so flows can
be reviewed before the Flask REST API and MongoDB Atlas layer are added.

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

The login form is prefilled with `minh.le@example.com` / `password123`.
Any valid email and password of at least 6 characters also work. Use
`wrongpass` to preview the invalid-credentials state. Registering with
`taken@example.com` previews the duplicate-email state.

Sessions are stored in `localStorage` under `splitnest.session`.

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
src/
  components/
    groups/     Expense, debt, and member tab content
    layout/     App shell, auth layout, protected routes, brand
    ui/         Buttons, fields, modals, notices, avatars, QR placeholder
  context/      Auth and in-memory data providers
  data/         Seed groups, members, expenses, debts, and bank details
  modals/       Route-backed create/edit/detail dialogs
  pages/        Route-level screens
  styles/       Design tokens plus base, layout, component, and screen CSS
  utils/        Formatting, selectors, equal splitting, QR placeholder
```

## Data and API integration

`src/data/mockData.js` and `src/context/DataContext.jsx` are the temporary
frontend data layer. The working copy (groups, expenses, debts, and bank
details) is persisted in `localStorage` under `splitnest.data.v1` so a refresh
does not discard a demo session, while the session itself lives under
`splitnest.session`. To reset the demo, clear site data for `localhost:5173`.

When the Flask REST API is ready, replace the actions in `DataContext.jsx` with
`fetch` calls and map API responses onto the existing object shapes. Screen
components should not need structural changes. VietQR rendering is an
illustrative local placeholder and should be replaced with a valid VietQR
payload during that integration.

## Notes

- The layout is desktop-first with tablet and mobile breakpoints. Wide tables
  scroll inside their own container on small screens.
- Modals are route-backed, so browser back/forward and deep links work.
- Expense editing locks once a repayment request exists, matching the intended
  settlement rules.
