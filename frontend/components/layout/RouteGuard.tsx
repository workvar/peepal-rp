"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useAccess } from "@/lib/useAccess";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

/**
 * Blocks direct navigation to routes the current role isn't allowed to see.
 * Access comes from the role access matrix (myAccess) plus the tenant's
 * industry — so hiding a module also locks its URL.
 *
 * The guard deliberately does nothing until `settled` is true. On a full page
 * refresh the layout renders before myAccess/terminology have come back, and
 * evaluating access against those empty defaults used to mark almost every
 * page "blocked" and bounce the user to the dashboard.
 */
export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;
  const { settled, canViewHref } = useAccess();

  // Strip the tenant prefix: /acme/hostel → /hostel
  const relPath = "/" + pathname.split("/").filter(Boolean).slice(1).join("/");
  const blocked = settled && !canViewHref(relPath);

  useEffect(() => {
    if (blocked) router.replace(`/${tenant}/dashboard`);
  }, [blocked, tenant, router]);

  if (!settled) return <LoadingSpinner text="Loading..." />;
  if (blocked) return null;
  return <>{children}</>;
}
