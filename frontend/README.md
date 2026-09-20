# Peepal — Educational Institute ERP

A full-stack ERP system for colleges and educational institutes.

**Stack:** Next.js 14 + TypeScript + Redux Toolkit (frontend) · Go Fiber + GORM + PostgreSQL (backend)

---

## Project Structure

```
Peepal/
├── backend/      ← Go Fiber REST API
└── frontend/     ← Next.js 14 app
```

---

## Quick Start

### 1. Backend (Go Fiber)

**Requirements:** Go 1.21+

```bash
cd backend

# Copy env file and edit if needed
cp .env.example .env

# Download dependencies
go mod tidy

# Run the server (starts on :8080)
go run main.go
```

On first run, a default **admin** user is seeded:
- **Email:** `admin@college.edu`
- **Password:** `Admin@123`

Change these in `.env` before deploying.

---

### 2. Frontend (Next.js)

**Requirements:** Node.js 18+

```bash
cd frontend

# Copy env and configure backend URL
cp .env.local.example .env.local

# Install dependencies
npm install

# Start dev server (runs on :3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the admin credentials.

---

## Using Docker (optional)

```bash
# Backend only
cd backend
docker build -t peepal-backend .
docker run -p 8080:8080 peepal-backend
```

---

## Modules

| Module      | Path          | Roles with Access              |
|-------------|---------------|-------------------------------|
| Dashboard   | `/dashboard`  | All                           |
| Users       | `/users`      | Admin only                    |
| Employees   | `/employees`  | Admin, Staff                  |
| Students    | `/students`   | Admin, Teacher, Student       |
| Attendance  | `/attendance` | All                           |
| Marks       | `/marks`      | Admin, Teacher, Student       |
| Leaves      | `/leaves`     | All                           |

---

## API Endpoints

All endpoints are prefixed with `/api`.

| Method | Path                       | Description                    |
|--------|----------------------------|--------------------------------|
| POST   | `/auth/login`              | Login — returns JWT            |
| GET    | `/auth/me`                 | Get current user               |
| GET    | `/users`                   | List users (admin)             |
| POST   | `/users`                   | Create user (admin)            |
| GET    | `/employees`               | List employees                 |
| POST   | `/employees`               | Add employee (admin)           |
| GET    | `/students`                | List students                  |
| POST   | `/students`                | Enroll student (admin)         |
| GET    | `/attendance`              | List attendance records        |
| POST   | `/attendance`              | Mark attendance                |
| POST   | `/attendance/bulk`         | Bulk mark attendance           |
| GET    | `/marks`                   | List marks                     |
| POST   | `/marks`                   | Enter marks (admin/teacher)    |
| GET    | `/leaves`                  | List leave applications        |
| POST   | `/leaves`                  | Apply for leave                |
| PUT    | `/leaves/:id/review`       | Approve/reject leave (admin)   |

---

## Roles & Permissions

- **Admin** — Full access. Creates all user accounts. Approves leaves.
- **Teacher** — Can mark attendance, enter marks, apply/view leaves.
- **Staff** — Can view employees, mark attendance, apply/view leaves.
- **Student** — Can view their own marks, attendance, and apply for leaves.

---

## Development Notes

- The backend uses **PostgreSQL** (Aiven-managed) via the GORM postgres driver (pgx). The connection string is read from the `DB_PATH` env var, and schema migrations run only when the backend is started with the `--migrate` flag.
- Access tokens (JWTs) expire after **15 minutes** (`ACCESS_TOKEN_TTL`). Sessions stay signed in for **30 days** (`REFRESH_TOKEN_TTL`) via a rotating refresh token exchanged at `POST /api/v1/auth/refresh`; the frontend does this automatically on a 401.
- The frontend proxies `/api/*` requests to the backend via `next.config.ts`.
- All API responses follow a consistent `{ success, data, message, error }` envelope.

---

## Legal

- **Terms & Conditions**: [`/terms`](https://peepal.app/terms); source [`app/terms/page.tsx`](app/terms/page.tsx)
- **Privacy Policy**: [`/privacy`](https://peepal.app/privacy); source [`app/privacy/page.tsx`](app/privacy/page.tsx)

Both pages are also linked from the landing page footer under the **Legal** column.
