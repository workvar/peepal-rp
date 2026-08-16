// Package updater watches the two release repositories and installs newer
// tags on the client machine without anyone logging into it.
package updater

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

// State records what is deployed, so a check is a cheap tag comparison.
type State struct {
	BackendTag  string    `json:"backend_tag"`
	FrontendTag string    `json:"frontend_tag"`
	LastCheck   time.Time `json:"last_check"`
	LastUpdate  time.Time `json:"last_update"`
	// LastError is kept for the status endpoint and support calls.
	LastError string `json:"last_error,omitempty"`
}

// LoadState reads the state file, returning a zero state when absent.
func LoadState(path string) State {
	var s State
	b, err := os.ReadFile(path)
	if err != nil {
		return s
	}
	json.Unmarshal(b, &s)
	return s
}

// SaveState writes the state file atomically.
func SaveState(path string, s State) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
