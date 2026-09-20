# CollERP E2E Tests

Playwright-based end-to-end tests for the CollERP frontend.
Stacked hierarchy, real backend, LIFO cleanup, live dashboard.

## Quick start

```
cd frontend
pnpm install
pnpm test:install        # downloads Chromium for Playwright
cp tests/.env.example tests/.env
pnpm test
```

Start the Go backend (`cd backend && go run main.go`) and the Next.js dev
server (`pnpm dev`) in separate terminals first. `pnpm test` opens the
live dashboard at `http://localhost:9323` automatically.

## What the dashboard shows

- Left: filter buttons + nested hierarchy tree
- Center: every test in the run with status and duration
- Right (live): currently-running test, every Playwright step as it
  executes, and a streaming console feed (browser console, page errors,
  failed network requests). When you click another test the right panel
  switches to that test; click no test and it auto-follows whichever is
  currently running.

## How the run is shaped

The tests run as a single ordered flow (`workers: 1`,
`fullyParallel: false`). Each layer depends on data created in the layer
above it.

```
Landing page loads
Login page works
├─ Login to super admin
│  ├─ Organizations / Tenants → creates tenant, stores tenantId/Slug
│  ├─ Plans                    → creates plan, stores planId
│  └─ Subscriptions            → creates subscription using tenantId+planId
└─ Login to tenant (uses the slug from above when available)
   ├─ Admin management
   │  ├─ Create user
   │  ├─ Create role
   │  ├─ Create student        → stores studentId
   │  └─ Create employee
   ├─ Attendance
   │  ├─ Add attendance (uses studentId)
   │  └─ Bulk CSV upload
   ├─ Marks                    → enter marks for the student
   └─ Leaves
      ├─ Apply for leave
      └─ Approve leave
```

## Cleanup

Every test that creates a record calls
`track({ kind: "...", id })` from `tests/context/track.ts`. The list is
written to `tests/.run-state.json`. When the run finishes,
`tests/context/teardown.ts` reads it, reverses it (LIFO), and issues
DELETE calls against the Go backend. Subscriptions are removed before
plans and tenants, students before the user that created them, and so on.

A summary line is printed at the end:

```
[teardown] draining 7 cleanup item(s) in LIFO order
  ✓ leave:23
  ✓ marks:14
  ✓ attendance:55
  ✓ employee:9 (EABC1)
  ✓ student:8 (RABC1)
  ✓ user:5 (e2e_user_abc@example.test)
  ✓ subscription:3
  ✓ plan:2 (E2E Plan abc)
  ✓ tenant:1 (tenant e2e-abc)
[teardown] done: 9 deleted, 0 failed
```

If your backend uses a different DELETE path for some kind, edit
`DELETE_PATHS` in `tests/context/teardown.ts`.

## Folder layout

```
tests/
├── playwright.config.ts        Test runner config (workers: 1, serial)
├── .env.example                Copy to .env and edit
├── context/
│   ├── state.ts                In-memory map shared across the flow
│   ├── track.ts                File-backed LIFO cleanup stack
│   ├── api.ts                  fetch wrapper (admin + super tokens)
│   ├── session.ts              Holds super + tenant Playwright pages
│   ├── setup.ts                globalSetup: clears stack
│   └── teardown.ts             globalTeardown: drains stack reversed
├── e2e/
│   ├── 00-flow.spec.ts         Master spec, composes the hierarchy
│   └── flows/                  One small module per feature
│       ├── landing.ts
│       ├── login-page.ts
│       ├── superadmin/{login,tenants,plans,subscriptions}.ts
│       └── tenant/{login,users,roles,students,employees,
│                   attendance,marks,leaves,_nav}.ts
├── pages/                      Optional Page Objects
├── helpers/                    data factories, wait helpers
└── dashboard/                  Live dashboard server + UI
    ├── runner.js               `pnpm test` entrypoint
    ├── server.js               HTTP + WS fan-out
    ├── reporter.js             Playwright reporter (tests + steps + logs)
    └── public/                 Browser UI
```

## Test scripts

- `pnpm test`           runs the full suite with the live dashboard.
- `pnpm test:headed`    runs with a visible browser.
- `pnpm test:ui`        opens Playwright's built-in UI mode.
- `pnpm test:report`    opens the last archived HTML report.

Extra args pass through, so `pnpm test --grep "Create student"` works.

## Adding a new test

See `AUTHORING.md`.

## Troubleshooting

- "Dashboard didn't auto-open": the server still started. Open the URL
  printed in the terminal manually.
- "Cleanup items printed as failed (404)": the route name doesn't match.
  Update `DELETE_PATHS` in `tests/context/teardown.ts`.
- "Login tests fail with org not found": seed a tenant matching
  `TEST_ORG_SLUG`, or let the super-admin flow create one first.
- "Browser not installed": run `pnpm test:install` once.
