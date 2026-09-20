// Pure helpers for reasoning about the reporting hierarchy. They operate on a
// flat list of users keyed by id + managerId so the same logic serves both the
// manager picker and the reportee picker.
//
// The backend's assignUserManager only blocks self-management, not cycles, so
// these helpers are what keep the UI from creating a loop (A → B → A): we
// exclude a user's descendants from their manager options, and a user's
// ancestors from their reportee options.

export interface HasManager {
  id: string;
  managerId?: string | null;
}

// Direct reports: users whose manager is exactly `managerId`.
export function directReportIds(users: HasManager[], managerId: string): string[] {
  return users.filter((u) => u.managerId === managerId).map((u) => u.id);
}

// Every user beneath `rootId` in the tree (transitive reports). Cycle-safe via
// a visited set, so a pre-existing loop can't hang the traversal.
export function descendantIds(users: HasManager[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const u of users) {
    if (!u.managerId) continue;
    const list = childrenOf.get(u.managerId) ?? [];
    list.push(u.id);
    childrenOf.set(u.managerId, list);
  }
  const out = new Set<string>();
  const stack = [...(childrenOf.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return out;
}

// Every manager above `userId` (transitive). Cycle-safe via a visited set.
export function ancestorIds(users: HasManager[], userId: string): Set<string> {
  const byId = new Map(users.map((u) => [u.id, u]));
  const out = new Set<string>();
  let current = byId.get(userId)?.managerId ?? null;
  while (current && !out.has(current)) {
    out.add(current);
    current = byId.get(current)?.managerId ?? null;
  }
  return out;
}
