import { gql } from "@apollo/client";

// The calling tenant's own SMTP settings (password value never returned).
export const EMAIL_SETTINGS = gql`
  query EmailSettings {
    emailSettings {
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

// Whether the tenant can currently send mail, and why — drives the invite UI.
export const EMAIL_SEND_STATUS = gql`
  query EmailSendStatus {
    emailSendStatus {
      allowed
      enabled
      transportConfigured
      canSend
    }
  }
`;
