"use client";

/**
 * Profile & Settings page — redesigned with a 12-col grid layout.
 *
 *   ┌───────────────────────────────────────────────────┐
 *   │            Account overview (full width)          │
 *   └───────────────────────────────────────────────────┘
 *   ┌─────────────┬─────────────────────────────────────┐
 *   │ Profile     │ Personal information                │
 *   │ Photo       │ (name, email)                       │
 *   └─────────────┴─────────────────────────────────────┘
 *   ┌───────────────────────────────────────────────────┐
 *   │            Change password (full width)           │
 *   └───────────────────────────────────────────────────┘
 *   ┌───────────────────────────────────────────────────┐
 *   │        Passkeys · Sign-in PIN (full width)        │
 *   └───────────────────────────────────────────────────┘
 *   ┌───────────────────────────────────────────────────┐
 *   │           Active sessions (full width)            │
 *   └───────────────────────────────────────────────────┘
 *
 * Sessions sit directly below the password form on purpose: changing a password
 * already signs every other device out, so the list is where a user confirms
 * that it did.
 */

import { useState } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMe } from "@/store/slices/authSlice";
import { authAPI } from "@/lib/api";
import { resolvePhotoUrl } from "@/api/services/uploads";
import PageHeader from "@/components/ui/PageHeader";
import PhotoUpload from "@/components/ui/PhotoUpload";
import toast from "react-hot-toast";
import { User, Lock, Shield, Mail, CheckCircle } from "lucide-react";
import { useTerminology } from "@/store/hooks/useTerminology";
import { roleLabel } from "@/lib/roleLabels";
import ActiveSessionsCard from "@/components/sessions/ActiveSessionsCard";
import PasskeysCard from "@/components/security/PasskeysCard";
import LoginPinCard from "@/components/security/LoginPinCard";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:       { bg: "rgba(31,93,54,0.12)",  text: "#1f5d36" },
  teacher:     { bg: "rgba(16,185,129,0.12)",  text: "#059669" },
  student:     { bg: "rgba(6,182,212,0.12)",   text: "#0891b2" },
  staff:       { bg: "rgba(245,158,11,0.12)",  text: "#d97706" },
  super_admin: { bg: "rgba(239,68,68,0.12)",   text: "#dc2626" },
};

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: "8+ characters",    ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number",           ok: /[0-9]/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const passed = checks.filter((c) => c.ok).length;
  const strength = passed <= 1 ? "Weak" : passed === 2 ? "Fair" : passed === 3 ? "Good" : "Strong";
  const strengthColor = passed <= 1 ? "#dc2626" : passed === 2 ? "#d97706" : passed === 3 ? "#0891b2" : "#059669";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= passed ? strengthColor : "rgb(var(--muted))" }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: strengthColor }}>{strength}</span>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-end">
          {checks.map((c) => (
            <span
              key={c.label}
              className="text-[10px] flex items-center gap-1"
              style={{ color: c.ok ? "#059669" : "rgb(var(--muted-foreground))" }}
            >
              <CheckCircle size={9} style={{ opacity: c.ok ? 1 : 0.3 }} />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const user     = useAppSelector((s) => s.auth.user);
  const terms    = useTerminology();

  const [name,       setName]       = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd,  setSavingPwd]  = useState(false);
  // Removing the last passkey also removes the PIN server-side, so the PIN card
  // re-reads its state whenever the passkey list changes rather than holding a
  // view the server has already moved past.
  const [securityVersion, setSecurityVersion] = useState(0);

  if (!user) return null;

  const roleStyle = ROLE_COLORS[user.role] ?? ROLE_COLORS.staff;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    try {
      setSavingName(true);
      await authAPI.updateProfile(name.trim());
      await dispatch(fetchMe());
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd)             { toast.error("Enter your current password"); return; }
    if (newPwd.length < 8)       { toast.error("New password must be at least 8 characters"); return; }
    if (newPwd !== confirmPwd)   { toast.error("Passwords do not match"); return; }
    try {
      setSavingPwd(true);
      await authAPI.changePassword(currentPwd, newPwd);
      toast.success("Password changed successfully");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? "Failed to change password");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader title="My Profile" subtitle="Manage your account details and security" />

      {/* ── Row 1 · Account overview (full width) ─────────────────────── */}
      <div
        className="card relative overflow-hidden"
        style={{ background: "rgba(31,93,54,0.06)" }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: "var(--color-category-violet)" }}
        />
        <div className="flex items-center gap-5 pt-4">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold text-white shrink-0"
            style={{ background: user.photo_url ? "transparent" : "var(--color-category-violet)" }}
          >
            {user.photo_url ? (
              // unoptimized: avatar URLs are user uploads served by our backend
              <Image src={resolvePhotoUrl(user.photo_url)} alt={user.name} width={96} height={96} unoptimized className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Mail size={13} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">{user.email}</span>
            </div>
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: roleStyle.bg, color: roleStyle.text }}
              >
                <Shield size={10} />
                {roleLabel(user.role, terms)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2 · Photo (4 cols) + Personal info (8 cols) ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Profile photo */}
        <div className="card md:col-span-4 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
            >
              <User size={15} style={{ color: "#0891b2" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Profile Photo</h3>
              <p className="text-xs text-muted-foreground">Shown in the top bar</p>
            </div>
          </div>
          <div className="flex-1 flex items-center">
            <PhotoUpload
              entity="user"
              value={user.photo_url}
              fallbackName={user.name}
              onChange={async (url) => {
                try {
                  await authAPI.updateProfile({ photo_url: url });
                  await dispatch(fetchMe());
                } catch {
                  toast.error("Failed to save photo");
                }
              }}
            />
          </div>
        </div>

        {/* Personal info */}
        <div className="card md:col-span-8">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(31,93,54,0.1)", border: "1px solid rgba(31,93,54,0.2)" }}
            >
              <User size={15} style={{ color: "#1f5d36" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
              <p className="text-xs text-muted-foreground">Update your display name</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <input
                className="input-field opacity-60 cursor-not-allowed"
                value={user.email}
                disabled
                title="Contact your admin to change your email"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact your administrator if you need to update it.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={savingName || name === user.name} className="btn-primary">
                {savingName
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  : "Save Changes"
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Row 3 · Change password (full width) ─────────────────────── */}
      <div id="password" className="card scroll-mt-24">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <Lock size={15} style={{ color: "#dc2626" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Change Password</h3>
            <p className="text-xs text-muted-foreground">Choose a strong password to keep your account secure</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Current Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              className="input-field"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              New Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              className="input-field"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Confirm New Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              className="input-field"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
            {confirmPwd && newPwd !== confirmPwd && (
              <p className="text-xs text-destructive font-medium">Passwords do not match</p>
            )}
            {confirmPwd && newPwd === confirmPwd && newPwd.length >= 8 && (
              <p className="text-xs flex items-center gap-1" style={{ color: "#059669" }}>
                <CheckCircle size={11} /> Passwords match
              </p>
            )}
          </div>

          <div className="md:col-span-3">
            <PasswordStrength password={newPwd} />
          </div>

          <div className="md:col-span-3 flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd}
              className="btn-error"
            >
              {savingPwd
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Changing…</>
                : "Change Password"
              }
            </button>
          </div>
        </form>
      </div>

      {/* ── Row 4 · Passkeys and the sign-in PIN (full width) ───────── */}
      <PasskeysCard onChanged={() => setSecurityVersion((v) => v + 1)} />
      <LoginPinCard refreshKey={securityVersion} />

      {/* ── Row 5 · Active sessions (full width) ─────────────────────── */}
      <ActiveSessionsCard />
    </div>
  );
}
