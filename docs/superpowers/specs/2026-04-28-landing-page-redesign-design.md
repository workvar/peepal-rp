# Landing Page Redesign — Design Spec

**Date:** 2026-04-28
**Scope:** Redesign `app/page.tsx` (the marketing landing page) with editorial / Linear-style direction. Refresh sibling marketing pages (`/about`, `/mission`, `/inspiration`, `/modules`, `/modules/[slug]`) to match. Swap brand primary across the whole app from Apple Blue (`#007AFF`) to Forest Green (`#1f5d36`).
**Status:** Awaiting implementation plan.

---

## 1. Goals & non-goals

### Goals

- Replace the current gradient-blob, GSAP-heavy marketing landing with a quiet, editorial design that signals craft to decision-makers and shows the actual product to IT/operations admins.
- Swap the brand primary token from Apple Blue → Forest Green (`#1f5d36`) across light + dark modes — every Button, link, focus ring, and active sidebar item inherits the change.
- Anchor every major section with a real product screenshot in a browser frame, since there is no customer social proof to lean on yet.
- Drop the heavy scroll choreography (pinning, horizontal rail, parallax, mouse-tracking blobs) in favor of restrained Framer Motion in-view reveals.

### Non-goals

- No login / authentication flow changes.
- No dashboard UX redesign — only the brand-color swap touches it.
- No re-architecture of marketing routing — the existing `MarketingShell` + nav items stay.
- No CMS, no internationalization, no marketing analytics work.
- No new pricing page, no testimonials section, no FAQ.

---

## 2. Decisions log

| Question | Choice |
| --- | --- |
| Goal of redesign | **E** — start fresh |
| Primary audience | Decision-makers + IT/operations admins (both, equally) |
| Available proof | Pre-launch — no customer logos, no stats |
| Product imagery | Real screenshots, stylized in browser/device frames |
| Visual direction | **A** — Editorial / Linear-style (off-white, single accent) |
| Page length | **B** — Medium (~6–7 viewports, 8 sections + footer) |
| Brand accent | **B** — refresh to Forest Green |
| Scope | **C** — marketing redesign + global brand token swap |
| Approach | Approach 2 — editorial frame anchored by product screenshots |
| Rollout | **A** — direct swap of `app/page.tsx`, no `/v2` route |
| Screenshot pipeline | **B** — scripted via Playwright |
| Demo data | **C** — ship a demo-fixture seed script alongside |

---

## 3. Page architecture

The landing page is composed of **9 sequential sections** rendered inside the existing `MarketingShell`:

| # | Section | New / rewrite | Notes |
| --- | --- | --- | --- |
| 1 | Hero | rewrite | Editorial split — headline + sub + 2 CTAs left, dashboard screenshot in `BrowserFrame` right. Off-white surface; no gradient backdrop. |
| 2 | Manifesto | new | Single big-type paragraph, ~30 words. No image. |
| 3 | Modules grid | new | Quiet 3×3 grid driven by `lib/marketing/modules.ts`. Forest tint on hover only. Replaces the horizontal-scroll rail. |
| 4 | Deep-dive · Attendance | new (parameterized) | Two-column with `BrowserFrame` screenshot right. |
| 5 | Deep-dive · Payroll | new | Mirrored — screenshot left. |
| 6 | Deep-dive · Reports | new | Back to copy-left. |
| 7 | IT panel | new | Dark inset (`#0a0a09`). Three columns: Roles · Data · Audit. |
| 8 | Closing CTA | rewrite | Restrained — no gradient banner. |
| 9 | Footer | retone only | Existing `MarketingFooter`, brand-color swap only. |

### Removed from current page

- `Hero` blob mouse-tracking
- `PinnedFeatures` (pinned crossfade panels)
- `HorizontalModules` (horizontal-scroll rail)
- `ParallaxStats` (parallax stat cards)
- `HowItWorks` (3-step cards)
- `CTASection` (violet→pink gradient banner)

---

## 4. Visual system

### 4.1 Color — Forest Green palette

