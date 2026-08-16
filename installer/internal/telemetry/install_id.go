package telemetry

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
)

// InstallID returns a stable random identifier for this installation, created
// on first use. It is deliberately not derived from the hostname or MAC
// address: the developer needs to tell installs apart, not to identify the
// machine.
func InstallID(dataDir string) string {
	path := filepath.Join(dataDir, "install-id")
	if b, err := os.ReadFile(path); err == nil {
		if id := strings.TrimSpace(string(b)); id != "" {
			return id
		}
	}
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "unknown"
	}
	id := hex.EncodeToString(buf)
	if err := os.MkdirAll(dataDir, 0o755); err == nil {
		os.WriteFile(path, []byte(id+"\n"), 0o644)
	}
	return id
}
