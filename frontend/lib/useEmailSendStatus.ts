import { useQuery } from "@apollo/client";
import { EMAIL_SEND_STATUS } from "@/graphql/queries/email";

export interface EmailSendStatus {
  allowed: boolean;
  enabled: boolean;
  transportConfigured: boolean;
  canSend: boolean;
}

// useEmailSendStatus reads whether the current tenant can send mail, used by
// create forms to decide whether the invite option is offered. Defaults to a
// "cannot send" status until loaded so forms fall back to requiring a password.
export function useEmailSendStatus(): { status: EmailSendStatus; loading: boolean } {
  const { data, loading } = useQuery(EMAIL_SEND_STATUS, {
    fetchPolicy: "cache-first",
  });
  const status: EmailSendStatus = data?.emailSendStatus ?? {
    allowed: false,
    enabled: false,
    transportConfigured: false,
    canSend: false,
  };
  return { status, loading };
}