Primary swap: `--primary` / `--accent` / `--ring` change from Apple Blue → Forest Green in both `:root` and `.dark` blocks of `globals.css`. The Apple HIG token system is otherwise unchanged.

| Token | Hex | RGB | Use |
| --- | --- | --- | --- |
| `forest-50` | `#f0f5f1` | 240 245 241 | Hover surfaces, badges, IT-panel stat cards |
| `forest-100` | `#dcebe0` | 220 235 224 | Subtle tint backgrounds |
| `forest-200` | `#b9d6c2` | 185 214 194 | Borders/dividers in tinted contexts |
| `forest-300` | `#93c2a0` | 147 194 160 | Dark-mode hover states |
| `forest-400` | `#4f9268` | 79 146 104 | **Dark-mode `--primary`** (AA on near-black) |
| `forest-500` | `#2d7a4a` | 45 122 74 | Sub-accents |
| `forest-600` | `#1f5d36` | 31 93 54 | **Light-mode `--primary`**, default brand color |
| `forest-700` | `#163f25` | 22 63 37 | Hover/pressed for buttons + links |
| `forest-800` | `#0e2d1a` | 14 45 26 | Footer, deep accents |

Rules of use:
- `--primary` button: `forest-600` background, `forest-700` hover, white foreground.
- Links: `forest-600` text, underline on hover.
- Focus ring: `forest-600` at 50% opacity.
- Marketing surfaces: page `#fafaf9`, cards `#ffffff`, IT inset `#0a0a09`.

Module per-color: existing `MODULES[i].color` field stays as a property but the **landing-page modules grid does not use it** (single forest accent on hover only). `/modules/[slug]` detail pages continue to use a per-module accent, but those raw hex values get retoned to a quieter palette in a follow-up sweep — out of scope for this redesign.

### 4.2 Typography

- **Sans:** keep existing `system-ui, -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`. ~95% of all page type.
- **Serif accent:** add `font-serif` Tailwind family with stack `"Iowan Old Style", "Georgia", serif`. Used italic, on a single phrase per major heading. No web-font load.
- **Display sizes (marketing-only) added to `tailwind.config.ts`:**
  - `display-1`: 96px / 1.02 / -0.025em
  - `display-2`: 72px / 1.04 / -0.025em
  - `display-3`: 56px / 1.05 / -0.02em
- Existing Apple type scale (`large-title`, `title-1`, …, `caption-2`) untouched.
- Body copy on marketing pages: 17px / 1.55 (the existing `body` token).

### 4.3 Surfaces

| Surface | Hex | Use |
| --- | --- | --- |
| Page | `#fafaf9` | Default canvas for all marketing sections except the IT panel |
| Card | `#ffffff` | Module tiles, framed screenshots |
| IT inset | `#0a0a09` | Section #7 only — single dark moment in the page |
| Border (hairline) | `#e7e7e3` | All borders |

- No gradients anywhere on the landing page.
- Shadows: existing `shadow-sm/md/lg/xl` scale only — no glow.
- Marketing pages render light-only — `MarketingShell` forces `class="light"` (or removes any `dark` class on its root) to defend against OS dark-mode bleeding through.

### 4.4 Motion

| Status | Behavior |
| --- | --- |
| **Keep** | Lenis smooth scroll (existing `SmoothScroll` wrapper) |
| **Keep** | Framer Motion `whileInView` fade + slide-up (12px, ~400ms ease-out) via new `Reveal` primitive |
| **Keep** | Hover lift on module tiles (transform-only, 150ms) |
| **Keep** | One Framer-driven "settle" animation on hero `BrowserFrame` mount |
| **Drop** | GSAP `ScrollTrigger` pinning |
| **Drop** | Horizontal scroll rail |
| **Drop** | Parallax blob backgrounds |
| **Drop** | Mouse-tracking hero blobs |
| **Drop** | `TextReveal` char-by-char animation |

`gsap` stays installed (other features may use it), but no new marketing code calls it.

---

## 5. Component & file plan

### New files

