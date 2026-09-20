"use client";

// Generic /login is intentionally NOT an auth screen. Sign-in is only allowed
// on the per-tenant page at /[tenant]/login (super admins use /super/login).
// This page just helps a user find their org and forwards them to its login.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useHydrateSession } from "@/store/hooks/useHydrateSession";
import { tenantLookupAPI } from "@/lib/api";
import { AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const C = {
  bg:          "#F2F2F7",
  surface:     "#FFFFFF",
  blue:        "#007AFF",
  red:         "#FF3B30",
  label:       "#1C1C1E",
  placeholder: "#8E8E93",
  fill:        "#F2F2F7",
  separator:   "#E5E5EA",
};

const FONT = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export default function FindOrgPage() {
  const router = useRouter();
  const { hasSession, user, tenantSlug: storedSlug } = useAppSelector((s) => s.auth);

  // Already signed in but arrived via a full load? Hydrate `user` so the
  // bounce effect below can forward to the right dashboard.
  useHydrateSession();

  const [orgId,      setOrgId]      = useState("");
  const [orgFocused, setOrgFocused] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // Already signed in? Bounce to the appropriate dashboard.
  useEffect(() => {
    if (hasSession && user) {
      if (user.role === "super_admin") {
        router.replace("/super/dashboard");
      } else if (storedSlug) {
        router.replace(`/${storedSlug}/dashboard`);
      }
    }
  }, [hasSession, user, storedSlug, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const slug = orgId.trim().toLowerCase();
    if (!slug) {
      setError("Please enter your organisation identifier.");
      return;
    }

    setLoading(true);
    try {
      const res = await tenantLookupAPI.lookup(slug);
      const resolvedSlug = res.data.data.subdomain;
      router.push(`/${resolvedSlug}/login`);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 403) {
        setError("This organisation is suspended. Contact support.");
      } else {
        setError("Organisation not found. Check the identifier and try again.");
      }
      setLoading(false);
    }
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 14px", fontSize: "16px", fontFamily: FONT,
    color: C.label, backgroundColor: focused ? C.surface : C.fill,
    border: `1.5px solid ${focused ? C.blue : C.separator}`,
    borderRadius: "10px", outline: "none", boxSizing: "border-box" as const,
    boxShadow: focused ? "0 0 0 4px rgba(0,122,255,0.12)" : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  });

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.bg, fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", WebkitFontSmoothing: "antialiased",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <Logo size={48} variant="gradient" />
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: C.label, lineHeight: 1.2 }}>
            Find your organisation
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: C.placeholder }}>
            Enter your org identifier to continue to its sign-in page
          </p>
        </div>

        <div style={{ backgroundColor: C.surface, borderRadius: "18px", padding: "28px 24px", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>

          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              backgroundColor: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
            }}>
              <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: "14px", color: C.red, lineHeight: 1.4 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Organisation
              </label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                onFocus={() => setOrgFocused(true)}
                onBlur={() => setOrgFocused(false)}
                placeholder="your-org-name"
                autoComplete="organization"
                required
                style={inputStyle(orgFocused)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "6px", width: "100%", padding: "13px",
                fontSize: "16px", fontWeight: 600, fontFamily: FONT,
                color: "#fff", backgroundColor: loading ? "#aaa" : C.blue,
                border: "none", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              {loading ? "Locating…" : "Continue"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: C.placeholder }}>
          Super admin?{" "}
          <a href="/super/login" style={{ color: C.blue, textDecoration: "none", fontWeight: 600 }}>
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
