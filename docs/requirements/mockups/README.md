# SplitNest website mockups (PA2, WBS 2.4.1–2.4.3)

Static, desktop-first **website** mockups for the Account, Group and invite, and Expense screens. Open any `.html` file in a modern browser. No build step, package install or internet connection is needed.

| File | WBS | Screens | Feature |
|---|---|---|---|
| [account.html](account.html) | 2.4.1 Account | A1 Sign up, A2 Sign in, A3 Bank details (not saved), A4 Bank details (saved) | F01 |
| [group-invite.html](group-invite.html) | 2.4.2 Group and invite screens (includes QR join) | G1 My groups, G2 Create group, G3 Group members, G4 Invite (link and QR), G5 Join (signed in), G6 Join (signed out), G7 Invalid link | F02 |
| [expense.html](expense.html) | 2.4.3 Expense screens | E1 Expenses list, E2 Add expense, E3 Validation errors, E4 Expense detail, E5 Locked expense, E6 Delete confirmation | F03, with repayment status chips for F04 |

The debt screens (WBS 2.4.4) are not in this set. In the PA1 schedule, WBS 2.4 starts after 2.1 and runs in parallel with 2.2.

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