```
components/marketing/primitives/BrowserFrame.tsx
components/marketing/primitives/Reveal.tsx
components/marketing/sections/Manifesto.tsx
components/marketing/sections/ModulesGrid.tsx
components/marketing/sections/ModuleDeepDive.tsx
components/marketing/sections/ITPanel.tsx
components/marketing/sections/ClosingCTA.tsx        # replaces CTASection.tsx
public/marketing/screenshots/dashboard.png          # generated by Playwright
public/marketing/screenshots/attendance.png         # generated
public/marketing/screenshots/payroll.png            # generated
public/marketing/screenshots/reports.png            # generated
scripts/capture-marketing-screenshots.ts            # Playwright capture
scripts/seed-demo-data.ts                           # demo fixture for screenshots
```

### Rewritten

```
components/marketing/sections/Hero.tsx              # editorial split, BrowserFrame
components/marketing/layout/MarketingNav.tsx        # retoned; light-mode-only behavior
components/marketing/layout/MarketingFooter.tsx     # retoned
app/page.tsx                                        # composes new sections
```

### Deleted

```
components/marketing/sections/PinnedFeatures.tsx
components/marketing/sections/HorizontalModules.tsx
components/marketing/sections/ParallaxStats.tsx
components/marketing/sections/HowItWorks.tsx
components/marketing/sections/CTASection.tsx        # replaced by ClosingCTA.tsx
components/marketing/scroll/Pinned.tsx
components/marketing/scroll/HorizontalScroll.tsx
components/marketing/scroll/Parallax.tsx
components/marketing/scroll/TextReveal.tsx
components/marketing/scroll/ScrollReveal.tsx
```

### Kept (no structural change)

```
components/marketing/scroll/SmoothScroll.tsx
components/marketing/layout/MarketingShell.tsx
lib/marketing/modules.ts                            # structure unchanged; only color + gradient values retone (see hex sweep below)
components/marketing/modules/*                      # light visual sweep only
```

### Token & token-consumer updates

```
app/globals.css                                     # --primary, --accent, --ring (light + dark)
tailwind.config.ts                                  # forest-* color scale, display-1/2/3, font-serif
```

Hardcoded violet/pink hex sweep — replace with `--primary` token, neutral grays, or remove:

```
components/ui/ConfirmDialog.tsx
components/ui/dialog.tsx
components/ui/LoadingSpinner.tsx
components/ui/Logo.tsx
components/pages/(super-admin)/super/admins/Page.tsx
components/pages/[tenant]/(dashboard)/docs/diagrams/StateChart.tsx
components/pages/[tenant]/(dashboard)/docs/diagrams/DataModelERD.tsx
components/pages/[tenant]/(dashboard)/docs/diagrams/ModuleMap.tsx
components/pages/[tenant]/(dashboard)/docs/diagrams/UserOnboardingFlow.tsx
components/pages/[tenant]/(dashboard)/docs/users/sections/Roles.tsx
components/pages/[tenant]/(dashboard)/profile/Page.tsx
components/pages/[tenant]/(dashboard)/timetable/Page.tsx
lib/marketing/modules.ts                            # gradient/color fields per module
```

### Component contracts

**`BrowserFrame`** — wraps a child or `<Image>` in browser/Mac chrome.

```tsx
interface BrowserFrameProps {
  src: string;                       // image path
  alt: string;
  variant?: "browser" | "mac";       // default "browser" (Chrome-style URL bar)
  url?: string;                      // shown in URL bar; defaults to "stepelly.app/<slug>"
  tilt?: number;                     // degrees, default -1
  shadow?: "sm" | "md" | "lg";       // default "lg"
  priority?: boolean;                // forwarded to next/image
  className?: string;
}
```

**`Reveal`** — Framer Motion `whileInView` wrapper.

```tsx
interface RevealProps {
  children: React.ReactNode;
  delay?: number;                    // seconds, default 0
  distance?: number;                 // px, default 12
  duration?: number;                 // seconds, default 0.4
  as?: keyof JSX.IntrinsicElements;  // default "div"
  className?: string;
}
```

