"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { Upload } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { apolloClient } from "@/lib/apollo";
import { GET_ORG_STRUCTURE, GET_ORG_USERS } from "@/graphql/queries/org";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDepartments } from "@/store/slices/orgSlice";
import SearchableSelect from "@/components/ui/SearchableSelect";
import TreeNode from "./TreeNode";
import UserCard from "./UserCard";
import ManageHierarchy, { type OrgUserFlat } from "./ManageHierarchy";
import BulkManagerModal from "./BulkManagerModal";
import type { OrgNode, OrgUser } from "./types";

// Normalise GQL camelCase org user to the local snake_case OrgUser shape.
function toOrgUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  managerId?: string | null;
  departmentId?: string | null;
  designation?: string | null;
}): OrgUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    photo_url: u.photoUrl ?? undefined,
    manager_id: u.managerId ?? null,
    department_id: u.departmentId ?? null,
    designation: u.designation ?? undefined,
  };
}

// Recursively strip student nodes from the tree. Returns null if the node
// itself is a student (so the caller can filter it out).
function filterStudentNodes(n: OrgNode): OrgNode | null {
  if (n.role === "student") return null;
  return {
    ...n,
    children: n.children
      .map(filterStudentNodes)
      .filter((c): c is OrgNode => c !== null),
  };
}

// Recursively normalise a GQL OrgNode tree to the local OrgNode shape.
function toOrgNode(n: {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  managerId?: string | null;
  departmentId?: string | null;
  designation?: string | null;
  children: unknown[];
}): OrgNode {
  return {
    ...toOrgUser(n),
    children: (n.children ?? []).map((c) => toOrgNode(c as Parameters<typeof toOrgNode>[0])),
  };
}

// OrganizationStructurePage shows the company hierarchy as a tree, with
// department filter + user search. Selecting a user highlights them in the
// tree and renders a small "ancestors" trail in the side panel.
export default function OrganizationStructurePage() {
  const dispatch = useAppDispatch();
  const departments = useAppSelector((s) => s.org.departments);
  const isAdmin = useAppSelector((s) => s.auth.user?.role === "admin");

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [roots, setRoots] = useState<OrgNode[]>([]);
  const [departmentId, setDepartmentId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);

  // Flat, unfiltered employee list — drives the manager/reportee pickers and
  // the cycle checks, independent of the department filter on the tree.
  const { data: orgUsersData, refetch: refetchOrgUsers } = useQuery(GET_ORG_USERS);
  const orgUsersFlat: OrgUserFlat[] = useMemo(
    () => (orgUsersData?.orgUsers ?? []).filter((u: OrgUserFlat) => u.role !== "student"),
    [orgUsersData],
  );

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  const loadOrg = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apolloClient.query({
        query: GET_ORG_STRUCTURE,
        variables: { department: departmentId || undefined },
        fetchPolicy: "network-only",
      });
      // Exclude students — org tree shows the employee hierarchy only.
      setRoots(
        (data?.orgStructure?.roots ?? [])
          .map(toOrgNode)
          .map(filterStudentNodes)
          .filter((n: OrgNode | null): n is OrgNode => n !== null),
      );
      setUsers(
        (data?.orgStructure?.users ?? [])
          .map(toOrgUser)
          .filter((u: ReturnType<typeof toOrgUser>) => u.role !== "student"),
      );
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    void loadOrg();
  }, [loadOrg]);

  // After an assignment change, refresh both the flat list and the tree.
  const handleHierarchyChanged = useCallback(async () => {
    await Promise.all([refetchOrgUsers(), loadOrg()]);
  }, [refetchOrgUsers, loadOrg]);

  // Build manager chain for the selected user — used in the side panel.
  const ancestors = useMemo(() => {
    if (!selectedId) return [] as OrgUser[];
    const byId = new Map(users.map((u) => [u.id, u]));
    const chain: OrgUser[] = [];
    let cur = byId.get(selectedId);
    while (cur?.manager_id) {
      const next = byId.get(cur.manager_id);
      if (!next) break;
      chain.push(next);
      cur = next;
    }
    return chain;
  }, [selectedId, users]);

  // Search hits — surfaced as a quick list above the tree.
  const searchHits = useMemo(() => {
    if (!search.trim()) return [] as OrgUser[];
    const q = search.toLowerCase();
    return users
      .filter((u) =>
        [u.name, u.email, u.designation, u.role].some((v) =>
          (v ?? "").toLowerCase().includes(q),
        ),
      )
      .slice(0, 8);
  }, [search, users]);

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Organisation Structure"
        subtitle="Browse the reporting hierarchy and find people"
        actions={
          isAdmin ? (
            <Button variant="outline" onClick={() => setShowBulk(true)}>
              <Upload size={16} /> Bulk Assign Managers
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        {/* ── Tree column ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="w-64">
              <SearchableSelect
                options={[
                  { value: "", label: "All departments" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                value={departmentId}
                onChange={setDepartmentId}
                placeholder="All departments"
                searchPlaceholder="Search departments…"
              />
            </div>
            <input
              className="input-field flex-1 min-w-[200px]"
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {searchHits.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground px-1">
                Search results
              </p>
              {searchHits.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  highlighted={u.id === selectedId}
                  onClick={() => setSelectedId(u.id)}
                />
              ))}
            </div>
          )}

          <div className="card p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : roots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No users in this view. Select a person and use &ldquo;Manage
                reporting line&rdquo; to build the hierarchy.
              </p>
            ) : (
              <div className="space-y-2">
                {roots.map((n) => (
                  <TreeNode
                    key={n.id}
                    node={n}
                    highlightId={selectedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Side panel: selected user + chain ──────────────── */}
        <aside className="space-y-3 sticky top-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground px-1">
            Selected
          </p>
          {selectedUser ? (
            <UserCard user={selectedUser} highlighted />
          ) : (
            <p className="text-sm text-muted-foreground px-1">
              Click a person in the tree to see their reporting line.
            </p>
          )}
          {ancestors.length > 0 && (
            <>
              <p className="text-xs uppercase tracking-wide text-muted-foreground px-1 pt-2">
                Reports up to
              </p>
              <div className="space-y-1">
                {ancestors.map((a) => (
                  <UserCard key={a.id} user={a} onClick={() => setSelectedId(a.id)} />
                ))}
              </div>
            </>
          )}

          {selectedUser && isAdmin && (
            <ManageHierarchy
              user={{ id: selectedUser.id, name: selectedUser.name, managerId: selectedUser.manager_id }}
              orgUsers={orgUsersFlat}
              onChanged={handleHierarchyChanged}
            />
          )}
        </aside>
      </div>

      {isAdmin && (
        <BulkManagerModal
          open={showBulk}
          onClose={() => setShowBulk(false)}
          onFinished={handleHierarchyChanged}
        />
      )}
    </div>
  );
}
