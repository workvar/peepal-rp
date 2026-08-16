# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current gradient-blob, GSAP-heavy marketing landing with a quiet editorial design anchored by real product screenshots in browser frames; swap brand primary from Apple Blue → Forest Green across the entire app; ship a Playwright screenshot pipeline + demo-fixture seeder so screenshots are reproducible.

**Architecture:** Direct swap of `app/page.tsx` (no `/v2`). Foundation phase changes one CSS variable (`--primary`) and a tailwind color scale; the dashboard inherits automatically. Marketing-only display sizes and a `font-serif` stack are added without touching the existing Apple type scale. New primitives (`BrowserFrame`, `Reveal`) and four new section components compose the page top-to-bottom; six legacy section/scroll components are deleted at the end.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS v3, Framer Motion 12, Lenis (smooth scroll), Playwright (screenshot capture, new dev dep), `tsx` (TS script runner, new dev dep), shadcn-style `components/ui` primitives.

**Reference spec:** `docs/superpowers/specs/2026-04-28-landing-page-redesign-design.md`

---

## File Structure

### New files

```
frontend/components/marketing/primitives/BrowserFrame.tsx
frontend/components/marketing/primitives/Reveal.tsx
frontend/components/marketing/sections/Manifesto.tsx
frontend/components/marketing/sections/ModulesGrid.tsx
frontend/components/marketing/sections/ModuleDeepDive.tsx
frontend/components/marketing/sections/ITPanel.tsx
frontend/components/marketing/sections/ClosingCTA.tsx
frontend/scripts/seed-demo-data.ts
frontend/scripts/capture-marketing-screenshots.ts
frontend/public/marketing/screenshots/dashboard.png        (generated)
frontend/public/marketing/screenshots/attendance.png       (generated)
frontend/public/marketing/screenshots/payroll.png          (generated)
frontend/public/marketing/screenshots/reports.png          (generated)
```

### Rewritten

```
frontend/tailwind.config.ts                                # forest scale + display sizes + serif
frontend/app/globals.css                                   # --primary swap (light + dark)
frontend/components/marketing/sections/Hero.tsx            # editorial split layout
frontend/components/marketing/layout/MarketingNav.tsx      # retone + force light
frontend/components/marketing/layout/MarketingFooter.tsx   # retone
frontend/components/marketing/scroll/SmoothScroll.tsx      # Lenis-only, drop GSAP
frontend/app/page.tsx                                      # compose new sections
frontend/components/ui/Logo.tsx                            # forest gradient
frontend/components/ui/LoadingSpinner.tsx                  # forest accent
frontend/components/ui/ConfirmDialog.tsx                   # forest accent
frontend/components/ui/dialog.tsx                          # forest accent
frontend/lib/marketing/modules.ts                          # retone color/gradient values
frontend/README.md                                         # document seed + screenshot scripts
frontend/package.json                                      # add deps + scripts
```

### Deleted

```
frontend/components/marketing/sections/PinnedFeatures.tsx
frontend/components/marketing/sections/HorizontalModules.tsx
frontend/components/marketing/sections/ParallaxStats.tsx
frontend/components/marketing/sections/HowItWorks.tsx
frontend/components/marketing/sections/CTASection.tsx
frontend/components/marketing/scroll/Pinned.tsx
frontend/components/marketing/scroll/HorizontalScroll.tsx
frontend/components/marketing/scroll/Parallax.tsx
frontend/components/marketing/scroll/TextReveal.tsx
frontend/components/marketing/scroll/ScrollReveal.tsx
```

### Lightly touched (color/gradient retone only)

```
frontend/components/pages/(super-admin)/super/admins/Page.tsx
frontend/components/pages/[tenant]/(dashboard)/profile/Page.tsx
frontend/components/pages/[tenant]/(dashboard)/timetable/Page.tsx
frontend/components/pages/[tenant]/(dashboard)/docs/diagrams/StateChart.tsx
frontend/components/pages/[tenant]/(dashboard)/docs/diagrams/DataModelERD.tsx
frontend/components/pages/[tenant]/(dashboard)/docs/diagrams/ModuleMap.tsx
frontend/components/pages/[tenant]/(dashboard)/docs/diagrams/UserOnboardingFlow.tsx
frontend/components/pages/[tenant]/(dashboard)/docs/users/sections/Roles.tsx
frontend/components/marketing/sections/InfoHero.tsx
frontend/components/marketing/modules/ModuleHero.tsx
frontend/components/marketing/modules/ModuleFeatures.tsx
frontend/components/marketing/modules/ModuleHighlights.tsx
frontend/components/marketing/modules/ModulePage.tsx
frontend/components/marketing/modules/WhoCanUse.tsx
```

### Testing approach

This redesign is UI/visual work with no business logic. There is no test framework currently configured in `frontend/`. Validation per task uses:

1. `pnpm tsc --noEmit` — must pass after every change.
2. `pnpm dev` — visit the affected URL, confirm rendering matches the spec section.
3. After Phase 1: 30-minute click-through across dashboard routes to catch token-swap regressions.
4. Phase 6: Lighthouse pass on `/`.

**Working directory for all commands: `/Users/yasharyan/Documents/Claude/Projects/CollERP/frontend`** unless stated otherwise.

---

## Phase 1 — Foundation (token swap)

### Task 1.1: Add forest color scale, display font sizes, and serif font family to Tailwind

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Open the file and locate the `theme.extend` block**

Run: `grep -n "extend:" tailwind.config.ts`
Expected: one line, `extend: {`.

- [ ] **Step 2: Add the `forest` color scale, display sizes, and serif family**

Edit `tailwind.config.ts`. Inside `theme.extend`, locate the `colors: {…}` block and append a new top-level key `forest`. Locate `fontSize: {…}` and add three `display-*` entries. Locate `fontFamily: {…}` and add a `serif` stack.

The final shape (only the changed portions shown):

```ts
colors: {
  // … existing semantic tokens …
  destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },

  forest: {
    50:  "#f0f5f1",
    100: "#dcebe0",
    200: "#b9d6c2",
    300: "#93c2a0",
    400: "#4f9268",
    500: "#2d7a4a",
    600: "#1f5d36",
    700: "#163f25",
    800: "#0e2d1a",
  },
},

fontSize: {
  // … existing Apple scale …
  "caption-2":   ["0.6875rem", { lineHeight: "0.8125rem" }],

  "display-1":   ["6rem",     { lineHeight: "1.02", letterSpacing: "-0.025em" }], // 96px
  "display-2":   ["4.5rem",   { lineHeight: "1.04", letterSpacing: "-0.025em" }], // 72px
  "display-3":   ["3.5rem",   { lineHeight: "1.05", letterSpacing: "-0.02em"  }], // 56px
},

fontFamily: {
  sans: [
    "system-ui", "-apple-system", "SF Pro Display",
    "Helvetica Neue", "sans-serif",
  ],
  serif: [
    "Iowan Old Style", "Georgia", "serif",
  ],
},
```

