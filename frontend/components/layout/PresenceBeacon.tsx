"use client";

import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { connectPresence } from "@/lib/presence";

/**
 * Keeps a presence WebSocket open for the authenticated tenant user so the
 * backend can count active sessions (e.g. system-update prompts). Renders nothing.
 */
export default function PresenceBeacon() {
  const { hasSession, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!hasSession || !user) return;

    const conn = connectPresence();
    return () => conn.close();
  }, [hasSession, user]);

  return null;
}
