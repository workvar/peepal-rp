"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Sparkles, Users } from "lucide-react";
import { GET_ORG_USERS } from "@/graphql/queries/org";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchRoles, fetchUsersCustomRoles, assignUserCustomRole } from "@/store/slices/orgSlice";
import toast from "react-hot-toast";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Assign a tenant CustomRole to individual users. The custom role's matrix
// column grants extra access on top of the user's base system role.
export default function UserRoleAssignment() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const tenant = (params?.tenant as string) ?? "";

  const { data } = useQuery(GET_ORG_USERS, { fetchPolicy: "cache-and-network" });
  const roles = useAppSelector((s) => s.org.roles);
  const usersCustomRoles = useAppSelector((s) => s.org.usersCustomRoles);

  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchRoles());
    dispatch(fetchUsersCustomRoles());
  }, [dispatch]);

  const users: OrgUser[] = useMemo(() => {
    const all: OrgUser[] = data?.orgUsers ?? [];
    // Custom roles layer onto non-admin users; admins already have full access.
    const visible = all.filter((u) => u.role !== "admin" && u.role !== "super_admin");
    if (!search) return visible;
    const q = search.toLowerCase();
    return visible.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  const onChange = async (userId: string, customRoleId: string) => {
    setSavingId(userId);
    const result = await dispatch(
      assignUserCustomRole({ userId, customRoleId: customRoleId || null })
    );
    setSavingId(null);
    if (assignUserCustomRole.fulfilled.match(result)) {
      toast.success(customRoleId ? "Custom role assigned" : "Custom role removed");
    } else {
      toast.error("Failed to update role");
    }
  };

  return (
    <section className="mt-10">
      <h2 className="section-title flex items-center gap-2">
        <Users size={16} className="text-primary-500" />
        Assign Custom Roles
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Give a user a custom role to grant the extra access defined in its matrix
        column, on top of their base role.
      </p>

      {roles.length === 0 ? (
        <div className="card flex items-center gap-3 text-sm text-muted-foreground">
          <Sparkles size={16} className="text-primary-500 shrink-0" />
          No custom roles yet. Create one on the{" "}
          <Link href={`/${tenant}/org/roles`} className="text-primary hover:underline">
            Roles
          </Link>{" "}
          page, then assign it here.
        </div>
      ) : (
        <>
          <input
            className="input-field w-full mb-3"
            placeholder="Search users by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 dark:bg-slate-800/60">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">User</th>
                  <th className="text-left font-semibold px-4 py-2.5">Base role</th>
                  <th className="text-left font-semibold px-4 py-2.5 w-56">Custom role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">{u.role}</td>
                    <td className="px-4 py-2">
                      <SearchableSelect
                        value={usersCustomRoles[u.id] ?? ""}
                        disabled={savingId === u.id}
                        onChange={(v) => onChange(u.id, v)}
                        options={roles.map((r) => ({ value: r.id, label: r.name }))}
                        placeholder="— None —"
                      />
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground/70">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
