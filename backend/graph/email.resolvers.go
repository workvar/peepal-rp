package graph

// Resolvers for a tenant's outbound email: its own SMTP settings, the
// send-capability status, a test sender, and (re)issuing password-setup
// invites. Platform-wide SMTP is managed by super admins over REST; this file
// is the per-tenant counterpart. All operations are admin-only.

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/invites"
	"collegeerp/mailer"
	"collegeerp/models"
)

// EmailSettings returns the calling tenant's own SMTP settings (defaults when
// none have been saved). The stored password is never returned.
func (r *queryResolver) EmailSettings(ctx context.Context) (*model.EmailSettings, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var s models.EmailSettings
	if err := r.DB.First(&s, "tenant_id = ?", auth.TenantID).Error; err != nil {
		return &model.EmailSettings{Enabled: true, SMTPPort: 587}, nil
	}
	return emailSettingsToGQL(s), nil
}

// EmailSendStatus reports whether the tenant can currently send mail, and why.
func (r *queryResolver) EmailSendStatus(ctx context.Context) (*model.EmailSendStatus, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	st := mailer.Status(r.DB, auth.TenantID)
	return &model.EmailSendStatus{
		Allowed:             st.Allowed,
		Enabled:             st.Enabled,
		TransportConfigured: st.TransportConfigured,
		CanSend:             st.CanSend,
	}, nil
}

// UpdateEmailSettings upserts the tenant's own SMTP row.
func (r *mutationResolver) UpdateEmailSettings(ctx context.Context, input model.UpdateEmailSettingsInput) (*model.EmailSettings, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var s models.EmailSettings
	if err := r.DB.First(&s, "tenant_id = ?", auth.TenantID).Error; err != nil {
		s = models.EmailSettings{TenantID: auth.TenantID, Enabled: true, SMTPPort: 587}
	}
	applyEmailSettingsInput(&s, input)
	if err := r.DB.Save(&s).Error; err != nil {
		return nil, GQLErr("could not save email settings")
	}
	return emailSettingsToGQL(s), nil
}

// TestEmailSettings sends a verification message via the tenant's effective
// transport (own settings, else the platform fallback).
func (r *mutationResolver) TestEmailSettings(ctx context.Context, to *string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	cfg, err := mailer.Resolve(r.DB, auth.TenantID)
	if err != nil {
		return false, GQLErr("email is not configured or not allowed for this organisation")
	}
	dest := cfg.FromEmail
	if to != nil && *to != "" {
		dest = *to
	}
	if err := mailer.SendTest(cfg, dest); err != nil {
		return false, GQLErr("test failed: " + err.Error())
	}
	return true, nil
}

// ResendInvite issues a fresh password-setup invite for a user and e-mails it.
// The link is always returned so it can be copied when no SMTP is configured.
func (r *mutationResolver) ResendInvite(ctx context.Context, userID string) (*model.InviteResult, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var user models.User
	if err := r.DB.Where("id = ? AND tenant_id = ?", userID, auth.TenantID).First(&user).Error; err != nil {
		return nil, ErrNotFound
	}
	if user.Email == "" {
		return nil, GQLErr("this user has no email address to send an invite to")
	}
	var tenant models.Tenant
	if err := r.DB.First(&tenant, "id = ?", auth.TenantID).Error; err != nil {
		return nil, err
	}
	res, err := invites.Issue(r.DB, &tenant, &user)
	if err != nil {
		return nil, GQLErr(err.Error())
	}
	return &model.InviteResult{
		Link:      res.Link,
		Sent:      res.Sent,
		ExpiresAt: res.ExpiresAt.Format(time.RFC3339),
	}, nil
}

func emailSettingsToGQL(s models.EmailSettings) *model.EmailSettings {
	port := s.SMTPPort
	if port == 0 {
		port = 587
	}
	return &model.EmailSettings{
		Enabled:      s.Enabled,
		FromName:     s.FromName,
		FromEmail:    s.FromEmail,
		SMTPHost:     s.SMTPHost,
		SMTPPort:     port,
		SMTPUsername: s.SMTPUsername,
		UseTLS:       s.UseTLS,
		HasPassword:  s.SMTPPassword != "",
	}
}

// applyEmailSettingsInput mutates s with the non-nil fields of input. An empty
// smtpPassword is treated as "unchanged" so the UI need not re-enter it.
func applyEmailSettingsInput(s *models.EmailSettings, in model.UpdateEmailSettingsInput) {
	if in.Enabled != nil {
		s.Enabled = *in.Enabled
	}
	if in.FromName != nil {
		s.FromName = *in.FromName
	}
	if in.FromEmail != nil {
		s.FromEmail = *in.FromEmail
	}
	if in.SMTPHost != nil {
		s.SMTPHost = *in.SMTPHost
	}
	if in.SMTPPort != nil && *in.SMTPPort > 0 {
		s.SMTPPort = *in.SMTPPort
	}
	if in.SMTPUsername != nil {
		s.SMTPUsername = *in.SMTPUsername
	}
	if in.SMTPPassword != nil && *in.SMTPPassword != "" {
		s.SMTPPassword = *in.SMTPPassword
	}
	if in.UseTLS != nil {
		s.UseTLS = *in.UseTLS
	}
}
