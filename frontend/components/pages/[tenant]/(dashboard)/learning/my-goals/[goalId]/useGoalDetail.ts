"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { MY_LEARNING_GOALS } from "@/graphql/queries/learning";
import { UPDATE_ITEM_PROGRESS } from "@/graphql/mutations/learning";
import {
  EmployeeGoalProgress,
  ItemProgress,
  LearningItem,
  flattenItems,
  computeLockedMap,
} from "@/types/pages/learning/page";
import toast from "react-hot-toast";

// All data, selection, and progress-mutation state for the goal detail page.
export function useGoalDetail() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenant = (params?.tenant as string) ?? "";
  const goalId = (params?.goalId as string) ?? "";

  const { data, loading, refetch } = useQuery(MY_LEARNING_GOALS);
  const rows: EmployeeGoalProgress[] = data?.myLearningGoals ?? [];
  const row = rows.find((r) => r.goalId === goalId);

  // Selection is primarily React state for instant UI response; it is mirrored
  // to the URL (?item=<id>) via history.replaceState so refresh restores the
  // same page and browser back/forward works without retriggering Next.js
  // routing (which is noticeably slow when paired with large page trees).
  const initialItemId = searchParams?.get("item") ?? null;
  const [selectedItemId, setSelectedItemIdState] = useState<string | null>(initialItemId);

  const setSelectedItemId = useCallback(
    (id: string | null) => {
      setSelectedItemIdState(id);
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        if (id) sp.set("item", id);
        else sp.delete("item");
        const qs = sp.toString();
        const url = `${pathname}${qs ? `?${qs}` : ""}`;
        window.history.replaceState(null, "", url);
      }
    },
    [pathname],
  );

  const [updateProgress] = useMutation(UPDATE_ITEM_PROGRESS);

  // Need goal with sections + items. MY_LEARNING_GOALS returns goal without sections in shared slice,
  // so we refetch via EMPLOYEE_LEARNING_GOALS-style nesting. Fallback: use goal.sections if present.
  const goal = row?.goal;

  const items = useMemo<LearningItem[]>(
    () => (goal ? flattenItems(goal) : []),
    [goal],
  );

  const progressByItem = useMemo(() => {
    const map = new Map<string, ItemProgress>();
    for (const p of row?.itemProgress ?? []) {
      map.set(`${p.itemType}:${p.itemId}`, p);
    }
    return map;
  }, [row]);

  const lockedMap = useMemo(
    () => (goal ? computeLockedMap(goal, row?.itemProgress ?? []) : {}),
    [goal, row],
  );

  // Select first unlocked item by default (only when no ?item= in URL).
  useEffect(() => {
    if (!selectedItemId && items.length > 0) {
      const firstUnlocked = items.find((it) => !lockedMap[it.id]);
      if (firstUnlocked) setSelectedItemId(firstUnlocked.id);
    }
  }, [items, lockedMap, selectedItemId, setSelectedItemId]);

  // If the URL points to a locked/invalid item, fall back to the first unlocked.
  useEffect(() => {
    if (!selectedItemId || items.length === 0) return;
    const exists = items.some((it) => it.id === selectedItemId);
    const isLocked = exists && lockedMap[selectedItemId];
    if (!exists || isLocked) {
      const firstUnlocked = items.find((it) => !lockedMap[it.id]);
      if (firstUnlocked) setSelectedItemId(firstUnlocked.id);
    }
  }, [items, lockedMap, selectedItemId, setSelectedItemId]);

  const selectedIndex = useMemo(
    () => items.findIndex((it) => it.id === selectedItemId),
    [items, selectedItemId],
  );
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;
  const selectedProgress = selectedItem
    ? progressByItem.get(`${selectedItem.itemType}:${selectedItem.id}`)
    : undefined;

  const itemDone = (it: LearningItem) => {
    const p = progressByItem.get(`${it.itemType}:${it.id}`);
    return (
      (it.itemType === "unit" && p?.status === "completed") ||
      (it.itemType === "assignment" && p?.status === "passed")
    );
  };

  // Stable click handler so list rows don't get new prop identity each render,
  // and the click registers with no perceptible delay.
  const selectItem = useCallback(
    (id: string) => {
      if (lockedMap[id]) return;
      setSelectedItemId(id);
    },
    [lockedMap, setSelectedItemId],
  );

  // Previous / Next navigation — point to the immediate neighbors, regardless
  // of lock state. Locking controls whether the button is clickable, not
  // whether it appears. Only truly missing neighbors (first / last item) return
  // null, which hides the button entirely.
  const prevItem = useMemo<LearningItem | null>(() => {
    if (selectedIndex <= 0) return null;
    return items[selectedIndex - 1];
  }, [items, selectedIndex]);

  const nextItem = useMemo<LearningItem | null>(() => {
    if (selectedIndex < 0 || selectedIndex >= items.length - 1) return null;
    return items[selectedIndex + 1];
  }, [items, selectedIndex]);

  const prevLocked = !!(prevItem && lockedMap[prevItem.id]);
  const nextLocked = !!(nextItem && lockedMap[nextItem.id]);

  const goToPrev = useCallback(() => {
    if (prevItem && !prevLocked) setSelectedItemId(prevItem.id);
  }, [prevItem, prevLocked, setSelectedItemId]);
  const goToNext = useCallback(() => {
    if (nextItem && !nextLocked) setSelectedItemId(nextItem.id);
  }, [nextItem, nextLocked, setSelectedItemId]);

  const handleMarkUnit = async () => {
    if (!selectedItem || !row) return;
    try {
      await updateProgress({
        variables: {
          input: {
            employeeGoalProgressId: row.id,
            itemId: selectedItem.id,
            itemType: "unit",
            status: "completed",
          },
        },
        refetchQueries: [{ query: MY_LEARNING_GOALS }],
      });
      toast.success("Marked as completed");
      await refetch();
    } catch (err) {
      const e = err as { graphQLErrors?: Array<{ message?: string }> };
      toast.error(e?.graphQLErrors?.[0]?.message ?? "Failed to update progress");
    }
  };

  const handleSubmitCompletion = async () => {
    if (!selectedItem || !row) return;
    try {
      await updateProgress({
        variables: {
          input: {
            employeeGoalProgressId: row.id,
            itemId: selectedItem.id,
            itemType: "assignment",
            status: "passed",
          },
        },
        refetchQueries: [{ query: MY_LEARNING_GOALS }],
      });
      toast.success("Assignment completed");
      await refetch();
    } catch (err) {
      const e = err as { graphQLErrors?: Array<{ message?: string }> };
      toast.error(e?.graphQLErrors?.[0]?.message ?? "Failed to update progress");
    }
  };

  return {
    router, tenant, loading, refetch, row, goal,
    items, lockedMap, selectedItemId, selectedIndex, selectedItem, selectedProgress,
    itemDone, selectItem,
    prevItem, nextItem, prevLocked, nextLocked, goToPrev, goToNext,
    handleMarkUnit, handleSubmitCompletion,
  };
}

export type GoalDetailState = ReturnType<typeof useGoalDetail>;