**`ModuleDeepDive`** — parameterized two-column section.

```tsx
interface ModuleDeepDiveProps {
  side: "left" | "right";            // which side the screenshot sits on
  eyebrow: string;                   // e.g. "Attendance"
  heading: string;
  body: string;
  bullets: string[];                 // exactly 3
  screenshotSrc: string;             // path under public/marketing/screenshots/
  screenshotAlt: string;
}
```

---

## 6. Copy

### Hero

- **Eyebrow:** `StepElly · ERP for institutes`
- **Headline:** `Run every team. Every workflow.` *(italic-serif "Every" on line 2)*
- **Subhead:** `StepElly is one workspace for everything an institute runs — students, staff, attendance, marks, leaves, payroll and fees, with reports built in.`
- **CTAs:** `Sign in →` · `Explore modules`

### Manifesto (#2)

> Most institutes run on six tools and a thousand spreadsheets. StepElly replaces all of them with a single workspace where attendance, payroll, marks, leaves and reports finally talk to each other — and to you.

### Modules grid (#3)

- **Eyebrow:** `Every module`
- **Heading:** `Built for every role.`
- **Subhead:** `From the front desk to finance — nine modules, one system.`
- Tiles render `name` + `tagline` from existing `MODULES`.

### Deep-dive · Attendance (#4)

- **Eyebrow:** `Attendance` · **Heading:** `Never chase a register again.`
- **Body:** `Bulk marking, period-wise slots and live shortage alerts — attendance that keeps up with how classes really happen.`
- **Bullets:** Mark a whole class in one tap, edit in line · Live shortage tracking per student, per course · Bridges to payroll for staff attendance

### Deep-dive · Payroll (#5)

- **Eyebrow:** `Payroll` · **Heading:** `Payroll that just runs.`
- **Body:** `Salary structures, attendance-aware payruns, branded payslips at scale. Statutory reports in one click.`
- **Bullets:** Component-based salary structures · Bulk payslip release with your branding · Attendance, leaves and overtime, factored automatically

### Deep-dive · Reports (#6)

- **Eyebrow:** `Reports` · **Heading:** `Decisions, not spreadsheets.`
- **Body:** `Live dashboards and role-aware reports across every module. Exports anywhere. No data team required.`
- **Bullets:** Every module ships dashboards on day one · Role-aware — each user sees their numbers, no manual filtering · CSV / PDF on every table, one click

### IT panel (#7)

- **Eyebrow:** `For IT & operations`
- **Heading:** `Built for the people who actually run it.`
- **Body:** `StepElly is multi-tenant, role-based and audit-friendly — so the team running the institute can sleep at night.`
- Three columns:
  - **Roles & permissions** — `27+ scopes. Role-based access end-to-end.`
  - **Data ownership** — `Export anything. CSV/PDF baked into every screen.`
  - **Audit & access** — `Every action logged. One tenant per institute.`

### Closing CTA (#8)

- **Heading:** `Run your institute on one operating system.`
- **Subhead:** `Sign in to your workspace, or ask your administrator to provision an account.`
- **CTAs:** `Sign in →` · `Explore modules`

---

## 7. Screenshot pipeline

### Inputs

- Backend running locally with the seeded admin (`admin@college.edu` / `Admin@123`).
- Demo fixtures applied via `scripts/seed-demo-data.ts` (idempotent — safe to re-run).
- Frontend dev server on `http://localhost:3000`.

### What `scripts/seed-demo-data.ts` produces

Idempotent insertions sufficient to make screenshots look populated:

- ~30 students across 4 batches
- ~12 employees across 3 departments
- ~2 weeks of attendance for the current term
- 1 completed payrun + 1 pending payrun
- Marks for 2 internal exams across 3 subjects
- A handful of leave requests (pending + approved)

The script is a Node/TypeScript file in the frontend repo that authenticates against the backend HTTP API as the seeded admin and POSTs the fixture rows through the public endpoints. It is idempotent — re-running does not produce duplicates. Output is logged so it is clear what was inserted.

