package pgsql

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"

	"github.com/peepal/installer/internal/download"
)

// edbWindowsInstaller is the graphical installer, driven in unattended mode.
// The plain binary archive cannot be used on Windows because postgres.exe
// refuses to run under an administrator token; this installer sets up a
// dedicated low-privilege service account for us.
const edbWindowsInstaller = "https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64.exe"

// ServiceName is the Windows service the EnterpriseDB installer registers.
const ServiceName = "peepal-postgres"

// installWindows runs the vendor installer silently and returns the resulting
// installation. The cluster it creates is already initialised, so the caller
// skips initdb entirely (Managed is false: Windows starts the service).
func installWindows(ctx context.Context, pgRoot, dataDir, cacheDir, superPassword string, port int, log Logf) (Install, error) {
	log("Downloading the PostgreSQL installer for Windows...")
	setup := filepath.Join(cacheDir, "postgresql-setup.exe")
	if err := download.ToFile(ctx, download.Options{URL: edbWindowsInstaller, Dest: setup}); err != nil {
		return Install{}, err
	}

	log("Installing PostgreSQL as the %q service (this takes a few minutes)...", ServiceName)
	args := []string{
		"--mode", "unattended",
		"--unattendedmodeui", "none",
		"--prefix", pgRoot,
		"--datadir", dataDir,
		"--servicename", ServiceName,
		"--serviceaccount", "NT AUTHORITY\\NetworkService",
		"--superaccount", SuperUser,
		"--superpassword", superPassword,
		"--serverport", strconv.Itoa(port),
		"--disable-components", "pgAdmin,stackbuilder",
	}
	cmd := exec.CommandContext(ctx, setup, args...)
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		return Install{}, fmt.Errorf("PostgreSQL installer failed: %w", err)
	}
	os.Remove(setup)

	in := Install{BinDir: filepath.Join(pgRoot, "bin"), Managed: false, Source: "EnterpriseDB installer"}
	if !hasInitdb(in.BinDir) {
		return Install{}, fmt.Errorf("PostgreSQL installer finished but %s is missing", in.Bin("initdb"))
	}
	return in, nil
}
