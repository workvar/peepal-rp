//go:build !windows

package main

import "github.com/peepal/installer/internal/sysuser"

// serviceUser is the unprivileged account child processes run as.
func serviceUser() string { return sysuser.Account() }
