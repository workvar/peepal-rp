// Package appstate is the small JSON file that remembers what is installed:
// which commit each repository is on, when the last update ran and how it
// went. It survives rebuilds because it lives in the data directory.
package appstate

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

// State is the whole file.
type State struct {
	InstalledAt time.Time `json:"installed_at"`
	// Commits maps a repo name to the commit currently built and running.
	Commits map[string]string `json:"commits"`
	// Releases maps a repo name to the release tag currently checked out.
	// Empty for a repository that is following a branch instead.
	Releases map[string]string `json:"releases"`
	// Previous is the commit set before the last update, used to roll back.
	Previous     map[string]string `json:"previous,omitempty"`
	LastCheck    time.Time         `json:"last_check"`
	LastUpdate   time.Time         `json:"last_update"`
	LastError    string            `json:"last_error,omitempty"`
	PanelVersion string            `json:"panel_version,omitempty"`
	// Setup records that the wizard finished, so the panel opens on the
	// dashboard instead of the first question.
	Setup bool `json:"setup"`
}

// Load reads the file, returning an empty state when it does not exist yet.
func Load(path string) State {
	s := State{Commits: map[string]string{}, Releases: map[string]string{}}
	b, err := os.ReadFile(path)
	if err != nil {
		return s
	}
	json.Unmarshal(b, &s)
	if s.Commits == nil {
		s.Commits = map[string]string{}
	}
	if s.Releases == nil {
		s.Releases = map[string]string{}
	}
	return s
}

// Save writes the file atomically.
func Save(path string, s State) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
