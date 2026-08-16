//go:build !windows

package supervisor

import (
	"os/exec"
	"syscall"
)

// terminate asks a child to shut down cleanly. PostgreSQL treats SIGINT as
// "fast shutdown", which is what we want before swapping binaries.
func terminate(cmd *exec.Cmd) {
	cmd.Process.Signal(syscall.SIGTERM)
}
