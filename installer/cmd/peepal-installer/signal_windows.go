//go:build windows

package main

import "os/exec"

// signalStop has no graceful equivalent on Windows; the server recovers on
// its next start.
func signalStop(cmd *exec.Cmd) { cmd.Process.Kill() }
