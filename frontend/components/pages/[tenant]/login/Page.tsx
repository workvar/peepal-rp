"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useHydrateSession } from "@/store/hooks/useHydrateSession";
import {
  login,
  clearError,
  setTenantSlug,
  sessionEstablished,
} from "@/store/slices/authSlice";
import { setTenantType } from "@/store/slices/terminologySlice";
import { tenantLookupAPI } from "@/lib/api";
import type { AuthUser, TenantType } from "@/types";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import PasskeySignIn from "@/components/auth/PasskeySignIn";
import { C, FONT, inputStyle } from "@/components/auth/theme";

interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  type?: TenantType;
  // Identity policy. When a population is false, those users sign in by
  // Employee ID / Roll Number instead of email. Optional for older responses.
  staff_email_required?: boolean;
  student_email_required?: boolean;
}

export default function TenantLoginPage() {
  const router   = useRouter();
  const params   = useParams();
  const tenant   = params.tenant as string;

  const dispatch = useAppDispatch();
  const { loading, error, hasSession, user } = useAppSelector((s) => s.auth);

  // Bounce an already-signed-in visitor: hydrate `user` from the live cookie
  // so the redirect effect below fires instead of showing the login form.
  useHydrateSession();

  const [tenantInfo,   setTenantInfo]   = useState<TenantInfo | null>(null);
  const [tenantError,  setTenantError]  = useState("");
  const [lookingUp,    setLookingUp]    = useState(true);

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused,  setPassFocused]  = useState(false);

  // The passkey component owns its own multi-step flow (prompt → optional PIN).
  // The page only needs to know when the PIN step is up, so the password form
  // can get out of its way instead of asking for two credentials at once.
  const [passkeyStage, setPasskeyStage] = useState<"idle" | "identifier" | "pin">("idle");
  // Stable identity: the child re-reports its stage from an effect, so a new
  // function every render would loop.
  const handlePasskeyStage = useCallback(
    (next: "idle" | "identifier" | "pin") => setPasskeyStage(next),
    []
  );
  const handlePasskeySuccess = useCallback(
    (user: AuthUser) => {
      dispatch(sessionEstablished(user));
      if (user.tenant_type) dispatch(setTenantType(user.tenant_type));
      dispatch(setTenantSlug(tenant));
      router.replace(`/${tenant}/dashboard`);
    },
    [dispatch, router, tenant]
  );

  // Resolve tenant on mount
  useEffect(() => {
    if (!tenant) return;
    tenantLookupAPI.lookup(tenant)
      .then((res) => {
        setTenantInfo(res.data.data);
        const lookedUp = res.data.data as TenantInfo;
        if (lookedUp.type) dispatch(setTenantType(lookedUp.type));
      })
      .catch((err: unknown) => {
        const e = err as { response?: { status?: number } };
        if (e.response?.status === 403) {
          setTenantError("This organisation is suspended. Contact support.");
        } else {
          setTenantError("Organisation not found. Check the URL and try again.");
        }
      })
      .finally(() => setLookingUp(false));
  }, [tenant, dispatch]);

  // Redirect once authenticated
  useEffect(() => {
    if (hasSession && user) {
      if (user.role === "super_admin") {
        router.replace("/super/dashboard");
      } else {
        router.replace(`/${tenant}/dashboard`);
      }
    }
  }, [hasSession, user, tenant, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    const slug = (tenantInfo?.subdomain || tenant).toLowerCase();
    const result = await dispatch(
      login({ identifier: email.trim(), password, tenantSubdomain: slug })
    );
    if (login.fulfilled.match(result)) {
      dispatch(setTenantSlug(tenant));
      router.replace(`/${tenant}/dashboard`);
    }
  };

  if (lookingUp) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: FONT, color: C.placeholder }}>Loading…</p>
      </div>
    );
  }

  // Identity policy → adapt the identifier field. Fully email-based tenants
  // (the default) show a simple "Email" field; tenants that run any population
  // on IDs show an inclusive label (the admin still signs in with their email).
  const staffEmailRequired = tenantInfo?.staff_email_required ?? true;
  const studentEmailRequired = tenantInfo?.student_email_required ?? true;
  const emailOnly = staffEmailRequired && studentEmailRequired;
  const identifierLabel = emailOnly ? "Email" : "Employee ID, Roll Number, or Email";
  const identifierPlaceholder = emailOnly
    ? "you@example.com"
    : "EMP001 / 22CS001 / you@example.com";

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.bg, fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", WebkitFontSmoothing: "antialiased",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <Logo size={48} variant="gradient" />
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: C.label }}>
            {tenantInfo ? tenantInfo.name : "Sign In"}
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: C.placeholder }}>
            {tenantInfo ? `Sign in to ${tenantInfo.subdomain}.roserp.workvar.com` : ""}
          </p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: C.surface, borderRadius: "18px", padding: "28px 24px", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>

          {/* Org not found / suspended error */}
          {tenantError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              backgroundColor: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
            }}>
              <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: "14px", color: C.red, lineHeight: 1.4 }}>{tenantError}</p>
            </div>
          )}

          {/* Auth error */}
          {error && !tenantError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              backgroundColor: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
            }}>
              <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: "14px", color: C.red, lineHeight: 1.4 }}>{error}</p>
            </div>
          )}

          {/* The password form steps aside once the passkey flow reaches its
              PIN step — asking for two credentials at once reads as an error. */}
          {passkeyStage !== "pin" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                {identifierLabel}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder={identifierPlaceholder}
                autoComplete="username"
                required
                disabled={!!tenantError}
                style={inputStyle(emailFocused)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={!!tenantError}
                  style={{ ...inputStyle(passFocused), paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.placeholder, padding: 0 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!tenantError}
              style={{
                marginTop: "6px", width: "100%", padding: "13px",
                fontSize: "16px", fontWeight: 600, fontFamily: FONT,
                color: "#fff", backgroundColor: (loading || !!tenantError) ? "#aaa" : C.blue,
                border: "none", borderRadius: "12px",
                cursor: (loading || !!tenantError) ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          )}

          {/* Passkey sign-in. Rendered below the password form rather than
              above it: the password is what most people still reach for, and a
              button that opens a system prompt is easier to find than it is to
              dismiss by accident. The component hides itself where the browser
              has no WebAuthn support. */}
          {passkeyStage !== "pin" && !tenantError && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "18px 0 14px" }}>
              <div style={{ flex: 1, height: 1, backgroundColor: C.separator }} />
              <span style={{ fontSize: "12px", color: C.placeholder, fontFamily: FONT }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: C.separator }} />
            </div>
          )}
          <PasskeySignIn
            tenantSubdomain={(tenantInfo?.subdomain || tenant)?.toLowerCase()}
            identifierHint={email.trim()}
            disabled={!!tenantError}
            onSuccess={handlePasskeySuccess}
            onStageChange={handlePasskeyStage}
          />
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: C.placeholder }}>
          Not from this org?{" "}
          <a href="/login" style={{ color: C.blue, textDecoration: "none", fontWeight: 600 }}>
            Sign in with a different org
          </a>
        </p>
      </div>
    </div>
  );
}
