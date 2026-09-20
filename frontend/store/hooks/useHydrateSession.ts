"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMe } from "@/store/slices/authSlice";

// Reconciles the persisted session marker with the real httpOnly cookie.
//
// `hasSession` is read from localStorage and survives reloads, but `user`
// lives only in memory and is hydrated by fetchMe() inside the dashboard
// layouts. Login pages sit outside those layouts, so without this hook a
// still-logged-in visitor (e.g. a super admin) would see a login form
// instead of being bounced to their dashboard.
//
// On success fetchMe populates `user` (the page's redirect effect then fires);
// on failure it clears the marker so the login form shows correctly.
export function useHydrateSession(): void {
  const dispatch = useAppDispatch();
  const { hasSession, user } = useAppSelector((s) => s.auth);
  const attempted = useRef(false);

  useEffect(() => {
    if (hasSession && !user && !attempted.current) {
      attempted.current = true;
      dispatch(fetchMe());
    }
  }, [hasSession, user, dispatch]);
}
