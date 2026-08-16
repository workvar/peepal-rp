package main

import (
	"fmt"

	"github.com/peepal/installer/internal/buildinfo"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/sysinfo"
	"github.com/peepal/installer/internal/ui"
)

// minDiskBytes is the floor for the app, the database and a model download.
const minDiskBytes = 12 << 30

// preflight refuses to start when the machine obviously cannot host the app,
// so failures happen before anything has been written.
func preflight(o Options) sysinfo.Machine {
	ui.Step(1, "Checking this computer")

	m := sysinfo.Detect()
	ui.Info("%s", m)

	if !sysinfo.IsAdmin() {
		ui.Fail("Administrator rights are required.\n      %s", sysinfo.ElevationHint())
	}
	ui.OK("Running with administrator rights")

	if buildinfo.Token == "" {
		ui.Warn("No release token was built into this installer; private downloads will fail.")
	}

	free := sysinfo.FreeDiskForPath(o.Dir)
	if free > 0 && free < minDiskBytes {
		ui.Fail("Only %.1f GB free at %s; at least %d GB is needed.",
			float64(free)/(1<<30), o.Dir, minDiskBytes>>30)
	}
	if free > 0 {
		ui.OK("%.1f GB free at %s", float64(free)/(1<<30), o.Dir)
	}

	if m.RAMBytes > 0 && m.RAMBytes < 4<<30 {
		ui.Fail("%.1f GB of RAM is below the 4 GB minimum.", m.RAMGB())
	}

	layout := paths.New(o.Dir)
	if sysinfo.PortFree(o.HTTPPort) {
		ui.OK("Port %d is free", o.HTTPPort)
	} else if alreadyInstalled(layout) {
		ui.Info("Port %d is in use by an existing Peepal install; it will be restarted.", o.HTTPPort)
	} else {
		ui.Fail("Port %d is already in use by another program. Re-run with --port to pick another.", o.HTTPPort)
	}

	return m
}

// alreadyInstalled reports whether this is an upgrade of an existing install.
func alreadyInstalled(l paths.Layout) bool {
	return fileExists(l.ConfigFile())
}

func fmtGB(b uint64) string { return fmt.Sprintf("%.1f GB", float64(b)/(1<<30)) }
