"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMyQuota } from "@/store/slices/quotaSlice";
import { useTerminology } from "@/store/hooks/useTerminology";

// Persistent, non-dismissible banner shown to every user in a tenant that has
// exceeded a subscription quota. It names each breached quota and by how much.
// New records of the breached type are blocked server-side until usage drops
// back within the limit, so this is the only place users learn why.
export default function QuotaBanner() {
  const dispatch = useAppDispatch();
  const t = useTerminology();
  const { status, loaded } = useAppSelector((s) => s.quota);

  // Self-contained: load once on mount. A failed fetch resolves to no banner.
  useEffect(() => {
    if (!loaded) dispatch(fetchMyQuota());
  }, [loaded, dispatch]);

  const breaches = status?.breaches ?? [];
  if (breaches.length === 0) return null;

  const labelFor = (resource: string) => {
    if (resource === "students") return t.member_plural;
    if (resource === "employees") return t.staff_plural;
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  };

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        width: "100%",
        padding: "10px 16px",
        backgroundColor: "#FEF3C7",
        borderBottom: "1px solid #F59E0B",
        color: "#92400E",
        fontSize: "13.5px",
        lineHeight: 1.45,
      }}
    >
      <AlertTriangle size={18} color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
        <span>
          <strong>Subscription limit exceeded.</strong> Your organisation is over its
          plan quota{breaches.length > 1 ? "s" : ""}. New records of the affected
          type can&apos;t be added until usage is back within the limit.
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {breaches.map((b) => (
            <span
              key={b.resource}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "2px 8px",
                borderRadius: "9999px",
                backgroundColor: "rgba(180,83,9,0.12)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {labelFor(b.resource)}: {b.current} / {b.limit}
              <span style={{ fontWeight: 700 }}>({b.over_by} over)</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
