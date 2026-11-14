# SplitNest — UI Styling & Design Rules

**Platform:** Desktop-first Web Application  
**Design Mode:** Operate  
**Design Direction:** Cute, Cozy, Friendly, Modern  
**Reference:** Original SplitNest Multi-Frame Mockup  
**Primary Constraint:** Preserve UC flows, navigation structure, screen organization, and interaction behavior while freely redesigning the visual identity.

---

## 1. Design Objective

Redesign SplitNest into a visually appealing, friendly, approachable, and memorable web application.

The interface should feel like a modern product designed for friends who share expenses, not traditional accounting software.

The design should communicate:

- Friendly and welcoming.
- Cute but not childish.
- Playful but not distracting.
- Modern and polished.
- Comfortable for everyday use.
- Trustworthy when handling financial information.

Do not treat the existing mockup's colors, typography, shadows, or decorative styling as mandatory.

The existing mockup is the source of truth for functionality, user journeys, navigation, and screen organization — not visual identity.

## 2. Design Freedom

The visual design is open to improvement.

The AI designer may independently choose:

- Color palette.
- Typography and font pairing.
- Illustration style.
- Icon style.
- Card appearance.
- Background treatments.
- Shadows and borders.
- Corner radii.
- Decorative elements.
- Micro-interactions.
- Visual hierarchy improvements.

Choose a coherent visual direction instead of combining unrelated design trends.

Possible color families include pastel peach, lavender, butter yellow, warm cream, sky blue, soft green, or other suitable combinations.

Do not force the existing mint-green palette.

Do not assume that pastel green must remain the primary brand color.

The final design must feel intentional and consistent across all screens.

## 3. Mandatory UX Preservation Rules

This section has the highest priority.

The original mockup defines the application's functional and navigational structure.

Visual redesign MUST NOT alter the approved user journeys.

### 3.1 Use Case Preservation

Preserve all original Use Case groups and their screen coverage:

1. Account: UC01–UC04.
2. Group: UC05–UC08, UC15.
3. Expense: UC09–UC11, UC13.
4. Debt: UC12–UC14.
5. VietQR: UC17.
6. History: UC18.

Rules:

- Preserve all existing Use Cases.
- Preserve the original workflow order.
- Preserve all existing screens and their intended purposes.
- Preserve transitions between screens.
- Preserve validation and confirmation states.
- Preserve success, error, and pending states.
- Do not merge separate Use Cases merely to simplify the interface.
- Do not invent additional business workflows.
- Do not remove existing functionality.

### 3.2 Navigation Preservation

Maintain the navigation structure shown in the original mockup.

Preserve:

- Sidebar organization.
- Navigation item order.
- Navigation labels and destinations.
- Active navigation behavior.
- Account and settings access.
- Breadcrumbs or contextual navigation where present.
- Placement and purpose of navigation controls.

Visual appearance may be redesigned completely.

Navigation labels must remain recognizable and functionally consistent.

### 3.3 Button Preservation

Every existing button must retain its original purpose.

For each button, preserve:

- Intended action.
- Destination or next state.
- Position within its original workflow.
- Relationship with other actions.
- Primary or secondary action priority.
- Confirmation requirements.

Buttons may receive new:
- Colors.
- Shapes.
- Typography.
- Icons.
- Sizes.
- Hover effects.
- Focus indicators.
- Loading states.

Do not replace a primary action with a different action.

Do not hide important actions behind unnecessary menus.

Do not change button labels if doing so creates ambiguity about their original purpose.

### 3.4 Interaction Preservation

Preserve all existing interaction behavior:

- Form submissions.
- Field validation.
- Dropdown selections.
- Navigation transitions.
- Modal opening and closing.
- Confirmation dialogs.
- QR generation and display.
- Payment-related states.
- Repayment confirmation.
- Transaction filtering.
- User feedback.

The redesign must not change API contracts, data models, database behavior, or business rules.

---

## 4. Frame and Layout Standards

The original multi-frame mockup is the structural reference.

### Frame Organization

Maintain the original six frame groups and their order.

Each frame represents a specific screen or interaction state.

Do not arbitrarily change:
- Frame count.
- Use Case grouping.
- Screen sequence.
- Screen purpose.
- Workflow relationships.

### Frame Dimensions

Inspect the original mockup and existing project artifacts to determine the actual frame dimensions and aspect ratios.

Use the original frame dimensions as the reference for visual comparison.

Do not impose a new aspect ratio without a technical reason.

