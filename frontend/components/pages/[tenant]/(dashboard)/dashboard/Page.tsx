"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { DASHBOARD_STATS } from "@/graphql/queries/reports";
import { useAppSelector } from "@/store/hooks";
import { LIST_ANNOUNCEMENTS } from "@/graphql/queries/announcements";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import { useOnboarding } from "@/components/onboarding/useOnboarding";
import QueryError from "@/components/ui/QueryError";

import DashboardHero from "./sections/DashboardHero";
import StatsGrid from "./sections/StatsGrid";
import InsightStrip from "./sections/InsightStrip";
import AnalyticsGrid from "./sections/AnalyticsGrid";
import QuickPanel from "./sections/QuickPanel";
import AnnouncementsPanel from "./sections/AnnouncementsPanel";
import ShortcutsGrid from "./sections/ShortcutsGrid";
import { useDashboardAnalytics } from "./analytics/useDashboardAnalytics";

import {
  StatGridSkeleton,
  AnnouncementsSkeleton,
  ChartsSkeleton,
} from "./skeletons";

export default function DashboardPage() {
  const { data: statsData, loading: statsLoading, error: statsError, refetch: refetchStats } = useQuery(DASHBOARD_STATS);
  const stats = statsData?.dashboardStats;

  const { user, tenantSlug } = useAppSelector((s) => s.auth);
  const isAdmin = user?.role === "admin";

  // All chart data comes from the GraphQL report resolvers (see the hook).
  const analytics = useDashboardAnalytics(!!isAdmin);

  const { data: announcementsData, loading: announcementsLoading } = useQuery(LIST_ANNOUNCEMENTS);
  const announcements: Array<{ id: string; title: string; body: string; priority: string }> =
    announcementsData?.announcements ?? [];

  const firstName = user?.name?.split(" ")[0] ?? "";
  const slug =
    tenantSlug ??
    (typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : "") ??
    "";
  const tenantHref = (path: string) => (slug ? `/${slug}${path}` : path);

  const [visible, setVisible] = useState(false);

  const tour = useOnboarding({
    tenantSlug: slug,
    userId: user?.id,
    role: user?.role ?? "",
  });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const chartsPending = analytics.loading && analytics.attendance.trend.length === 0;

  return (
    <div className="space-y-6 transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }}>
      <OnboardingTour open={tour.open} onClose={tour.close} tenantSlug={slug} />

      <DashboardHero firstName={firstName} isAdmin={!!isAdmin} onStartTour={tour.start} />

      {/* ── Admin: KPIs + analytics + side panels ──────────────────────── */}
      {isAdmin ? (
        <>
          {statsError && <QueryError message={statsError.message} onRetry={() => void refetchStats()} />}
          {statsLoading && !stats ? (
            <StatGridSkeleton count={8} />
          ) : stats ? (
            <StatsGrid
              stats={stats}
              presentSpark={analytics.attendance.presentSpark}
              absentSpark={analytics.attendance.absentSpark}
              tenantHref={tenantHref}
            />
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,1fr)] gap-4">
            <div className="space-y-4">
              {chartsPending ? (
                <ChartsSkeleton count={4} />
              ) : (
                <>
                  <InsightStrip data={analytics} stats={stats ?? {}} />
                  <AnalyticsGrid data={analytics} stats={stats ?? {}} />
                </>
              )}
            </div>

            <div className="space-y-4">
              {announcementsLoading && announcements.length === 0 ? (
                <AnnouncementsSkeleton />
              ) : announcements.length > 0 ? (
                <AnnouncementsPanel announcements={announcements} viewAllHref={tenantHref("/announcements")} />
              ) : null}
              <QuickPanel tenantHref={tenantHref} />
            </div>
          </div>
        </>
      ) : (
        /* ── Non-admin: shortcuts + announcements ─────────────────────── */
        <>
          <ShortcutsGrid />
          {announcementsLoading && announcements.length === 0 ? (
            <AnnouncementsSkeleton />
          ) : announcements.length > 0 ? (
            <AnnouncementsPanel announcements={announcements} viewAllHref={tenantHref("/announcements")} />
          ) : null}
        </>
      )}
    </div>
  );
}