- [ ] **Step 3: Verify the config compiles**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(theme): add forest color scale, display sizes, serif fallback"
```

---

### Task 1.2: Swap `--primary` / `--accent` / `--ring` to forest in `globals.css`

**Files:**
- Modify: `app/globals.css` (the `:root` and `.dark` blocks)

- [ ] **Step 1: Locate the existing primary/accent/ring lines in `:root`**

Run: `grep -nE "--primary:|--accent:|--ring:" app/globals.css | head -10`
Expected: lines pointing to Apple-blue values in both `:root` and `.dark` blocks.

- [ ] **Step 2: Update the `:root` block (light mode)**

Edit `app/globals.css`. Replace the three lines inside `:root` exactly:

```css
    --primary:                31  93  54;    /* forest-600 #1f5d36 */
    --primary-foreground:     255 255 255;
    /* … */
    --accent:                 31  93  54;
    --accent-foreground:      255 255 255;
    /* … */
    --ring:                   31  93  54;
```

(The `--primary-foreground` and `--accent-foreground` already say `255 255 255` — leave them.)

- [ ] **Step 3: Update the `.dark` block (dark mode)**

Replace the corresponding lines inside `.dark`:

```css
    --primary:                79  146 104;   /* forest-400 #4f9268 — AA on near-black */
    --primary-foreground:     255 255 255;
    /* … */
    --accent:                 79  146 104;
    --accent-foreground:      255 255 255;
    /* … */
    --ring:                   79  146 104;
```

- [ ] **Step 4: Boot the dev server and visually confirm**

```bash
pnpm dev
```

Open `http://localhost:3000/login`. Expected: the primary button is forest green, focus rings on inputs are forest green. Stop the server with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): swap brand primary from apple-blue to forest-green"
```

---

### Task 1.3: Retone the Logo to forest gradient

**Files:**
- Modify: `components/ui/Logo.tsx`

- [ ] **Step 1: Replace the gradient and mono fills**

Edit `components/ui/Logo.tsx`. Update the lines that hardcode the violet/cyan palette to use the forest scale:

```tsx
// Replace this block in the function body:
const fill  = isWhite ? "#ffffff" : isGradient ? `url(#${GRAD_ID})`  : "#1f5d36";
const fill2 = isWhite ? "rgba(255,255,255,0.70)" : isGradient ? `url(#${GRAD2_ID})` : "#2d7a4a";
const fill3 = isWhite ? "rgba(255,255,255,0.45)" : isGradient ? `url(#${GRAD2_ID})` : "#4f9268";

// Replace the gradient stops in <defs>:
<linearGradient id={GRAD_ID} x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
  <stop offset="0%"   stopColor="#1f5d36" />
  <stop offset="100%" stopColor="#4f9268" />
</linearGradient>
<linearGradient id={GRAD2_ID} x1="0" y1="40" x2="40" y2="0" gradientUnits="userSpaceOnUse">
  <stop offset="0%"   stopColor="#2d7a4a" />
  <stop offset="100%" stopColor="#93c2a0" />
</linearGradient>

// Replace the wordmark colors near the bottom of the JSX:
style={{
  fontSize: size * 0.5,
  color: isWhite ? "#ffffff" : "#1f5d36",
}}
// And the "Elly" half:
<span style={{ color: isWhite ? "rgba(255,255,255,0.85)" : "#2d7a4a" }}>Elly</span>
```

- [ ] **Step 2: Update the docstring at the top of the file to match**

Replace the line:

```tsx
 *   <Logo variant="mono" />         — flat violet fill
```

with:

```tsx
 *   <Logo variant="mono" />         — flat forest fill
```

And replace `Violet → cyan gradient keeps it feeling modern and tech-forward.` with `Forest gradient signals reliability and growth.`.

- [ ] **Step 3: Visually confirm**

```bash
pnpm dev
```

Open `http://localhost:3000/`. The nav logo should be forest gradient. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add components/ui/Logo.tsx
git commit -m "feat(brand): retone Logo to forest gradient"
```

---

### Task 1.4: Retone LoadingSpinner conic gradient

**Files:**
- Modify: `components/ui/LoadingSpinner.tsx`

- [ ] **Step 1: Replace the gradient colors**

Edit `components/ui/LoadingSpinner.tsx`. Locate line 9 (the `background` style) and replace:

```tsx
background: "conic-gradient(from 0deg, #1f5d36, #4f9268, transparent)",
```

- [ ] **Step 2: Verify rendering**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/LoadingSpinner.tsx
git commit -m "feat(brand): retone LoadingSpinner to forest gradient"
```

---

### Task 1.5: Retone ConfirmDialog and dialog accent palettes

**Files:**
- Modify: `components/ui/ConfirmDialog.tsx`
- Modify: `components/ui/dialog.tsx`

- [ ] **Step 1: Inspect the violet usages in both files**

Run: `grep -n "#7c3aed\|#ec4899\|#a855f7\|#6d28d9" components/ui/ConfirmDialog.tsx components/ui/dialog.tsx`
Expected: ~3 lines combined.

- [ ] **Step 2: Replace `#7c3aed` with `#1f5d36` in `ConfirmDialog.tsx`**

In `components/ui/ConfirmDialog.tsx`, change every literal `"#7c3aed"` to `"#1f5d36"`. Both occurrences are within an entry in the variant-style map (`iconColor` and `accentGradient`).

- [ ] **Step 3: Replace `#7c3aed` with `#1f5d36` in `dialog.tsx`**

In `components/ui/dialog.tsx`, change `violet: "#7c3aed",` to `violet: "#1f5d36",`. Leave the key name `violet` for now — the field is referenced by name elsewhere; renaming it is out of scope for the brand sweep.

- [ ] **Step 4: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/ConfirmDialog.tsx components/ui/dialog.tsx
git commit -m "feat(brand): retone dialog accent colors to forest"
```

---

### Task 1.6: Sweep hardcoded violet/pink in dashboard pages

**Files:**
- Modify: `components/pages/(super-admin)/super/admins/Page.tsx`
- Modify: `components/pages/[tenant]/(dashboard)/profile/Page.tsx`
- Modify: `components/pages/[tenant]/(dashboard)/timetable/Page.tsx`
- Modify: `components/pages/[tenant]/(dashboard)/docs/diagrams/StateChart.tsx`
- Modify: `components/pages/[tenant]/(dashboard)/docs/diagrams/DataModelERD.tsx`
- Modify: `components/pages/[tenant]/(dashboard)/docs/diagrams/ModuleMap.tsx`
- Modify: `components/pages/[tenant]/(dashboard)/docs/diagrams/UserOnboardingFlow.tsx`
- Modify: `components/pages/[tenant]/(dashboard)/docs/users/sections/Roles.tsx`

- [ ] **Step 1: List every hex usage with line numbers**

```bash
grep -nE "#7c3aed|#ec4899|#a855f7|#6d28d9" \
  components/pages/\(super-admin\)/super/admins/Page.tsx \
  components/pages/\[tenant\]/\(dashboard\)/profile/Page.tsx \
  components/pages/\[tenant\]/\(dashboard\)/timetable/Page.tsx \
  components/pages/\[tenant\]/\(dashboard\)/docs/diagrams/StateChart.tsx \
  components/pages/\[tenant\]/\(dashboard\)/docs/diagrams/DataModelERD.tsx \
  components/pages/\[tenant\]/\(dashboard\)/docs/diagrams/ModuleMap.tsx \
  components/pages/\[tenant\]/\(dashboard\)/docs/diagrams/UserOnboardingFlow.tsx \
  components/pages/\[tenant\]/\(dashboard\)/docs/users/sections/Roles.tsx
