# Apple Design System Redesign — CollERP

**Date:** 2026-04-17  
**Scope:** Entire frontend app  
**Status:** Approved — ready for implementation

---

## Overview

Redesign the CollERP frontend to follow Apple's Human Interface Guidelines. The guiding principle: content leads, UI chrome recedes. Visual hierarchy is driven by typography, spacing, and contrast — not decoration. No gradients anywhere. Spatial depth is communicated through subtle shadows, blur, and layering rather than color fills.

---

## Section 1: Design Token Layer

### CSS Variables

All hardcoded hex values, `linear-gradient()` strings, and `box-shadow` strings are replaced with semantic CSS variables. Two sets: `:root` (light) and `.dark` (dark).

#### Backgrounds
| Variable | Light | Dark | Role |
|---|---|---|---|
| `--color-bg-primary` | `#FFFFFF` | `#000000` | Page canvas |
| `--color-bg-secondary` | `#F2F2F7` | `#1C1C1E` | Grouped/inset areas |
| `--color-bg-tertiary` | `#FFFFFF` | `#2C2C2E` | Nested surfaces |

#### Surfaces
| Variable | Light | Dark | Role |
|---|---|---|---|
| `--color-surface` | `#FFFFFF` | `#1C1C1E` | Cards, sheets |
| `--color-surface-raised` | `#FFFFFF` | `#2C2C2E` | Modals, floating panels |

#### Text (Label Roles)
| Variable | Light | Dark | Role |
|---|---|---|---|
| `--color-label` | `#000000` | `#FFFFFF` | Primary text |
| `--color-label-secondary` | `rgba(60,60,67,0.6)` | `rgba(235,235,245,0.6)` | Supporting text |
| `--color-label-tertiary` | `rgba(60,60,67,0.3)` | `rgba(235,235,245,0.3)` | Placeholder / metadata |
| `--color-label-quaternary` | `rgba(60,60,67,0.18)` | `rgba(235,235,245,0.18)` | Disabled |

#### System
| Variable | Light | Dark | Role |
|---|---|---|---|
| `--color-separator` | `rgba(60,60,67,0.12)` | `rgba(84,84,88,0.65)` | Hairline borders, dividers |
| `--color-fill` | `rgba(120,120,128,0.12)` | `rgba(120,120,128,0.36)` | Interactive tint backgrounds |
| `--color-accent` | `#007AFF` | `#0A84FF` | Buttons, links, active states — used sparingly |

#### Category Colors (solid, no gradient)
| Variable | Light | Dark | Assigned Groups |
|---|---|---|---|
| `--color-category-blue` | `#007AFF` | `#0A84FF` | People, My Workspace |
| `--color-category-purple` | `#AF52DE` | `#BF5AF2` | Academics |
| `--color-category-green` | `#34C759` | `#30D158` | Operations |
| `--color-category-orange` | `#FF9500` | `#FF9F0A` | Finance |
| `--color-category-teal` | `#5AC8FA` | `#64D2FF` | Campus |
| `--color-category-pink` | `#FF2D55` | `#FF375F` | Communications |
| `--color-category-indigo` | `#5856D6` | `#6E6CF0` | Administration |
| `--color-category-red` | `#FF3B30` | `#FF453A` | Urgent / error states |

### Typography Scale

Map to Tailwind `fontSize` config extensions. Font family: `system-ui, -apple-system, "SF Pro Display", sans-serif`.

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `text-large-title` | 34px | 700 | 41px | Page headings |
| `text-title-1` | 28px | 700 | 34px | Section headings |
| `text-title-2` | 22px | 700 | 28px | Card titles |
| `text-title-3` | 20px | 600 | 25px | Sub-section headings |
| `text-headline` | 17px | 600 | 22px | Card labels, list items |
| `text-body` | 17px | 400 | 22px | Default content |
| `text-callout` | 16px | 400 | 21px | Supporting content |
| `text-subhead` | 15px | 400 | 20px | Metadata |
| `text-footnote` | 13px | 400 | 18px | Secondary metadata |
| `text-caption-1` | 12px | 400 | 16px | Labels, group headers |
| `text-caption-2` | 11px | 400 | 13px | Timestamps, fine print |

### Spacing

Base unit: 4pt. Scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 44 / 64`.

### Corner Radii

Override Tailwind's default `borderRadius` values in `tailwind.config.ts` — existing code using these tokens auto-migrates to the new values.

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 6px | Small pills, dots |
| `rounded-md` | 10px | Inputs, small chips |
| `rounded-lg` | 12px | Icon badges, inline elements |
| `rounded-xl` | 16px | Cards, panels |
| `rounded-2xl` | 20px | Modals, sheets |

### Motion

- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for state changes; spring (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for scale interactions
- Duration: 150ms state changes, 200ms entrances, 300ms page-level
- Remove all decorative animations: `animate-shimmer`, `animate-float`, `animate-pulse-soft`, `stagger` — replace with functional transitions only
- Skeleton loading: opacity pulse `0.4 → 0.7 → 0.4` using `--color-fill`

---

## Section 2: GridMenu — Grouped Module Launcher

### ModuleDef Interface Changes

Remove `gradient: string` and `shadow: string` fields from `ModuleDef`.  
Add `group: string` and `color: string` (one of: `blue | purple | green | orange | teal | pink | indigo`).

### Module Groups

| Group | Color Token | Modules |
|---|---|---|
| People | `blue` | Users, Employees, Students |
| Academics | `purple` | Marks, Results, Academic, Timetable |
| Operations | `green` | Attendance, Leaves |
| Finance | `orange` | Payroll, Fees |
| Campus | `teal` | Hostel, Transport, Library, Events |
| Communications | `pink` | Notices |
| Administration | `indigo` | Reports, Organisation |
| My Workspace | `blue` | My Portal, My Profile |

### Card Anatomy

- **Background:** `--color-surface`, `rounded-xl`, `1px solid --color-separator`
- **Hover:** `scale(1.02)`, `shadow-sm` deepens — spring easing 200ms
- **Active:** `scale(0.98)`
- **Icon badge:** 40×40 `rounded-lg`, solid `--color-category-{color}` background, 22px icon in white
- **Label:** `text-headline` (17px/600), `--color-label`
- **Description:** `text-caption-1` (12px/400), `--color-label-secondary`

### Section Header Anatomy

- Text: `text-caption-2` (11px), `--color-label-secondary`, uppercase, `letter-spacing: 0.06em`
- Margin: 20px above each group header, 8px between header and card grid
- No decorative element — purely typographic

### Layout

- Cards within each group: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`
- Groups stack vertically, `gap-6` (24px) between groups
- Remove top-level "Select a module" label — group headers replace it
- Filtering by role still applies — groups with no visible modules are hidden entirely

