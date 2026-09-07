# PeepalRP

Monorepo for the PeepalRP college ERP platform.

## Layout

- `frontend/` — Next.js app (`collegeerp-frontend`), managed with pnpm.
- `backend/` — Go API server (module `collegeerp`).
- `installer/` — Go desktop installer/control panel (module `github.com/peepal/installer`).
- `architecture/` — generated architecture maps and docs.
- `docs/` — product specs, design plans, and guides.
- `postman/` — Postman collections and environments for the API.

Go modules are wired together with a root `go.work` (`backend` + `installer`), and the JS package
is a pnpm workspace member declared in `pnpm-workspace.yaml`.

## Setup

```bash
# JS deps (frontend)
pnpm install

# Go toolchain picks up both modules automatically via go.work
cd backend && go build ./...
cd ../installer && go build ./...
```

## Common tasks

Run from the repo root:

```bash
pnpm dev              # frontend dev server
pnpm build             # frontend production build
pnpm lint              # frontend lint
pnpm test              # frontend tests
pnpm backend:build     # go build ./... in backend
pnpm backend:run       # go run ./cmd in backend
pnpm installer:build   # go build ./... in installer
```

Each package also keeps its own README with package-specific details:
[`frontend/README.md`](./frontend/README.md) *(if present)*, [`backend/README.md`](./backend/README.md).
