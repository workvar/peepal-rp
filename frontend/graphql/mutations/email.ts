import { gql } from "@apollo/client";

// Upsert the calling tenant's own SMTP settings.
export const UPDATE_EMAIL_SETTINGS = gql`
  mutation UpdateEmailSettings($input: UpdateEmailSettingsInput!) {
    updateEmailSettings(input: $input) {
      enabled
      fromName
      fromEmail
      smtpHost
      smtpPort
      smtpUsername
      useTls
      hasPassword
    }
  }
`;

// Send a test message via the tenant's effective transport.
export const TEST_EMAIL_SETTINGS = gql`
  mutation TestEmailSettings($to: String) {
    testEmailSettings(to: $to)
  }
`;

// (Re)issue a password-setup invite for a user and e-mail it.
export const RESEND_INVITE = gql`
  mutation ResendInvite($userId: ID!) {
    resendInvite(userId: $userId) {
      link
      sent
      expiresAt
    }
  }
`;
