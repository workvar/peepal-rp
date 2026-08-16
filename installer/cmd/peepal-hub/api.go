package main

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/peepal/installer/internal/telemetry"
)

// Server is the hub's HTTP surface: two endpoints for installations, three
// for the developer.
type Server struct {
	Store      *Store
	Token      string
	AdminToken string
}

// Routes registers everything on a mux.
func (s *Server) Routes(mux *http.ServeMux) {
	// Installations.
	mux.HandleFunc("/api/events", s.agentAuth(s.events))
	mux.HandleFunc("/api/results", s.agentAuth(s.results))

	// Developer console.
	mux.HandleFunc("/api/installs", s.adminAuth(s.installs))
	mux.HandleFunc("/api/install/", s.adminAuth(s.install))
	mux.HandleFunc("/api/command", s.adminAuth(s.command))
	mux.HandleFunc("/", s.console)
}

// events accepts a heartbeat, a log batch or a crash, and answers with any
// commands queued for that installation. This response is the only channel
// the developer has into the customer's machine.
func (s *Server) events(w http.ResponseWriter, r *http.Request) {
	var e telemetry.Event
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<20)).Decode(&e); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if e.InstallID == "" {
		http.Error(w, "install_id is required", http.StatusBadRequest)
		return
	}
	cmds := s.Store.Record(e)
	writeJSON(w, telemetry.Ack{OK: true, Commands: cmds})
}

// results files what happened when a command ran.
func (s *Server) results(w http.ResponseWriter, r *http.Request) {
	var res telemetry.Result
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<20)).Decode(&res); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.Store.Result(r.Header.Get("X-Install-ID"), res)
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) installs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, s.Store.List())
}

func (s *Server) install(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/install/")
	in, events, ok := s.Store.Get(id)
	if !ok {
		http.NotFound(w, r)
		return
	}
	writeJSON(w, map[string]any{"install": in, "events": events})
}

// command queues an instruction. It is delivered on the install's next
// heartbeat, so the delay is at most one heartbeat interval.
func (s *Server) command(w http.ResponseWriter, r *http.Request) {
	var req struct {
		InstallID string            `json:"install_id"`
		Name      string            `json:"name"`
		Args      map[string]string `json:"args"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.InstallID == "" || req.Name == "" {
		http.Error(w, "install_id and name are required", http.StatusBadRequest)
		return
	}
	writeJSON(w, s.Store.Queue(req.InstallID, req.Name, req.Args))
}

// agentAuth guards the endpoints installations call.
func (s *Server) agentAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}
		if bearer(r) != s.Token {
			http.Error(w, "unauthorised", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// adminAuth guards the developer console. The token may arrive as a header
// (for scripts) or as a query parameter (for a browser tab).
func (s *Server) adminAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if bearer(r) != s.AdminToken && r.URL.Query().Get("token") != s.AdminToken {
			http.Error(w, "unauthorised", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func bearer(r *http.Request) string {
	return strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
