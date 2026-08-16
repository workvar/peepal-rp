package pgsql

import (
	"os/exec"

	"github.com/peepal/installer/internal/sysuser"
)

// applyCredential runs a PostgreSQL child process as the unprivileged service
// account, which the server requires on Unix.
func applyCredential(cmd *exec.Cmd, name string) { sysuser.Apply(cmd, name) }

// chownTree hands a data directory to the service account.
func chownTree(path, name string) error { return sysuser.Chown(path, name) }
