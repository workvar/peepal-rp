package supervisor

import (
	"context"
	"time"
)

// Group runs an ordered set of processes: earlier entries start first and
// stop last, which is how the database outlives the app servers.
type Group struct {
	procs []*Process
	ctx   context.Context
	stop  context.CancelFunc
}

// NewGroup creates an empty group.
func NewGroup() *Group { return &Group{} }

// Add registers a process. Order matters.
func (g *Group) Add(p *Process) { g.procs = append(g.procs, p) }

// Get returns a registered process by name.
func (g *Group) Get(name string) *Process {
	for _, p := range g.procs {
		if p.Name == name {
			return p
		}
	}
	return nil
}

// Start launches everything in registration order.
func (g *Group) Start(parent context.Context) {
	g.ctx, g.stop = context.WithCancel(parent)
	for _, p := range g.procs {
		p.Start(g.ctx)
	}
}

// StopApp stops the application processes but leaves the database running, so
// an update can run migrations against a live cluster.
func (g *Group) StopApp(names []string, timeout time.Duration) {
	for i := len(g.procs) - 1; i >= 0; i-- {
		if contains(names, g.procs[i].Name) {
			g.procs[i].Stop(timeout)
		}
	}
}

// StartApp brings previously stopped processes back up.
func (g *Group) StartApp(names []string) {
	for _, p := range g.procs {
		if contains(names, p.Name) {
			p.Start(g.ctx)
		}
	}
}

// StopAll shuts the whole stack down in reverse order.
func (g *Group) StopAll(timeout time.Duration) {
	for i := len(g.procs) - 1; i >= 0; i-- {
		g.procs[i].Stop(timeout)
	}
	if g.stop != nil {
		g.stop()
	}
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}
