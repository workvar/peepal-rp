"use client";

import { useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useSuperAnalytics } from "./useSuperAnalytics";
import KpiStrip from "./sections/KpiStrip";
import TenantsSection from "./sections/TenantsSection";
import PeopleSection from "./sections/PeopleSection";
import SubscriptionsSection from "./sections/SubscriptionsSection";
import QuotaSection from "./sections/QuotaSection";

// Live super-admin dashboard. Data comes from the platformAnalytics GraphQL
// query (cache-and-network + 60s poll); the button forces an immediate refetch.
// The page itself is thin: it just composes the four metric-group sections.
export default function SuperAdminDashboard() {
  const { analytics, loading, error, refetch } = useSuperAnalytics();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const updated = analytics ? new Date(analytics.generatedAt) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Platform Overview" subtitle="Live metrics across every organisation" />
        <div className="flex items-center gap-3">
          {updated && (
            <span className="text-xs text-muted-foreground">
              Updated{" "}
              {updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && !analytics && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle size={16} />
          Couldn&apos;t load platform analytics. {error.message}
        </div>
      )}

      {!analytics && loading && <LoadingSpinner text="Loading platform analytics..." />}

      {analytics && (
        <div className="space-y-5">
          <KpiStrip a={analytics} />
          <TenantsSection tenants={analytics.tenants} />
          <PeopleSection people={analytics.people} />
          <SubscriptionsSection subscriptions={analytics.subscriptions} />
          <QuotaSection quota={analytics.quota} />
        </div>
      )}
    </div>
  );
}
