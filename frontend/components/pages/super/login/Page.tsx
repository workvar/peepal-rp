"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useHydrateSession } from "@/store/hooks/useHydrateSession";
import { login, clearError, sessionEstablished } from "@/store/slices/authSlice";
import type { AuthUser } from "@/types";
import PasskeySignIn from "@/components/auth/PasskeySignIn";
import { Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";

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

export default function SuperLoginPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error, hasSession, user } = useAppSelector((s) => s.auth);

  // A still-valid session (marker set, cookie alive) but no `user` in memory
  // means we arrived here via a full load — fetch the profile so the effect
  // below can bounce an already-signed-in admin to the console.
  useHydrateSession();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused,  setPassFocused]  = useState(false);
  const [accessError,  setAccessError]  = useState("");

  // The passkey flow runs the same here as on a tenant page; the only
  // difference is that no tenant scopes it, which is what tells the server to
  // accept a super admin and nobody else.
  const [passkeyStage, setPasskeyStage] = useState<"idle" | "identifier" | "pin">("idle");
  const handlePasskeyStage = useCallback(
    (next: "idle" | "identifier" | "pin") => setPasskeyStage(next),
    []
  );
  const handlePasskeySuccess = useCallback(
    (u: AuthUser) => {
      dispatch(sessionEstablished(u));
      router.replace("/super/dashboard");
    },
    [dispatch, router]
  );

  useEffect(() => {
    if (hasSession && user) {
      if (user.role === "super_admin") {
        router.replace("/super/dashboard");
      } else {
        setAccessError("Access denied. This login is for super admins only.");
      }
    }
  }, [hasSession, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessError("");
    dispatch(clearError());
    await dispatch(login({ identifier: email, password }));
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 14px", fontSize: "16px", fontFamily: FONT,
    color: C.label, backgroundColor: focused ? C.surface : C.fill,
    border: `1.5px solid ${focused ? C.blue : C.separator}`,
    borderRadius: "10px", outline: "none", boxSizing: "border-box" as const,
    boxShadow: focused ? "0 0 0 4px rgba(0,122,255,0.12)" : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  });

  const displayError = accessError || error;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.bg, fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", WebkitFontSmoothing: "antialiased",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#1C1C1E",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.6px", color: C.label, lineHeight: 1.2 }}>
            Super Admin
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: C.placeholder }}>
            Peepal Platform Console
          </p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: C.surface, borderRadius: "18px", padding: "28px 24px", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>

          {displayError && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              backgroundColor: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
            }}>
              <AlertCircle size={16} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: "14px", color: C.red, lineHeight: 1.4 }}>{displayError}</p>
            </div>
          )}

          {/* Hidden while the PIN step is up: two credential prompts at once
              reads as a failure rather than a choice. */}
          {passkeyStage !== "pin" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="admin@peepal.com"
                autoComplete="email"
                required
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
              disabled={loading}
              style={{
                marginTop: "6px", width: "100%", padding: "13px",
                fontSize: "16px", fontWeight: 600, fontFamily: FONT,
                color: "#fff", backgroundColor: loading ? "#888" : "#1C1C1E",
                border: "none", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          )}

          {passkeyStage !== "pin" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "18px 0 14px" }}>
              <div style={{ flex: 1, height: 1, backgroundColor: C.separator }} />
              <span style={{ fontSize: "12px", color: C.placeholder, fontFamily: FONT }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: C.separator }} />
            </div>
          )}
          <PasskeySignIn
            identifierHint={email.trim()}
            onSuccess={handlePasskeySuccess}
            onStageChange={handlePasskeyStage}
          />
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: C.placeholder }}>
          <a href="/" style={{ color: C.blue, textDecoration: "none", fontWeight: 600 }}>
            ← Back to home
          </a>
        </p>
      </div>
    </div>
  );
}
