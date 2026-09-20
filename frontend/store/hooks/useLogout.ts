"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";

// Single place that performs a logout + redirect.
//
// `logoutUser` clears local session state (marker, tenant keys, terminology)
// SYNCHRONOUSLY before its network call, so guards see "no session" the moment
// this runs. We then redirect with the App Router (not window.location) so the
// SPA stays alive and the background cookie-clear request still completes, and
// we use `replace` so Back can't return to the protected page just left.
export function useLogout() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  return (redirectTo: string = "/login") => {
    dispatch(logoutUser());
    router.replace(redirectTo);
  };
}
