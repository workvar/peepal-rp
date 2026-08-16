// Package runstate is the single flag the proxy and the updater agree on:
// while an update is applying, every request is answered with a maintenance
// page instead of a dead connection.
package runstate

import (
	"sync"
	"time"
)

// Mode is what the stack is currently doing.
type Mode string

const (
	// Starting covers the window between the agent booting and the app
	// answering health checks.
	Starting Mode = "starting"
	// Running is normal operation; traffic is proxied to the app.
	Running Mode = "running"
	// Updating means binaries are being swapped. Traffic gets HTTP 503.
	Updating Mode = "updating"
	// Failed means the last update or start attempt did not recover.
	Failed Mode = "failed"
)

// Snapshot is what the maintenance page and the status endpoint render.
type Snapshot struct {
	Mode      Mode      `json:"mode"`
	Step      string    `json:"step"`
	Since     time.Time `json:"since"`
	Version   string    `json:"version"`
	Backend   string    `json:"backend_version"`
	Frontend  string    `json:"frontend_version"`
	LastError string    `json:"last_error,omitempty"`
}

// State is a goroutine-safe holder for the current snapshot.
type State struct {
	mu   sync.RWMutex
	snap Snapshot
}

// New returns a state in the starting mode.
func New(agentVersion string) *State {
	return &State{snap: Snapshot{Mode: Starting, Step: "Starting services", Since: time.Now(), Version: agentVersion}}
}

// Get returns a copy of the current snapshot.
func (s *State) Get() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.snap
}

// Set changes the mode and the human-readable step.
func (s *State) Set(m Mode, step string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.snap.Mode != m {
		s.snap.Since = time.Now()
	}
	s.snap.Mode, s.snap.Step = m, step
	if m != Failed {
		s.snap.LastError = ""
	}
}

// Step updates only the progress text, leaving the mode alone.
func (s *State) SetStep(step string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snap.Step = step
}

// Fail records an error and switches to the failed mode.
func (s *State) Fail(step string, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snap.Mode, s.snap.Step, s.snap.Since = Failed, step, time.Now()
	if err != nil {
		s.snap.LastError = err.Error()
	}
}

// SetVersions records what is currently deployed.
func (s *State) SetVersions(backend, frontend string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snap.Backend, s.snap.Frontend = backend, frontend
}

// Serving reports whether requests should be proxied through.
func (s *State) Serving() bool { return s.Get().Mode == Running }
