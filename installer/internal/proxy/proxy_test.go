package proxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/peepal/installer/internal/runstate"
)

// While an update runs, browsers must get the maintenance page and API
// callers must get JSON, both as HTTP 503.
func TestMaintenanceResponses(t *testing.T) {
	state := runstate.New("test")
	state.Set(runstate.Updating, "Installing new files")
	srv := New(Options{State: state, BackendPort: 1, FrontendPort: 2})

	t.Run("browser", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
		req.Header.Set("Accept", "text/html")
		srv.Handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("status = %d, want 503", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "Peepal is updating") {
			t.Errorf("body does not explain the outage:\n%s", rec.Body.String())
		}
		if rec.Header().Get("Retry-After") == "" {
			t.Error("missing Retry-After header")
		}
	})

	t.Run("api", func(t *testing.T) {
		rec := httptest.NewRecorder()
		srv.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/graphql", nil))

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("status = %d, want 503", rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
			t.Errorf("Content-Type = %q, want JSON", ct)
		}
	})

	t.Run("status endpoint stays live", func(t *testing.T) {
		rec := httptest.NewRecorder()
		srv.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/_peepal/status", nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), `"mode":"updating"`) {
			t.Errorf("unexpected body: %s", rec.Body.String())
		}
	})
}

// When the app is healthy the proxy must forward rather than intercept.
func TestForwardsWhenRunning(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("frontend ok"))
	}))
	defer upstream.Close()

	state := runstate.New("test")
	state.Set(runstate.Running, "Up to date")
	srv := New(Options{State: state, BackendPort: 1, FrontendPort: upstreamPort(upstream.URL)})

	rec := httptest.NewRecorder()
	srv.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Body.String() != "frontend ok" {
		t.Fatalf("body = %q, want the upstream response", rec.Body.String())
	}
}

// upstreamPort pulls the port out of an httptest server URL.
func upstreamPort(url string) int {
	parts := strings.Split(url, ":")
	p := 0
	for _, c := range parts[len(parts)-1] {
		p = p*10 + int(c-'0')
	}
	return p
}
