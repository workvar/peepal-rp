"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMe } from "@/store/slices/authSlice";
import { fetchTerminology } from "@/store/slices/terminologySlice";
import { fetchMyAccess } from "@/store/slices/accessSlice";
import TopBar          from "@/components/layout/TopBar";
import Sidebar         from "@/components/layout/sidebar";
import LoadingSpinner  from "@/components/ui/LoadingSpinner";
import DashboardProviders from "@/components/layout/DashboardProviders";
import RouteGuard      from "@/components/layout/RouteGuard";
import QuotaBanner     from "@/components/layout/QuotaBanner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const params   = useParams();
  const tenant   = params.tenant as string;

  const dispatch = useAppDispatch();
  const { hasSession, user, tenantSlug } = useAppSelector((s) => s.auth);
  const terminologyLoaded = useAppSelector((s) => s.terminology.loaded);
  const myAccessLoaded = useAppSelector((s) => s.access.myAccessLoaded);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Load the current user's effective module access once authenticated. Drives
  // the sidebar, dashboard shortcuts, and RouteGuard.
  useEffect(() => {
    if (mounted && hasSession && user && user.role !== "super_admin" && !myAccessLoaded) {
      dispatch(fetchMyAccess());
    }
  }, [mounted, hasSession, user, myAccessLoaded, dispatch]);

  // Load the tenant's label map once authenticated. Kept separate from the
  // auth effect so a failed terminology fetch doesn't block render — the
  // slice falls back to education defaults.
  useEffect(() => {
    if (mounted && hasSession && user && !terminologyLoaded) {
      dispatch(fetchTerminology());
    }
  }, [mounted, hasSession, user, terminologyLoaded, dispatch]);

  useEffect(() => {
    if (!mounted) return;

    if (!hasSession) {
      router.replace(`/${tenant}/login`);
      return;
    }

    if (user) {
      if (user.role === "super_admin") {
        router.replace("/super/dashboard");
        return;
      }
      // Redirect to the correct org if the URL tenant doesn't match
      if (tenantSlug && tenantSlug !== tenant) {
        router.replace(`/${tenantSlug}/dashboard`);
        return;
      }
    } else {
      dispatch(fetchMe());
    }
  }, [mounted, hasSession, user, tenantSlug, tenant, dispatch, router]);

  if (!mounted)     return <LoadingSpinner text="Loading..." />;
  if (!hasSession)  return null;
  if (!user)        return <LoadingSpinner text="Authenticating..." />;

  if (user.role === "super_admin") {
    router.replace("/super/dashboard");
    return null;
  }

  return (
    <DashboardProviders>
      <div
        className="flex flex-col h-screen overflow-hidden transition-colors duration-200"
        style={{ background: "rgb(var(--bg-base))" }}
      >
        {/* Persistent, full-width over-quota notice (renders nothing when within limits) */}
        <QuotaBanner />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar hidden on small screens; the TopBar exposes a drawer there */}
          <div className="hidden lg:flex">
            <Sidebar />
          </div>

          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <TopBar />
            <main
              className="flex-1 overflow-y-auto p-6 lg:p-8 transition-colors duration-200"
              style={{ background: "rgb(var(--bg-base))" }}
            >
              <RouteGuard>{children}</RouteGuard>
            </main>
          </div>
        </div>
      </div>
    </DashboardProviders>
  );
}
