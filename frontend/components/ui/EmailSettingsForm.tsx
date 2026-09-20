"use client";

// Presentational SMTP settings form, shared by the super-admin (platform) and
// tenant-admin (own) settings pages. It is fully controlled: the parent owns
// the values and handles save/test against its own data source (REST or
// GraphQL).

import Switch from "@/components/ui/switch";

export interface EmailSettingsValues {
  enabled: boolean;
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string; // input only; blank = keep the stored one
  useTls: boolean;
  hasPassword: boolean; // display only
}

interface Props {
  values: EmailSettingsValues;
  onChange: (patch: Partial<EmailSettingsValues>) => void;
  onSave: () => void;
  onTest: () => void;
  saving?: boolean;
  testing?: boolean;
  testTo: string;
  onTestToChange: (v: string) => void;
  /** Optional helper note shown above the SMTP fields (e.g. platform fallback). */
  note?: string;
  /** Optional content rendered at the very top (e.g. a status banner). */
  children?: React.ReactNode;
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function EmailSettingsForm({
  values,
  onChange,
  onSave,
  onTest,
  saving = false,
  testing = false,
  testTo,
  onTestToChange,
  note,
  children,
}: Props) {
  return (
    <div className="card p-6 space-y-5 max-w-2xl">
      {children}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Sending enabled</p>
          <p className="text-xs text-muted-foreground">
            Turn off to stop all outbound mail for this scope.
          </p>
        </div>
        <Switch checked={values.enabled} onChange={(c) => onChange({ enabled: c })} />
      </div>

      {note && <p className="text-xs text-muted-foreground">{note}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Labeled label="From name">
          <input
            className="input-field"
            value={values.fromName}
            onChange={(e) => onChange({ fromName: e.target.value })}
            placeholder="Peepal"
          />
        </Labeled>
        <Labeled label="From email">
          <input
            className="input-field"
            type="email"
            value={values.fromEmail}
            onChange={(e) => onChange({ fromEmail: e.target.value })}
            placeholder="no-reply@example.com"
          />
        </Labeled>
        <Labeled label="SMTP host">
          <input
            className="input-field"
            value={values.smtpHost}
            onChange={(e) => onChange({ smtpHost: e.target.value })}
            placeholder="smtp.example.com"
          />
        </Labeled>
        <Labeled label="SMTP port">
          <input
            className="input-field"
            type="number"
            value={values.smtpPort || ""}
            onChange={(e) => onChange({ smtpPort: parseInt(e.target.value, 10) || 0 })}
            placeholder="587"
          />
        </Labeled>
        <Labeled label="SMTP username">
          <input
            className="input-field"
            value={values.smtpUsername}
            onChange={(e) => onChange({ smtpUsername: e.target.value })}
            placeholder="apikey / user@example.com"
          />
        </Labeled>
        <Labeled label="SMTP password">
          <input
            className="input-field"
            type="password"
            value={values.smtpPassword}
            onChange={(e) => onChange({ smtpPassword: e.target.value })}
            placeholder={values.hasPassword ? "•••••••• (saved — blank keeps it)" : "App password / API key"}
          />
        </Labeled>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground/90">
        <input
          type="checkbox"
          checked={values.useTls}
          onChange={(e) => onChange({ useTls: e.target.checked })}
          className="rounded border-border"
        />
        Use implicit TLS (port 465). Leave off for STARTTLS (port 587).
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
        <button type="button" className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <input
            className="input-field w-56"
            type="email"
            value={testTo}
            onChange={(e) => onTestToChange(e.target.value)}
            placeholder="Send test to…"
          />
          <button type="button" className="btn-ghost" onClick={onTest} disabled={testing}>
            {testing ? "Sending..." : "Send test"}
          </button>
        </div>
      </div>
    </div>
  );
}
