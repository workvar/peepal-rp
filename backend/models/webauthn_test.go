package models

// webauthn_test.go — the storage invariants a passkey login depends on.
//
// Two of them carry real weight. A credential ID must map to exactly one
// account, because that mapping is what a discoverable login resolves the user
// from. And a ceremony challenge must be answerable exactly once, because a
// challenge that can be replayed is not a challenge.

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/go-webauthn/webauthn/webauthn"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func webauthnDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&WebAuthnCredential{}, &WebAuthnSession{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	return db
}

func sampleCredential(id string) *webauthn.Credential {
	cred := &webauthn.Credential{
		ID:        []byte(id),
		PublicKey: []byte("public-key-bytes"),
	}
	cred.Authenticator.SignCount = 1
	cred.Flags.BackupEligible = true
	cred.Flags.BackupState = true
	return cred
}

func TestStoreAndFindCredential(t *testing.T) {
	db := webauthnDB(t)
	cred := sampleCredential("cred-a")

	row, err := StoreCredential(db, "u1", "t1", "MacBook", cred)
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	if row.CredentialID != EncodeCredentialID(cred.ID) {
		t.Fatalf("credential ID stored as %q", row.CredentialID)
	}
	if !row.BackupState {
		t.Fatal("backup state not carried over from the credential flags")
	}

	found, err := FindCredential(db, cred.ID)
	if err != nil {
		t.Fatalf("find: %v", err)
	}
	if found.UserID != "u1" || found.Name != "MacBook" {
		t.Fatalf("found the wrong row: %+v", found)
	}

	// The stored JSON must decode back to something usable — the public key is
	// what every future assertion is verified against.
	decoded, err := found.Credential()
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if string(decoded.PublicKey) != "public-key-bytes" {
		t.Fatalf("public key round-tripped as %q", decoded.PublicKey)
	}
}

func TestCredentialIDIsGloballyUnique(t *testing.T) {
	db := webauthnDB(t)
	cred := sampleCredential("cred-a")
	if _, err := StoreCredential(db, "u1", "t1", "First", cred); err != nil {
		t.Fatalf("first store: %v", err)
	}
	// The same authenticator must not end up bound to a second account: that
	// is what a discoverable login resolves identity from.
	if _, err := StoreCredential(db, "u2", "t1", "Second", cred); err == nil {
		t.Fatal("a duplicate credential ID was accepted")
	}
}

func TestFindCredentialUnknown(t *testing.T) {
	db := webauthnDB(t)
	if _, err := FindCredential(db, []byte("nope")); err != ErrCredentialNotFound {
		t.Fatalf("got %v, want ErrCredentialNotFound", err)
	}
}

func TestRecordCredentialUseUpdatesCounter(t *testing.T) {
	db := webauthnDB(t)
	cred := sampleCredential("cred-a")
	row, _ := StoreCredential(db, "u1", "t1", "MacBook", cred)

	cred.Authenticator.SignCount = 42
	cred.Authenticator.CloneWarning = true
	if err := RecordCredentialUse(db, row, cred); err != nil {
		t.Fatalf("record use: %v", err)
	}

	found, _ := FindCredential(db, cred.ID)
	if found.SignCount != 42 {
		t.Fatalf("sign count = %d, want 42", found.SignCount)
	}
	// A clone warning is evidence that two copies of the key exist. It is kept
	// so the passkey list can surface it, not dropped on the floor.
	if !found.CloneWarning {
		t.Fatal("clone warning was not persisted")
	}
	if found.LastUsedAt == nil {
		t.Fatal("last used timestamp not recorded")
	}
}

func TestDeleteAndRenameAreOwnerScoped(t *testing.T) {
	db := webauthnDB(t)
	row, _ := StoreCredential(db, "u1", "t1", "MacBook", sampleCredential("cred-a"))

	// A row ID learned from anywhere must not let another account touch it.
	if err := DeleteCredential(db, "u2", row.ID); err != ErrCredentialNotFound {
		t.Fatalf("cross-account delete: got %v, want ErrCredentialNotFound", err)
	}
	if err := RenameCredential(db, "u2", row.ID, "Stolen"); err != ErrCredentialNotFound {
		t.Fatalf("cross-account rename: got %v, want ErrCredentialNotFound", err)
	}

	if err := RenameCredential(db, "u1", row.ID, "Work laptop"); err != nil {
		t.Fatalf("rename: %v", err)
	}
	rows, _ := UserCredentials(db, "u1")
	if len(rows) != 1 || rows[0].Name != "Work laptop" {
		t.Fatalf("unexpected credentials after rename: %+v", rows)
	}

	if err := DeleteCredential(db, "u1", row.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if UserHasCredentials(db, "u1") {
		t.Fatal("credential still present after delete")
	}
}

func TestCeremonyIsSingleUse(t *testing.T) {
	db := webauthnDB(t)
	data := &webauthn.SessionData{Challenge: "abc", Expires: time.Now().Add(time.Minute)}

	id, err := StartCeremony(db, CeremonyLogin, "", "t1", "acme", data)
	if err != nil {
		t.Fatalf("start: %v", err)
	}

	row, got, err := ConsumeCeremony(db, id, CeremonyLogin)
	if err != nil {
		t.Fatalf("consume: %v", err)
	}
	if got.Challenge != "abc" || row.TenantSubdomain != "acme" {
		t.Fatalf("ceremony round-tripped wrong: %+v / %+v", row, got)
	}

	// Replaying the same challenge must fail, or the signature over it could be
	// reused.
	if _, _, err := ConsumeCeremony(db, id, CeremonyLogin); err != ErrCeremonyUnknown {
		t.Fatalf("replay: got %v, want ErrCeremonyUnknown", err)
	}
}

func TestCeremonyPurposeIsEnforced(t *testing.T) {
	db := webauthnDB(t)
	data := &webauthn.SessionData{Challenge: "abc", Expires: time.Now().Add(time.Minute)}
	id, _ := StartCeremony(db, CeremonyRegister, "u1", "t1", "", data)

	// A registration challenge answered as a login would let an enrolment
	// ceremony mint a session.
	if _, _, err := ConsumeCeremony(db, id, CeremonyLogin); err != ErrCeremonyUnknown {
		t.Fatalf("cross-purpose: got %v, want ErrCeremonyUnknown", err)
	}
}

func TestCeremonyExpires(t *testing.T) {
	db := webauthnDB(t)
	data := &webauthn.SessionData{Challenge: "abc"}
	id, _ := StartCeremony(db, CeremonyLogin, "", "t1", "acme", data)

	if err := db.Model(&WebAuthnSession{}).Where("id = ?", id).
		Update("expires_at", time.Now().Add(-time.Second)).Error; err != nil {
		t.Fatalf("expire: %v", err)
	}
	if _, _, err := ConsumeCeremony(db, id, CeremonyLogin); err != ErrCeremonyExpired {
		t.Fatalf("got %v, want ErrCeremonyExpired", err)
	}
}
