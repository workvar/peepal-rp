// Package service registers the agent with the operating system so the ERP
// comes back by itself after a power cut, without anyone logging in.
package service

import (
	"fmt"
	"runtime"
)

// Name is the service identifier used on every platform.
const Name = "peepal"

// Definition describes the background service to register.
type Definition struct {
	DisplayName string
	Description string
	ExecPath    string
	Args        []string
	WorkingDir  string
	// User is the account the service runs as; empty means the system
	// account. The agent needs root/SYSTEM to bind port 80 and to drop
	// privileges for its children.
	User string
}

// Manager installs and controls the platform's service.
type Manager interface {
	Install(d Definition) error
	Uninstall() error
	Start() error
	Stop() error
	// Installed reports whether the service is already registered.
	Installed() bool
	// Describe returns the commands an administrator would use by hand.
	Describe() string
}

// For returns the manager for the current operating system.
func For() (Manager, error) {
	switch runtime.GOOS {
	case "linux":
		return systemd{}, nil
	case "darwin":
		return launchd{}, nil
	case "windows":
		return windowsTask{}, nil
	}
	return nil, fmt.Errorf("no service integration for %s", runtime.GOOS)
}
