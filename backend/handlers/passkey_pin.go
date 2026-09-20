package handlers

// passkey_pin.go — managing the optional 6-digit PIN.
//
// The PIN is a second factor for passkey sign-in, never a credential of its
// own, so everything here is authenticated: you must already be signed in to
// set, change, or remove it. Changing it also requires proving the account
// again — with the current PIN if there is one, or the account password if
// there is not — so that an unlocked, unattended session cannot be turned into
// a permanent foothold by quietly setting a PIN the real user does not know.
//
// It is only offered once a passkey exists. A PIN with nothing to second-factor
// is a secret the user has to remember for no login path, which is why removing
// the last passkey removes the PIN too (see DeleteMyPasskey).

import (
	"errors"
	"log"
	"strings"

	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// GetMyLoginPIN reports whether a PIN is set, and whether one can be.
func GetMyLoginPIN(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)
	db := database.DB.WithContext(c.Context())

	out := fiber.Map{
		"enabled":      models.HasLoginPIN(db, userID),
		"has_passkeys": models.UserHasCredentials(db, userID),
	}
	if row, err := models.GetLoginPIN(db, userID); err == nil && row.LockedUntil != nil {
		out["locked_until"] = row.LockedUntil
	}
	return utils.OK(c, out, "")
}

// SetMyLoginPIN creates or changes the PIN.
//
// Body: { "pin": "482915", "current_pin": "…", "password": "…" }
// current_pin is required when a PIN already exists; password otherwise.
func SetMyLoginPIN(c *fiber.Ctx) error {
	var body struct {
		PIN        string `json:"pin"`
		CurrentPIN string `json:"current_pin"`
		Password   string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	user, err := currentUser(c)
	if err != nil {
		return utils.NotFound(c, "User not found")
	}
	db := database.DB.WithContext(c.Context())

	if !models.UserHasCredentials(db, user.ID) {
		return utils.BadRequest(c, "Add a passkey before setting a PIN — the PIN is a second step for passkey sign-in.")
	}

	pin := strings.TrimSpace(body.PIN)
	if err := models.ValidatePIN(pin); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	if err := confirmPINOwner(c, db, user, body.CurrentPIN, body.Password); err != nil {
		return err
	}

	if err := models.SetLoginPIN(db, user.ID, user.TenantID, pin); err != nil {
		if errors.Is(err, models.ErrPINFormat) || errors.Is(err, models.ErrPINWeak) {
			return utils.BadRequest(c, err.Error())
		}
		log.Printf("[PASSKEY] failed to set PIN user=%s err=%v", user.ID, err)
		return utils.InternalError(c, "Failed to save record")
	}

	log.Printf("[PASSKEY] PIN set user=%s tenant=%s", user.ID, user.TenantID)
	return utils.OK(c, fiber.Map{"enabled": true}, "PIN saved")
}

// DeleteMyLoginPIN turns the second factor off. Proof of the current PIN (or
// the account password) is required: switching a factor off is exactly what
// someone who borrowed an open session would want to do.
func DeleteMyLoginPIN(c *fiber.Ctx) error {
	var body struct {
		CurrentPIN string `json:"current_pin"`
		Password   string `json:"password"`
	}
	// A missing body is fine here — confirmPINOwner rejects it with the right
	// message rather than a parse error.
	_ = c.BodyParser(&body)

	user, err := currentUser(c)
	if err != nil {
		return utils.NotFound(c, "User not found")
	}
	db := database.DB.WithContext(c.Context())

	if !models.HasLoginPIN(db, user.ID) {
		return utils.OK(c, fiber.Map{"enabled": false}, "PIN is already off")
	}
	if err := confirmPINOwner(c, db, user, body.CurrentPIN, body.Password); err != nil {
		return err
	}
	if err := models.ClearLoginPIN(db, user.ID); err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	log.Printf("[PASSKEY] PIN removed user=%s tenant=%s", user.ID, user.TenantID)
	return utils.OK(c, fiber.Map{"enabled": false}, "PIN removed")
}

// confirmPINOwner re-proves the account before a PIN change.
//
// Either factor is accepted, and which one is required depends only on what the
// account has: a user who has never set a PIN has nothing but their password to
// prove with. The failure paths return the same throttled errors the login PIN
// check does, so this endpoint is not a softer place to guess.
func confirmPINOwner(c *fiber.Ctx, db *gorm.DB, user *models.User, currentPIN, password string) error {
	if models.HasLoginPIN(db, user.ID) {
		if strings.TrimSpace(currentPIN) == "" {
			return utils.BadRequest(c, "Enter your current PIN")
		}
		switch err := models.VerifyLoginPIN(db, user.ID, strings.TrimSpace(currentPIN)); {
		case err == nil:
			return nil
		case errors.Is(err, models.ErrPINLocked):
			return utils.TooManyRequests(c, err.Error())
		default:
			return utils.Unauthorized(c, "Current PIN is incorrect")
		}
	}

	if password == "" {
		return utils.BadRequest(c, "Enter your account password to confirm")
	}
	if !utils.CheckPassword(password, user.Password) {
		return utils.Unauthorized(c, "Password is incorrect")
	}
	return nil
}
