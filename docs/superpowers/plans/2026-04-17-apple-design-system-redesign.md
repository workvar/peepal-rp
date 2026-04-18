# Apple Design System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the gradient-heavy, purple-branded UI with Apple HIG — semantic color tokens, system typography, grouped module launcher, no gradients anywhere.

**Architecture:** Token-first approach — Task 1–2 lay the foundation (Tailwind config + CSS variables), Tasks 3–5 rewrite the core components that carry the most gradient debt (moduleConfig, GridMenu, dashboard page), Tasks 6–8 clean up the remaining components. Each task produces a buildable state.

**Tech Stack:** Next.js 14, React, Tailwind CSS, TypeScript, Lucide icons, CSS custom properties

---

## File Map

| File | Change |
|---|---|
| `frontend/tailwind.config.ts` | New typography scale, border radius, font family, category colors |
| `frontend/app/globals.css` | Full token layer + component class rewrite |
| `frontend/lib/moduleConfig.ts` | Remove gradient/shadow fields, add group/color |
| `frontend/components/layout/GridMenu.tsx` | Full rewrite — grouped sections, Apple cards |
| `frontend/app/[tenant]/(dashboard)/dashboard/page.tsx` | Full rewrite — no gradients anywhere |
| `frontend/components/ui/card.tsx` | Add `raised` variant |
| `frontend/components/ui/button.tsx` | Remove gradient variant, rename to match spec |
| `frontend/components/ui/badge.tsx` | Remove inline gradient dots |
| `frontend/components/ui/skeleton.tsx` | Replace shimmer with opacity pulse |
| `frontend/components/ui/input.tsx` | Update bg to secondary |
| `frontend/components/layout/Sidebar.tsx` | Full rewrite — Apple HIG sidebar |
| `frontend/components/layout/TopBar.tsx` | Remove hardcoded purple inline styles |

---

## Task 1: Tailwind Config — Typography, Radii, Font

**Files:**
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Replace tailwind.config.ts with the following**

```ts
import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Semantic tokens (CSS var → Tailwind utilities) ──────────────────
      colors: {
        background:  v("background"),
        foreground:  v("foreground"),
        border:      v("border"),
        input:       v("input"),
        ring:        v("ring"),
        card:        { DEFAULT: v("card"), foreground: v("card-foreground") },
        popover:     { DEFAULT: v("popover"), foreground: v("popover-foreground") },
        primary:     { DEFAULT: v("primary"), foreground: v("primary-foreground") },
        secondary:   { DEFAULT: v("secondary"), foreground: v("secondary-foreground") },
        accent:      { DEFAULT: v("accent"), foreground: v("accent-foreground") },
        muted:       { DEFAULT: v("muted"), foreground: v("muted-foreground") },
        destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },
      },

      // ── Apple typography scale ───────────────────────────────────────────
      // Use as: text-large-title, text-headline, text-caption-1, etc.
      fontSize: {
        "large-title": ["2.125rem",  { lineHeight: "2.5625rem" }], // 34px / 41px
        "title-1":     ["1.75rem",   { lineHeight: "2.125rem" }],  // 28px / 34px
        "title-2":     ["1.375rem",  { lineHeight: "1.75rem" }],   // 22px / 28px
        "title-3":     ["1.25rem",   { lineHeight: "1.5625rem" }], // 20px / 25px
        "headline":    ["1.0625rem", { lineHeight: "1.375rem" }],  // 17px / 22px
        "body":        ["1.0625rem", { lineHeight: "1.375rem" }],  // 17px / 22px
        "callout":     ["1rem",      { lineHeight: "1.3125rem" }], // 16px / 21px
        "subhead":     ["0.9375rem", { lineHeight: "1.25rem" }],   // 15px / 20px
        "footnote":    ["0.8125rem", { lineHeight: "1.125rem" }],  // 13px / 18px
        "caption-1":   ["0.75rem",   { lineHeight: "1rem" }],      // 12px / 16px
        "caption-2":   ["0.6875rem", { lineHeight: "0.8125rem" }], // 11px / 13px
      },

      // ── Apple border radii (override Tailwind defaults) ─────────────────
      // Existing code using rounded-xl, rounded-2xl etc. auto-migrates.
      borderRadius: {
        DEFAULT: "10px",
        sm:    "6px",
        md:    "10px",
        lg:    "12px",
        xl:    "16px",
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "32px",
        full:  "9999px",
      },

      // ── System-UI font stack (SF Pro on Apple, system font elsewhere) ────
      fontFamily: {
        sans: [
          "system-ui", "-apple-system", "SF Pro Display",
          "Helvetica Neue", "sans-serif",
        ],
      },

      // ── Functional shadows only — no glow effects ───────────────────────
      boxShadow: {
        sm:  "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        md:  "0 2px 8px rgba(0,0,0,0.08)",
        lg:  "0 4px 16px rgba(0,0,0,0.10)",
        xl:  "0 8px 24px rgba(0,0,0,0.12)",
      },

      // ── Functional animations only ───────────────────────────────────────
      animation: {
        "fade-in":   "fadeIn 0.2s cubic-bezier(0.4,0,0.2,1) both",
        "slide-up":  "slideInFromBottom 0.2s cubic-bezier(0.4,0,0.2,1) both",
        "scale-in":  "scaleIn 0.2s cubic-bezier(0.4,0,0.2,1) both",
        "skeleton":  "skeletonPulse 1.2s ease-in-out infinite",
        "spin":      "spin 1s linear infinite",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideInFromBottom: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        skeletonPulse: {
          "0%,100%": { opacity: "0.4" },
          "50%":     { opacity: "0.7" },
        },
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors from tailwind.config.ts

- [ ] **Step 3: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
git add tailwind.config.ts
git commit -m "feat: apple hig typography scale, border radii, system-ui font"
```

---

## Task 2: CSS Token Layer (globals.css)

**Files:**
- Modify: `frontend/app/globals.css`

This replaces the purple-brand token system with Apple semantic tokens and removes all decorative animations (shimmer, float, gradient-flow). The component layer gets gradient-free button/card styles.

- [ ] **Step 1: Replace frontend/app/globals.css with the following**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─────────────────────────────────────────────────────────────────────────────
   CSS Token System — Apple HIG semantic tokens
   ───────────────────────────────────────────────────────────────────────────── */