### What `scripts/capture-marketing-screenshots.ts` does

1. Reads target URL from env (`STEPELLY_DEV_URL`, default `http://localhost:3000`).
2. Logs in via the UI as the seeded admin.
3. Resolves the active tenant slug from the post-login redirect.
4. For each target route, navigates, waits for network-idle + a 500ms settle, and captures a 1280×800 viewport screenshot at `deviceScaleFactor: 2`.
5. Writes PNGs to `public/marketing/screenshots/<name>.png`.

Targets:

| Output file | Route | State to wait for |
| --- | --- | --- |
| `dashboard.png` | `/<tenant>/dashboard` | KPI tiles + chart rendered |
| `attendance.png` | `/<tenant>/attendance` | Bulk-mark table populated |
| `payroll.png` | `/<tenant>/payroll` | Payrun list + detail drawer open on the latest run |
| `reports.png` | `/<tenant>/dashboard` | Same as dashboard but cropped to the report grid; could also use a dedicated `/reports` route if it exists when implementation begins |

### Tooling additions

- Add `playwright` and `@playwright/test` as devDependencies.
- Add `pnpm screenshots:marketing` script that runs the capture (assumes dev server + backend already up).
- Add `pnpm seed:demo` script that runs the demo-fixture seeder.
- Document both in `README.md`.

---

## 8. Implementation order

The plan builder will turn this into discrete tasks. Suggested sequencing:

1. **Phase 1 · Foundation** — `forest-*` color scale, display sizes, serif stack added to `tailwind.config.ts`; `--primary` / `--accent` / `--ring` swapped in `globals.css`; sweep the 13 dashboard files with hardcoded violet/pink. *Visual smoke test before merging.*
2. **Phase 2 · Primitives** — `BrowserFrame`, `Reveal`.
3. **Phase 3 · Screenshot pipeline** — Playwright + capture script + demo seed + run once + commit four PNGs.
4. **Phase 4 · Sections** — `Manifesto` → `ModulesGrid` → `ModuleDeepDive` → `Hero` rewrite → `ITPanel` → `ClosingCTA` → compose in `app/page.tsx`.
5. **Phase 5 · Sibling marketing pages** — visual sweep on `/about`, `/mission`, `/inspiration`, `/modules`, `/modules/[slug]`; nav + footer retone.
6. **Phase 6 · Cleanup** — delete dead components and scroll primitives; `pnpm tsc --noEmit` clean; Lighthouse pass on `/`.

---

## 9. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| `--primary` swap visually breaks dashboard pages we forgot about (custom hex usage, custom focus rings). | Phase 1 ends with a 30-minute click-through across every dashboard route the seeded admin can reach. Bug list is fixed before Phase 2 starts. |
| Screenshots go stale as dashboards evolve. | `pnpm screenshots:marketing` is one command and idempotent. Add to README; revisit later for CI automation. |
| Demo seed conflicts with real data on a developer's local DB. | Seed script is idempotent and namespaces fixture rows (e.g., `email LIKE '%@demo.stepelly.app'`); `--reset` flag deletes only fixture-namespaced rows. |
| Visitor's OS dark-mode bleeds into marketing pages. | `MarketingShell` strips any `dark` class from `<html>` while mounted; CSS for marketing-specific surfaces uses literal hex, not dark-mode-conditional tokens. |
| Page weight balloons from screenshots. | All screenshots use `next/image`, which serves modern formats (AVIF/WebP) automatically — sources stay as PNG. Hero gets `priority`, others lazy-load. Soft target: each screenshot below 250 KB after `next/image` optimization. |
| `gsap`/`lenis` stay as deps even though only Lenis is used. | Acceptable — `gsap` is used elsewhere in the codebase. No bundle-size change for `/`. |

---

## 10. Out of scope (parking lot)

- Per-module accent retoning on `/modules/[slug]` detail pages.
- Pricing page.
- Customer-logo bar / case studies (revisit post-launch).
- CI integration of `pnpm screenshots:marketing`.
- Visual regression testing.
- Marketing-page i18n.
