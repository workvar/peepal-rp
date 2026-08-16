package main

import (
	"net"
	"strconv"
	"time"

	"github.com/peepal/installer/internal/appconfig"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/service"
	"github.com/peepal/installer/internal/ui"
)

// installService puts the agent binary in place and registers it so the ERP
// starts with the machine.
func installService(l paths.Layout, cfg appconfig.Config) {
	src, err := siblingOf(paths.Exe("peepal-agent"))
	if err != nil || !fileExists(src) {
		ui.Fail("The peepal-agent program was not found beside this installer.\n      Re-download the installer package; it ships both files.")
	}
	if err := copyExecutable(src, l.AgentBin()); err != nil {
		ui.Fail("Could not install the background service program: %v", err)
	}

	mgr, err := service.For()
	if err != nil {
		ui.Fail("%v", err)
	}
	if mgr.Installed() {
		ui.Info("Updating the existing background service...")
		mgr.Stop()
	}
	def := service.Definition{
		DisplayName: "Peepal ERP",
		Description: "Peepal ERP application server and automatic updater",
		ExecPath:    l.AgentBin(),
		Args:        []string{"-config", l.ConfigFile()},
		WorkingDir:  l.Root,
	}
	if err := mgr.Install(def); err != nil {
		ui.Fail("Could not register the background service: %v", err)
	}
	if err := mgr.Start(); err != nil {
		ui.Fail("Could not start the background service: %v", err)
	}
	ui.OK("Background service registered and started")
}

// serviceManager is a convenience wrapper for the summary and the uninstaller.
func serviceManager() (service.Manager, error) { return service.For() }

// serving reports whether the front door answers a TCP connection.
func serving(port int) bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:"+strconv.Itoa(port), 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}
