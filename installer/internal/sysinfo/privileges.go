package sysinfo

import (
	"os"
	"os/exec"
	"runtime"
)

// IsAdmin reports whether the process can write to system directories and
// register services. Installing without this always fails later, so the
// installer checks it before doing any work.
func IsAdmin() bool {
	if runtime.GOOS == "windows" {
		// "net session" needs the administrator token; it fails for a
		// standard user even in an elevated-looking console.
		return exec.Command("net", "session").Run() == nil
	}
	return os.Geteuid() == 0
}

// ElevationHint is the platform-specific instruction shown when IsAdmin fails.
func ElevationHint() string {
	switch runtime.GOOS {
	case "windows":
		return "Right-click the installer and choose \"Run as administrator\"."
	case "darwin":
		return "Re-run with: sudo peepal-installer"
	default:
		return "Re-run with: sudo peepal-installer"
	}
}
