//go:build windows

// Package sysuser is a no-op on Windows: services take their identity from
// the service registration (NetworkService for PostgreSQL, LocalSystem for
// the agent) rather than from the parent process.
package sysuser

import "os/exec"

// Account is empty on Windows: services take their identity from the service
// registration, and children inherit it.
func Account() string { return "" }

// Ensure reports that no service account needs creating.
func Ensure(homeDir string) (string, error) { return "", nil }

// Apply does nothing; child processes inherit the service identity.
func Apply(cmd *exec.Cmd, name string) {}

// Chown does nothing; NTFS inheritance from the install directory applies.
func Chown(path, name string) error { return nil }