The web application must additionally work at common desktop widths, including:

- 1440px.
- 1366px.
- 1280px.

Mobile and tablet layouts are responsive adaptations, not replacements for the desktop master design.

### Layout Preservation

Preserve the original information architecture:

- Sidebar and navigation placement.
- Topbar structure.
- Main content position.
- Page header hierarchy.
- Primary action placement.
- Form grouping.
- Table organization.
- Card grouping.
- Modal and dialog relationships.

Layout refinements are allowed when they improve readability or usability without changing the original navigation and workflow.

---

## 5. Application Shell

All authenticated screens must share a coherent application shell.

### Sidebar

Preserve the original navigation structure.

Maintain consistent:
- Width.
- Alignment.
- Navigation order.
- Icon placement.
- Active states.
- Spacing.

The visual style may be redesigned.

### Topbar

Preserve the existing top-level controls and their purposes.

Use a consistent header across authenticated screens.

### Main Content

Use a consistent page container and alignment system.

Ensure:
- Clear page titles.
- Predictable content hierarchy.
- Consistent section spacing.
- Consistent action placement.
- Responsive layouts.
- No unnecessary nested containers.

Authentication screens may use a separate layout, as in the original mockup.

---

## 6. Visual Design Language

The chosen direction is Cute & Cozy.

Use:
- Friendly shapes.
- Comfortable spacing.
- Approachable typography.
- Carefully selected accent colors.
- Soft surfaces.
- Subtle visual details.
- Consistent illustration and icon styles.

The interface should look distinctive rather than like a generic dashboard template.

### Color System

Create a complete palette with:

- Primary brand color.
- Secondary brand color.
- Background.
- Surface.
- Text primary.
- Text secondary.
- Borders.
- Success.
- Error.
- Warning.
- Information.
- Disabled states.

The designer may choose the actual colors.

Requirements:

- Maintain readable text contrast.
- Use semantic colors consistently.
- Avoid excessive accent colors.
- Keep financial statuses recognizable.
- Avoid relying on color alone.

### Typography

Choose a friendly, modern, highly readable font family.

Suitable characteristics:
- Rounded or soft letterforms.
- Good Vietnamese character support.
- Clear numerical characters.
- Strong readability at smaller sizes.

Maintain a consistent typography scale for page titles, section headings, card titles, body text, labels, captions, and financial figures.

Use tabular numbers for financial data.

### Shape Language

Use a consistent system of:
- Card radii.
- Input radii.
- Button radii.
- Modal radii.
- Badge shapes.
- Avatar shapes.

Rounded components are encouraged but should not become excessively pill-shaped.

### Shadows and Borders

Use subtle elevation and borders.

Avoid:
- Heavy drop shadows.
- Excessive outlines.
- Strong visual separation between every small element.
- Excessive glassmorphism.

---

## 7. Component Guidelines

Create or reuse shared components for:

- Buttons.
- Inputs.
- Selects.
- Cards.
- Tables.
- Badges.
- Modals.
- Dropdowns.
- Avatars.
- Tooltips.
- Notifications.
- Empty states.
- Loading states.

All instances of the same component must share consistent styling and behavior.

Define component variants where necessary rather than implementing unrelated styles on individual screens.

### Buttons

Support:
- Primary.
- Secondary.
- Tertiary.
- Destructive.
- Icon-only.

Implement:
- Default.
- Hover.
- Focus-visible.
- Active.
- Disabled.
- Loading.

Preserve original button actions and hierarchy.

### Forms

- Use explicit labels.
- Maintain consistent input dimensions.
- Group related fields.
- Provide inline validation.
- Preserve entered values after errors.
- Keep form submission actions in their original workflow positions.

### Cards

Use consistent padding, alignment, typography, and elevation.

Financial summary cards should prioritize information readability.

### Tables

- Maintain readable row heights.
- Align financial values consistently.
- Use clear column headings.
- Keep status indicators recognizable.
- Preserve existing filtering and transaction actions.

### Modals

Preserve the purpose and trigger of every original modal.

Use clear titles, descriptions, and action hierarchy.

Avoid introducing additional confirmation steps without justification.

---

## 8. Friendly Visual Personality

Use illustrations and decorative elements selectively.

Suitable visual themes:
- Wallets.
- Coins.
- Receipts.
- Piggy banks.
- Friendly characters.
- Small plants.
- Gift boxes.
- Shared activities.

Illustrations should have one consistent art direction.

Use them primarily for:
- Authentication welcome areas.
- Empty states.
- Success screens.
- First-time experiences.
- Feature explanations.

