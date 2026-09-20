// Package agentctl is the loopback-only HTTP API the backend uses to ask the
// agent about updates and to trigger an apply.
package agentctl

import (
	"crypto/subtle"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/peepal/installer/internal/appconfig"
	"github.com/peepal/installer/internal/runstate"
	"github.com/peepal/installer/internal/semver"
	"github.com/peepal/installer/internal/updater"
)

// DefaultAddr is the loopback bind address for the control listener.
const DefaultAddr = "127.0.0.1:9080"

// Options configures the control server.
type Options struct {
	Token     string
	Addr      string
	Updater   *updater.Updater
	Status    *runstate.State
	Cfg       appconfig.Config
	StatePath string
}

// StatusResponse is the JSON body for GET/POST check of update availability.
type StatusResponse struct {
	InstalledBackend  string `json:"installed_backend"`
	InstalledFrontend string `json:"installed_frontend"`
	AvailableBackend  string `json:"available_backend"`
	AvailableFrontend string `json:"available_frontend"`
	UpdateAvailable   bool   `json:"update_available"`
	AutoApply         bool   `json:"auto_apply"`
	WindowStartHour   int    `json:"window_start_hour"`
	WindowEndHour     int    `json:"window_end_hour"`
}

// ApplyResponse is the JSON body for POST apply.
type ApplyResponse struct {
	Applied bool `json:"applied"`
}

// New builds the loopback control HTTP server.
func New(o Options) *http.Server {
	if o.Addr == "" {
		o.Addr = DefaultAddr
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/_peepal/control/update", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			writeJSON(w, http.StatusOK, statusOf(r, o))
		case http.MethodPost:
			applyUpdate(w, r, o)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/_peepal/control/check", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, http.StatusOK, statusOf(r, o))
	})

	return &http.Server{
		Addr:              o.Addr,
		Handler:           guard(o.Token, mux),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      5 * time.Minute,
		IdleTimeout:       60 * time.Second,
	}
}

func guard(token string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isLoopback(r.RemoteAddr) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if !bearerOK(r.Header.Get("Authorization"), token) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func statusOf(r *http.Request, o Options) StatusResponse {
	state := updater.LoadState(o.StatePath)
	var availBackend, availFrontend string
	if o.Updater != nil {
		availBackend, availFrontend = o.Updater.LatestAvailable(r.Context())
	}
	return StatusResponse{
		InstalledBackend:  state.BackendTag,
		InstalledFrontend: state.FrontendTag,
		AvailableBackend:  availBackend,
		AvailableFrontend: availFrontend,
		UpdateAvailable:   semver.Newer(availBackend, state.BackendTag) || semver.Newer(availFrontend, state.FrontendTag),
		AutoApply:         o.Cfg.Updates.Enabled,
		WindowStartHour:   o.Cfg.Updates.WindowStartHour,
		WindowEndHour:     o.Cfg.Updates.WindowEndHour,
	}
}

func applyUpdate(w http.ResponseWriter, r *http.Request, o Options) {
	if o.Updater == nil {
		http.Error(w, "updater unavailable", http.StatusServiceUnavailable)
		return
	}
	applied, err := o.Updater.CheckAndApply(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, ApplyResponse{Applied: applied})
}

func bearerOK(header, token string) bool {
	if token == "" {
		return false
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return false
	}
	got := []byte(header[len(prefix):])
	want := []byte(token)
	if len(got) != len(want) {
		return false
	}
	return subtle.ConstantTimeCompare(got, want) == 1
}

func isLoopback(remoteAddr string) bool {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}
