// Package gateway is the front door for a definition-driven install. Routes
// come from the YAML rather than being hard-coded: each service claims a set
// of path prefixes, and one of them claims "/" as the fallback.
package gateway

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/proxy"
	"github.com/peepal/installer/internal/runstate"
)

// Options configures the front-door server.
type Options struct {
	Listen string
	Spec   appdef.Spec
	State  *runstate.State
}

type route struct {
	prefix string
	target *httputil.ReverseProxy
}

// New builds the HTTP server. Longer prefixes win, so /api/v1/graphql can go
// somewhere different from /api if a definition ever wants that.
func New(o Options) *http.Server {
	var routes []route
	var fallback *httputil.ReverseProxy

	for _, sv := range o.Spec.Services {
		if sv.Port == 0 {
			continue
		}
		p := reverseProxy(sv.Port)
		for _, prefix := range sv.Routes {
			if prefix == "/" {
				fallback = p
				continue
			}
			routes = append(routes, route{prefix: prefix, target: p})
		}
	}
	sort.Slice(routes, func(i, j int) bool { return len(routes[i].prefix) > len(routes[j].prefix) })

	mux := http.NewServeMux()
	mux.HandleFunc("/_panel/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		json.NewEncoder(w).Encode(o.State.Get())
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if snap := o.State.Get(); snap.Mode != runstate.Running {
			proxy.WriteMaintenance(w, r, snap)
			return
		}
		for _, rt := range routes {
			if strings.HasPrefix(r.URL.Path, rt.prefix) {
				rt.target.ServeHTTP(w, r)
				return
			}
		}
		if fallback == nil {
			http.Error(w, "no service is configured for this path", http.StatusNotFound)
			return
		}
		fallback.ServeHTTP(w, r)
	})

	return &http.Server{
		Addr:              o.Listen,
		Handler:           mux,
		ReadHeaderTimeout: 15 * time.Second,
		// Bulk uploads and PDF exports are slow by design.
		WriteTimeout: 10 * time.Minute,
		IdleTimeout:  120 * time.Second,
	}
}

// reverseProxy targets a loopback port and shows the maintenance page rather
// than a bare gateway error when the service is not there yet.
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
		proxy.WriteMaintenance(w, r, runstate.Snapshot{
			Mode:  runstate.Starting,
			Step:  "The application is starting up",
			Since: time.Now(),
		})
	}
	return p
}
