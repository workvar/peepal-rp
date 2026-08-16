// Package proxy is the single front door. Everything the customer types into
// a browser hits this server, which either forwards to the app or, during an
// update, answers with a maintenance page.
package proxy

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/peepal/installer/internal/runstate"
)

// Options configures the front-door server.
type Options struct {
	Listen       string
	BackendPort  int
	FrontendPort int
	State        *runstate.State
}

// New builds the HTTP server. Requests under /api go to the Go backend; the
// rest go to the Next.js server.
func New(o Options) *http.Server {
	backend := reverseProxy(o.BackendPort)
	frontend := reverseProxy(o.FrontendPort)

	mux := http.NewServeMux()

	// The status endpoint stays available during updates so the maintenance
	// page can poll it and reload the moment the app is back.
	mux.HandleFunc("/_peepal/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		json.NewEncoder(w).Encode(o.State.Get())
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if snap := o.State.Get(); snap.Mode != runstate.Running {
			WriteMaintenance(w, r, snap)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/") {
			backend.ServeHTTP(w, r)
			return
		}
		frontend.ServeHTTP(w, r)
	})

	return &http.Server{
		Addr:              o.Listen,
		Handler:           mux,
		ReadHeaderTimeout: 15 * time.Second,
		// Long timeouts: bulk CSV uploads and PDF exports are slow by design.
		WriteTimeout: 10 * time.Minute,
		IdleTimeout:  120 * time.Second,
	}
}

// reverseProxy targets a loopback port and reports upstream failures as a
// maintenance page rather than a bare gateway error.
func reverseProxy(port int) *httputil.ReverseProxy {
	target, _ := url.Parse(fmt.Sprintf("http://127.0.0.1:%d", port))
	p := httputil.NewSingleHostReverseProxy(target)
	p.Transport = &http.Transport{
		DialContext:         (&net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		MaxIdleConnsPerHost: 32,
		IdleConnTimeout:     90 * time.Second,
	}
	p.FlushInterval = 100 * time.Millisecond
	p.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		WriteMaintenance(w, r, runstate.Snapshot{
			Mode:  runstate.Starting,
			Step:  "The application is starting up",
			Since: time.Now(),
		})
	}
	return p
}
