package handlers

// passkey_login.go — signing in with a passkey, and the optional PIN step that
// follows it.
//
// The flow has two shapes behind one endpoint pair:
//
//   - Discoverable ("Sign in with a passkey"): nothing is typed. The
//     authenticator picks the account and hands back the user handle it stored
//     at registration.
//   - Identifier-first: the user types their email / employee ID / roll number
//     and the server names the credentials that account may use. This is the
//     fallback for authenticators that cannot store a resident key.
//
// Whichever path ran, the assertion only proves *which account* the caller
// holds a key for. Everything that gates a password login still has to be
// re-checked afterwards — active account, correct tenant, live subscription —
// because a passkey is a credential, not an authorisation.
//
// The PIN, when the account has one, sits between the assertion and the
// session: a verified assertion yields a short-lived pending token, and only
// the PIN exchanges that token for a real session.

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"errors"
	"log"
	"strings"

	"collegeerp/database"
	"collegeerp/graph"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// BeginPasskeyLogin issues the assertion challenge.
//
// Body: { "tenant_subdomain": "acme", "identifier": "optional" }
// Response: { "challenge_id": "...", "options": { publicKey request options } }
func BeginPasskeyLogin(c *fiber.Ctx) error {
	var req struct {
		TenantSubdomain string `json:"tenant_subdomain"`
		Identifier      string `json:"identifier"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	rp, err := relyingParty(c)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	db := database.DB.WithContext(c.Context())
	subdomain := strings.TrimSpace(req.TenantSubdomain)
	identifier := strings.TrimSpace(req.Identifier)

	// Identifier-first needs a tenant to scope the lookup, exactly as password
	// login does; discoverable login does not, because the credential names the
	// account and the tenant is checked when it does.
	if identifier != "" {
		return beginIdentifierLogin(c, rp, db, subdomain, identifier)
	}

	options, sessionData, err := rp.BeginDiscoverableLogin(
		webauthn.WithUserVerification(protocol.VerificationRequired),
	)
	if err != nil {
		log.Printf("[PASSKEY] begin discoverable login failed err=%v", err)
		return utils.InternalError(c, "Could not start passkey sign-in")
	}
	ceremonyID, err := models.StartCeremony(db, models.CeremonyLogin, "", "", subdomain, sessionData)
	if err != nil {
		return utils.InternalError(c, "Could not start passkey sign-in")
	}
	return utils.OK(c, fiber.Map{
		"challenge_id": ceremonyID,
		"options":      options.Response,
	}, "")
}

// beginIdentifierLogin issues a challenge naming one account's credentials.
//
// An account that does not exist, or that has no passkey, gets a challenge too
// — one listing a credential ID nothing will match. The browser then reports
// "no passkey available" locally, which is the same thing a real account whose
// key is on another device reports, so this endpoint tells an attacker nothing
// about which identifiers are real.
func beginIdentifierLogin(c *fiber.Ctx, rp *webauthn.WebAuthn, db *gorm.DB, subdomain, identifier string) error {
	pu := decoyUser()
	tenantID := ""

	if subdomain != "" {
		var tenant models.Tenant
		if err := db.Where("subdomain = ?", subdomain).First(&tenant).Error; err == nil && tenant.Status != models.TenantSuspended {
			var user models.User
			if resolveUserByIdentifier(identifier, tenant.ID, &user) {
				if real, _, err := loadPasskeyUser(db, &user); err == nil && len(real.credentials) > 0 {
					pu = real
					tenantID = tenant.ID
				}
			}
		}
	}

	options, sessionData, err := rp.BeginLogin(pu,
		webauthn.WithUserVerification(protocol.VerificationRequired),
	)
	if err != nil {
		log.Printf("[PASSKEY] begin identifier login failed err=%v", err)
		return utils.InternalError(c, "Could not start passkey sign-in")
	}
	// The ceremony records no user ID even for a real account: the assertion
	// itself will name the credential, and looking the owner up from that keeps
	// one verification path instead of two.
	ceremonyID, err := models.StartCeremony(db, models.CeremonyLogin, "", tenantID, subdomain, sessionData)
	if err != nil {
		return utils.InternalError(c, "Could not start passkey sign-in")
	}
	return utils.OK(c, fiber.Map{
		"challenge_id": ceremonyID,
		"options":      options.Response,
	}, "")
}

// decoyUser is an account-shaped placeholder with one credential ID that no
// authenticator holds. It exists so an unknown identifier produces a
// well-formed challenge instead of an error that confirms the identifier.
func decoyUser() *passkeyUser {
	id := make([]byte, 32)
	_, _ = rand.Read(id)
	return &passkeyUser{
		user:       &models.User{ID: strings.Repeat("0", 36), Name: "unknown"},
		identifier: "unknown",
		credentials: []webauthn.Credential{{
			ID:        id,
			PublicKey: id,
		}},
	}
}

// FinishPasskeyLogin verifies the assertion and either establishes the session
// or hands back a pending token for the PIN step.
//
// Body: { "challenge_id": "...", "credential": { … } }
func FinishPasskeyLogin(c *fiber.Ctx) error {
	var body struct {
		ChallengeID string          `json:"challenge_id"`
		Credential  json.RawMessage `json:"credential"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	rp, err := relyingParty(c)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	db := database.DB.WithContext(c.Context())

	ceremony, sessionData, err := models.ConsumeCeremony(db, body.ChallengeID, models.CeremonyLogin)
	if err != nil {
		return utils.Unauthorized(c, err.Error())
	}

	parsed, err := protocol.ParseCredentialRequestResponseBody(bytes.NewReader(body.Credential))
	if err != nil {
		return utils.BadRequest(c, "That passkey could not be read. Please try again.")
	}

	// The lookup runs during verification, so the row it resolved is captured
	// here rather than fetched a second time afterwards.
	var (
		matchedRow  *models.WebAuthnCredential
		matchedUser models.User
	)
	handler := func(rawID, userHandle []byte) (webauthn.User, error) {
		row, err := models.FindCredential(db, rawID)
		if err != nil {
			return nil, err
		}
		// The user handle the authenticator returns must agree with the owner
		// recorded here. A mismatch means the credential was re-bound
		// somewhere, which is not something to sign anybody in on.
		if len(userHandle) > 0 && string(userHandle) != row.UserID {
			return nil, models.ErrCredentialNotFound
		}
		if err := db.First(&matchedUser, "id = ?", row.UserID).Error; err != nil {
			return nil, models.ErrCredentialNotFound
		}
		matchedRow = row
		pu, _, err := loadPasskeyUser(db, &matchedUser)
		if err != nil {
			return nil, err
		}
		return pu, nil
	}

	var credential *webauthn.Credential
	if len(sessionData.UserID) == 0 {
		// Discoverable: the assertion carries the user handle.
		_, credential, err = rp.ValidatePasskeyLogin(handler, *sessionData, parsed)
	} else {
		// Identifier-first: resolve the owner from the credential first, then
		// validate against that account.
		user, herr := handler(parsed.RawID, parsed.Response.UserHandle)
		if herr != nil {
			return utils.Unauthorized(c, "That passkey was not recognised.")
		}
		credential, err = rp.ValidateLogin(user, *sessionData, parsed)
	}
	if err != nil || matchedRow == nil {
		log.Printf("[PASSKEY] assertion rejected ip=%s err=%v", c.IP(), err)
		return utils.Unauthorized(c, "That passkey could not be verified. Please try again.")
	}

	// A counter that went backwards means two copies of this credential exist.
	// Recorded, surfaced in the passkey list, and logged loudly — but not
	// treated as a failed login, because the legitimate device is as likely to
	// be the one presenting it and locking it out helps nobody.
	if credential.Authenticator.CloneWarning {
		log.Printf("[PASSKEY] clone warning: credential=%s user=%s ip=%s", matchedRow.ID, matchedRow.UserID, c.IP())
	}
	if err := models.RecordCredentialUse(db, matchedRow, credential); err != nil {
		log.Printf("[PASSKEY] failed to record credential use credential=%s err=%v", matchedRow.ID, err)
	}

	// Every gate that guards a password login applies here too.
	if err := passkeyLoginAllowed(c, db, &matchedUser, ceremony.TenantSubdomain); err != nil {
		return err
	}

	// PIN accounts stop here with a pending token; everyone else gets a session.
	if models.HasLoginPIN(db, matchedUser.ID) {
		token, err := models.IssuePendingLogin(db, matchedUser.ID, matchedUser.TenantID)
		if err != nil {
			return utils.InternalError(c, "Could not start sign-in")
		}
		return utils.OK(c, fiber.Map{
			"pin_required": true,
			"pin_token":    token,
			"user": fiber.Map{
				"name":      matchedUser.Name,
				"photo_url": matchedUser.PhotoURL,
			},
		}, "Enter your PIN to finish signing in")
	}

	return completePasskeyLogin(c, db, &matchedUser)
}

// VerifyLoginPIN completes a passkey login that is waiting on its second factor.
//
// Body: { "pin_token": "...", "pin": "123456" }
func VerifyLoginPIN(c *fiber.Ctx) error {
	var body struct {
		PINToken string `json:"pin_token"`
		PIN      string `json:"pin"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	db := database.DB.WithContext(c.Context())
	pending, err := models.ResolvePendingLogin(db, strings.TrimSpace(body.PINToken))
	if err != nil {
		return utils.Unauthorized(c, err.Error())
	}

	switch err := models.VerifyLoginPIN(db, pending.UserID, body.PIN); {
	case err == nil:
		// carry on
	case errors.Is(err, models.ErrPINLocked):
		// The pending login dies with the lockout: making the user redo the
		// passkey step is the point of the cooling-off period.
		models.SpendPendingLogin(db, pending.ID)
		log.Printf("[PASSKEY] PIN lockout user=%s ip=%s", pending.UserID, c.IP())
		return utils.TooManyRequests(c, err.Error())
	case errors.Is(err, models.ErrPINNotSet):
		// The PIN was turned off between the two steps; nothing left to check.
		models.SpendPendingLogin(db, pending.ID)
		return utils.Unauthorized(c, models.ErrPendingLoginInvalid.Error())
	default:
		// 400, not 401: the pending token is still good and the user should be
		// left on the PIN field to try again. A 401 here would be
		// indistinguishable from "your sign-in attempt expired", which sends
		// the client back to the passkey step for nothing.
		return c.Status(fiber.StatusBadRequest).JSON(utils.APIResponse{
			Success: false,
			Error:   "Incorrect PIN",
			Data: fiber.Map{
				"attempts_remaining": models.PINAttemptsRemaining(db, pending.UserID),
			},
		})
	}

	var user models.User
	if err := db.First(&user, "id = ?", pending.UserID).Error; err != nil {
		models.SpendPendingLogin(db, pending.ID)
		return utils.Unauthorized(c, "Invalid credentials")
	}
	// The gates are re-checked rather than trusted from the first step: the
	// pending token lives for minutes, and an account can be deactivated inside
	// that window.
	if err := passkeyLoginAllowed(c, db, &user, ""); err != nil {
		models.SpendPendingLogin(db, pending.ID)
		return err
	}

	models.SpendPendingLogin(db, pending.ID)
	return completePasskeyLogin(c, db, &user)
}

// passkeyLoginAllowed re-applies the login policy from auth.go to an account
// that just proved possession of a passkey.
//
// tenantSubdomain, when supplied, is the login page the ceremony started on: a
// discoverable credential is bound to the shared parent domain, so nothing in
// the ceremony itself stops a user of one tenant answering another tenant's
// prompt. Checking it here is what keeps the tenant boundary.
func passkeyLoginAllowed(c *fiber.Ctx, db *gorm.DB, user *models.User, tenantSubdomain string) error {
	if !user.IsActive {
		return utils.Forbidden(c, "This account is no longer active.")
	}

	if tenantSubdomain != "" {
		var tenant models.Tenant
		if err := db.Where("subdomain = ?", tenantSubdomain).First(&tenant).Error; err != nil {
			return utils.Unauthorized(c, "Invalid credentials")
		}
		if tenant.Status == models.TenantSuspended {
			return utils.Forbidden(c, "This organisation is suspended. Contact support.")
		}
		if user.TenantID != tenant.ID {
			return utils.Unauthorized(c, "That passkey belongs to a different organisation.")
		}
		if user.Role == models.RoleSuperAdmin {
			return utils.Forbidden(c, "Super admins must sign in from the super admin page.")
		}
	} else if user.Role != models.RoleSuperAdmin {
		// No tenant page named the ceremony (the platform login screen), so
		// only a super admin can be completing it — same rule as password login.
		return utils.Forbidden(c, "Use your organisation's login page.")
	}

	if user.Role != models.RoleSuperAdmin {
		if allowed, reason := models.SubscriptionLoginAllowed(db, user.TenantID); !allowed {
			return utils.Forbidden(c, subscriptionBlockMessage(reason))
		}
	}
	return nil
}

// completePasskeyLogin establishes the session and returns the same payload the
// password login does, so the frontend has exactly one shape to handle.
func completePasskeyLogin(c *fiber.Ctx, db *gorm.DB, user *models.User) error {
	log.Printf("[PASSKEY] login success user=%s role=%s tenant=%s", user.ID, user.Role, user.TenantID)
	graph.RecordLoginAudit(database.DB, user.TenantID, user.ID, user.Name, string(user.Role), c.IP())

	tokens, err := startSession(c, user, string(user.Role))
	if err != nil {
		log.Printf("[PASSKEY] token generation failed user=%s err=%v", user.ID, err)
		return utils.InternalError(c, "Could not generate token")
	}

	var tenant models.Tenant
	var tenantPtr *models.Tenant
	if err := db.First(&tenant, "id = ?", user.TenantID).Error; err == nil {
		tenantPtr = &tenant
	}

	payload := sessionPayload(c, tokens)
	payload["user"] = sessionUserMap(c, user, tenantPtr, string(user.Role))
	return utils.OK(c, payload, "Login successful")
}
