//go:build windows

package supervisor

import "os/exec"

// terminate kills the child. Windows has no graceful signal for a console-less
// child process, so the app is expected to survive an abrupt stop.
func terminate(cmd *exec.Cmd) {
	cmd.Process.Kill()
}
