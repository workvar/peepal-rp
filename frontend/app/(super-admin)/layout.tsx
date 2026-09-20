"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMe } from "@/store/slices/authSlice";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SuperSidebar from "@/components/layout/super/SuperSidebar";
import SuperTopBar from "@/components/layout/super/SuperTopBar";
import DashboardProviders from "@/components/layout/DashboardProviders";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { hasSession, user } = useAppSelector((s) => s.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!hasSession) {
      router.replace("/super/login");
      return;
    }
    if (!user) {
      dispatch(fetchMe());
    }
  }, [mounted, hasSession, user, dispatch, router]);

  // Show spinner on server and before client hydration to avoid flash
  if (!mounted) return <LoadingSpinner text="Loading..." />;
  if (!hasSession) return <LoadingSpinner text="Redirecting to login..." />;
  if (!user) return <LoadingSpinner text="Authenticating..." />;

  // Redirect non-super_admin users
  if (user.role !== "super_admin") {
    const slug = typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null;
    router.replace(slug ? `/${slug}/dashboard` : "/login");
    return <LoadingSpinner text="Redirecting..." />;
  }

  // Same shell as the tenant dashboard: sidebar + top bar (with search) + main.
  // DashboardProviders supplies the Apollo client so super pages (e.g. the live
  // dashboard) can run GraphQL queries; it's excluded from the login bundle.
  return (
    <DashboardProviders>
      <div
        className="flex h-screen overflow-hidden transition-colors duration-200"
        style={{ background: "rgb(var(--bg-base))" }}
      >
        <SuperSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <SuperTopBar />
          <main
            className="flex-1 overflow-y-auto p-6 lg:p-8 transition-colors duration-200"
            style={{ background: "rgb(var(--bg-base))" }}
          >
            {children}
          </main>
        </div>
      </div>
    </DashboardProviders>
  );
}
