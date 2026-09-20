# In-app issue reporting (GitHub Issues + Projects)

**Date:** 2026-09-20  
**Status:** Approved for implementation planning  
**Approach:** Thin GraphQL proxy to GitHub (live create + live read; no local issue mirror)

## Goal

Let every logged-in user (tenant roles and super admin) report bugs and requests from inside Peepal. Each submission becomes a GitHub issue on `workvar/peepal-rp`, is added to a triage Project, and remains visible in-app with status, search, and filters — scoped so a tenant only sees its own in-app issues (super admin sees all in-app issues).

## Non-goals

- Storing a Postgres mirror of issues or webhook-based sync.
- Letting tenants see developer-created GitHub issues (no `source:in-app` label) or other tenants’ issues.
- Editing/closing issues from the app (status is read from GitHub; triage stays on GitHub/Project).
- Client-side GitHub tokens or browser-direct GitHub API calls.
- Configurable target repo (always `workvar/peepal-rp` for v1).

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Destination repo | Always `workvar/peepal-rp` |
| Read model | Live GitHub API (Approach B) |
| Tenant isolation | Labels **and** body metadata (Approach C) |
| Super admin visibility | All in-app issues across tenants (Approach B) |
| Submit form | Title, description, type, severity, attachments (Approach C) |
| Project board | Env `GITHUB_PROJECT_ID` (Approach C) |
| Who can use it | Everyone logged in, including students and patients (Approach A) |
| Architecture | Thin GraphQL proxy to GitHub (Approach 1) |
| API surface | GraphQL only (no new REST routes) |

---

## 1. Architecture & data flow

### Stack

- Backend: gqlgen module (`graph/issues.resolvers.go` + `internal/github` client).
- Frontend: tenant page `/[tenant]/issues` and super-admin page `/super/issues`; sidebar entries in `navConfig` and `superNav`.
- No new Postgres tables for issue content.

### Server env (never exposed to the client)

| Variable | Purpose | Default |
| --- | --- | --- |
| `GITHUB_TOKEN` | PAT or GitHub App installation token with Issues + Projects write on the repo | required for the feature |
| `GITHUB_OWNER` | Repo owner | `workvar` |
| `GITHUB_REPO` | Repo name | `peepal-rp` |
| `GITHUB_PROJECT_ID` | Projects v2 node ID for triage | required to add cards; create still works if unset, with a logged warning |

If `GITHUB_TOKEN` is unset, mutations/queries return a clear “issue tracker unavailable” error and the UI shows a disabled/empty state.

### Create flow

1. Client may first upload files through the backend-proxied attachment endpoint and receive GitHub-hosted URLs.
2. Authenticated user submits title, body, type, severity, optional page URL, and `attachmentUrls`.
3. Backend derives tenant slug from session (`tenant:platform` for super admin with no tenant).
4. Creates issue with labels:
   - `source:in-app`
   - `tenant:<slug>`
   - `type:bug` | `type:feature` | `type:question`
   - `severity:low` | `severity:medium` | `severity:high` | `severity:critical`
5. Embeds attachment URLs in the body (and optionally a follow-up comment) and appends a hidden HTML comment metadata block (tenant ID, tenant slug, user ID, email, role, page URL, user-agent).
6. Adds the issue to the Project identified by `GITHUB_PROJECT_ID` (GraphQL Projects v2 `addProjectV2ItemById`).
7. Returns the mapped `AppIssue` to the client.

### List / search / detail flow

- Build a GitHub search query:
  - Base: `repo:workvar/peepal-rp is:issue label:source:in-app`
  - Tenant users: always append `label:tenant:<session-slug>` (client cannot override).
  - Super admin: omit tenant label, or append `label:tenant:<filter>` when the UI filter is set.
  - Optional: `is:open` / `is:closed`, type/severity labels, and free-text search terms.
- Map results to `AppIssue`; strip the metadata comment from `body` before returning.
- `appIssue(number)` fetches one issue and returns not-found if it lacks `source:in-app` or (for tenant users) the wrong tenant label.

### Visibility rules

- Tenant A never receives Tenant B’s issues.
- Issues without `source:in-app` never appear in the app.
- Enforcement is server-side from the auth context.

---

## 2. UI

### Navigation

- Tenant sidebar (`frontend/components/layout/sidebar/navConfig.ts`): top-level **Issues** → `/issues`, roles: `admin`, `teacher`, `student`, `staff`, `super_admin`, `patient`.
- Super-admin sidebar (`frontend/components/layout/super/superNav.ts`): **Issues** → `/super/issues`.

