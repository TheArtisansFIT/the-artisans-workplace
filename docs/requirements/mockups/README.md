# SplitNest website mockups (PA2, WBS 2.4.1–2.4.3)

Static, desktop-first **website** mockups for the Account, Group and invite, Expense, Debt, VietQR, and History screens. Open any `.html` file in a modern browser. No build step, package install or internet connection is needed.

| File | WBS | Screens | Feature |
|---|---|---|---|
| [account.html](account.html) | 2.4.1 Account | A1 Sign up, A2 Sign in, A3 Bank details (not saved), A4 Bank details (saved) | F01 |
| [group-invite.html](group-invite.html) | 2.4.2 Group and invite screens (includes QR join) | G1 My groups, G2 Create group, G3 Group members, G4 Invite (link and QR), G5 Join (signed in), G6 Join (signed out), G7 Invalid link | F02 |
| [expense.html](expense.html) | 2.4.3 Expense screens | E1 Expenses list, E2 Add expense, E3 Validation errors, E4 Expense detail, E5 Locked expense, E6 Delete confirmation | F03, with repayment status chips for F04 |
| [debt.html](debt.html) | 2.4.4 Debt screens | D1 Debt list, D2 Report repayment, D3 Review repayment, D4 Confirmed, D5 Rejected | F04 |
| [vietqr.html](vietqr.html) | VietQR screens | Q1 Payment details, Q2 Generated VietQR | F05 |
| [history.html](history.html) | History screens | H1 All activity, H2 Repayment filter | F06 |

## Main use case coverage

| Screen | Related use case(s) | Mockup / prototype flow |
|---|---|---|
| Account | UC01 Register Account, UC02 Sign In, UC03 Save Bank Details | A1 → A2 → A3 → A4 |
| Group | UC04 Create Group, UC05 Invite Members, UC06 Join Group, UC07 View Group Members | G1 → G2 → G3 → G4 → G5/G6/G7 |
| Expense | UC08 Record Shared Expense, UC13 Edit Expense, UC14 Delete Expense | E1 → E2/E3 → E4/E5 → E6 |
| Debt | UC09 View Debts, UC10 Report Repayment, UC11 Confirm Repayment, UC12 Reject Repayment | D1 → D2 → D3 → D4/D5 |
| VietQR | UC15 Generate VietQR | Q1 → Q2 |
| History | UC16 View History and Summary | H1 → H2 |

## Basic accessibility checks

- **Contrast:** primary teal `#167D75` on white and white on primary teal meet WCAG AA for normal text. Body and secondary text use dark blue-grey tones on light surfaces. Statuses use text labels in addition to colour.
- **Labels:** form controls have persistent visible labels; supporting text and errors are connected with `aria-describedby`. QR graphics have accessible names. Dialogs have programmatic titles.
- **Keyboard:** links, buttons and fields use native HTML controls, logical DOM order and a visible `:focus-visible` outline. Primary actions are at least 43px high; tables reflow horizontally on narrow screens.
- **Prototype note:** Figma hotspots supplement keyboard-focus testing in the HTML artefacts; Figma presentation mode itself does not replace an implementation-level accessibility audit.

## Viewing and implementation notes

- The main mockups use desktop browser frames and web navigation, not phone frames. CSS breakpoints also adapt the layouts to tablet and narrow browser windows.
- `mockup.css` contains the shared design system: colours, typography, spacing, forms, tables, dialogs and responsive rules.
- Links between screens make the main flows navigable. Buttons that would require application state are visual only.
- These static HTML/CSS artefacts are requirements mockups. The implementation stack remains React + JavaScript on the frontend, Flask + Python on the backend, and MongoDB Atlas, as specified in PA0/PA1.
- UI copy is in English. Sample names and bank details are Vietnamese, and amounts are whole VND with comma separators, for example `150,000 VND`.
- Sample data: the user is Minh. The group “Đà Lạt trip 2026” has Minh (organizer), Lan, Huy and Thu.
- The invite link uses the placeholder domain `splitnest.example`. The QR encodes that link, but the link does not resolve.
- PNG exports of each complete mockup board are in [`png/`](png/).

## Assumptions to confirm

1. Sign-up asks for display name, email and password only. Bank details are added later.
2. Bank details are saved all at once. Save stays disabled until all three fields are filled because VietQR (F05) needs the complete set.
3. Users can remove saved bank details. F01 does not explicitly mention removal.
4. An expense needs a description. The date defaults to today.
5. A new expense initially selects every group member under “Split equally between.” E2 shows Thu unchecked because the user changed it.
6. Edit uses the Add expense form, pre-filled.
7. A member who did not create an expense sees its detail without Edit or Delete.

## Open questions

1. **Group name before joining.** G5 hides the group name because PA1 says only members can view group information. Should invitees see the name before they join?
2. **Invite links.** Can a link expire, be regenerated or be revoked? Currently anyone who signs in with the link can join.
3. **Password reset.** Is password reset part of F01? Are password rules needed?
4. **UI language.** PA0 calls SplitNest “Vietnamese-first,” but these mockups use English copy. Should the next iteration use Vietnamese copy?
5. **Removing members.** PA1 blocks removing members who have debts, but does not define removal for members without debts.
