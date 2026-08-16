package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/peepal/installer/internal/telemetry"
)

// Install is one customer machine as the hub sees it.
type Install struct {
	ID      string              `json:"id"`
	App     string              `json:"app"`
	Version string              `json:"version"`
	FirstAt time.Time           `json:"first_seen"`
	LastAt  time.Time           `json:"last_seen"`
	Metrics *telemetry.Metrics  `json:"metrics,omitempty"`
	Errors  int                 `json:"errors"`
	Queue   []telemetry.Command `json:"queue,omitempty"`
	Results []telemetry.Result  `json:"results,omitempty"`
	Recent  []telemetry.Event   `json:"-"`
}

// Online reports whether a heartbeat arrived recently enough to trust.
func (i *Install) Online() bool { return time.Since(i.LastAt) < 5*time.Minute }

// Store keeps installs in memory and appends every event to a per-install
// log file, so a hub restart loses the dashboard but never the history.
type Store struct {
	dir string

	mu       sync.RWMutex
	installs map[string]*Install
	seq      int
}

// NewStore opens (and creates) the data directory.
func NewStore(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Store{dir: dir, installs: map[string]*Install{}}, nil
}

// Record files an event and returns the commands waiting for that install.
func (s *Store) Record(e telemetry.Event) []telemetry.Command {
	s.mu.Lock()
	defer s.mu.Unlock()

	in, ok := s.installs[e.InstallID]
	if !ok {
		in = &Install{ID: e.InstallID, FirstAt: time.Now()}
		s.installs[e.InstallID] = in
	}
	in.App, in.Version, in.LastAt = e.App, e.Version, time.Now()
	if e.Metrics != nil {
		in.Metrics = e.Metrics
	}
	if e.Kind == telemetry.Error {
		in.Errors++
	}
	if len(in.Recent) == 200 {
		in.Recent = in.Recent[1:]
	}
	in.Recent = append(in.Recent, e)
	s.append(e)

	queued := in.Queue
	in.Queue = nil // handed over; the panel reports back through /api/results
	return queued
}

// Queue adds a command for one install, to be delivered on its next heartbeat.
func (s *Store) Queue(id, name string, args map[string]string) telemetry.Command {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seq++
	cmd := telemetry.Command{ID: nextID(s.seq), Name: name, Args: args}
	in, ok := s.installs[id]
	if !ok {
		in = &Install{ID: id, FirstAt: time.Now()}
		s.installs[id] = in
	}
	in.Queue = append(in.Queue, cmd)
	return cmd
}

// Result files the outcome of a command.
func (s *Store) Result(id string, r telemetry.Result) {
	s.mu.Lock()
	defer s.mu.Unlock()
	in, ok := s.installs[id]
	if !ok {
		return
	}
	if len(in.Results) == 50 {
		in.Results = in.Results[1:]
	}
	in.Results = append(in.Results, r)
}

// List returns every install, most recently seen first.
func (s *Store) List() []*Install {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*Install, 0, len(s.installs))
	for _, in := range s.installs {
		out = append(out, in)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].LastAt.After(out[j].LastAt) })
	return out
}

// Get returns one install and its recent events.
func (s *Store) Get(id string) (*Install, []telemetry.Event, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	in, ok := s.installs[id]
	if !ok {
		return nil, nil, false
	}
	events := make([]telemetry.Event, len(in.Recent))
	copy(events, in.Recent)
	return in, events, true
}

// append writes one JSON line per event. Line-delimited JSON is enough for a
// few dozen installs and stays readable with grep.
func (s *Store) append(e telemetry.Event) {
	path := filepath.Join(s.dir, e.InstallID+".jsonl")
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o640)
	if err != nil {
		return
	}
	defer f.Close()
	json.NewEncoder(f).Encode(e)
}

func nextID(n int) string {
	return time.Now().UTC().Format("20060102T150405") + "-" + itoa(n)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [12]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