### List page

1. Header “Issues” + primary **Report an issue** action.
2. Search bar (title/body text via GitHub search).
3. Filters: status (open / closed / all), type, severity; super-admin also gets a tenant dropdown.
4. Result rows: number, title, type, severity, status, submitter (from metadata when present), created date.
5. Row opens a detail drawer/page: cleaned description, attachments, status, and a “View on GitHub” link (visible to anyone who can see the issue).

### Submit form (modal or dedicated sub-route)

- Title (required)
- Type: Bug | Feature | Question
- Severity: Low | Medium | High | Critical
- Description (required, plain/markdown textarea)
- Attachments: images and PDFs; max 5 files, 5 MB each
- Read-only context: organisation name, user email/role, current page URL

### Empty / error states

- No matching issues → empty state with CTA to report.
- GitHub / token unavailable → non-technical error + retry; never leak token or raw API errors.

---

## 3. GraphQL API

### Schema sketch

```graphql
enum AppIssueType { BUG FEATURE QUESTION }
enum AppIssueSeverity { LOW MEDIUM HIGH CRITICAL }
enum AppIssueStatus { OPEN CLOSED }

type AppIssue {
  number: Int!
  title: String!
  body: String!
  type: AppIssueType!
  severity: AppIssueSeverity!
  status: AppIssueStatus!
  tenantSlug: String!
  submitterEmail: String
  submitterRole: String
  htmlUrl: String!
  createdAt: String!
  updatedAt: String!
  attachmentUrls: [String!]!
}

type AppIssueConnection {
  nodes: [AppIssue!]!
  totalCount: Int!
}

input CreateAppIssueInput {
  title: String!
  body: String!
  type: AppIssueType!
  severity: AppIssueSeverity!
  pageUrl: String
  attachmentUrls: [String!]
}

extend type Query {
  appIssues(
    search: String
    status: AppIssueStatus
    type: AppIssueType
    severity: AppIssueSeverity
    tenantSlug: String
    page: Int
    perPage: Int
  ): AppIssueConnection!
  appIssue(number: Int!): AppIssue
}

extend type Mutation {
  createAppIssue(input: CreateAppIssueInput!): AppIssue!
}
```

### Attachments

Prefer a two-step flow: client uploads files through a backend-proxied GitHub asset upload (or a small GraphQL/multipart helper that returns GitHub-hosted URLs), then passes `attachmentUrls` into `createAppIssue`. URLs are embedded in the issue body (and optionally a follow-up comment). Keeps mutation payloads small.

Exact GitHub upload endpoint details are an implementation concern; the contract is: attachments end up hosted by GitHub and linked from the issue, not stored in Peepal object storage for v1.

### AuthZ

- All operations require a logged-in user; any role may call them.
- `tenantSlug` on `appIssues` is ignored for non–super-admin sessions.
- Create always stamps labels from session tenant / platform.

---

## 4. Security & abuse

- GitHub token stays server-side only.
- Rate-limit `createAppIssue` per user (suggested default: 10 / hour); return a clear limit error.
- Validate attachment MIME/size before upload.
- Sanitize title/body length (e.g. title ≤ 200 chars, body ≤ 32 KB).
- Map GitHub API failures to generic client errors; log details server-side.
- Metadata HTML comment must not be returned in `AppIssue.body`.

---

## 5. Testing

- Unit: label construction, metadata encode/decode/strip, search-query builder, tenant filter enforcement.
- Resolver tests with a mocked GitHub client (create, list, get, project add, upload).
- Frontend: form validation and filter wiring with mocked GraphQL.
- CI must not call real GitHub.

---

## 6. Implementation outline (for the later plan)

1. Config + GitHub client package.
2. GraphQL schema + resolvers + mockable interface.
3. Tenant Issues page + nav entry.
4. Super-admin Issues page + nav entry.
5. Attachment upload path.
6. Project add on create.
7. Docs: `.env.example` keys and operator setup (token scopes, project ID).
8. Tests as above.

---

## 7. Open implementation details (non-blocking)

These do not change product decisions; the implementation plan may pick concrete libraries/endpoints:

- Fine-grained PAT vs GitHub App installation token.
- Exact Projects v2 GraphQL mutation field names for the installed API version.
- Whether attachment upload uses the undocumented user-content upload used by github.com UI vs committing files to a dedicated branch (prefer official/supported paths first).
