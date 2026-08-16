//go:build !windows

package main

import (
	"os/exec"
	"syscall"
)

// signalStop asks PostgreSQL for a fast shutdown.
func signalStop(cmd *exec.Cmd) { cmd.Process.Signal(syscall.SIGINT) }
