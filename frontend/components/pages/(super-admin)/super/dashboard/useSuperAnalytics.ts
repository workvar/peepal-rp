"use client";

import { useQuery } from "@apollo/client";
import { PLATFORM_ANALYTICS } from "@/graphql/queries/platform";
import type { PlatformAnalyticsData } from "./types";

/**
 * Live platform analytics for the super-admin dashboard. `cache-and-network`
 * paints instantly from cache then refreshes, and a 60s poll keeps the page
 * current while it stays open. Exposes `refetch` for the manual refresh button.
 */
export function useSuperAnalytics() {
  const { data, loading, error, refetch } = useQuery<PlatformAnalyticsData>(
    PLATFORM_ANALYTICS,
    {
      fetchPolicy: "cache-and-network",
      pollInterval: 60_000,
      notifyOnNetworkStatusChange: true,
    },
  );

  return {
    analytics: data?.platformAnalytics ?? null,
    loading,
    error,
    refetch,
  };
}
