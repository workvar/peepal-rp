package main

import (
	"context"
	"os/exec"
	"time"

	"github.com/peepal/installer/internal/pgsql"
)

// The installer needs the database briefly, before the agent exists to
// supervise it. tempServer is that short-lived instance.
var tempServer *exec.Cmd

func startTemporaryServer(ctx context.Context, c pgsql.Cluster) error {
	cmd := c.ServerCommand(ctx)
	if err := cmd.Start(); err != nil {
		return err
	}
	tempServer = cmd
	return nil
}

// stopTemporaryServer shuts the temporary instance down so the agent can take
// ownership of the data directory.
func stopTemporaryServer() {
	if tempServer == nil || tempServer.Process == nil {
		return
	}
	signalStop(tempServer)
	done := make(chan struct{})
	go func() { tempServer.Wait(); close(done) }()
	select {
	case <-done:
	case <-time.After(30 * time.Second):
		tempServer.Process.Kill()
	}
	tempServer = nil
}