Do not add illustrations to every card or table.

Avoid excessive emojis and childish cartoon aesthetics.

---

## 9. Feature-Specific Requirements

### Account — UC01–UC04

Preserve authentication and account management workflows.

Improve visual clarity, form hierarchy, and welcoming presentation.

### Group — UC05–UC08, UC15

Preserve group creation, joining, member management, and invitation workflows.

Improve group cards, member avatars, and invitation presentation.

### Expense — UC09–UC11, UC13

Preserve expense creation, editing, management, and related states.

Prioritize transaction readability and straightforward expense entry.

### Debt — UC12–UC14

Preserve debt tracking, repayment requests, and repayment confirmation workflows.

Clearly distinguish:
- Money owed.
- Money receivable.
- Pending repayments.
- Confirmed repayments.

Financial consequences must never be obscured by playful visuals.

### VietQR — UC17

Preserve QR-related workflows.

Keep QR codes large, unobstructed, and scannable.

Maintain clear instructions and payment states.

### History — UC18

Preserve transaction history and its existing filtering and detail interactions.

Prioritize readable dates, amounts, and transaction statuses.

---

## 10. Responsive Web Design

Desktop is the primary design target.

Desktop:
- Preserve the main application shell.
- Keep the sidebar and topbar structure.
- Maintain the original information hierarchy.
- Use appropriate multi-column layouts.

Tablet:
- Adapt the navigation when necessary.
- Reduce grid columns.
- Maintain readable content.

Mobile:
- Adapt the sidebar to a mobile navigation pattern.
- Use single-column layouts where appropriate.
- Keep forms usable.
- Adapt tables into responsive layouts.
- Preserve all existing functionality.
- Avoid horizontal overflow.

Responsive adaptations must not change the underlying Use Case flows.

---

## 11. Accessibility and Usability

Follow WCAG 2.2 AA principles.

- Provide sufficient contrast.
- Use semantic HTML.
- Support keyboard navigation.
- Provide visible focus states.
- Label all form controls.
- Provide accessible names for icon-only buttons.
- Maintain practical touch target sizes.
- Respect reduced-motion preferences.
- Never use color as the only indicator of a financial status.

---

## 12. Anti-Patterns

Strictly avoid:

- Treating the original color palette as mandatory.
- Designing every frame independently.
- Changing Use Case flows for visual convenience.
- Changing navigation destinations.
- Changing button actions.
- Removing existing controls.
- Hiding primary actions.
- Replacing desktop web layouts with mobile-app patterns.
- Overusing pastel colors.
- Childish cartoon aesthetics.
- Excessive gradients.
- Heavy glassmorphism.
- Excessive decorative illustrations.
- Inconsistent component styling.
- Low-contrast financial information.
- Unnecessary animations.

---

## 13. Implementation Workflow

Follow this order:

1. Inspect all original frames and identify their Use Cases.
2. Map the existing screens, navigation, buttons, and transitions.
3. Establish the new visual direction and design tokens.
4. Design the shared authenticated application shell.
5. Build reusable UI components.
6. Apply the new design to Account screens.
7. Apply the new design to Group screens.
8. Apply the new design to Expense screens.
9. Apply the new design to Debt screens.
10. Apply the new design to VietQR screens.
11. Apply the new design to History screens.
12. Verify all original workflows and navigation.
13. Verify desktop and responsive layouts.

Do not implement a new visual direction independently on every frame.

---

## 14. Definition of Done

### UX Integrity
- [ ] All original Use Cases remain supported.
- [ ] Original workflow order is preserved.
- [ ] Navigation destinations remain correct.
- [ ] Every original button retains its intended action.
- [ ] Forms and validation retain their intended behavior.
- [ ] All original interaction states remain supported.

### Visual Quality
- [ ] The new visual identity is coherent.
- [ ] The design feels friendly and approachable.
- [ ] Typography is readable.
- [ ] Components are consistent.
- [ ] Financial data is easy to understand.
- [ ] Illustrations and decorative elements are purposeful.

### Technical Quality
- [ ] Desktop layouts work at target widths.
- [ ] Responsive behavior is verified.
- [ ] Accessibility is considered.
- [ ] No unnecessary dependencies are introduced.
- [ ] Existing business logic remains intact.

**Final Principle:**

Redesign the visual experience, not the product's behavior.

Preserve every approved Use Case flow, navigation relationship, button purpose, and interaction. Everything visual is open to thoughtful improvement.