@layer base {
  :root {
    /* Backgrounds */
    --background:             255 255 255;   /* #FFFFFF */
    --foreground:             0   0   0;     /* #000000 */
    --card:                   255 255 255;
    --card-foreground:        0   0   0;
    --popover:                255 255 255;
    --popover-foreground:     0   0   0;

    /* Brand / Accent — Apple blue */
    --primary:                0   122 255;   /* #007AFF */
    --primary-foreground:     255 255 255;
    --secondary:              242 242 247;   /* #F2F2F7 grouped bg */
    --secondary-foreground:   60  60  67;
    --accent:                 0   122 255;
    --accent-foreground:      255 255 255;

    /* Semantic */
    --muted:                  242 242 247;
    --muted-foreground:       99  99  102;   /* ~rgba(60,60,67,0.6) on white */
    --destructive:            255 59  48;    /* Apple red #FF3B30 */
    --destructive-foreground: 255 255 255;
    --success:                52  199 89;    /* Apple green #34C759 */
    --warning:                255 149 0;     /* Apple orange #FF9500 */
    --border:                 209 209 214;   /* light separator */
    --input:                  209 209 214;
    --ring:                   0   122 255;
    --radius:                 1rem;

    /* Legacy aliases (keep for old components) */
    --text-primary:           0   0   0;
    --text-muted:             99  99  102;
    --bg-base:                255 255 255;
    --bg-surface:             255 255 255;

    /* Category colors — solid hex, adaptive per mode */
    --color-category-blue:    #007AFF;
    --color-category-purple:  #AF52DE;
    --color-category-green:   #34C759;
    --color-category-orange:  #FF9500;
    --color-category-teal:    #5AC8FA;
    --color-category-pink:    #FF2D55;
    --color-category-indigo:  #5856D6;
    --color-category-red:     #FF3B30;
  }

  .dark {
    --background:             0   0   0;     /* pure black */
    --foreground:             255 255 255;
    --card:                   28  28  30;    /* #1C1C1E */
    --card-foreground:        255 255 255;
    --popover:                44  44  46;    /* #2C2C2E */
    --popover-foreground:     255 255 255;

    --primary:                10  132 255;   /* #0A84FF */
    --primary-foreground:     255 255 255;
    --secondary:              28  28  30;
    --secondary-foreground:   235 235 245;
    --accent:                 10  132 255;
    --accent-foreground:      255 255 255;

    --muted:                  28  28  30;
    --muted-foreground:       174 174 178;   /* ~rgba(235,235,245,0.6) */
    --destructive:            255 69  58;    /* #FF453A */
    --destructive-foreground: 0   0   0;
    --success:                48  209 88;    /* #30D158 */
    --warning:                255 159 10;    /* #FF9F0A */
    --border:                 56  56  58;    /* #383A3A dark separator */
    --input:                  56  56  58;
    --ring:                   10  132 255;

    --text-primary:           255 255 255;
    --text-muted:             174 174 178;
    --bg-base:                0   0   0;
    --bg-surface:             28  28  30;

    --color-category-blue:    #0A84FF;
    --color-category-purple:  #BF5AF2;
    --color-category-green:   #30D158;
    --color-category-orange:  #FF9F0A;
    --color-category-teal:    #64D2FF;
    --color-category-pink:    #FF375F;
    --color-category-indigo:  #6E6CF0;
    --color-category-red:     #FF453A;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-family: system-ui, -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif;
  }

  body {
    background-color: rgb(var(--background));
    color: rgb(var(--foreground));
    transition: background-color 0.25s ease, color 0.25s ease;
  }

  ::-webkit-scrollbar        { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track  { background: transparent; }
  ::-webkit-scrollbar-thumb  { background: rgba(0,0,0,0.18); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.30); }
  .dark ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); }
  .dark ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.30); }

  * { border-color: rgb(var(--border)); }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Keyframes — functional only, no decoration
   ───────────────────────────────────────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideInFromBottom {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideInFromTop {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes slideInFromLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.7; }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────────────────────────────────────── */
@layer utilities {
  .animate-in             { animation: fadeIn 0.2s cubic-bezier(0.4,0,0.2,1) both; }
  .slide-in-from-bottom-4 { animation: slideInFromBottom 0.2s cubic-bezier(0.4,0,0.2,1) both; }
  .slide-in-from-top      { animation: slideInFromTop 0.2s cubic-bezier(0.4,0,0.2,1) both; }
  .slide-in-from-left     { animation: slideInFromLeft 0.2s cubic-bezier(0.4,0,0.2,1) both; }
  .scale-in               { animation: scaleIn 0.2s cubic-bezier(0.4,0,0.2,1) both; }

  /* Interactive scale — spring physics */
  .hover-lift {
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
                box-shadow 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  .hover-lift:hover { transform: scale(1.02); }
  .hover-scale { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
  .hover-scale:hover { transform: scale(1.04); }
  .press { transition: transform 0.15s cubic-bezier(0.4,0,0.2,1); }
  .press:active { transform: scale(0.97); }

  /* Stagger — simple sequential fade, no slide */
  .stagger > * { animation: fadeIn 0.2s cubic-bezier(0.4,0,0.2,1) both; }
  .stagger > *:nth-child(1) { animation-delay:   0ms; }
  .stagger > *:nth-child(2) { animation-delay:  40ms; }
  .stagger > *:nth-child(3) { animation-delay:  80ms; }
  .stagger > *:nth-child(4) { animation-delay: 120ms; }
  .stagger > *:nth-child(5) { animation-delay: 160ms; }
  .stagger > *:nth-child(6) { animation-delay: 200ms; }
  .stagger > *:nth-child(7) { animation-delay: 240ms; }
  .stagger > *:nth-child(8) { animation-delay: 280ms; }
  .stagger > *:nth-child(9) { animation-delay: 320ms; }

  .tabular-nums { font-variant-numeric: tabular-nums; }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component Classes
   ───────────────────────────────────────────────────────────────────────────── */
@layer components {

  /* ── Buttons ──────────────────────────────────────────────────────────── */
  .btn {
    @apply inline-flex items-center justify-center gap-2 whitespace-nowrap
           font-semibold text-sm rounded-xl border-0
           transition-all duration-150 cursor-pointer select-none
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
           disabled:opacity-40 disabled:pointer-events-none;
    padding: 0.55rem 1.1rem;
    line-height: 1.25rem;
  }
  .btn:active:not(:disabled) { transform: scale(0.97); }

  /* filled — solid accent bg, primary actions only */
  .btn-primary {
    @apply btn text-white;
    background: rgb(var(--primary));
  }
  .btn-primary:hover:not(:disabled) { filter: brightness(0.92); }

  /* tinted — accent bg at 12% */
  .btn-secondary {
    @apply btn;
    background: rgb(var(--primary) / 0.12);
    color: rgb(var(--primary));
  }
  .btn-secondary:hover:not(:disabled) { background: rgb(var(--primary) / 0.18); }

  /* plain — no bg, accent text */
  .btn-ghost {
    @apply btn bg-transparent;
    color: rgb(var(--primary));
  }
  .btn-ghost:hover:not(:disabled) { background: rgb(var(--primary) / 0.08); }

  /* outline */
  .btn-outline {
    @apply btn bg-transparent;
    border: 1px solid rgb(var(--border));
    color: rgb(var(--foreground));
  }
  .btn-outline:hover:not(:disabled) { background: rgb(var(--muted)); }

  /* error */
  .btn-error {
    @apply btn text-white;
    background: rgb(var(--destructive));
  }
  .btn-error:hover:not(:disabled) { filter: brightness(0.92); }

  /* success */
  .btn-success {
    @apply btn text-white;
    background: rgb(var(--success));
  }
  .btn-success:hover:not(:disabled) { filter: brightness(0.92); }

  /* sizes */
  .btn-sm  { @apply text-xs; padding: 0.35rem 0.75rem; border-radius: 0.625rem; }
  .btn-lg  { @apply text-base; padding: 0.75rem 1.75rem; border-radius: 0.875rem; }
  .btn-xs  { @apply text-[11px]; padding: 0.2rem 0.6rem; border-radius: 0.5rem; }

  /* aliases */
  .btn-gradient { @apply btn-primary; }
  .btn-danger   { @apply btn-error; }
  .shadow-glow-sm { box-shadow: 0 4px 15px rgba(0,0,0,0.10); }

  /* ── Input ───────────────────────────────────────────────────────────── */
  .input-field {
    @apply flex h-10 w-full rounded-xl border border-input
           bg-secondary px-4 py-2.5 text-sm text-foreground
           placeholder:text-muted-foreground
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60
           focus-visible:ring-offset-0 focus-visible:border-primary/50
           disabled:cursor-not-allowed disabled:opacity-50
           transition-all duration-150;
  }
  .input          { @apply input-field; }
  .input-bordered { @apply input-field; }

  /* ── Select ──────────────────────────────────────────────────────────── */
  select.input-field,
  select:not([data-custom]) {
    @apply appearance-none cursor-pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b9a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px !important;
    background-color: rgb(var(--secondary));
  }
  select option {
    background-color: rgb(var(--card));
    color: rgb(var(--foreground));
  }

  /* ── Card ────────────────────────────────────────────────────────────── */
  .card {
    border-radius: 1rem;
    border: 1px solid rgb(var(--border));
    background-color: rgb(var(--card));
    color: rgb(var(--card-foreground));
    transition: all 0.15s ease;
    padding: 1.25rem;
  }
  .card-body   { @apply p-5; }
  .card-title  { @apply text-base font-semibold text-foreground mb-1; }
  .card-actions { @apply flex items-center justify-end gap-2 pt-4; }

  .card-hover { @apply card cursor-pointer; }
  .card-hover:hover {
    transform: scale(1.01);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  }
  .dark .card-hover:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.40); }

  .stat-card {
    @apply card flex items-center gap-4 relative overflow-hidden;
    padding: 1.25rem;
  }
  .stat-icon { @apply w-10 h-10 rounded-xl flex items-center justify-center shrink-0; }

  /* ── Badge ───────────────────────────────────────────────────────────── */
  .badge {
    @apply inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
           text-xs font-semibold leading-none;
    white-space: nowrap;
  }
  .badge-primary   { background: rgb(var(--primary) / 0.12);    color: rgb(var(--primary)); }
  .badge-secondary { background: rgb(var(--muted));              color: rgb(var(--muted-foreground)); }
  .badge-success   { background: rgba(52,199,89,0.12);           color: #1a7f37; }
  .badge-warning   { background: rgba(255,149,0,0.12);           color: #b45309; }
  .badge-error     { background: rgb(var(--destructive) / 0.12); color: rgb(var(--destructive)); }
  .badge-info      { background: rgba(90,200,250,0.12);          color: #0582b7; }
  .badge-ghost     { background: rgb(var(--muted));              color: rgb(var(--muted-foreground)); }
  .badge-outline   { border: 1px solid rgb(var(--border));       color: rgb(var(--foreground)); background: transparent; }
  .dark .badge-success { color: #34c759; }
  .dark .badge-warning { color: #ff9500; }
  .dark .badge-error   { color: rgb(var(--destructive)); }
  .dark .badge-info    { color: #5ac8fa; }

  /* ── Table ───────────────────────────────────────────────────────────── */
  .table-th {
    @apply px-5 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground;
    background-color: rgb(var(--muted) / 0.5);
  }
  .table-td  { @apply px-5 py-3.5 text-sm; color: rgb(var(--foreground)); }
  .table-row {
    border-bottom: 1px solid rgb(var(--border) / 0.7);
    transition: background-color 0.1s ease;
  }
  .table-row:hover { background-color: rgb(var(--primary) / 0.04); }

  /* ── Page header helpers ─────────────────────────────────────────────── */
  .page-title    { @apply text-2xl font-bold tracking-tight text-foreground; }
  .page-subtitle { @apply text-sm text-muted-foreground mt-0.5; }
  .section-title { @apply text-base font-semibold text-foreground mb-4; }
  .divider       { border-top: 1px solid rgb(var(--border) / 0.6); margin: 1rem 0; }

  /* ── Topbar — translucent, same in light and dark ────────────────────── */
  .topbar-header {
    background: rgb(var(--background) / 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }

  /* ── Alert ───────────────────────────────────────────────────────────── */
  .alert { @apply flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium; }
  .alert-success { background: rgba(52,199,89,0.10);  border-color: rgba(52,199,89,0.25);  color: #1a7f37; }
  .alert-warning { background: rgba(255,149,0,0.10);  border-color: rgba(255,149,0,0.25);  color: #b45309; }
  .alert-error   { background: rgba(255,59,48,0.10);  border-color: rgba(255,59,48,0.25);  color: #d92b21; }
  .alert-info    { background: rgba(90,200,250,0.10); border-color: rgba(90,200,250,0.25); color: #0582b7; }
  .dark .alert-success { color: #34c759; }
  .dark .alert-warning { color: #ff9500; }
  .dark .alert-error   { color: #ff453a; }
  .dark .alert-info    { color: #64d2ff; }

  /* ── Permission checkbox row ─────────────────────────────────────────── */
  .perm-row {
    @apply flex items-start gap-3 p-4 rounded-2xl border border-border/60
           cursor-pointer select-none transition-all duration-150;
    background: rgb(var(--card));
  }
  .perm-row:hover { border-color: rgb(var(--primary) / 0.30); background: rgb(var(--primary) / 0.04); }
  .perm-row.checked {
    border-color: rgb(var(--primary) / 0.45);
    background: rgb(var(--primary) / 0.08);
  }
}
```

- [ ] **Step 2: Run build to check for CSS errors**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
npm run build 2>&1 | tail -20
```
Expected: build succeeds (app still has gradient inline styles in pages — those get cleaned up in later tasks, TypeScript is fine).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: apple hig css token layer — no gradients, system colors"
```

---

## Task 3: moduleConfig.ts — Remove Gradient/Shadow, Add Group/Color

**Files:**
- Modify: `frontend/lib/moduleConfig.ts`

- [ ] **Step 1: Replace frontend/lib/moduleConfig.ts with the following**

```ts
/**
 * moduleConfig.ts
 * Central definition of all ERP modules — used by GridMenu and ModuleSwitcher.
 * Each module entry drives the grouped grid cards and the expandable switcher.
 */

import type { LucideIcon } from "lucide-react";
import {
  Users, UserCog, GraduationCap, CalendarCheck,
  BookOpen, FileText, DollarSign, CreditCard, BarChart2,
  Calendar, Hotel, Bus, Megaphone, Building, Award,
  ClipboardList, LayoutGrid, User, PieChart,
} from "lucide-react";

export type CategoryColor =
  | "blue" | "purple" | "green" | "orange"
  | "teal" | "pink"   | "indigo" | "red";

export interface ModuleDef {
  id:          string;
  label:       string;
  description: string;
  href:        string;     // tenant-prefixed at runtime via getModules()
  baseHref:    string;     // relative path e.g. /students
  icon:        LucideIcon;
  color:       CategoryColor;  // maps to --color-category-{color}
  group:       string;         // section label in GridMenu
  roles:       string[];
}

// Base module definitions — no hrefs (added at runtime by getModules)
const BASE_MODULES: Omit<ModuleDef, "href">[] = [
  // ── People ────────────────────────────────────────────────────────────────
  { id: "users",         label: "Users",         description: "System users & access",       baseHref: "/users",              icon: Users,         color: "blue",   group: "People",         roles: ["admin"] },
  { id: "employees",     label: "Employees",     description: "Staff profiles & departments", baseHref: "/employees",          icon: UserCog,       color: "blue",   group: "People",         roles: ["admin", "staff"] },
  { id: "students",      label: "Students",      description: "Enrollment & records",         baseHref: "/students",           icon: GraduationCap, color: "blue",   group: "People",         roles: ["admin", "teacher", "student"] },

  // ── Academics ─────────────────────────────────────────────────────────────
  { id: "marks",         label: "Marks",         description: "Grade entry & marksheets",     baseHref: "/marks",              icon: BookOpen,      color: "purple", group: "Academics",      roles: ["admin", "teacher", "student"] },
  { id: "results",       label: "Results",       description: "Exam results & transcripts",   baseHref: "/results",            icon: Award,         color: "purple", group: "Academics",      roles: ["admin", "teacher", "student"] },
  { id: "academic",      label: "Academic",      description: "Subjects & exam schedules",    baseHref: "/academic/subjects",  icon: ClipboardList, color: "purple", group: "Academics",      roles: ["admin", "teacher"] },
  { id: "timetable",     label: "Timetable",     description: "Class & session schedules",    baseHref: "/timetable",          icon: LayoutGrid,    color: "purple", group: "Academics",      roles: ["admin", "teacher", "student", "staff"] },

  // ── Operations ────────────────────────────────────────────────────────────
  { id: "attendance",    label: "Attendance",    description: "Mark & track attendance",      baseHref: "/attendance",         icon: CalendarCheck, color: "green",  group: "Operations",     roles: ["admin", "teacher", "staff", "student"] },
  { id: "leaves",        label: "Leaves",        description: "Leave requests & approvals",   baseHref: "/leaves",             icon: FileText,      color: "green",  group: "Operations",     roles: ["admin", "teacher", "student", "staff"] },

  // ── Finance ───────────────────────────────────────────────────────────────
  { id: "payroll",       label: "Payroll",       description: "Salary & payroll processing",  baseHref: "/payroll",            icon: DollarSign,    color: "orange", group: "Finance",        roles: ["admin", "teacher", "staff"] },
  { id: "fees",          label: "Fees",          description: "Fee collection & records",     baseHref: "/fees",               icon: CreditCard,    color: "orange", group: "Finance",        roles: ["admin", "staff", "student"] },

  // ── Campus ────────────────────────────────────────────────────────────────
  { id: "hostel",        label: "Hostel",        description: "Room & hostel management",     baseHref: "/hostel",             icon: Hotel,         color: "teal",   group: "Campus",         roles: ["admin", "staff", "student"] },
  { id: "transport",     label: "Transport",     description: "Buses & route management",     baseHref: "/transport",          icon: Bus,           color: "teal",   group: "Campus",         roles: ["admin", "staff", "student"] },
  { id: "library",       label: "Library",       description: "Books & library records",      baseHref: "/library",            icon: BookOpen,      color: "teal",   group: "Campus",         roles: ["admin", "teacher", "staff", "student"] },
  { id: "events",        label: "Events",        description: "Campus events & calendar",     baseHref: "/events",             icon: Calendar,      color: "teal",   group: "Campus",         roles: ["admin", "teacher", "student", "staff"] },

  // ── Communications ────────────────────────────────────────────────────────
  { id: "announcements", label: "Notices",       description: "Announcements & notices",      baseHref: "/announcements",      icon: Megaphone,     color: "pink",   group: "Communications", roles: ["admin", "teacher", "student", "staff"] },

  // ── Administration ────────────────────────────────────────────────────────
  { id: "reports",       label: "Reports",       description: "Analytics & data exports",     baseHref: "/reports/attendance", icon: BarChart2,     color: "indigo", group: "Administration", roles: ["admin"] },
  { id: "org",           label: "Organisation",  description: "Settings & configuration",     baseHref: "/org/profile",        icon: Building,      color: "indigo", group: "Administration", roles: ["admin"] },

  // ── My Workspace ──────────────────────────────────────────────────────────
  { id: "portal",        label: "My Portal",     description: "Student self-service portal",  baseHref: "/portal",             icon: PieChart,      color: "blue",   group: "My Workspace",   roles: ["student"] },
  { id: "profile",       label: "My Profile",    description: "View & edit your profile",     baseHref: "/profile",            icon: User,          color: "blue",   group: "My Workspace",   roles: ["admin", "teacher", "student", "staff"] },
];

/** Returns module list with hrefs prefixed by the tenant slug. */
export function getModules(tenantSlug: string): ModuleDef[] {
  return BASE_MODULES.map((m) => ({
    ...m,
    href: `/${tenantSlug}${m.baseHref}`,
  }));
}

// ── Pathname → module name lookup ─────────────────────────────────────────────

const PATH_NAMES: Record<string, string> = {
  "/dashboard":           "Home",
  "/users":               "Users",
  "/employees":           "Employees",
  "/students":            "Students",
  "/attendance":          "Attendance",
  "/attendance/summary":  "Attendance Summary",
  "/attendance/shortage": "Shortage List",
  "/attendance/export":   "Attendance Export",
  "/marks":               "Marks",
  "/results":             "Results",
  "/leaves":              "Leaves",
  "/events":              "Events",
  "/portal":              "My Portal",
  "/profile":             "My Profile",
  "/academic/subjects":   "Subjects",
  "/academic/exams":      "Exam Schedules",
  "/timetable":           "Timetable",
  "/payroll":             "Payroll",
  "/salary-structures":   "Salary Structures",
  "/fees":                "Fees",
  "/reports/attendance":  "Attendance Report",
  "/reports/marks":       "Marks Report",
  "/reports/fees":        "Fee Report",
  "/reports/payroll":     "Payroll Report",
  "/reports/leaves":      "Leave Report",
  "/hostel":              "Hostel",
  "/transport":           "Transport",
  "/library":             "Library",
  "/announcements":       "Announcements",
  "/notifications":       "Notifications",
  "/org/profile":         "Org Profile",
  "/org/departments":     "Departments",
  "/org/academic-years":  "Academic Years",
  "/org/roles":           "Roles",
  "/org/holidays":        "Holidays",
  "/leave-types":         "Leave Types",
};

/**
 * Returns a human-readable name for the current pathname.
 * Pass tenantSlug to strip the tenant prefix before lookup.
 */
export function getModuleName(pathname: string, tenantSlug?: string): string {
  const path = tenantSlug ? pathname.replace(`/${tenantSlug}`, "") || "/" : pathname;
  if (PATH_NAMES[path]) return PATH_NAMES[path];
  const match = Object.keys(PATH_NAMES)
    .sort((a, b) => b.length - a.length)
    .find((key) => path.startsWith(key) && key !== "/dashboard");
  return match ? PATH_NAMES[match] : "Dashboard";
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
npx tsc --noEmit 2>&1 | grep "moduleConfig\|GridMenu\|ModuleSwitcher" | head -20
```
Expected: any errors will show `gradient` or `shadow` used elsewhere (ModuleSwitcher) — fix those in their own tasks.

- [ ] **Step 3: Commit**

```bash
git add lib/moduleConfig.ts
git commit -m "feat: moduleConfig — replace gradient/shadow with group/color fields"
```

---

## Task 4: GridMenu.tsx — Grouped Module Launcher

**Files:**
- Modify: `frontend/components/layout/GridMenu.tsx`

- [ ] **Step 1: Replace frontend/components/layout/GridMenu.tsx with the following**

```tsx
"use client";

/**
 * GridMenu — home-screen module launcher.
 *
 * Renders modules in named groups (People, Academics, etc.).
 * Apple HIG style: neutral surface cards, solid category color icon badge,
 * typography-driven hierarchy. No gradients.
 */

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { getModules, type CategoryColor } from "@/lib/moduleConfig";

/** Maps a CategoryColor token to its CSS variable. */
function categoryVar(color: CategoryColor): string {
  return `var(--color-category-${color})`;
}

/** Group order defines display sequence. */
const GROUP_ORDER = [
  "People",
  "Academics",
  "Operations",
  "Finance",
  "Campus",
  "Communications",
  "Administration",
  "My Workspace",
];

export default function GridMenu() {
  const { user, tenantSlug } = useAppSelector((s) => s.auth);
  const role = user?.role ?? "";
  const slug =
    tenantSlug ??
    (typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : "") ??
    "";

  const allModules = getModules(slug).filter((m) => m.roles.includes(role));

  // Build group → modules map
  const groupMap = new Map<string, typeof allModules>();
  for (const order of GROUP_ORDER) {
    const mods = allModules.filter((m) => m.group === order);
    if (mods.length > 0) groupMap.set(order, mods);
  }

  return (
    <section className="space-y-6">
      {Array.from(groupMap.entries()).map(([groupName, mods]) => (
        <div key={groupName}>
          {/* Section header */}
          <p
            className="mb-2 text-caption-2 font-semibold uppercase tracking-[0.06em]"
            style={{ color: "rgb(var(--muted-foreground))" }}
          >
            {groupName}
          </p>

          {/* Module cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {mods.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.id}
                  href={mod.href}
                  className="
                    group flex flex-col gap-3 p-4 rounded-xl
                    border border-border bg-card
                    transition-all duration-200
                    hover:scale-[1.02] active:scale-[0.98]
                    hover:shadow-md
                  "
                  style={{
                    transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  {/* Icon badge */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: categoryVar(mod.color) }}
                  >
                    <Icon size={20} className="text-white" />
                  </div>

                  {/* Text */}
                  <div>
                    <p className="text-headline font-semibold text-foreground leading-tight">
                      {mod.label}
                    </p>
                    <p className="text-caption-1 text-muted-foreground mt-0.5 leading-snug">
                      {mod.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
npx tsc --noEmit 2>&1 | grep "GridMenu" | head -10
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/layout/GridMenu.tsx
git commit -m "feat: gridmenu — grouped apple hig module launcher, no gradients"
```

---

## Task 5: Dashboard Page Rewrite

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/dashboard/page.tsx`

This replaces the gradient hero banner, gradient stat cards, gradient quick links, and gradient SVG charts with Apple-style clean equivalents.

- [ ] **Step 1: Replace the dashboard page with the following**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDashboardStats, fetchDashboardCharts } from "@/store/slices/reportSlice";
import { fetchAnnouncements } from "@/store/slices/notificationSlice";
import Link from "next/link";
import {
  Users, GraduationCap, Briefcase, Clock,
  CheckCircle, XCircle, Bell, ArrowRight,
  TrendingUp, AlertCircle, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import GridMenu from "@/components/layout/GridMenu";

// ── Chart helpers (no external library) ───────────────────────────────────────

interface ChartPoint { label: string; value: number; }

function SvgLineChart({ data, color, unit = "" }: { data: ChartPoint[]; color: string; unit?: string }) {
  const W = 400; const H = 160; const pad = { t: 10, r: 20, b: 30, l: 36 };
  const cw = W - pad.l - pad.r; const ch = H - pad.t - pad.b;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const xs = data.map((_, i) => pad.l + (i / Math.max(data.length - 1, 1)) * cw);
  const ys = data.map((d) => pad.t + ch - (d.value / maxV) * ch);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  // Solid area fill at 8% opacity — no gradient
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${(pad.t + ch).toFixed(1)} L${xs[0].toFixed(1)},${(pad.t + ch).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + ch * t;
        return <line key={t} x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="rgb(var(--border))" strokeDasharray="4 4" />;
      })}
      <path d={area} fill={color} fillOpacity="0.08" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={ys[i]} r="3.5" fill={color} stroke="rgb(var(--card))" strokeWidth="1.5" />
          <text x={xs[i]} y={H - 4} textAnchor="middle" fontSize="9" fill="rgb(var(--muted-foreground))">{d.label}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <text key={`v${i}`} x={xs[i]} y={ys[i] - 8} textAnchor="middle" fontSize="9" fill={color} fontWeight="600">
          {d.value.toFixed(1)}{unit}
        </text>
      ))}
    </svg>
  );
}

function SvgBarChart({ data, color, unit = "", formatValue }: {
  data: ChartPoint[]; color: string; unit?: string; formatValue?: (v: number) => string;
}) {
  const W = 400; const H = 160; const pad = { t: 16, r: 12, b: 30, l: 36 };
  const cw = W - pad.l - pad.r; const ch = H - pad.t - pad.b;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const gap = 6; const bw = Math.max(4, (cw / data.length) - gap);
  const fmt = formatValue ?? ((v: number) => `${v}${unit}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + ch * t;
        return <line key={t} x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="rgb(var(--border))" strokeDasharray="4 4" />;
      })}
      {data.map((d, i) => {
        const barH = (d.value / maxV) * ch;
        const x = pad.l + i * (bw + gap) + gap / 2;
        const y = pad.t + ch - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={barH} rx="4" fill={color} fillOpacity="0.85" />
            <text x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="rgb(var(--muted-foreground))">{d.label}</text>
            {barH > 14 && (
              <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="8" fill={color} fontWeight="600">{fmt(d.value)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const PIE_COLORS = [
  "var(--color-category-blue)",
  "var(--color-category-purple)",
  "var(--color-category-green)",
  "var(--color-category-orange)",
  "var(--color-category-teal)",
  "var(--color-category-pink)",
  "var(--color-category-indigo)",
];

function SvgDonutChart({ data }: { data: ChartPoint[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 90; const cy = 80; const r = 60; const innerR = 38;
  let startAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const slice = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + slice;
    const x1 = cx + r * Math.cos(startAngle); const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);   const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle); const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);   const iy2 = cy + innerR * Math.sin(endAngle);
    const large = slice > Math.PI ? 1 : 0;
    const path = `M${ix1.toFixed(2)},${iy1.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${ix2.toFixed(2)},${iy2.toFixed(2)} A${innerR},${innerR} 0 ${large} 0 ${ix1.toFixed(2)},${iy1.toFixed(2)} Z`;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    startAngle = endAngle;
    return { path, color, label: d.label, value: d.value };
  });
  return (
    <svg viewBox="0 0 360 160" className="w-full" style={{ height: 160 }}>
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.9" />)}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="rgb(var(--foreground))">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="rgb(var(--muted-foreground))">Total</text>
      <g>
        {slices.map((s, i) => (
          <g key={i} transform={`translate(190,${20 + i * 20})`}>
            <rect width="10" height="10" rx="2" fill={s.color} />
            <text x="14" y="9" fontSize="10" fill="rgb(var(--muted-foreground))">{s.label} ({s.value})</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:     string;
  value:     number | string;
  icon:      React.ElementType;
  color:     string;  // CSS variable e.g. "var(--color-category-blue)"
  href?:     string;
  trend?:    string;
}

function StatCard({ label, value, icon: Icon, color, href, trend }: StatCardProps) {
  const inner = (
    <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
      <div className="min-w-0">
        <p className="text-caption-1 font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {label}
        </p>
        <p className="text-title-1 font-bold text-foreground tabular-nums leading-none">
          {value}
        </p>
        {trend && (
          <p className="text-caption-2 text-muted-foreground mt-1.5 flex items-center gap-1">
            <TrendingUp size={10} /> {trend}
          </p>
        )}
      </div>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: color }}
      >
        <Icon size={18} className="text-white" />
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : <div>{inner}</div>;
}

// ── Priority dot ───────────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: string }) {
  const color =
    priority === "urgent" ? "var(--color-category-red)" :
    priority === "high"   ? "var(--color-category-orange)" :
                            "var(--color-category-blue)";
  return (
    <span
      className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
      style={{ background: color }}
    />
  );
}

// ── Quick report row ───────────────────────────────────────────────────────────

function QuickReportRow({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 hover:bg-secondary transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl"
    >
      <span className="text-headline font-semibold text-foreground">{label}</span>
      <ChevronRight size={15} className="text-muted-foreground" />
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { dashboardStats, dashboardCharts, loading } = useAppSelector((s) => s.report);
  const { announcements } = useAppSelector((s) => s.notification);
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role === "admin";
  const firstName = user?.name?.split(" ")[0] ?? "";

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchDashboardStats());
      dispatch(fetchDashboardCharts());
    }
    dispatch(fetchAnnouncements());
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [dispatch, isAdmin]);

  const stats = dashboardStats;

  return (
    <div
      className="space-y-8 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* ── Typographic greeting ─────────────────────────────────────── */}
      <div className="pb-6 border-b border-border">
        <h1 className="text-large-title font-bold text-foreground tracking-tight">
          Good day, {firstName || "there"}
        </h1>
        <p className="text-subhead text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening across your campus today.
        </p>
      </div>

      {/* ── Module grid launcher ─────────────────────────────────────── */}
      <GridMenu />

      {/* ── Admin stats ──────────────────────────────────────────────── */}
      {isAdmin && (
        <>
          {loading && !stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Row 1 — entity counts */}
              <div>
                <p className="text-caption-2 font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                  Organisation
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Students"    value={stats.students}  icon={GraduationCap} color="var(--color-category-blue)"   href="/students"  trend="Enrolled" />
                  <StatCard label="Employees"   value={stats.employees} icon={Briefcase}     color="var(--color-category-pink)"   href="/employees" />
                  <StatCard label="Teachers"    value={stats.teachers}  icon={Users}         color="var(--color-category-teal)"   href="/employees" />
                  <StatCard label="Total Users" value={stats.users}     icon={Users}         color="var(--color-category-indigo)" href="/users"     />
                </div>
              </div>

              {/* Row 2 — today's snapshot */}
              <div>
                <p className="text-caption-2 font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                  Today
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Present"        value={stats.today_present}   icon={CheckCircle} color="var(--color-category-green)"  href="/attendance" />
                  <StatCard label="Absent"         value={stats.today_absent}    icon={XCircle}     color="var(--color-category-red)"    href="/attendance" />
                  <StatCard label="Pending Leaves" value={stats.pending_leaves}  icon={Clock}       color="var(--color-category-orange)" href="/leaves"     />
                  <StatCard label="Draft Payrolls" value={stats.pending_payrolls}icon={Bell}        color="var(--color-category-purple)" href="/payroll"    />
                </div>
              </div>

              {/* Quick reports — plain list */}
              <div>
                <p className="text-caption-2 font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
                  Quick Reports
                </p>
                <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                  <QuickReportRow label="Attendance Report"     href="/reports/attendance" />
                  <QuickReportRow label="Fee Collection Report" href="/reports/fees"       />
                  <QuickReportRow label="Payroll Report"        href="/reports/payroll"    />
                </div>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* ── Announcements ────────────────────────────────────────────── */}
      {announcements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-caption-2 font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Announcements
            </p>
            <Link
              href="/announcements"
              className="text-caption-1 font-semibold text-primary flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="space-y-2">
            {announcements.slice(0, 3).map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start gap-3">
                  <PriorityDot priority={a.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="text-headline font-semibold text-foreground leading-snug truncate">
                      {a.title}
                    </p>
                    <p className="text-callout text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                  </div>
                  <span
                    className="text-caption-2 font-semibold shrink-0 capitalize"
                    style={{
                      color:
                        a.priority === "urgent" ? "var(--color-category-red)" :
                        a.priority === "high"   ? "var(--color-category-orange)" :
                                                  "var(--color-category-blue)",
                    }}
                  >
                    {a.priority}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts (admin only) ──────────────────────────────────────── */}
      {isAdmin && dashboardCharts && (
        <div>
          <p className="text-title-3 font-semibold text-foreground mb-4">Performance Analytics</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardCharts.attendance_trend?.length > 0 && (
              <Card className="p-4">
                <p className="text-subhead font-semibold text-foreground mb-3">Attendance Trend (Last 7 Days)</p>
                <SvgLineChart
                  data={dashboardCharts.attendance_trend.map((d) => ({ label: d.date.slice(5), value: d.percentage }))}
                  color="var(--color-category-blue)"
                  unit="%"
                />
              </Card>
            )}

            {dashboardCharts.enrollment_by_course?.length > 0 && (
              <Card className="p-4">
                <p className="text-subhead font-semibold text-foreground mb-3">Enrollment by Course</p>
                <SvgDonutChart
                  data={dashboardCharts.enrollment_by_course.map((d) => ({ label: d.course_name, value: d.count }))}
                />
              </Card>
            )}

            {dashboardCharts.marks_distribution?.length > 0 && (
              <Card className="p-4">
                <p className="text-subhead font-semibold text-foreground mb-3">Marks Distribution</p>
                <SvgBarChart
                  data={dashboardCharts.marks_distribution.map((d) => ({ label: d.grade, value: d.count }))}
                  color="var(--color-category-purple)"
                />
              </Card>
            )}

            {dashboardCharts.monthly_fee_collection?.length > 0 && (
              <Card className="p-4">
                <p className="text-subhead font-semibold text-foreground mb-3">Monthly Fee Collection</p>
                <SvgBarChart
                  data={dashboardCharts.monthly_fee_collection.map((d) => ({ label: d.month, value: d.amount }))}
                  color="var(--color-category-green)"
                  unit="₹"
                  formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
npx tsc --noEmit 2>&1 | grep "dashboard/page" | head -10
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/[tenant]/(dashboard)/dashboard/page.tsx"
git commit -m "feat: dashboard page — apple hig, typographic greeting, grouped stats, no gradients"
```

---

## Task 6: Core UI Components

**Files:**
- Modify: `frontend/components/ui/card.tsx`
- Modify: `frontend/components/ui/button.tsx`
- Modify: `frontend/components/ui/badge.tsx`
- Modify: `frontend/components/ui/skeleton.tsx`
- Modify: `frontend/components/ui/input.tsx`

- [ ] **Step 1: Update card.tsx — add raised variant**

Replace `frontend/components/ui/card.tsx` with:

```tsx
import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "raised";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground",
        "transition-all duration-150",
        variant === "raised" && "shadow-md",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-semibold leading-none tracking-tight text-foreground", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

- [ ] **Step 2: Update button.tsx — replace gradient variant with filled/tinted/plain**

Replace `frontend/components/ui/button.tsx` with:

```tsx
import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
type Size    = "default" | "sm" | "lg" | "icon" | "xs";

const variantClasses: Record<Variant, string> = {
  default:     "btn-primary",
  secondary:   "btn-secondary",
  destructive: "btn-error",
  outline:     "btn-outline",
  ghost:       "btn-ghost",
  link:        "btn bg-transparent text-primary hover:underline underline-offset-4 px-0",
};

const sizeClasses: Record<Size, string> = {
  default: "",
  sm:      "btn-sm",
  lg:      "btn-lg",
  xs:      "btn-xs",
  icon:    "h-9 w-9 !p-0 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "btn",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export { Button };
```

- [ ] **Step 3: Update badge.tsx — remove gradient dot, use solid circle**

Replace `frontend/components/ui/badge.tsx` with:

```tsx
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant =
  | "default" | "secondary" | "destructive" | "outline"
  | "success"  | "warning"   | "purple"      | "cyan" | "pink"
  | "green"    | "red"       | "yellow"      | "blue" | "gray";

const variantClasses: Record<string, string> = {
  default:     "bg-primary/12 text-primary",
  secondary:   "bg-muted text-muted-foreground",
  destructive: "bg-destructive/12 text-destructive",
  outline:     "text-foreground border border-border",
  success:     "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  warning:     "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  purple:      "bg-violet-500/12 text-violet-700 dark:text-violet-400",
  cyan:        "bg-cyan-500/12 text-cyan-700 dark:text-cyan-400",
  pink:        "bg-pink-500/12 text-pink-700 dark:text-pink-400",
  green:       "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  red:         "bg-destructive/12 text-destructive",
  yellow:      "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  blue:        "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  gray:        "bg-muted text-muted-foreground",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  label?: string;
}

function Badge({ className, variant = "default", dot = false, label, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
        "text-xs font-semibold tracking-wide transition-all duration-150",
        variantClasses[variant] ?? variantClasses.default,
        className
      )}
      {...props}
    >
      {/* solid dot — no gradient */}
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {children ?? label}
    </span>
  );
}

export { Badge };
export type { BadgeVariant };
export default Badge;
```

- [ ] **Step 4: Update skeleton.tsx — opacity pulse, no shimmer gradient**

Replace `frontend/components/ui/skeleton.tsx` with:

```tsx
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-muted animate-skeleton",
        className
      )}
      {...props}
    />
  );
}
export { Skeleton };
```

- [ ] **Step 5: Update input.tsx — bg-secondary instead of bg-background**

Replace `frontend/components/ui/input.tsx` with:

```tsx
import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm",
          "text-foreground placeholder:text-muted-foreground",
          "ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-150",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
export { Input };
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
npx tsc --noEmit 2>&1 | grep -E "card|button|badge|skeleton|input" | head -15
```
Expected: no errors. If any files use `variant="gradient"` on Button, change them to `variant="default"`.

- [ ] **Step 7: Commit**

```bash
git add components/ui/card.tsx components/ui/button.tsx components/ui/badge.tsx components/ui/skeleton.tsx components/ui/input.tsx
git commit -m "feat: core ui components — apple hig, no gradients, raised card variant"
```

---

## Task 7: Sidebar Redesign

**Files:**
- Modify: `frontend/components/layout/Sidebar.tsx`

The sidebar moves from a dark gradient panel (violet-black) to an Apple-style secondary background sidebar. Light mode: `--secondary` (#F2F2F7 light gray). Dark mode: `--secondary` (#1C1C1E). Active items use accent blue fill. All gradient strings and hardcoded rgba purple values removed.

- [ ] **Step 1: Replace frontend/components/layout/Sidebar.tsx with the following**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useTheme } from "@/context/ThemeContext";
import Switch from "@/components/ui/switch";
import {
  LayoutDashboard, Users, UserCog, GraduationCap, CalendarCheck,
  BookOpen, FileText, LogOut, Settings, Building, Calendar,
  Shield, User, ClipboardList, BarChart2, AlertTriangle,
  CalendarX, DollarSign, Sliders, CreditCard, Megaphone, Bell,
  PieChart, TrendingUp, Sun, LayoutGrid, Hotel, Bus, Award, Download,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

// ── Nav data ───────────────────────────────────────────────────────────────────

const navItems = [
  { label: "Dashboard",     href: "/dashboard",           icon: LayoutDashboard, roles: ["admin","teacher","student","staff"] },
  { label: "Users",         href: "/users",               icon: Users,           roles: ["admin"] },
  { label: "Employees",     href: "/employees",           icon: UserCog,         roles: ["admin","staff"] },
  { label: "Students",      href: "/students",            icon: GraduationCap,   roles: ["admin","teacher","student"] },
  { label: "Attendance",    href: "/attendance",          icon: CalendarCheck,   roles: ["admin","teacher","staff","student"] },
  { label: "Att. Summary",  href: "/attendance/summary",  icon: BarChart2,       roles: ["admin","teacher"] },
  { label: "Shortage List", href: "/attendance/shortage", icon: AlertTriangle,   roles: ["admin"] },
  { label: "Att. Export",   href: "/attendance/export",   icon: Download,        roles: ["admin"] },
  { label: "Marks",         href: "/marks",               icon: BookOpen,        roles: ["admin","teacher","student"] },
  { label: "Results",       href: "/results",             icon: Award,           roles: ["admin","teacher","student"] },
  { label: "Leaves",        href: "/leaves",              icon: FileText,        roles: ["admin","teacher","student","staff"] },
  { label: "Events",        href: "/events",              icon: Calendar,        roles: ["admin","teacher","student","staff"] },
  { label: "My Portal",     href: "/portal",              icon: User,            roles: ["student"] },
  { label: "My Profile",    href: "/profile",             icon: User,            roles: ["admin","teacher","student","staff"] },
];

const academicItems = [
  { label: "Subjects",       href: "/academic/subjects", icon: BookOpen,      roles: ["admin","teacher"] },
  { label: "Exam Schedules", href: "/academic/exams",    icon: ClipboardList, roles: ["admin","teacher"] },
  { label: "Timetable",      href: "/timetable",         icon: LayoutGrid,    roles: ["admin","teacher","student","staff"] },
];

const payrollItems = [
  { label: "Payroll",           href: "/payroll",           icon: DollarSign, roles: ["admin","teacher","staff"] },
  { label: "Salary Structures", href: "/salary-structures", icon: Sliders,    roles: ["admin"] },
];

const feeItems = [
  { label: "Fees", href: "/fees", icon: CreditCard, roles: ["admin","staff","student"] },
];

const reportsItems = [
  { label: "Attendance", href: "/reports/attendance", icon: BarChart2,  roles: ["admin"] },
  { label: "Marks",      href: "/reports/marks",      icon: PieChart,   roles: ["admin"] },
  { label: "Fees",       href: "/reports/fees",       icon: TrendingUp, roles: ["admin"] },
  { label: "Payroll",    href: "/reports/payroll",    icon: TrendingUp, roles: ["admin"] },
  { label: "Leaves",     href: "/reports/leaves",     icon: BarChart2,  roles: ["admin"] },
];

const communicationItems = [
  { label: "Announcements", href: "/announcements", icon: Megaphone, roles: ["admin","teacher","student","staff"] },
  { label: "Notifications", href: "/notifications", icon: Bell,      roles: ["admin","teacher","student","staff"] },
];

const campusItems = [
  { label: "Hostel",    href: "/hostel",    icon: Hotel, roles: ["admin","staff","student"] },
  { label: "Transport", href: "/transport", icon: Bus,   roles: ["admin","staff","student"] },
];

const libraryItems = [
  { label: "Library", href: "/library", icon: BookOpen, roles: ["admin","teacher","staff","student"] },
];

const orgItems = [
  { label: "Org Profile",    href: "/org/profile",        icon: Settings, roles: ["admin"] },
  { label: "Departments",    href: "/org/departments",     icon: Building, roles: ["admin"] },
  { label: "Academic Years", href: "/org/academic-years",  icon: Calendar, roles: ["admin"] },
  { label: "Roles",          href: "/org/roles",           icon: Shield,   roles: ["admin"] },
  { label: "Holidays",       href: "/org/holidays",        icon: CalendarX,roles: ["admin"] },
  { label: "Leave Types",    href: "/leave-types",         icon: FileText, roles: ["admin"] },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavLink({ href, icon: Icon, label, active }: {
  href: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
      style={
        active
          ? {
              background: "rgb(var(--primary) / 0.10)",
              color: "rgb(var(--primary))",
            }
          : {
              color: "rgb(var(--muted-foreground))",
            }
      }
    >
      <Icon size={16} className="shrink-0" style={{ color: active ? "rgb(var(--primary))" : undefined }} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
      {label}
    </p>
  );
}

function SectionDivider() {
  return <div className="mx-3 my-1 h-px bg-border" />;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { theme, mounted, toggleTheme } = useTheme();

  const role = user?.role ?? "";
  const is  = (r: string) => role === r;
  const has = (...roles: string[]) => roles.includes(role);

  const visible = (items: typeof navItems) =>
    items.filter((item) => item.roles.includes(role));

  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="w-64 h-screen flex flex-col shrink-0 overflow-hidden"
      style={{
        background: "rgb(var(--secondary))",
        borderRight: "1px solid rgb(var(--border))",
      }}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border">
        <Logo withText size={32} />
        <p className="text-[10px] text-muted-foreground mt-1 ml-[40px] leading-none font-medium tracking-wide">
          Educational ERP
        </p>
      </div>

      {/* ── User chip ────────────────────────────── */}
      {user && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-card border border-border">
          <p className="text-sm font-semibold truncate leading-tight text-foreground">{user.name}</p>
          <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium capitalize bg-primary/10 text-primary">
            {user.role.replace("_", " ")}
          </span>
        </div>
      )}

      {/* ── Nav ──────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">

        {visible(navItems).map((item) => (
          <NavLink key={item.href} {...item} active={active(item.href)} />
        ))}

        {has("admin", "teacher") && visible(academicItems).length > 0 && (
          <>
            <SectionDivider />
            <SectionLabel label="Academic" />
            {visible(academicItems).map((item) => (
              <NavLink key={item.href} {...item} active={active(item.href)} />
            ))}
          </>
        )}

        {has("admin", "teacher", "staff") && visible(payrollItems).length > 0 && (
          <>
            <SectionDivider />
            <SectionLabel label="Payroll" />
            {visible(payrollItems).map((item) => (
              <NavLink key={item.href} {...item} active={active(item.href)} />
            ))}
          </>
        )}

        {has("admin", "staff", "student") && visible(feeItems).length > 0 && (
          <>
            <SectionDivider />
            <SectionLabel label="Fees" />
            {visible(feeItems).map((item) => (
              <NavLink key={item.href} {...item} active={active(item.href)} />
            ))}
          </>
        )}

        {is("admin") && (
          <>
            <SectionDivider />
            <SectionLabel label="Reports" />
            {reportsItems.map((item) => (
              <NavLink key={item.href} {...item} active={active(item.href)} />
            ))}
          </>
        )}

        {has("admin", "staff", "student") && visible(campusItems).length > 0 && (
          <>
            <SectionDivider />
            <SectionLabel label="Campus Life" />
            {visible(campusItems).map((item) => (
              <NavLink key={item.href} {...item} active={active(item.href)} />
            ))}
          </>
        )}

        {has("admin", "teacher", "staff", "student") && visible(libraryItems).length > 0 && (
          <>
            <SectionDivider />
            <SectionLabel label="Library" />
            {visible(libraryItems).map((item) => (
              <NavLink key={item.href} {...item} active={active(item.href)} />
            ))}
          </>
        )}

        {has("admin", "teacher", "student", "staff") && visible(communicationItems).length > 0 && (
          <>
            <SectionDivider />
            <SectionLabel label="Communication" />
            {visible(communicationItems).map((item) => (
              <NavLink key={item.href} {...item} active={active(item.href)} />
            ))}
          </>
        )}

        {is("admin") && (
          <>
            <SectionDivider />
            <SectionLabel label="Organisation" />
            {orgItems.map((item) => (
              <NavLink key={item.href} {...item} active={active(item.href)} />
            ))}
          </>
        )}
      </nav>

      {/* ── Footer ───────────────────────────────── */}
      <div className="px-3 py-3 space-y-1 border-t border-border">
        {mounted && (
          <div className="flex items-center justify-between px-1 py-2">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sun size={14} className="shrink-0" />
              Dark Mode
            </span>
            <Switch checked={theme === "dark"} onChange={toggleTheme} size="sm" />
          </div>
        )}

        <button
          onClick={() => {
            dispatch(logout());
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
        >
          <LogOut size={15} className="shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
npx tsc --noEmit 2>&1 | grep "Sidebar" | head -10
```
Expected: no errors. Note: `Logo` currently accepts `variant="white"` — the new sidebar uses the default logo. If the Logo component throws a TypeScript error about variant being required, remove the `variant` prop entirely (it defaults to the standard version).

- [ ] **Step 3: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: sidebar — apple hig secondary bg, accent active state, no gradients"
```

---

## Task 8: TopBar Cleanup + Remaining Gradient Sweep

**Files:**
- Modify: `frontend/components/layout/TopBar.tsx`
- Sweep: all remaining `linear-gradient` strings in `frontend/`

- [ ] **Step 1: Update TopBar.tsx — replace hardcoded purple inline styles with semantic tokens**

Replace `frontend/components/layout/TopBar.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useTheme } from "@/context/ThemeContext";
import Switch from "@/components/ui/switch";
import NotificationBell from "@/components/layout/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { Home, Sun, LogOut, ChevronRight } from "lucide-react";
import { getModuleName } from "@/lib/moduleConfig";

export default function TopBar() {
  const pathname  = usePathname();
  const dispatch  = useAppDispatch();
  const { user, tenantSlug } = useAppSelector((s) => s.auth);
  const { theme, mounted, toggleTheme } = useTheme();

  const homeHref = tenantSlug ? `/${tenantSlug}/dashboard` : "/login";
  const isHome   = tenantSlug ? pathname === `/${tenantSlug}/dashboard` : false;
  const modName  = getModuleName(pathname, tenantSlug ?? undefined);

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = "/login";
  };

  return (
    <header className="shrink-0 flex items-center justify-between px-5 py-3 z-40 transition-colors duration-200 topbar-header border-b border-border">
      {/* ── Left: logo + breadcrumb ─────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href={homeHref} className="shrink-0 flex items-center gap-2">
          <Logo withText size={28} />
        </Link>

        {!isHome && (
          <>
            <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
            <Link
              href={homeHref}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-150 bg-primary/10 text-primary hover:bg-primary/15"
            >
              <Home size={12} />
              Home
            </Link>
            <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
            <span className="text-xs font-semibold truncate max-w-[160px] text-foreground">
              {modName}
            </span>
          </>
        )}
      </div>

      {/* ── Right: notifications + theme + user + logout ────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell />

        {mounted && (
          <div className="flex items-center gap-1.5">
            <Sun size={14} className="text-muted-foreground" />
            <Switch checked={theme === "dark"} onChange={toggleTheme} size="sm" />
          </div>
        )}

        {user && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg hidden sm:block bg-secondary text-muted-foreground border border-border">
            {user.name}
          </span>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150 bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Find all remaining linear-gradient occurrences**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
grep -rn "linear-gradient" --include="*.tsx" --include="*.ts" --include="*.css" \
  --exclude-dir=".next" --exclude-dir="node_modules" \
  . | grep -v "globals.css" | grep -v "tailwind.config"
```

Expected output: a list of files still using `linear-gradient`. Common locations will be:
- `components/layout/ModuleSwitcher.tsx` (uses `mod.gradient` — now removed from ModuleDef)
- `components/layout/Header.tsx` (if it exists)
- Other page files

- [ ] **Step 3: Fix ModuleSwitcher.tsx — replace mod.gradient/mod.shadow with category color**

Open `frontend/components/layout/ModuleSwitcher.tsx`. Find all usages of `mod.gradient` and `mod.shadow`. Replace:
- `background: mod.gradient` → `background: \`var(--color-category-${mod.color})\``
- `boxShadow: mod.shadow` → remove entirely (or replace with `"none"`)

The exact edit depends on what the file contains. Run:

```bash
grep -n "mod\.gradient\|mod\.shadow" /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend/components/layout/ModuleSwitcher.tsx
```

Then for each occurrence, use Edit to replace with `var(--color-category-${mod.color})`.

- [ ] **Step 4: Fix any remaining pages with inline linear-gradient**

For each file from Step 2 output (excluding ModuleSwitcher already fixed), open the file and replace `linear-gradient(...)` style values:
- Colored backgrounds → use `var(--color-category-{color})` solid color
- Gradient text (`-webkit-background-clip: text`) → remove entirely, use `color: rgb(var(--primary))` instead
- Decorative `mesh-bg` / `glass` utility usages → remove the class

- [ ] **Step 5: Full TypeScript build check**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
npx tsc --noEmit 2>&1
```
Expected: 0 errors. Fix any type errors before committing.

- [ ] **Step 6: Final verification — confirm no linear-gradient remains**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend
grep -rn "linear-gradient" --include="*.tsx" --include="*.ts" \
  --exclude-dir=".next" --exclude-dir="node_modules" .
```
Expected: empty output (zero results).

- [ ] **Step 7: Commit**

```bash
git add components/layout/TopBar.tsx components/layout/ModuleSwitcher.tsx
git add $(git diff --name-only --diff-filter=M | grep -v ".next")
git commit -m "feat: topbar cleanup + sweep remaining linear-gradient occurrences"
```