---

## Section 3: Dashboard Page

### Hero / Greeting

- Remove decorated gradient banner entirely
- Replace with plain typographic block: `text-large-title` greeting ("Good morning, {name}") + `text-subhead` caption in `--color-label-secondary`
- No background, no card wrapper
- Hairline `--color-separator` rule below separates it from the module grid

### Stat Cards

- **Background:** `--color-surface`, `rounded-xl`, `1px solid --color-separator`
- **Icon:** 36×36 `rounded-md`, solid `--color-category-{color}` background, icon in white
- **Value:** `text-title-1` (28px/700), `--color-label`
- **Label:** `text-caption-1` (12px), `--color-label-secondary`, uppercase
- **Trend:** `text-caption-2`, `--color-label-tertiary`
- No colored card backgrounds — icon carries the color, surface is neutral
- Row groupings preserved: entity counts row, today's snapshot row
- Icon color assignments: Students → `blue`, Employees → `pink`, Teachers → `teal`, Total Users → `indigo`, Present Today → `green`, Absent Today → `red`, Pending Leaves → `orange`, Draft Payrolls → `purple`

### Quick Reports

- Becomes a plain inset grouped list: three rows, each with label (`text-headline`) + chevron in `--color-label-tertiary`
- Section header: "Quick Reports" in `text-caption-2` uppercase style
- No card with gradient text labels

### Announcements

- Each item: `--color-surface` card, `rounded-xl`
- Priority indicator: 6px solid dot in `--color-category-{red/orange/blue}` beside title — no colored background fills
- Title: `text-headline`, body: `text-callout` in `--color-label-secondary`
- Priority text label in matching category color, no filled badge background

### Charts

- Cards: plain `--color-surface`, no decorative section headers
- SVG `linearGradient` area fills removed — replaced with solid color at 8% opacity
- Chart lines/bars use solid category colors
- Section heading "Performance Analytics": `text-title-3`, `--color-label`

---

## Section 4: Global Components

### Card (`components/ui/card.tsx`)
- Background: `--color-surface`
- Border: `1px solid --color-separator`
- Radius: `rounded-xl`
- No shadow by default
- Add a `variant?: "default" | "raised"` prop — `raised` adds `box-shadow: 0 2px 8px rgba(0,0,0,0.08)` for modals and sheets

### Button
- `filled`: `--color-accent` bg, white text — primary actions only
- `tinted`: `--color-accent` at 12% opacity bg, `--color-accent` text — secondary
- `plain`: no background, `--color-accent` text — tertiary / destructive
- No gradient fills on any variant

### Badge
- Background: `--color-category-{color}` at 12% opacity
- Text: full `--color-category-{color}`
- Remove `dot` variant gradient — replace with solid 6px circle in category color

### Navigation / TopBar
- Background: `--color-bg-primary` at 80% opacity with `backdrop-filter: blur(20px) saturate(180%)`
- Bottom border: `1px solid --color-separator`
- No shadow, no gradient

### Sidebar
- Background: `--color-bg-secondary`
- Active item: `--color-accent` at 10% opacity bg, `--color-accent` text and icon
- Inactive: `--color-label-secondary` text and icon
- No border between sidebar and main content — background difference implies separation

### Inputs / Forms
- Background: `--color-bg-secondary`
- Border: `1px solid --color-separator`
- Radius: `rounded-lg` (12px)
- Focus ring: `2px solid --color-accent`, 3px offset
- No pill/rounded-full inputs

### Skeleton / Loading
- Replace shimmer gradient with opacity pulse: `0.4 → 0.7 → 0.4` using `--color-fill` as background
- Duration: 1200ms, ease-in-out, infinite

---

## Implementation Notes

- `moduleConfig.ts`: Remove `gradient` and `shadow` from `ModuleDef`, add `group` and `color`
- `globals.css`: Add all CSS variable definitions for light and dark modes
- `tailwind.config.ts`: Extend `fontSize`, `colors` (category tokens), `borderRadius` with the new scale
- `dashboard/page.tsx`: Full rewrite per Section 3
- `GridMenu.tsx`: Full rewrite per Section 2
- All other pages inherit the token system automatically via Tailwind utilities — spot-fixes only needed where hardcoded gradient strings exist
- Search for `linear-gradient` across the entire codebase — each hit must be resolved
