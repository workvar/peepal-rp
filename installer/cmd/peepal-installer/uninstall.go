package main

import (
	"context"
	"os"

	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/sysinfo"
	"github.com/peepal/installer/internal/ui"
)

// uninstall removes the service and the program files. The database and
// uploaded files are kept unless --keep-data=false is passed, because losing
// a customer's records to a stray flag is unforgivable.
func uninstall(ctx context.Context, o Options) {
	banner()
	if !sysinfo.IsAdmin() {
		ui.Fail("Administrator rights are required.\n      %s", sysinfo.ElevationHint())
	}

	l := paths.New(o.Dir)
	ui.Step(1, "Removing Peepal from "+l.Root)

	if !o.Unattended && !ui.Confirm("Remove the Peepal service and program files?", false) {
		ui.Info("Nothing was changed.")
		return
	}

	if mgr, err := serviceManager(); err == nil {
		mgr.Stop()
		if err := mgr.Uninstall(); err != nil {
			ui.Warn("Could not remove the service: %v", err)
		} else {
			ui.OK("Background service removed")
		}
	}

	for _, dir := range []string{l.Apps(), l.Bin(), l.Node(), l.Staging()} {
		if err := os.RemoveAll(dir); err != nil {
			ui.Warn("Could not remove %s: %v", dir, err)
		}
	}
	ui.OK("Program files removed")

	if o.KeepData {
		ui.Info("The database and uploaded files were kept in %s", l.Data)
		ui.Info("Delete that folder by hand once you are sure it is no longer needed.")
		return
	}
	if !o.Unattended && !ui.Confirm("Also delete the database and all uploaded files? This cannot be undone", false) {
		ui.Info("The data in %s was kept.", l.Data)
		return
	}
	if err := os.RemoveAll(l.Data); err != nil {
		ui.Warn("Could not remove %s: %v", l.Data, err)
		return
	}
	ui.OK("All data removed")
}
