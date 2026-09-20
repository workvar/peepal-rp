"use client";

// Public invite-accept page. A newly-created user lands here from the link in
// their invite email, sets a password, and is sent to their login page. No
// session is started here — they sign in normally afterwards.

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { invitesAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface InviteInfo {
  email: string;
  name: string;
  tenant_name: string;
}

const passwordHint = "At least 8 characters with an upper-case letter, a lower-case letter, and a digit.";

export default function AcceptInvitePage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const tenant = String(params.tenant ?? "");
  const token = search.get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalid("This link is missing its invite token.");
      setChecking(false);
      return;
    }
    invitesAPI
      .validate(token)
      .then((res) => setInfo(res.data.data as InviteInfo))
      .catch((err) => setInvalid(getErrorMessage(err, "This invitation link is invalid or has expired.")))
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await invitesAPI.accept(token, password);
      toast.success("Password set! You can now sign in.");
      router.push(`/${tenant}/login`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not set your password"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="card w-full max-w-md p-8">
        {checking ? (
          <p className="text-center text-muted-foreground">Checking your invitation…</p>
        ) : invalid ? (
          <div className="text-center space-y-3">
            <AlertTriangle className="mx-auto text-amber-500" size={32} />
            <h1 className="text-lg font-semibold text-foreground">Invitation problem</h1>
            <p className="text-sm text-muted-foreground">{invalid}</p>
            <button className="btn-ghost" onClick={() => router.push(`/${tenant}/login`)}>
              Go to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="text-center space-y-1">
              <CheckCircle2 className="mx-auto text-indigo-500" size={32} />
              <h1 className="text-lg font-semibold text-foreground">Set your password</h1>
              <p className="text-sm text-muted-foreground">
                Welcome{info?.name ? `, ${info.name}` : ""} — finish setting up your account
                {info?.tenant_name ? ` at ${info.tenant_name}` : ""}.
              </p>
            </div>

            {info?.email && (
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
                <input className="input-field bg-muted/40" value={info.email} disabled />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">New password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              <p className="mt-1 text-xs text-muted-foreground">{passwordHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Confirm password</label>
              <input
                type="password"
                className="input-field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Setting password…" : "Set password & continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
