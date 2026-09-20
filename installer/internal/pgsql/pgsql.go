// Package pgsql provisions and runs the PostgreSQL instance the backend
// needs, without asking the customer's IT department for a database.
//
// Three sources are tried in order: an installation already on the machine,
// the platform's package manager, and finally EnterpriseDB's redistributable
// binaries. Whichever wins, the result is the same: a bin directory holding
// initdb/postgres/psql that the rest of the package drives.
package pgsql

import (
	"context"
	"fmt"
	"path/filepath"
	"runtime"
)

// MajorVersion is the server series installed on fresh machines.
const MajorVersion = "16"

// Install describes a usable PostgreSQL installation.
type Install struct {
	// BinDir holds initdb, postgres, psql and pg_isready.
	BinDir string
	// Managed is true when the agent must start and stop the server itself.
	// It is false on Windows, where the EnterpriseDB installer registers a
	// Windows service that the OS starts for us.
	Managed bool
	Source  string
}

// Bin returns the absolute path of a PostgreSQL executable.
func (i Install) Bin(name string) string {
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	return filepath.Join(i.BinDir, name)
}

// Logf is the progress callback the installer passes in.
type Logf func(string, ...any)

// Ensure returns a usable installation, provisioning one if necessary.
// pgRoot is where downloaded binaries are unpacked; superPassword is used
// only by the Windows unattended installer, which initialises its own cluster.
func Ensure(ctx context.Context, pgRoot, dataDir, cacheDir, superPassword string, port int, log Logf) (Install, error) {
	if in, ok := Locate(pgRoot); ok {
		log("Found PostgreSQL at %s", in.BinDir)
		return in, nil
	}
	switch runtime.GOOS {
	case "windows":
		return installWindows(ctx, pgRoot, dataDir, cacheDir, superPassword, port, log)
	case "darwin":
		if in, err := installViaBrew(ctx, log); err == nil {
			return in, nil
		} else {
			log("Homebrew route unavailable (%v); falling back to portable binaries.", err)
		}
		return installPortable(ctx, pgRoot, cacheDir, log)
	case "linux":
		if in, err := installPortable(ctx, pgRoot, cacheDir, log); err == nil {
			return in, nil
		} else {
			log("Portable binaries unavailable (%v); trying the system package manager.", err)
		}
		return installViaPackageManager(ctx, log)
	}
	return Install{}, fmt.Errorf("no PostgreSQL provisioning strategy for %s", runtime.GOOS)
}
