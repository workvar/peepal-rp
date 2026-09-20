"use client";

// Tenant-admin email (SMTP) settings. The tenant can send through its own SMTP
// or, if left blank, the platform's shared server. The super admin controls
// whether the tenant may send at all.

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { EMAIL_SETTINGS, EMAIL_SEND_STATUS } from "@/graphql/queries/email";
import { UPDATE_EMAIL_SETTINGS, TEST_EMAIL_SETTINGS } from "@/graphql/mutations/email";
import PageHeader from "@/components/ui/PageHeader";
import EmailSettingsForm, { type EmailSettingsValues } from "@/components/ui/EmailSettingsForm";
import { TableSkeleton } from "@/components/ui/skeletons";
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

function StatusBanner({ allowed, canSend }: { allowed: boolean; canSend: boolean }) {
  if (!allowed) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
        Email sending is disabled for your organisation by the platform administrator.
        Contact support to enable invites and notifications.
      </div>
    );
  }
  if (canSend) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
        Email is active. New users can be invited to set their own password.
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
      Email is allowed but not working yet. Configure SMTP below, or it will use the
      platform&apos;s shared server once that is set up.
    </div>
  );
}

export default function OrgEmailPage() {
  const { data, loading, refetch } = useQuery(EMAIL_SETTINGS, { fetchPolicy: "cache-and-network" });
  const { data: statusData, refetch: refetchStatus } = useQuery(EMAIL_SEND_STATUS, {
    fetchPolicy: "cache-and-network",
  });
  const [updateSettings] = useMutation(UPDATE_EMAIL_SETTINGS);
  const [testSettings] = useMutation(TEST_EMAIL_SETTINGS);

  const [values, setValues] = useState<EmailSettingsValues>(emptyValues);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const s = data?.emailSettings;
    if (s) {
      setValues({
        enabled: s.enabled,
        fromName: s.fromName ?? "",
        fromEmail: s.fromEmail ?? "",
        smtpHost: s.smtpHost ?? "",
        smtpPort: s.smtpPort ?? 587,
        smtpUsername: s.smtpUsername ?? "",
        smtpPassword: "",
        useTls: s.useTls ?? false,
        hasPassword: s.hasPassword ?? false,
      });
    }
  }, [data]);

  const status = statusData?.emailSendStatus ?? { allowed: false, canSend: false };
  const onChange = (patch: Partial<EmailSettingsValues>) => setValues((v) => ({ ...v, ...patch }));

  const onSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        variables: {
          input: {
            enabled: values.enabled,
            fromName: values.fromName,
            fromEmail: values.fromEmail,
            smtpHost: values.smtpHost,
            smtpPort: values.smtpPort,
            smtpUsername: values.smtpUsername,
            ...(values.smtpPassword ? { smtpPassword: values.smtpPassword } : {}),
            useTls: values.useTls,
          },
        },
      });
      toast.success("Email settings saved");
      await Promise.all([refetch(), refetchStatus()]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      await testSettings({ variables: { to: testTo || null } });
      toast.success("Test email sent");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Test failed"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Email Settings"
        subtitle="Send password-setup invites and notifications from your own SMTP server"
      />
      {loading && !data ? (
        <TableSkeleton columns={["Setting", "Value"]} rows={5} />
      ) : (
        <EmailSettingsForm
          values={values}
          onChange={onChange}
          onSave={onSave}
          onTest={onTest}
          saving={saving}
          testing={testing}
          testTo={testTo}
          onTestToChange={setTestTo}
          note="Leave SMTP fields blank to send through the platform's shared email server."
        >
          <StatusBanner allowed={status.allowed} canSend={status.canSend} />
        </EmailSettingsForm>
      )}
    </div>
  );
}