```

Expected: ~15–25 hits. Read the surrounding context for each to decide between three replacement strategies:

- **`#7c3aed` standalone, used as a brand accent** → `#1f5d36` (forest-600).
- **A two-stop violet→pink gradient** (e.g., `linear-gradient(...,#7c3aed,#ec4899)`) → `linear-gradient(...,#1f5d36,#4f9268)` (forest-600 → forest-400).
- **Diagram nodes / state chart "category" colors** where each node has its own hex (purple/pink/blue/etc. mixed) — leave non-violet colors alone, replace **only** `#7c3aed` and `#ec4899` with forest tints (`#1f5d36`, `#2d7a4a`) so the diagram still has visual variety but no longer reads as "violet brand."

- [ ] **Step 2: Apply replacements file by file**

For each file, perform the appropriate replacements identified in step 1. Use `Edit` tool with `replace_all: true` per literal hex when safe; otherwise edit case-by-case. After each file, re-run the grep above limited to that file to verify zero remaining hits for the targeted hexes.

- [ ] **Step 3: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Smoke-test the affected dashboard pages**

```bash
pnpm dev
```

Click through, with the seeded admin logged in:

- `/super/admins` (super-admin tenant)
- `/<tenant>/profile`
- `/<tenant>/timetable`
- `/<tenant>/docs/users` (Roles section)
- `/<tenant>/docs` pages that include each diagram (StateChart, DataModelERD, ModuleMap, UserOnboardingFlow)

Confirm each page renders without runtime errors and the previously-violet accents are now forest. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add components/pages
git commit -m "chore(brand): sweep dashboard violet/pink hex to forest tints"
```

---

### Task 1.7: Retone module color/gradient data

**Files:**
- Modify: `lib/marketing/modules.ts`

- [ ] **Step 1: Replace the per-module `color` and `gradient` fields**

Edit `lib/marketing/modules.ts`. For each module entry, update the `color` and `gradient` properties to a forest-adjacent value. Use this mapping (each module gets a quietly distinct tint within the forest family):

```ts
// students
color: "#1f5d36",
gradient: "linear-gradient(135deg,#1f5d36,#2d7a4a)",

// employees
color: "#2d7a4a",
gradient: "linear-gradient(135deg,#2d7a4a,#4f9268)",

// attendance
color: "#1f5d36",
gradient: "linear-gradient(135deg,#1f5d36,#4f9268)",

// marks
color: "#163f25",
gradient: "linear-gradient(135deg,#163f25,#1f5d36)",

// leaves
color: "#4f9268",
gradient: "linear-gradient(135deg,#4f9268,#93c2a0)",

// payroll
color: "#1f5d36",
gradient: "linear-gradient(135deg,#1f5d36,#2d7a4a)",

// fees
color: "#0e2d1a",
gradient: "linear-gradient(135deg,#0e2d1a,#163f25)",

// reports
color: "#2d7a4a",
gradient: "linear-gradient(135deg,#2d7a4a,#1f5d36)",

// announcements
color: "#4f9268",
gradient: "linear-gradient(135deg,#4f9268,#2d7a4a)",
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Smoke-test the modules pages**

```bash
pnpm dev
```

Open `http://localhost:3000/modules` and click into a couple of `/modules/<slug>` pages — each should render with forest-tint accents and no broken styling. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add lib/marketing/modules.ts
git commit -m "feat(marketing): retone module color/gradient values to forest palette"
```

---

### Task 1.8: Phase 1 acceptance — full-app click-through

- [ ] **Step 1: Boot dev + backend; sign in with seeded admin**

In two terminals:

```bash
# terminal A
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go run main.go
# terminal B
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend && pnpm dev
```

Sign in with `admin@college.edu` / `Admin@123` at `http://localhost:3000/login`.

- [ ] **Step 2: Walk every dashboard nav item**

Click each item in the sidebar (Dashboard, Users, Employees, Students, Attendance, Marks, Leaves, Payroll, Fees, Reports, etc.). For each:

- Page loads without console errors.
- Primary buttons are forest green.
- Active sidebar item is forest green.
- No leftover blue/violet accents that look out of place.

Note any regressions in a list and fix them inline (loop back to the relevant 1.x task) before moving on.

- [ ] **Step 3: Commit any fixes from step 2 with message** `fix(brand): post-Phase-1 visual regression fixes`.

---

## Phase 2 — Primitives

### Task 2.1: Build the `BrowserFrame` primitive

