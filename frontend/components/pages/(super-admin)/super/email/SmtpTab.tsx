"use client";

// Platform-wide SMTP server settings — the shared fallback transport used by
// any tenant that has not configured its own.

import { useEffect, useState } from "react";
import { superAdminAPI } from "@/lib/api";
import EmailSettingsForm, { type EmailSettingsValues } from "@/components/ui/EmailSettingsForm";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

const emptyValues: EmailSettingsValues = {
  enabled: true,
  fromName: "",
  fromEmail: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUsername: "",
  smtpPassword: "",
  useTls: false,
  hasPassword: false,
};

export default function SmtpTab() {
  const [values, setValues] = useState<EmailSettingsValues>(emptyValues);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    superAdminAPI
      .getEmailSettings()
      .then((res) => {
        const d = res.data.data;
        setValues({
          enabled: d.enabled,
          fromName: d.from_name ?? "",
          fromEmail: d.from_email ?? "",
          smtpHost: d.smtp_host ?? "",
          smtpPort: d.smtp_port ?? 587,
          smtpUsername: d.smtp_username ?? "",
          smtpPassword: "",
          useTls: d.use_tls ?? false,
          hasPassword: d.has_password ?? false,
        });
      })
      .catch(() => {});
  }, []);

  const onChange = (patch: Partial<EmailSettingsValues>) =>
    setValues((v) => ({ ...v, ...patch }));

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await superAdminAPI.updateEmailSettings({
        enabled: values.enabled,
        from_name: values.fromName,
        from_email: values.fromEmail,
        smtp_host: values.smtpHost,
        smtp_port: values.smtpPort,
        smtp_username: values.smtpUsername,
        ...(values.smtpPassword ? { smtp_password: values.smtpPassword } : {}),
        use_tls: values.useTls,
      });
      const d = res.data.data;
      setValues((v) => ({ ...v, smtpPassword: "", hasPassword: d.has_password ?? v.hasPassword }));
      toast.success("Platform email settings saved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const res = await superAdminAPI.testEmailSettings(testTo || undefined);
      toast.success(`Test sent to ${res.data.data?.to ?? "the from address"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Test failed"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <EmailSettingsForm
      values={values}
      onChange={onChange}
      onSave={onSave}
      onTest={onTest}
      saving={saving}
      testing={testing}
      testTo={testTo}
      onTestToChange={setTestTo}
      note="Tenants without their own SMTP will send through this server."
    />
  );
}
