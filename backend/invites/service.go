package invites

import (
	"errors"
	"log"
	"time"

	"collegeerp/mailer"
	"collegeerp/models"
	"collegeerp/utils"

	"gorm.io/gorm"
)

// DefaultTTL is how long a freshly issued invite stays redeemable.
const DefaultTTL = 72 * time.Hour

// ErrInvalid is returned for any unusable token (unknown, expired, or already
// accepted). The message is deliberately vague so it can be shown to the user
// without leaking which case occurred.
var ErrInvalid = errors.New("this invitation link is invalid or has expired")

// Result describes the outcome of issuing an invite. Link is always set so the
// admin can copy it manually; Sent reports whether the email actually went out.
type Result struct {
	Link      string    `json:"link"`
	Sent      bool      `json:"sent"`
	ExpiresAt time.Time `json:"expires_at"`
}

// Issue creates a single live invite for user and tries to email it. Any prior
// unaccepted invite for the same user is dropped first so only one link works.
// A non-empty user email is required (there is nowhere to send otherwise).
func Issue(db *gorm.DB, tenant *models.Tenant, user *models.User) (*Result, error) {
	if user.Email == "" {
		return nil, errors.New("an email address is required to send an invite")
	}
	raw, hash, err := newToken()
	if err != nil {
		return nil, err
	}

	inv := models.Invite{
		TenantID:  tenant.ID,
		UserID:    user.ID,
		Email:     user.Email,
		Role:      string(user.Role),
		TokenHash: hash,
		ExpiresAt: time.Now().Add(DefaultTTL),
	}
	// Replace any prior unaccepted invite and create the new one atomically, so
	// a failure can never leave the user with no live link.
	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND accepted_at IS NULL", user.ID).
			Delete(&models.Invite{}).Error; err != nil {
			return err
		}
		return tx.Create(&inv).Error
	}); err != nil {
		return nil, err
	}

	link := mailer.BuildAcceptURL(tenant.Subdomain, raw)
	res := &Result{Link: link, ExpiresAt: inv.ExpiresAt}

	cfg, rErr := mailer.Resolve(db, tenant.ID)
	if rErr != nil {
		return res, nil // no transport — return the link for manual delivery
	}
	vars := map[string]string{
		"userName":   recipientName(user.Name),
		"tenantName": tenant.Name,
		"acceptUrl":  link,
	}
	if err := mailer.SendTemplated(db, cfg, mailer.TemplateInvite, user.Email, user.Name, vars); err != nil {
		// Transport exists but delivery failed (bad credentials, host down…).
		// Log it for operators; still hand back the link so the admin can share it.
		log.Printf("[INVITE] delivery failed tenant=%s email=%s err=%v", tenant.ID, user.Email, err)
		return res, nil
	}
	res.Sent = true
	return res, nil
}

// recipientName gives templates a friendly fallback when the user has no name.
func recipientName(name string) string {
	if name == "" {
		return "there"
	}
	return name
}

// SendWelcome best-effort emails the "welcome" template to a user who has just
// accepted their invite. Failures (no transport, delivery error) are logged but
// never block the accept flow.
func SendWelcome(db *gorm.DB, user *models.User) {
	if user == nil || user.Email == "" {
		return
	}
	var tenant models.Tenant
	if err := db.First(&tenant, "id = ?", user.TenantID).Error; err != nil {
		return
	}
	cfg, err := mailer.Resolve(db, tenant.ID)
	if err != nil {
		return
	}
	vars := map[string]string{
		"userName":   recipientName(user.Name),
		"tenantName": tenant.Name,
		"loginUrl":   mailer.BuildLoginURL(tenant.Subdomain),
	}
	if err := mailer.SendTemplated(db, cfg, mailer.TemplateWelcome, user.Email, user.Name, vars); err != nil {
		log.Printf("[INVITE] welcome delivery failed tenant=%s email=%s err=%v", tenant.ID, user.Email, err)
	}
}

// Validate looks up a redeemable invite and its target user + tenant without
// consuming it. Used to render the accept page.
func Validate(db *gorm.DB, raw string) (*models.Invite, *models.User, *models.Tenant, error) {
	var inv models.Invite
	if err := db.First(&inv, "token_hash = ?", HashToken(raw)).Error; err != nil {
		return nil, nil, nil, ErrInvalid
	}
	if !inv.IsRedeemable() {
		return nil, nil, nil, ErrInvalid
	}
	var user models.User
	if err := db.First(&user, "id = ?", inv.UserID).Error; err != nil {
		return nil, nil, nil, ErrInvalid
	}
	var tenant models.Tenant
	if err := db.First(&tenant, "id = ?", inv.TenantID).Error; err != nil {
		return nil, nil, nil, ErrInvalid
	}
	return &inv, &user, &tenant, nil
}

// Accept consumes a token: it sets the user's password, activates the account,
// and stamps the invite so it cannot be reused. Returns the updated user.
func Accept(db *gorm.DB, raw, newPassword string) (*models.User, error) {
	if err := utils.ValidatePassword(newPassword); err != nil {
		return nil, err
	}
	hash, err := utils.HashPassword(newPassword)
	if err != nil {
		return nil, errors.New("could not secure password")
	}

	var user models.User
	err = db.Transaction(func(tx *gorm.DB) error {
		var inv models.Invite
		if err := tx.First(&inv, "token_hash = ?", HashToken(raw)).Error; err != nil {
			return ErrInvalid
		}
		if !inv.IsRedeemable() {
			return ErrInvalid
		}
		// Atomically claim the invite: the conditional update only succeeds for
		// the first concurrent accept, so a token can never be redeemed twice.
		res := tx.Model(&models.Invite{}).
			Where("id = ? AND accepted_at IS NULL", inv.ID).
			Update("accepted_at", time.Now())
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected != 1 {
			return ErrInvalid // already accepted by a concurrent request
		}
		if err := tx.First(&user, "id = ?", inv.UserID).Error; err != nil {
			return ErrInvalid
		}
		user.Password = hash
		user.IsActive = true
		return tx.Save(&user).Error
	})
	if err != nil {
		return nil, err
	}
	return &user, nil
}
