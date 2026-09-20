// Helpers for the "bulk assign managers" flow on the Org Structure page.
//
// Each row is one employee (the reportee). The reportee's identity columns are
// pre-filled from the employee list; the admin only fills in the `manager`
// column with the manager's email OR employee ID. On submit we resolve that to
// a user id and call assignUserManager(userId = reportee, managerId = manager).

export interface EmployeeLite {
  employeeId: string;
  user: { id: string; name: string; email: string; role?: string | null };
  department?: { name: string } | null;
}

export interface OrgUserLite {
  id: string;
  name: string;
  email: string;
  role: string;
  managerId?: string | null;
}

// One editable row in the review table.
export interface AssignRow {
  userId: string; // reportee's user id — the stable key
  employeeId: string;
  name: string;
  email: string;
  department: string;
  currentManager: string; // display-only: current manager's name, or ""
  manager: string; // editable: manager email or employee ID
}

// CSV column order for the downloadable, pre-filled template.
export const MANAGER_CSV_HEADER = ["employee_name", "employee_id", "employee_email", "manager"] as const;

// Lookups used to resolve a typed manager value and current managers.
export interface ManagerIndexes {
  byEmployeeId: Map<string, string>; // lower(employeeId) -> userId
  byEmail: Map<string, string>; // lower(email) -> userId
  nameByUserId: Map<string, string>; // userId -> display name
  managerByUserId: Map<string, string | null>; // userId -> current managerId
}

function lc(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function buildIndexes(employees: EmployeeLite[], orgUsers: OrgUserLite[]): ManagerIndexes {
  const byEmployeeId = new Map<string, string>();
  const byEmail = new Map<string, string>();
  const nameByUserId = new Map<string, string>();
  const managerByUserId = new Map<string, string | null>();

  // Employee IDs only exist on the employee record.
  for (const e of employees) {
    if (e.employeeId) byEmployeeId.set(lc(e.employeeId), e.user.id);
  }
  // Emails + names + current managers come from the org-user list (covers
  // admins too, so an admin can be named as a manager).
  for (const u of orgUsers) {
    if (u.role === "student") continue;
    if (u.email) byEmail.set(lc(u.email), u.id);
    nameByUserId.set(u.id, u.name);
    managerByUserId.set(u.id, u.managerId ?? null);
  }
  return { byEmployeeId, byEmail, nameByUserId, managerByUserId };
}

// Build the full set of editable rows (one per employee), manager left blank.
export function buildAssignRows(employees: EmployeeLite[], idx: ManagerIndexes): AssignRow[] {
  return employees
    .filter((e) => e.user?.role !== "student")
    .map((e) => {
      const currentMgrId = idx.managerByUserId.get(e.user.id) ?? null;
      return {
        userId: e.user.id,
        employeeId: e.employeeId,
        name: e.user.name,
        email: e.user.email,
        department: e.department?.name ?? "",
        currentManager: currentMgrId ? idx.nameByUserId.get(currentMgrId) ?? "" : "",
        manager: "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Pre-filled CSV: identity columns populated, manager blank for the admin.
export function buildManagerCsv(rows: AssignRow[]): string {
  const lines = [MANAGER_CSV_HEADER.join(",")];
  for (const r of rows) {
    lines.push([r.name, r.employeeId, r.email, ""].map(csvEscape).join(","));
  }
  return lines.join("\n");
}

// Overlay manager values parsed from an uploaded CSV onto the row set, matching
// each CSV row to a reportee by employee_id first, then email. Unmatched CSV
// rows are ignored so a stale or partial file can't corrupt the table.
export function applyCsvManagers(
  rows: AssignRow[],
  parsed: Record<string, string>[],
): AssignRow[] {
  const byEmpId = new Map<string, number>();
  const byEmail = new Map<string, number>();
  rows.forEach((r, i) => {
    if (r.employeeId) byEmpId.set(lc(r.employeeId), i);
    if (r.email) byEmail.set(lc(r.email), i);
  });

  const next = rows.map((r) => ({ ...r }));
  for (const p of parsed) {
    const empId = lc(p["employee_id"]);
    const email = lc(p["employee_email"]);
    let i: number | undefined;
    if (empId && byEmpId.has(empId)) i = byEmpId.get(empId);
    else if (email && byEmail.has(email)) i = byEmail.get(email);
    if (i !== undefined) next[i].manager = (p["manager"] ?? "").trim();
  }
  return next;
}

export interface Resolved {
  managerId?: string;
  error?: string;
}

// Resolve a manager cell (email or employee ID) to a user id. A blank cell is
// "no change" — represented by an empty result with no error.
export function resolveManager(value: string, idx: ManagerIndexes): Resolved {
  const v = value.trim();
  if (!v) return {};
  const id = idx.byEmployeeId.get(lc(v)) ?? idx.byEmail.get(lc(v));
  if (!id) return { error: "manager not found (use their email or employee ID)" };
  return { managerId: id };
}

// Per-row validation for instant feedback. Blank manager → valid (skipped).
// `descendants` is the set of the reportee's reports, used to block cycles.
export function validateRow(
  row: AssignRow,
  idx: ManagerIndexes,
  descendantsOf: (userId: string) => Set<string>,
): string | null {
  const v = row.manager.trim();
  if (!v) return null;
  const { managerId, error } = resolveManager(v, idx);
  if (error) return error;
  if (managerId === row.userId) return "an employee can't be their own manager";
  if (descendantsOf(row.userId).has(managerId!)) return "that person reports to this employee (would loop)";
  return null;
}

// Submit-time cycle guard. Walks up the working manager map from `managerId`;
// if it reaches `childId`, the assignment would create a loop. This catches
// cycles formed across multiple rows in the same upload.
export function createsCycle(
  managerMap: Map<string, string | null>,
  childId: string,
  managerId: string,
): boolean {
  let cur: string | null | undefined = managerId;
  const seen = new Set<string>();
  while (cur) {
    if (cur === childId) return true;
    if (seen.has(cur)) break; // pre-existing loop elsewhere — stop
    seen.add(cur);
    cur = managerMap.get(cur) ?? null;
  }
  return false;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
