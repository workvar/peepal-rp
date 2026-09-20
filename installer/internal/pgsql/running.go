package pgsql

import (
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"time"
)

// DistroOSUser is the Unix account Debian/RHEL create for the packaged server.
const DistroOSUser = "postgres"

// ListeningPort returns the first candidate port where pg_isready succeeds.
func ListeningPort(in Install, ports ...int) (int, bool) {
	bin := in.Bin("pg_isready")
	for _, p := range ports {
		cmd := exec.Command(bin, "-h", "127.0.0.1", "-p", strconv.Itoa(p), "-q")
		if cmd.Run() == nil {
			return p, true
		}
	}
	return 0, false
}

// EnsureSystemRunning starts the distro PostgreSQL service if nothing is
// listening yet (common right after apt installs the package).
func EnsureSystemRunning(ctx context.Context, in Install, log Logf) error {
	if _, ok := ListeningPort(in, 5432, 5433); ok {
		return nil
	}
	log("Starting the system PostgreSQL service...")
	_ = exec.CommandContext(ctx, "systemctl", "start", "postgresql").Run()
	deadline := time.Now().Add(45 * time.Second)
	for time.Now().Before(deadline) {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if _, ok := ListeningPort(in, 5432, 5433); ok {
			return nil
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("PostgreSQL is installed but did not start listening on port 5432")
}
