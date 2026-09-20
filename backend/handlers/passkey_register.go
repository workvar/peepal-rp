package handlers

// passkey_register.go — enrolling a passkey, and managing the ones already
// enrolled.
//
// Registration runs inside an authenticated session on purpose. Adding a
// credential is equivalent to adding a way to log in, so it has to be gated by
// a way to log in that already worked; anything else would let whoever reaches
// the endpoint mint themselves an account.

import (
	"bytes"
	"encoding/json"
	"errors"
	"log"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gofiber/fiber/v2"
)

// BeginPasskeyRegistration issues the creation challenge for a new passkey.
//
// Response: { "challenge_id": "...", "options": { publicKey creation options } }
// The client passes options.publicKey straight to navigator.credentials.create.
func BeginPasskeyRegistration(c *fiber.Ctx) error {
	rp, err := relyingParty(c)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	user, err := currentUser(c)
	if err != nil {
		return utils.NotFound(c, "User not found")
	}

	db := database.DB.WithContext(c.Context())
	pu, rows, err := loadPasskeyUser(db, user)
	if err != nil {
		return utils.InternalError(c, "Could not read your passkeys")
	}

	// Excluding the keys already registered is what makes the authenticator say
	// "you already have a passkey for this account" instead of quietly creating
	// a second one on the same device.
	exclusions := make([]protocol.CredentialDescriptor, 0, len(rows))
	for _, cred := range pu.credentials {
		exclusions = append(exclusions, cred.Descriptor())
	}

	options, sessionData, err := rp.BeginRegistration(pu,
		webauthn.WithAuthenticatorSelection(authenticatorSelection()),
		webauthn.WithExclusions(exclusions),
	)
	if err != nil {
		log.Printf("[PASSKEY] begin registration failed user=%s err=%v", user.ID, err)
		return utils.InternalError(c, "Could not start passkey setup")
	}

	ceremonyID, err := models.StartCeremony(db, models.CeremonyRegister, user.ID, user.TenantID, "", sessionData)
	if err != nil {
		return utils.InternalError(c, "Could not start passkey setup")
	}

	return utils.OK(c, fiber.Map{
		"challenge_id": ceremonyID,
		"options":      options.Response,
	}, "")
}

// FinishPasskeyRegistration verifies the authenticator's attestation and stores
// the new credential.
//
// Body: { "challenge_id": "...", "name": "MacBook Touch ID", "credential": { … } }
func FinishPasskeyRegistration(c *fiber.Ctx) error {
	var body struct {
		ChallengeID string `json:"challenge_id"`
		Name        string `json:"name"`
		// Raw on purpose: re-marshalling the credential could change the bytes
		// the authenticator's signature was computed over.
		Credential json.RawMessage `json:"credential"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	rp, err := relyingParty(c)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	user, err := currentUser(c)
	if err != nil {
		return utils.NotFound(c, "User not found")
	}

	db := database.DB.WithContext(c.Context())
	ceremony, sessionData, err := models.ConsumeCeremony(db, body.ChallengeID, models.CeremonyRegister)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	// The challenge was issued to one account; it may only be answered by that
	// account, even though both requests are authenticated.
	if ceremony.UserID != user.ID {
		return utils.Forbidden(c, "This passkey setup belongs to a different account")
	}

	parsed, err := protocol.ParseCredentialCreationResponseBody(bytes.NewReader(body.Credential))
	if err != nil {
		return utils.BadRequest(c, "That passkey could not be read. Please try again.")
	}

	pu, _, err := loadPasskeyUser(db, user)
	if err != nil {
		return utils.InternalError(c, "Could not read your passkeys")
	}

	credential, err := rp.CreateCredential(pu, *sessionData, parsed)
	if err != nil {
		log.Printf("[PASSKEY] registration verification failed user=%s err=%v", user.ID, err)
		return utils.BadRequest(c, "That passkey could not be verified. Please try again.")
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		name = "Passkey"
	}
	if len(name) > 60 {
		name = name[:60]
	}

	row, err := models.StoreCredential(db, user.ID, user.TenantID, name, credential)
	if err != nil {
		log.Printf("[PASSKEY] storing credential failed user=%s err=%v", user.ID, err)
		return utils.BadRequest(c, "That passkey is already registered.")
	}

	log.Printf("[PASSKEY] registered user=%s tenant=%s credential=%s", user.ID, user.TenantID, row.ID)
	return utils.Created(c, passkeyView(row, false), "Passkey added")
}

// ListMyPasskeys returns the current user's registered passkeys, plus whether a
// PIN is set — the security section of the profile page renders both together.
func ListMyPasskeys(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)
	db := database.DB.WithContext(c.Context())

	rows, err := models.UserCredentials(db, userID)
	if err != nil {
		return utils.InternalError(c, "Could not read your passkeys")
	}
	views := make([]fiber.Map, 0, len(rows))
	for i := range rows {
		views = append(views, passkeyView(&rows[i], false))
	}
	return utils.OK(c, fiber.Map{
		"passkeys":    views,
		"pin_enabled": models.HasLoginPIN(db, userID),
	}, "")
}

// RenameMyPasskey updates the label on one of the caller's passkeys.
func RenameMyPasskey(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)
	var body struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		return utils.BadRequest(c, "Name cannot be empty")
	}
	if len(name) > 60 {
		name = name[:60]
	}

	err := models.RenameCredential(database.DB.WithContext(c.Context()), userID, c.Params("id"), name)
	if errors.Is(err, models.ErrCredentialNotFound) {
		return utils.NotFound(c, "Passkey not found")
	}
	if err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, nil, "Passkey renamed")
}

// DeleteMyPasskey removes one of the caller's passkeys.
//
// Removing the last one also removes the PIN. The PIN is the second factor for
// a passkey login and is not a credential on its own, so leaving it behind
// would strand a secret that nothing can use and that the user would have to
// remember for a login path they no longer have.
func DeleteMyPasskey(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)
	db := database.DB.WithContext(c.Context())

	err := models.DeleteCredential(db, userID, c.Params("id"))
	if errors.Is(err, models.ErrCredentialNotFound) {
		return utils.NotFound(c, "Passkey not found")
	}
	if err != nil {
		return utils.InternalError(c, "Failed to remove passkey")
	}

	if !models.UserHasCredentials(db, userID) {
		if err := models.ClearLoginPIN(db, userID); err != nil {
			log.Printf("[PASSKEY] failed to clear orphaned PIN user=%s err=%v", userID, err)
		}
	}
	return utils.OK(c, fiber.Map{
		"pin_enabled": models.HasLoginPIN(db, userID),
	}, "Passkey removed")
}

// passkeyView is the shape the frontend renders. It deliberately omits the
// public key and attestation: they are useless to the client and there is no
// reason to hand out more of a credential record than the UI shows.
func passkeyView(row *models.WebAuthnCredential, includeSyncHint bool) fiber.Map {
	out := fiber.Map{
		"id":           row.ID,
		"name":         row.Name,
		"created_at":   row.CreatedAt,
		"last_used_at": row.LastUsedAt,
		// A synced passkey lives in the user's cloud keychain and survives a
		// lost device; a device-bound one does not. Worth showing, because it
		// changes whether a second passkey is a good idea.
		"synced":        row.BackupState,
		"clone_warning": row.CloneWarning,
	}
	if includeSyncHint {
		out["backup_eligible"] = row.BackupEligible
	}
	return out
}
