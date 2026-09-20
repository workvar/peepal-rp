"use client";

// A password input that doubles as an invite control.
//
// When the tenant can send email, the default is to e-mail the user a
// password-setup link, so the field starts disabled with a small inline
// "Set temporary password" link. Clicking it reveals an editable field for an
// optional temporary password — the invite email is still sent either way.
//
// When the tenant cannot send email, it degrades to an ordinary required
// password field. Use invitePasswordPayload() to turn the current state into
// the { sendInvite, password } the create mutations expect.

export interface InvitePayload {
  sendInvite: boolean;
  password: string;
}

// invitePasswordPayload maps the field state to the values a create mutation
// needs. With email available the invite is always sent; a temporary password
// is included only when the admin opened that input.
export function invitePasswordPayload(opts: {
  canSendEmail: boolean;
  tempOpen: boolean;
  password: string;
}): InvitePayload {
  if (!opts.canSendEmail) {
    return { sendInvite: false, password: opts.password };
  }
  return { sendInvite: true, password: opts.tempOpen ? opts.password : "" };
}

interface Props {
  /** Whether the invite flow is available (tenant allowed + able to send). */
  canSendEmail: boolean;
  /** Recipient email, shown in the invite hint. */
  email?: string;
  password: string;
  onPasswordChange: (v: string) => void;
  /** Whether the temporary-password input is revealed. */
  tempOpen: boolean;
  onTempOpenChange: (open: boolean) => void;
  label?: string;
  /** Editing an existing account: password optional, no invite default. */
  editing?: boolean;
}

const linkClass =
  "absolute inset-y-0 right-2 my-auto h-fit text-xs font-medium text-indigo-600 hover:text-indigo-800";

export default function InvitePasswordField({
  canSendEmail,
  email,
  password,
  onPasswordChange,
  tempOpen,
  onTempOpenChange,
  label = "Password",
  editing = false,
}: Props) {
  // Plain password field: editing an account, or email sending unavailable.
  if (editing || !canSendEmail) {
    return (
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          {label}{" "}
          {editing && (
            <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>
          )}
        </label>
        <input
          type="password"
          className="input-field"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required={!editing}
          placeholder={editing ? "••••••••" : "Set a password"}
        />
        {!canSendEmail && !editing && (
          <p className="mt-1 text-xs text-muted-foreground">
            Email sending is off for this organisation, so a password is required.
          </p>
        )}
      </div>
    );
  }

  // Invite default: disabled field + inline "Set temporary password".
  if (!tempOpen) {
    return (
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
        <div className="relative">
          <input
            type="text"
            disabled
            className="input-field pr-40 cursor-not-allowed text-muted-foreground bg-muted/40"
            value=""
            placeholder={`Invite email will be sent${email ? ` to ${email}` : ""}`}
          />
          <button type="button" className={linkClass} onClick={() => onTempOpenChange(true)}>
            Set temporary password
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          They&apos;ll receive a link to choose their own password.
        </p>
      </div>
    );
  }

  // Temporary-password revealed: editable field, invite still sent.
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1">
        Temporary password
      </label>
      <div className="relative">
        <input
          type="password"
          autoFocus
          className="input-field pr-20"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Set a temporary password"
        />
        <button
          type="button"
          className={linkClass}
          onClick={() => {
            onTempOpenChange(false);
            onPasswordChange("");
          }}
        >
          Use invite
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        The invite email is still sent so they can change it.
      </p>
    </div>
  );
}
