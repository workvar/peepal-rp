package setup

import (
	"fmt"
	"os"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/service"
	"github.com/peepal/installer/internal/workspace"
)

// AgentName is the binary the service manager starts: the same panel
// executable, run headless.
const AgentName = "panel-agent"

// registerService installs the platform service that runs the stack without
// anyone logged in, and starts it.
func registerService(spec appdef.Spec, l workspace.Layout, r *reporter) error {
	mgr, err := service.For()
	if err != nil {
		return err
	}
	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("cannot find this program's own path: %w", err)
	}
	def := service.Definition{
		DisplayName: spec.App.DisplayName,
		Description: spec.App.Description,
		ExecPath:    exe,
		Args:        []string{"-headless", "-config", l.SpecFile()},
		WorkingDir:  l.Root,
	}
	r.line("Registering the %s service", spec.App.DisplayName)
	if err := mgr.Install(def); err != nil {
		return err
	}
	if err := mgr.Start(); err != nil {
		return err
	}
	r.line("%s", mgr.Describe())
	return nil
}

// sprintf keeps the reporter free of a direct fmt dependency in progress.go.
func sprintf(format string, a ...any) string { return fmt.Sprintf(format, a...) }
