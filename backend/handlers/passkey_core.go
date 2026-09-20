package handlers

// passkey_core.go — the Relying Party, and the adapter that lets a User row
// play the part WebAuthn expects.
//
// Two things here are worth understanding before reading the ceremony handlers.
//
// The RP ID is the domain a passkey is bound to, and the browser will only
// release a credential to a page whose origin sits under it. This deployment
// gives every tenant its own subdomain, so the RP ID has to be the shared
// parent (roserp.workvar.com) rather than any one tenant's host — otherwise a
// passkey registered at one subdomain would be invisible at another, and a
// user who moves between workspaces would silently lose their key.
//
// The permitted origin is then decided per request rather than listed in
// config, because the list is open-ended: a new tenant appears without a
// redeploy. Accepting the request's own Origin header is only safe because it
// is checked against the RP ID first — a page on any other domain cannot
// present an origin that passes, and the browser will not send our credentials
// there anyway.

import (
	"net/url"
	"strings"

	"collegeerp/config"
	"collegeerp/database"
	"collegeerp/models"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// relyingParty builds the WebAuthn instance for this request, bound to the
// origin the request actually came from.
//
// Returns an error when the origin is not one this Relying Party serves, which
// is the check that keeps the per-request origin from being a hole.
func relyingParty(c *fiber.Ctx) (*webauthn.WebAuthn, error) {
	origin, err := allowedOrigin(c)
	if err != nil {
		return nil, err
	}
	return webauthn.New(&webauthn.Config{
		RPID:          config.App.WebAuthnRPID,
		RPDisplayName: config.App.WebAuthnRPName,
		RPOrigins:     []string{origin},
	})
}

// allowedOrigin validates the request's Origin against the configured RP ID.
//
// The rule is the browser's own: an origin may use a credential bound to an RP
// ID when its host is that domain or a subdomain of it. Plain http is accepted
// only for loopback, which is the one place browsers relax the secure-context
// requirement (so local development works without a certificate).
func allowedOrigin(c *fiber.Ctx) (string, error) {
	raw := strings.TrimSpace(c.Get("Origin"))
	if raw == "" {
		// Native clients send no Origin. They authenticate against the RP ID
		// itself via platform APIs, so the canonical origin is the right one.
		return "https://" + config.App.WebAuthnRPID, nil
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return "", errInvalidOrigin
	}
	host := u.Hostname()
	loopback := host == "localhost" || host == "127.0.0.1" || host == "::1"
	if u.Scheme != "https" && !(u.Scheme == "http" && loopback) {
		return "", errInvalidOrigin
	}
	rpID := config.App.WebAuthnRPID
	if host != rpID && !strings.HasSuffix(host, "."+rpID) {
		return "", errInvalidOrigin
	}
	return u.Scheme + "://" + u.Host, nil
}

// errInvalidOrigin is deliberately vague to the caller: an origin that fails
// this check is either misconfiguration or an attack, and neither benefits
// from a detailed explanation.
var errInvalidOrigin = fiber.NewError(fiber.StatusBadRequest, "Passkeys are not available on this address")

// passkeyUser adapts a User row (plus its stored credentials) to the interface
// the WebAuthn library consumes.
//
// WebAuthnID is the user handle the authenticator stores alongside the key and
// hands back on a discoverable login. It must be stable for the life of the
// account and must not be personal data — the account's UUID is both.
type passkeyUser struct {
	user        *models.User
	identifier  string
	credentials []webauthn.Credential
}

func (u *passkeyUser) WebAuthnID() []byte { return []byte(u.user.ID) }

// WebAuthnName is what the browser's passkey picker shows underneath the
// account name, so it is the identifier this user actually signs in with —
// their email, or their employee ID / roll number at tenants that run on those.
func (u *passkeyUser) WebAuthnName() string {
	if u.identifier != "" {
		return u.identifier
	}
	return u.user.Name
}

func (u *passkeyUser) WebAuthnDisplayName() string { return u.user.Name }

func (u *passkeyUser) WebAuthnCredentials() []webauthn.Credential { return u.credentials }

// loadPasskeyUser assembles the adapter for a user, decoding every passkey they
// have registered.
//
// A credential whose stored JSON cannot be decoded is skipped rather than
// failing the whole login: one corrupt row must not lock a user out of the
// other keys they registered.
func loadPasskeyUser(db *gorm.DB, user *models.User) (*passkeyUser, []models.WebAuthnCredential, error) {
	rows, err := models.UserCredentials(db, user.ID)
	if err != nil {
		return nil, nil, err
	}
	creds := make([]webauthn.Credential, 0, len(rows))
	for i := range rows {
		cred, err := rows[i].Credential()
		if err != nil {
			continue
		}
		creds = append(creds, cred)
	}
	return &passkeyUser{
		user:        user,
		identifier:  loginIdentifier(db, user),
		credentials: creds,
	}, rows, nil
}

// loginIdentifier resolves what this user types into the identifier field,
// mirroring resolveUserByIdentifier in auth.go in reverse: email when the
// account has one, otherwise the employee ID or roll number that stands in for
// it at tenants which do not require email addresses.
func loginIdentifier(db *gorm.DB, user *models.User) string {
	if user.Email != "" {
		return user.Email
	}
	var emp models.Employee
	if err := db.Where("user_id = ? AND tenant_id = ?", user.ID, user.TenantID).First(&emp).Error; err == nil && emp.EmployeeID != "" {
		return emp.EmployeeID
	}
	var stu models.Student
	if err := db.Where("user_id = ? AND tenant_id = ?", user.ID, user.TenantID).First(&stu).Error; err == nil && stu.RollNumber != "" {
		return stu.RollNumber
	}
	return user.Name
}

// authenticatorSelection is the same policy for every ceremony we begin.
//
// Resident (discoverable) keys are required so the "Sign in with a passkey"
// button can work with nothing typed — the credential carries the user handle
// itself. User verification is required because the PIN is optional: without
// it, the device's own biometric or unlock code is the only thing standing
// between a borrowed laptop and someone's account.
func authenticatorSelection() protocol.AuthenticatorSelection {
	return protocol.AuthenticatorSelection{
		ResidentKey:      protocol.ResidentKeyRequirementRequired,
		UserVerification: protocol.VerificationRequired,
	}
}

// currentUser loads the User row behind an authenticated request.
func currentUser(c *fiber.Ctx) (*models.User, error) {
	userID, _ := c.Locals("userID").(string)
	var user models.User
	if err := database.DB.WithContext(c.Context()).First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
