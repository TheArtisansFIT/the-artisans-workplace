# PA3 Section 5 — Data Design Work Summary

**Member:** 24127295  
**Project:** SplitNest — The Artisans  
**Assigned section:** 5.1 Data Diagram, 5.2 Data Specification, 5.3 Normalisation and Indexes

## Work completed at the design/documentation level

- Reviewed PA0–PA2 and the current PA3 domain, class, architectural, and traceability descriptions to keep the data model within the approved project scope.
- Reviewed and revised ERD/RDM for eight logical entities: User, Group, GroupInvitation, GroupMembership, Expense, ExpenseShare, RepaymentObligation, and RepaymentReport.
- Included ExpenseShare for all selected participants, including the payer when selected, and linked each non-payer repayment obligation to the corresponding share.
- Used MembershipID to identify distinct membership records across leave/remove/rejoin events, with at most one Active membership for each group/user pair.
- Used ReportID to identify individual repayment reports and retained the logical composite key (ExpenseID, DebtorID) for repayment obligations.
- Reconciled primary keys, logical foreign keys, relationship cardinalities, amount constraints, and report/obligation status distinctions.
- Reviewed functional dependencies, the 1NF–3NF explanation, and indexes for the logical relational representation while retaining MongoDB Atlas as the planned persistent database.
- Highlighted cross-section follow-ups for ADR-002, sequence diagrams, UI specifications, the traceability matrix, and changes since PA2.

## Verification method and limits

Compared generated diagram/document iterations with PA2 requirements and PA3 Sections 3–5 and 7–8. Reviewed alternative modeling choices and retained only decisions traceable to existing project requirements or the agreed design. No claims are made here about successful MongoDB execution, repository test runs, or deployment.

## Related document

The final Section 5 design is maintained within the team's PA3 Software Design report. The separate AI usage record is `docs/ai-usage/PA3/24127295.md`.
