# Visual Styling Rules

## 1. Design Direction
SplitNest uses a warm, friendly, and approachable visual style. Prioritize soft surfaces, rounded shapes, comfortable spacing, clear hierarchy, and subtle elevation.

Avoid generic SaaS styling, excessive pastels, childish illustrations, heavy gradients, and glassmorphism.

## 2. Color System

Use the following design tokens consistently across all screens.

| Category | Token | Value |
|---|---|---|
| Brand | Primary | `#F08A6E` |
| | Primary Hover | `#E0735A` |
| | Primary Soft | `#FDE7DF` |
| | Secondary | `#A78BFA` |
| | Secondary Soft | `#EDE9FE` |
| Background | Page | `#FFF8F0` |
| | Surface | `#FFFFFF` |
| | Subtle | `#FFF3E8` |
| Text | Primary | `#3D2C2A` |
| | Secondary | `#7A6A66` |
| | Disabled | `#B8ADA9` |
| Border | Subtle | `#F0E6DC` |
| | Default | `#E4D6C8` |
| | Strong | `#C9B7A6` |
| Semantic | Success | `#4CAF7D` |
| | Danger | `#E45C5C` |
| | Warning | `#E8A93B` |
| | Info | `#5B9BD5` |
| | Disabled | `#D9CFC7` |

Use semantic colors consistently. Financial statuses must include both an icon and text, never color alone.

## 3. Typography

- Headings: **Quicksand**.
- Body and financial data: **Be Vietnam Pro**.
- Page title: 28px / 36px, weight 700.
- Section heading: 20px / 28px, weight 600.
- Card title: 16px / 24px, weight 600.
- Body: 14px / 22px, weight 400.
- Labels: 13px; captions: 12px.

All financial values must use tabular numerals. Right-align monetary columns in tables.

## 4. Spacing and Shapes

**Spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64px.

- Card padding: 20–24px.
- Section gap: 32px.
- Form field gap: 16px.
- List item gap: 12–16px.
- Page padding: Desktop 32px, tablet 24px, mobile 16px.

**Border radius:**
- 8px: Inputs and badges.
- 12px: Buttons and small cards.
- 16px: Main cards and tables.
- 24px: Modals and large panels.
- 999px: Avatars and status chips.

## 5. Elevation and Motion

Use subtle borders and shadows. Avoid excessive elevation.

- Cards: `0 2px 8px rgba(61,44,42,0.06)`.
- Modals: `0 8px 24px rgba(61,44,42,0.08)`.
- Micro-interactions: 150ms.
- Modals and panels: 250ms.
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`.

Respect `prefers-reduced-motion`.

## 6. Layout

**Authenticated Shell**
- Sidebar: 240px expanded, 72px collapsed.
- Topbar: 64px, sticky.
- Main content: Maximum width 1200px, centered.
- Active navigation: Primary-soft background, primary text, 3px left accent border.

**Authentication**
- Split layout with illustration on the left and form on the right.
- White form card with 24px radius.

Maintain consistent navigation, alignment, and spacing across screens.

## 7. Component Rules

| Component | Styling Requirements |
|---|---|
| Buttons | Primary, Secondary, Tertiary, and Destructive variants; heights 32px, 40px, 48px |
| Inputs | 40px height, visible labels, focus and error states |
| Cards | White background, 16px radius, 20–24px padding |
| Tables | Minimum 52px row height, subtle separators, right-aligned financial values |
| Status Badges | Semantic background, matching icon and text |
| Modals | 480–560px width, 24px radius, clear action hierarchy |
| Avatars | Circular, maximum four visible before `+N` |
| Empty States | Small illustration, heading, description, primary action |
| Toasts | Bottom-right, 12px radius, approximately 4-second duration |

All interactive components must provide appropriate default, hover, focus, active, disabled, and loading states.

## 8. Icons and Illustrations

- Use one consistent outline icon family with 1.5px stroke.
- Standard icon sizes: 16px, 20px, 24px.
- Illustrations use flat shapes, soft fills, and thin outlines.
- Reserve illustrations for authentication, empty states, success screens, and onboarding.

Avoid decorative illustrations in ordinary cards and tables.

## 9. Responsive Design

| Breakpoint | Requirements |
|---|---|
| Desktop ≥ 1280px | Full sidebar, multi-column layouts |
| Tablet 768–1279px | Compact sidebar, reduced grid columns |
| Mobile < 768px | Single-column layouts, stacked table rows, full-width forms |

Prevent horizontal overflow and maintain readable financial information and usable touch targets.

## 10. Accessibility

Follow WCAG 2.2 AA:
- Text contrast: Minimum 4.5:1.
- Large text contrast: Minimum 3:1.
- Visible keyboard focus states.
- Status indicators must not rely on color alone.
- Maintain readable financial values.
- Support reduced-motion preferences.

## 11. Implementation Constraints

- Use design tokens instead of arbitrary colors and styling values.
- Maintain consistent typography, spacing, shapes, and components across all screens.
- Preserve existing UC flows, navigation structure, and button behavior.
- Do not introduce unnecessary visual elements or additional styling patterns.
- Apply this styling system consistently across the entire application.