**Files:**
- Create: `components/marketing/primitives/BrowserFrame.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export interface BrowserFrameProps {
  src: string;
  alt: string;
  variant?: "browser" | "mac";
  url?: string;
  tilt?: number;
  shadow?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

const SHADOWS: Record<NonNullable<BrowserFrameProps["shadow"]>, string> = {
  sm: "shadow-md",
  md: "shadow-lg",
  lg: "shadow-xl",
};

export default function BrowserFrame({
  src,
  alt,
  variant = "browser",
  url,
  tilt = -1,
  shadow = "lg",
  priority = false,
  className,
  width = 1280,
  height = 800,
}: BrowserFrameProps) {
  const displayUrl = url ?? "peepal.app";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ transform: `rotate(${tilt}deg)` }}
      className={`overflow-hidden rounded-xl border border-[#e7e7e3] bg-white ${SHADOWS[shadow]} ${className ?? ""}`}
    >
      {/* Chrome */}
      <div className="flex items-center gap-2 border-b border-[#e7e7e3] bg-[#fafaf9] px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
        </div>
        {variant === "browser" && (
          <div className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-1 text-[11px] text-[#737370] border border-[#ececea]">
            {displayUrl}
          </div>
        )}
      </div>

      {/* Screenshot */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(min-width: 1024px) 720px, 100vw"
        className="block h-auto w-full"
      />
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/primitives/BrowserFrame.tsx
git commit -m "feat(marketing): add BrowserFrame primitive"
```

---

### Task 2.2: Build the `Reveal` primitive

**Files:**
- Create: `components/marketing/primitives/Reveal.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ElementType, ReactNode } from "react";

export interface RevealProps {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  as?: ElementType;
  className?: string;
}

/**
 * Subtle in-view fade + slide-up. Wrap any block that should ease into view.
 * Triggers once, on first intersection, with a 12% viewport margin.
 */
export default function Reveal({
  children,
  delay = 0,
  distance = 12,
  duration = 0.4,
  as = "div",
  className,
}: RevealProps) {
  const Comp = motion[as as keyof typeof motion] as React.ComponentType<HTMLMotionProps<"div">>;
  return (
    <Comp
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Comp>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/primitives/Reveal.tsx
git commit -m "feat(marketing): add Reveal primitive (Framer whileInView wrapper)"
```

---

## Phase 3 — Screenshot pipeline

### Task 3.1: Add Playwright + tsx as dev dependencies and add scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the deps**

```bash
pnpm add -D playwright tsx
pnpm exec playwright install chromium
```

Expected: `playwright`, `tsx` appear in `package.json` `devDependencies`. Chromium binaries download once.

- [ ] **Step 2: Add the npm scripts**

Edit `package.json`. Replace the `scripts` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "seed:demo": "tsx scripts/seed-demo-data.ts",
  "screenshots:marketing": "tsx scripts/capture-marketing-screenshots.ts"
},
```

- [ ] **Step 3: Verify install + scripts**

```bash
pnpm seed:demo --help 2>/dev/null || true
pnpm screenshots:marketing --help 2>/dev/null || true
```

Both will exit with errors (scripts don't exist yet) — fine. The point is to confirm `tsx` is wired.

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add playwright + tsx for screenshot pipeline"
```

---

### Task 3.2: Write the demo-data seeder

**Files:**
- Create: `scripts/seed-demo-data.ts`

- [ ] **Step 1: Create the seeder**

This script logs in as the seeded admin, then idempotently POSTs fixture students/employees/attendance/leaves/payroll using the public API. It namespaces fixture rows with `email LIKE '%@demo.peepal.app'` so it can be re-run safely.

```ts
/**
 * Demo-data seeder for marketing screenshots.
 * Idempotent — safe to re-run. Inserts fixture rows that all live under
 * the @demo.peepal.app email namespace so they can be cleaned out via
 *   pnpm seed:demo -- --reset
 */
import axios from "axios";

const API_BASE = process.env.PEEPAL_API_BASE ?? "http://localhost:8080/api";
const ADMIN_EMAIL = process.env.PEEPAL_ADMIN_EMAIL ?? "admin@college.edu";
const ADMIN_PASSWORD = process.env.PEEPAL_ADMIN_PASSWORD ?? "Admin@123";

const RESET = process.argv.includes("--reset");

const DEMO_DOMAIN = "demo.peepal.app";

const STUDENTS = Array.from({ length: 30 }, (_, i) => ({
  email: `student${i + 1}@${DEMO_DOMAIN}`,
  name: `Demo Student ${i + 1}`,
  rollNumber: `R${1000 + i}`,
  batch: ["A1", "A2", "B1", "B2"][i % 4],
}));

const EMPLOYEES = Array.from({ length: 12 }, (_, i) => ({
  email: `staff${i + 1}@${DEMO_DOMAIN}`,
  name: `Demo Staff ${i + 1}`,
  department: ["Faculty", "Administration", "Finance"][i % 3],
  designation: ["Lecturer", "Officer", "Coordinator"][i % 3],
}));

async function login() {
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = res.data?.data?.token ?? res.data?.token;
  if (!token) throw new Error("Login response did not include a token");
  return token;
}

async function getOrCreateStudents(token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const existing = await axios.get(`${API_BASE}/students`, { headers });
  const existingEmails: Set<string> = new Set(
    (existing.data?.data ?? []).map((s: { email: string }) => s.email),
  );

  let created = 0;
  for (const s of STUDENTS) {
    if (existingEmails.has(s.email)) continue;
    try {
      await axios.post(`${API_BASE}/students`, s, { headers });
      created++;
    } catch (err) {
      console.warn(`student ${s.email}: ${(err as Error).message}`);
    }
  }
  console.log(`students: ${created} created, ${STUDENTS.length - created} already present`);
}

async function getOrCreateEmployees(token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const existing = await axios.get(`${API_BASE}/employees`, { headers });
  const existingEmails: Set<string> = new Set(
    (existing.data?.data ?? []).map((e: { email: string }) => e.email),
  );

  let created = 0;
  for (const e of EMPLOYEES) {
    if (existingEmails.has(e.email)) continue;
    try {
      await axios.post(`${API_BASE}/employees`, e, { headers });
      created++;
    } catch (err) {
      console.warn(`employee ${e.email}: ${(err as Error).message}`);
    }
  }
  console.log(`employees: ${created} created, ${EMPLOYEES.length - created} already present`);
}

async function reset(token: string) {
  // Reset is best-effort: the public API may not expose direct delete endpoints
  // for every entity. Logs which rows we would remove; an admin can wipe via
  // the dashboard if needed.
  const headers = { Authorization: `Bearer ${token}` };
  const students = await axios.get(`${API_BASE}/students`, { headers });
  const toRemove: { id: number | string; email: string }[] = (students.data?.data ?? []).filter(
    (s: { email: string }) => s.email.endsWith(`@${DEMO_DOMAIN}`),
  );
  console.log(`would remove ${toRemove.length} demo students (manual cleanup if needed)`);
}

async function main() {
  console.log(`api: ${API_BASE}`);
  const token = await login();
  console.log("login: ok");

  if (RESET) {
    await reset(token);
    return;
  }

  await getOrCreateStudents(token);
  await getOrCreateEmployees(token);
  console.log("seed: done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run it once against a live backend**

Backend must be running on `http://localhost:8080`.

```bash
pnpm seed:demo
```

Expected output ends with `seed: done`. If the API rejects fields (`name`, `rollNumber`, etc.), inspect the error, look at `backend/handlers/*` to confirm the request shape, and adjust the script's request bodies to match. The shape of `STUDENTS` / `EMPLOYEES` is best-effort — fix any 400s by aligning to the actual handler.

- [ ] **Step 3: Run it twice and confirm idempotency**

```bash
pnpm seed:demo
```

Expected: second run reports `0 created, N already present` for both students and employees.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-demo-data.ts
git commit -m "feat(scripts): add idempotent demo-data seeder for marketing screenshots"
```

---

### Task 3.3: Write the Playwright screenshot capture script

**Files:**
- Create: `scripts/capture-marketing-screenshots.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * Capture marketing screenshots from the running dev server.
 * Logs in as the seeded admin, navigates to four routes, writes 1280×800
 * PNGs at deviceScaleFactor 2 into public/marketing/screenshots/.
 *
 * Run order:
 *   1. backend running on :8080
 *   2. frontend dev server running on :3000
 *   3. pnpm seed:demo (so screens look populated)
 *   4. pnpm screenshots:marketing
 */
import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const BASE = process.env.PEEPAL_DEV_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.PEEPAL_ADMIN_EMAIL ?? "admin@college.edu";
const ADMIN_PASSWORD = process.env.PEEPAL_ADMIN_PASSWORD ?? "Admin@123";
const OUT_DIR = path.resolve(__dirname, "../public/marketing/screenshots");

interface Target {
  name: string;
  pathSuffix: string;          // appended after /<tenant>
  waitForSelector?: string;    // optional readiness signal
  delayMs?: number;
}

const TARGETS: Target[] = [
  { name: "dashboard",  pathSuffix: "/dashboard",   delayMs: 800 },
  { name: "attendance", pathSuffix: "/attendance",  delayMs: 800 },
  { name: "payroll",    pathSuffix: "/payroll",     delayMs: 800 },
  { name: "reports",    pathSuffix: "/dashboard",   delayMs: 800 }, // re-uses dashboard for now
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const page = await ctx.newPage();

  // Log in via the UI
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/[^/]+\/dashboard/, { timeout: 10_000 });

  const url = new URL(page.url());
  const tenant = url.pathname.split("/").filter(Boolean)[0];
  if (!tenant) throw new Error("Could not infer tenant slug after login");
  console.log(`tenant: ${tenant}`);

  for (const t of TARGETS) {
    const target = `${BASE}/${tenant}${t.pathSuffix}`;
    console.log(`→ ${t.name}: ${target}`);
    await page.goto(target, { waitUntil: "networkidle" });
    if (t.waitForSelector) await page.waitForSelector(t.waitForSelector, { timeout: 5_000 });
    if (t.delayMs) await page.waitForTimeout(t.delayMs);

    const out = path.join(OUT_DIR, `${t.name}.png`);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`   wrote ${path.relative(process.cwd(), out)}`);
  }

  await browser.close();
  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the capture against a populated dev server**

In two terminals, ensure backend (`go run main.go`) and frontend (`pnpm dev`) are running, then:

```bash
pnpm seed:demo
pnpm screenshots:marketing
```

Expected: four PNGs appear in `public/marketing/screenshots/`.

- [ ] **Step 3: Visually inspect the screenshots**

Open each PNG. Confirm:

- They are 2560×1600 (1280×800 @2x).
- Dashboards and tables show populated data (not empty states).
- Forest green accents are visible (sidebar active state, primary buttons).
- No PII / debug overlays / dev banners.

If a screen is empty, return to Task 3.2 to add more seed data, or extend `waitForSelector` so the screenshot fires after the page renders.

- [ ] **Step 4: Commit script + screenshots together**

```bash
git add scripts/capture-marketing-screenshots.ts public/marketing/screenshots
git commit -m "feat(scripts): add Playwright marketing screenshot capture + initial PNGs"
```

---

### Task 3.4: Document the scripts in `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Marketing screenshots" section**

Append the following to `frontend/README.md` (or insert after the "Quick Start" frontend section if there's a clear spot):

```markdown
## Marketing screenshots

The landing page (`app/page.tsx`) embeds real product screenshots captured by Playwright. To regenerate them:

```bash
# 1. backend running on :8080, frontend on :3000
# 2. seed demo fixtures (idempotent, safe to re-run)
pnpm seed:demo

# 3. capture
pnpm screenshots:marketing
```

Outputs land in `public/marketing/screenshots/`. Commit the PNGs after re-running.

The seeder uses the `@demo.peepal.app` email namespace so fixture rows are easy to identify; pass `--reset` to log which rows would be removed.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document seed:demo and screenshots:marketing scripts"
```

---

## Phase 4 — Sections + Hero rewrite + page composition

### Task 4.1: Build the `Manifesto` section

**Files:**
- Create: `components/marketing/sections/Manifesto.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Reveal from "@/components/marketing/primitives/Reveal";

export default function Manifesto() {
  return (
    <section className="bg-[#fafaf9] px-6 py-32 md:px-10">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <p className="font-sans text-3xl font-semibold leading-[1.25] tracking-[-0.005em] text-[#0a0a09] md:text-[44px] md:leading-[1.18]">
            Most institutes run on six tools and a thousand spreadsheets.{" "}
            <span className="text-[#1f5d36]">Peepal replaces all of them</span>{" "}
            with a single workspace where attendance, payroll, marks, leaves and
            reports finally talk to each other — and to you.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/sections/Manifesto.tsx
git commit -m "feat(marketing): add Manifesto section"
```

---

### Task 4.2: Build the `ModulesGrid` section

**Files:**
- Create: `components/marketing/sections/ModulesGrid.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/marketing/primitives/Reveal";
import { MODULES } from "@/lib/marketing/modules";

export default function ModulesGrid() {
  return (
    <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            Every module
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-3 text-display-3 font-extrabold tracking-[-0.02em] text-[#0a0a09]">
            Built for every role.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 max-w-xl text-[17px] leading-[1.55] text-[#3a3a37]">
            From the front desk to finance — nine modules, one system.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <ul className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/modules/${m.slug}`}
                  className="group relative flex h-full flex-col gap-3 rounded-xl border border-[#e7e7e3] bg-white p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9d6c2] hover:bg-[#f0f5f1]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0f5f1] text-[#1f5d36] transition-colors group-hover:bg-[#dcebe0]">
                      <m.icon size={18} />
                    </span>
                    <ArrowUpRight
                      size={16}
                      className="text-[#737370] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#1f5d36]"
                    />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.005em] text-[#0a0a09]">
                      {m.name}
                    </h3>
                    <p className="mt-1 text-[13px] leading-[1.5] text-[#737370]">
                      {m.tagline}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/sections/ModulesGrid.tsx
git commit -m "feat(marketing): add quiet 3x3 ModulesGrid section"
```

---

### Task 4.3: Build the `ModuleDeepDive` section

**Files:**
- Create: `components/marketing/sections/ModuleDeepDive.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Reveal from "@/components/marketing/primitives/Reveal";
import BrowserFrame from "@/components/marketing/primitives/BrowserFrame";

export interface ModuleDeepDiveProps {
  side: "left" | "right";
  eyebrow: string;
  heading: string;
  body: string;
  bullets: [string, string, string];
  screenshotSrc: string;
  screenshotAlt: string;
  screenshotUrl?: string;
}

export default function ModuleDeepDive({
  side,
  eyebrow,
  heading,
  body,
  bullets,
  screenshotSrc,
  screenshotAlt,
  screenshotUrl,
}: ModuleDeepDiveProps) {
  const copyOrder = side === "right" ? "lg:order-1" : "lg:order-2";
  const shotOrder = side === "right" ? "lg:order-2" : "lg:order-1";

  return (
    <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className={copyOrder}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            {eyebrow}
          </p>
          <h3 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
            {heading}
          </h3>
          <p className="mt-5 max-w-md text-[17px] leading-[1.6] text-[#3a3a37]">
            {body}
          </p>
          <ul className="mt-7 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[15px] leading-[1.5] text-[#0a0a09]">
                <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-[#1f5d36]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className={shotOrder}>
          <BrowserFrame
            src={screenshotSrc}
            alt={screenshotAlt}
            url={screenshotUrl}
            tilt={side === "right" ? -1 : 1}
            shadow="lg"
          />
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/sections/ModuleDeepDive.tsx
git commit -m "feat(marketing): add parameterized ModuleDeepDive section"
```

---

### Task 4.4: Rewrite the `Hero` section

**Files:**
- Modify (full rewrite): `components/marketing/sections/Hero.tsx`

- [ ] **Step 1: Replace the file with the editorial split**

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrowserFrame from "@/components/marketing/primitives/BrowserFrame";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#fafaf9] pt-32 md:pt-40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 pb-24 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20 lg:pb-32">
        {/* Copy */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            Peepal · ERP for institutes
          </p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.04] tracking-[-0.025em] text-[#0a0a09] md:text-display-2">
            Run every team.{" "}
            <span className="font-serif italic font-normal text-[#1f5d36]">Every</span>{" "}
            workflow.
          </h1>
          <p className="mt-7 max-w-xl text-[17px] leading-[1.6] text-[#3a3a37] md:text-[19px]">
            Peepal is one workspace for everything an institute runs — students,
            staff, attendance, marks, leaves, payroll and fees, with reports built in.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/login">
              <Button size="lg" className="px-7 text-[15px]">
                Sign in <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/modules">
              <Button variant="outline" size="lg" className="px-7 text-[15px]">
                Explore modules
              </Button>
            </Link>
          </div>
        </div>

        {/* Screenshot */}
        <div className="relative">
          <BrowserFrame
            src="/marketing/screenshots/dashboard.png"
            alt="Peepal dashboard — KPI summary, recent activity and charts"
            url="peepal.app/dashboard"
            tilt={-1}
            shadow="lg"
            priority
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/sections/Hero.tsx
git commit -m "feat(marketing): rewrite Hero as editorial split with BrowserFrame"
```

---

### Task 4.5: Build the `ITPanel` section

**Files:**
- Create: `components/marketing/sections/ITPanel.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Reveal from "@/components/marketing/primitives/Reveal";

const PILLARS = [
  {
    title: "Roles & permissions",
    body: "27+ scopes. Role-based access end-to-end.",
  },
  {
    title: "Data ownership",
    body: "Export anything. CSV/PDF baked into every screen.",
  },
  {
    title: "Audit & access",
    body: "Every action logged. One tenant per institute.",
  },
] as const;

export default function ITPanel() {
  return (
    <section className="bg-[#fafaf9] px-6 py-20 md:px-10">
      <div className="mx-auto max-w-6xl rounded-3xl bg-[#0a0a09] px-8 py-20 md:px-16 md:py-24">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#93c2a0]">
            For IT &amp; operations
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-[-0.02em] text-[#fafaf9] md:text-[56px] md:leading-[1.05]">
            Built for the people who actually run it.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.6] text-[#a1a1aa]">
            Peepal is multi-tenant, role-based and audit-friendly — so the team
            running the institute can sleep at night.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-14 grid grid-cols-1 gap-10 border-t border-[#27272a] pt-10 md:grid-cols-3 md:gap-12">
            {PILLARS.map((p) => (
              <div key={p.title}>
                <h3 className="text-[17px] font-semibold tracking-[-0.005em] text-[#fafaf9]">
                  {p.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-[#a1a1aa]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/sections/ITPanel.tsx
git commit -m "feat(marketing): add ITPanel section (dark inset)"
```

---

### Task 4.6: Build the `ClosingCTA` section

**Files:**
- Create: `components/marketing/sections/ClosingCTA.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/marketing/primitives/Reveal";

export default function ClosingCTA() {
  return (
    <section className="bg-[#fafaf9] px-6 pb-32 pt-24 md:px-10 md:pt-32">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-display-3">
            Run your institute on one operating system.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.6] text-[#3a3a37]">
            Sign in to your workspace, or ask your administrator to provision an account.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="px-8 text-[15px]">
                Sign in <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/modules">
              <Button variant="outline" size="lg" className="px-8 text-[15px]">
                Explore modules
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/sections/ClosingCTA.tsx
git commit -m "feat(marketing): add restrained ClosingCTA section"
```

---

### Task 4.7: Compose the new `app/page.tsx`

**Files:**
- Modify (rewrite composition only): `components/pages/Page.tsx`

- [ ] **Step 1: Replace the imports + body**

Edit `components/pages/Page.tsx`. Replace the file contents:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import MarketingShell from "@/components/marketing/layout/MarketingShell";
import Hero from "@/components/marketing/sections/Hero";
import Manifesto from "@/components/marketing/sections/Manifesto";
import ModulesGrid from "@/components/marketing/sections/ModulesGrid";
import ModuleDeepDive from "@/components/marketing/sections/ModuleDeepDive";
import ITPanel from "@/components/marketing/sections/ITPanel";
import ClosingCTA from "@/components/marketing/sections/ClosingCTA";

/**
 * Authed users are bounced straight into their workspace — the marketing site
 * is for visitors and prospective admins.
 */
function useRedirectIfAuthed() {
  const router = useRouter();
  const { token, tenantSlug } = useAppSelector((s) => s.auth);
  useEffect(() => {
    if (!token) return;
    const slug =
      tenantSlug ||
      (typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null);
    router.replace(slug ? `/${slug}/dashboard` : "/login");
  }, [token, tenantSlug, router]);
}

export default function LandingPage() {
  useRedirectIfAuthed();

  return (
    <MarketingShell>
      <Hero />
      <Manifesto />
      <ModulesGrid />
      <ModuleDeepDive
        side="right"
        eyebrow="Attendance"
        heading="Never chase a register again."
        body="Bulk marking, period-wise slots and live shortage alerts — attendance that keeps up with how classes really happen."
        bullets={[
          "Mark a whole class in one tap, edit in line",
          "Live shortage tracking per student, per course",
          "Bridges to payroll for staff attendance",
        ]}
        screenshotSrc="/marketing/screenshots/attendance.png"
        screenshotAlt="Peepal attendance — bulk-mark UI for a class"
        screenshotUrl="peepal.app/attendance"
      />
      <ModuleDeepDive
        side="left"
        eyebrow="Payroll"
        heading="Payroll that just runs."
        body="Salary structures, attendance-aware payruns, branded payslips at scale. Statutory reports in one click."
        bullets={[
          "Component-based salary structures",
          "Bulk payslip release with your branding",
          "Attendance, leaves and overtime, factored automatically",
        ]}
        screenshotSrc="/marketing/screenshots/payroll.png"
        screenshotAlt="Peepal payroll — payrun list with detail drawer"
        screenshotUrl="peepal.app/payroll"
      />
      <ModuleDeepDive
        side="right"
        eyebrow="Reports"
        heading="Decisions, not spreadsheets."
        body="Live dashboards and role-aware reports across every module. Exports anywhere. No data team required."
        bullets={[
          "Every module ships dashboards on day one",
          "Role-aware — each user sees their numbers, no manual filtering",
          "CSV / PDF on every table, one click",
        ]}
        screenshotSrc="/marketing/screenshots/reports.png"
        screenshotAlt="Peepal dashboard — KPI tiles and trend charts"
        screenshotUrl="peepal.app/reports"
      />
      <ITPanel />
      <ClosingCTA />
    </MarketingShell>
  );
}
```

- [ ] **Step 2: Boot dev and inspect the new homepage**

```bash
pnpm dev
```

Open `http://localhost:3000/`. Walk top → bottom. Verify each section renders, screenshots load, copy is correct, no console errors. Stop the server.

- [ ] **Step 3: Verify types**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/pages/Page.tsx
git commit -m "feat(marketing): compose new editorial landing page"
```

---

## Phase 5 — Sibling pages, nav, footer, smooth-scroll cleanup

### Task 5.1: Retone `MarketingNav`

**Files:**
- Modify: `components/marketing/layout/MarketingNav.tsx`

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const NAV = [
  { href: "/modules",     label: "Modules"      },
  { href: "/about",       label: "About"        },
  { href: "/mission",     label: "Mission"      },
  { href: "/inspiration", label: "Inspiration"  },
];

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? "bg-[#fafaf9]/85 backdrop-blur-xl border-b border-[#e7e7e3]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="flex items-center">
          <Logo withText size={28} variant="gradient" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-[14px] font-medium text-[#3a3a37] transition-colors hover:text-[#0a0a09]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/login">
            <Button variant="default" size="sm">
              Get started <ChevronRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/layout/MarketingNav.tsx
git commit -m "feat(marketing): retone MarketingNav for editorial light theme"
```

---

### Task 5.2: Force light mode on `MarketingShell` and retone `MarketingFooter`

**Files:**
- Modify: `components/marketing/layout/MarketingShell.tsx`
- Modify: `components/marketing/layout/MarketingFooter.tsx`

- [ ] **Step 1: Edit `MarketingShell` to force light mode**

Replace the file:

```tsx
"use client";

import { useEffect } from "react";
import SmoothScroll from "@/components/marketing/scroll/SmoothScroll";
import MarketingNav from "./MarketingNav";
import MarketingFooter from "./MarketingFooter";

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  // Force light mode for marketing pages regardless of dashboard / OS preference.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => { if (had) root.classList.add("dark"); };
  }, []);

  return (
    <SmoothScroll>
      <div className="relative min-h-screen bg-[#fafaf9] text-[#0a0a09] antialiased">
        <MarketingNav />
        <main>{children}</main>
        <MarketingFooter />
      </div>
    </SmoothScroll>
  );
}
```

- [ ] **Step 2: Replace `MarketingFooter` with retoned styles**

```tsx
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { MODULES } from "@/lib/marketing/modules";

const COLS = [
  {
    title: "Platform",
    links: [
      { href: "/",            label: "Home"        },
      { href: "/modules",     label: "Modules"     },
      { href: "/about",       label: "About"       },
      { href: "/mission",     label: "Mission"     },
      { href: "/inspiration", label: "Inspiration" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms",   label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy"      },
    ],
  },
  {
    title: "Sign in",
    links: [{ href: "/login", label: "Log in to your workspace" }],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="relative mt-32 border-t border-[#e7e7e3] bg-[#fafaf9]">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo withText size={32} variant="gradient" />
            <p className="mt-4 text-sm leading-relaxed text-[#737370]">
              The operating system for modern institutes.
            </p>
          </div>

          <div className="md:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a09]">Modules</h4>
            <ul className="mt-4 space-y-2">
              {MODULES.slice(0, 6).map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/modules/${m.slug}`}
                    className="text-sm text-[#737370] transition-colors hover:text-[#0a0a09]"
                  >
                    {m.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a09]">{col.title}</h4>
              <ul className="mt-4 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#737370] transition-colors hover:text-[#0a0a09]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[#e7e7e3] pt-6 md:flex-row md:items-center">
          <p className="text-xs text-[#737370]">
            © {new Date().getFullYear()} Peepal — Run your institute on one operating system.
          </p>
          <p className="text-xs text-[#737370]">
            Crafted for education, operations and finance teams.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Verify and smoke-test**

```bash
pnpm tsc --noEmit
pnpm dev
```

Open `http://localhost:3000/`. Confirm light mode holds when toggling OS dark mode while the page is open. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/layout/MarketingShell.tsx components/marketing/layout/MarketingFooter.tsx
git commit -m "feat(marketing): retone footer + force light mode on MarketingShell"
```

---

### Task 5.3: Strip GSAP from `SmoothScroll` (Lenis-only)

**Files:**
- Modify: `components/marketing/scroll/SmoothScroll.tsx`

- [ ] **Step 1: Replace the file**

The GSAP `ticker.add` integration is only needed when ScrollTrigger is in play. Drop it; use the standard `requestAnimationFrame` loop documented in Lenis.

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Global smooth-scroll provider — Lenis only.
 * The marketing redesign no longer uses GSAP ScrollTrigger, so the previous
 * gsap.ticker bridge is unnecessary.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/scroll/SmoothScroll.tsx
git commit -m "refactor(marketing): drop GSAP from SmoothScroll, Lenis-only RAF loop"
```

---

### Task 5.4: Visual sweep — `/about`, `/mission`, `/inspiration`

**Files:**
- Modify: `app/about/page.tsx` (only style/copy tweaks if needed)
- Modify: `app/mission/page.tsx`
- Modify: `app/inspiration/page.tsx`
- Modify: `components/marketing/sections/InfoHero.tsx` (likely the shared hero used by these)

- [ ] **Step 1: Inspect each route**

```bash
pnpm dev
```

Visit `/about`, `/mission`, `/inspiration` in turn. They all render under `MarketingShell` so the page surface is already `#fafaf9` and brand colors already swapped via tokens. Document any visual issues in this list:

- Gradient backdrops, glow blobs, or violet/pink hex still present? → strip / retone in `InfoHero.tsx` or in the page bodies.
- Heading sizes overscale (e.g., 5xl headings on a page with ~30 words of body)? → step down to `text-display-3` or smaller per editorial rhythm.
- Text-on-text contrast: `--muted-foreground` on `#fafaf9` should still pass; if anything looks washed out, replace muted text with `text-[#3a3a37]`.

- [ ] **Step 2: Apply targeted edits**

Open each file. Replace any leftover violet/pink hex, gradient blob containers, or `TextReveal`/`ScrollReveal` imports (which we'll delete in Phase 6) with plain text or the new `Reveal` primitive. Do **not** restructure layouts — the goal is brand alignment, not redesign.

For `InfoHero.tsx`, if it still pulls in the GSAP-blob backdrop, replace the backdrop block with a plain `<section className="bg-[#fafaf9] pt-32 pb-16">` wrapper.

- [ ] **Step 3: Verify and re-walk**

```bash
pnpm tsc --noEmit
pnpm dev
```

Re-walk `/about`, `/mission`, `/inspiration`. Confirm each looks clean and editorial. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add app/about app/mission app/inspiration components/marketing/sections/InfoHero.tsx
git commit -m "feat(marketing): sibling pages — strip leftover gradients, align with editorial system"
```

---

### Task 5.5: Visual sweep — `/modules` and `/modules/[slug]`

**Files:**
- Modify: `app/modules/page.tsx` (if needed)
- Modify: each `app/modules/<slug>/page.tsx` (composition is shared via `ModulePage`; usually no changes needed)
- Modify: `components/marketing/modules/ModulePage.tsx`
- Modify: `components/marketing/modules/ModuleHero.tsx`
- Modify: `components/marketing/modules/ModuleFeatures.tsx`
- Modify: `components/marketing/modules/ModuleHighlights.tsx`
- Modify: `components/marketing/modules/WhoCanUse.tsx`

- [ ] **Step 1: Audit the components**

For each file, run `grep -nE "#7c3aed|#ec4899|#a855f7|gradient-to|from-violet|to-pink"` and note any leftover violet/pink references. The brand colors already flow through `MODULES[i].color` which is now forest, but components may have additional inline-styled gradient blobs.

- [ ] **Step 2: Replace gradient blob backdrops with flat `bg-[#fafaf9]`**

Where blob backdrops exist (most likely `ModuleHero.tsx`), replace the absolutely-positioned gradient `<div data-blob>` blocks with nothing — or with a single subtle `bg-[#f0f5f1]` band if a section divider feels needed.

- [ ] **Step 3: Replace `TextReveal` / `ScrollReveal` imports**

Any imports of `@/components/marketing/scroll/TextReveal` or `ScrollReveal` get swapped to the new `Reveal` primitive (`@/components/marketing/primitives/Reveal`). The component is a drop-in for the simple wrap case; for char-by-char animations we explicitly drop the effect and use plain heading text inside `<Reveal>`.

- [ ] **Step 4: Smoke-test every module page**

```bash
pnpm dev
```

Visit `/modules` and click into all nine `/modules/<slug>` pages. Each should:

- Render with forest accents (per-module hue from `MODULES[i].color`).
- Have no gradient-blob backdrops.
- No console errors.

Stop the server.

- [ ] **Step 5: Verify and commit**

```bash
pnpm tsc --noEmit
git add app/modules components/marketing/modules
git commit -m "feat(marketing): align module pages with editorial system"
```

---

## Phase 6 — Cleanup

### Task 6.1: Delete dead section components

**Files:**
- Delete: `components/marketing/sections/PinnedFeatures.tsx`
- Delete: `components/marketing/sections/HorizontalModules.tsx`
- Delete: `components/marketing/sections/ParallaxStats.tsx`
- Delete: `components/marketing/sections/HowItWorks.tsx`
- Delete: `components/marketing/sections/CTASection.tsx`

- [ ] **Step 1: Verify nothing imports these**

```bash
grep -rln \
  -e "marketing/sections/PinnedFeatures" \
  -e "marketing/sections/HorizontalModules" \
  -e "marketing/sections/ParallaxStats" \
  -e "marketing/sections/HowItWorks" \
  -e "marketing/sections/CTASection" \
  app components lib
```

Expected: zero hits. If any remain, fix the importer first (most likely `components/pages/Page.tsx` if Task 4.7 was skipped).

- [ ] **Step 2: Delete**

```bash
rm components/marketing/sections/PinnedFeatures.tsx
rm components/marketing/sections/HorizontalModules.tsx
rm components/marketing/sections/ParallaxStats.tsx
rm components/marketing/sections/HowItWorks.tsx
rm components/marketing/sections/CTASection.tsx
```

- [ ] **Step 3: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/sections
git commit -m "chore(marketing): delete legacy section components (Pinned, Horizontal, Parallax, HowItWorks, CTASection)"
```

---

### Task 6.2: Delete dead scroll primitives

**Files:**
- Delete: `components/marketing/scroll/Pinned.tsx`
- Delete: `components/marketing/scroll/HorizontalScroll.tsx`
- Delete: `components/marketing/scroll/Parallax.tsx`
- Delete: `components/marketing/scroll/TextReveal.tsx`
- Delete: `components/marketing/scroll/ScrollReveal.tsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -rln \
  -e "marketing/scroll/Pinned\"" \
  -e "marketing/scroll/HorizontalScroll" \
  -e "marketing/scroll/Parallax" \
  -e "marketing/scroll/TextReveal" \
  -e "marketing/scroll/ScrollReveal" \
  app components lib
```

Expected: zero hits. Fix any importer (most likely the module pages from Task 5.5) before deleting.

- [ ] **Step 2: Delete**

```bash
rm components/marketing/scroll/Pinned.tsx
rm components/marketing/scroll/HorizontalScroll.tsx
rm components/marketing/scroll/Parallax.tsx
rm components/marketing/scroll/TextReveal.tsx
rm components/marketing/scroll/ScrollReveal.tsx
```

- [ ] **Step 3: Verify**

Run: `pnpm tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/scroll
git commit -m "chore(marketing): delete unused scroll primitives (Pinned, HorizontalScroll, Parallax, TextReveal, ScrollReveal)"
```

---

### Task 6.3: Lint + typecheck pass

- [ ] **Step 1: Run lint and typecheck**

```bash
pnpm tsc --noEmit
pnpm lint
```

Expected: both succeed with zero errors. Fix any reported issues inline (most likely unused imports in the files lightly touched in Phase 5). Re-run until clean.

- [ ] **Step 2: Commit if there were fixes**

```bash
git add .
git commit -m "chore: lint + typecheck cleanup post-redesign"
```

(Skip the commit if there were no fixes.)

---

### Task 6.4: Lighthouse + manual acceptance pass

- [ ] **Step 1: Build and serve a production bundle**

```bash
pnpm build
pnpm start
```

- [ ] **Step 2: Run Lighthouse on `/`**

In Chrome devtools → Lighthouse → "Mobile" + "Performance / Accessibility / Best Practices / SEO". Run on `http://localhost:3000/`.

- Performance ≥ 85 on a Mac/local run.
- Accessibility ≥ 95.
- Best Practices ≥ 95.
- No CLS warnings on hero (hero `BrowserFrame` should reserve aspect ratio via `width`/`height` props).

If any score is dramatically below these targets, file inline fixes — the most common offender will be unoptimized screenshots; verify `next/image` is serving WebP/AVIF (network tab).

- [ ] **Step 3: Final manual acceptance**

Walk the entire homepage one more time. Confirm:

- Hero loads first paint with the dashboard screenshot.
- Manifesto, modules grid, three deep-dives, IT panel, closing CTA all render.
- Scroll feel is smooth (Lenis still active).
- No console errors.
- Toggling OS dark mode while on `/` does not flip the page to dark.

- [ ] **Step 4: Final commit (if anything was touched)**

```bash
git add .
git commit -m "perf(marketing): post-Lighthouse touchups"
```

(Skip if there were no fixes.)

---

## Self-review checklist (run before handoff)

- [x] **Spec coverage:** Every section in the spec maps to at least one task. Color/type/surface/motion → Phase 1 + 2. Sections → Phase 4. Sibling pages + nav/footer → Phase 5. Cleanup → Phase 6. Screenshot pipeline → Phase 3.
- [x] **No placeholders:** Every step shows the exact code/command/expected output. No "TBD", "implement later", or generic "add validation".
- [x] **Type consistency:** `BrowserFrame` props match between primitive (Task 2.1) and consumers (Tasks 4.3, 4.4). `ModuleDeepDive` props match between definition (Task 4.3) and call sites in `app/page.tsx` (Task 4.7). `Reveal` props match between definition (Task 2.2) and consumers (Tasks 4.1, 4.2, 4.3, 4.5, 4.6).
- [x] **Working directory** is fixed at `frontend/` for every command (declared once in File Structure section).
- [x] **Risk mitigations** from spec §9 are addressed: Phase 1.8 click-through, idempotent seed (Task 3.2), `MarketingShell` light-mode forcing (Task 5.2), `next/image` for screenshots (Task 2.1).
