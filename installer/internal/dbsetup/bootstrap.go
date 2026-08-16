package dbsetup

import (
	"context"
	"fmt"
	"time"

	"github.com/peepal/installer/internal/pgsql"
)

// startTemporarily brings a freshly initialised cluster up just long enough
// to create the role and the database. The agent owns the server afterwards,
// so this process is stopped again before setup finishes.
func startTemporarily(ctx context.Context, c pgsql.Cluster, log Logf) error {
	if c.Ready(ctx, 2*time.Second) {
		return nil // something is already serving this port
	}
	log("Starting the database for first-time setup...")
	runCtx, cancel := context.WithCancel(ctx)
	cmd := c.ServerCommand(runCtx)
	if err := cmd.Start(); err != nil {
		cancel()
		return fmt.Errorf("starting PostgreSQL: %w", err)
	}
	go func() {
		<-runCtx.Done()
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
	}()
	if !c.Ready(ctx, 60*time.Second) {
		cancel()
		return fmt.Errorf("PostgreSQL did not become ready")
	}
	// The caller finishes its work while the server is up; stopping is
	// deferred to the returned closer.
	bootstrapStop = cancel
	return nil
}

// bootstrapStop stops the temporary server started during setup. It is a
// package variable rather than a return value so Prepare's signature stays
// about the database rather than about process lifetimes.
var bootstrapStop context.CancelFunc

// StopBootstrap shuts down the temporary setup server, if one is running.
// The panel calls it once the environment files are written and the real
// supervisor is about to take over.
func StopBootstrap() {
	if bootstrapStop != nil {
		bootstrapStop()
		bootstrapStop = nil
		time.Sleep(2 * time.Second) // let the postmaster release the socket
	}
}
