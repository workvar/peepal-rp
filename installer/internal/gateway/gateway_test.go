package gateway

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/runstate"
)

// serveOn starts a real listener on a free port and returns the port, because
// the gateway proxies to loopback ports rather than to handlers.
func serveOn(t *testing.T, body string) int {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	srv := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%s:%s", body, r.URL.Path)
	})}
	go srv.Serve(ln)
	t.Cleanup(func() { srv.Close() })
	return ln.Addr().(*net.TCPAddr).Port
}

func gatewayFor(t *testing.T, state *runstate.State) http.Handler {
	api := serveOn(t, "api")
	web := serveOn(t, "web")
	spec := appdef.Spec{Services: []appdef.Service{
		{Name: "api", Port: api, Routes: []string{"/api/"}},
		{Name: "web", Port: web, Routes: []string{"/"}},
	}}
	return New(Options{Listen: ":0", Spec: spec, State: state}).Handler
}

func get(t *testing.T, h http.Handler, path string) (int, string) {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	body, _ := io.ReadAll(rec.Body)
	return rec.Code, string(body)
}

func TestRoutesGoToTheRightService(t *testing.T) {
	state := runstate.New("test")
	state.Set(runstate.Running, "up")
	h := gatewayFor(t, state)

	if code, body := get(t, h, "/api/v1/users"); code != 200 || body != "api:/api/v1/users" {
		t.Errorf("/api/v1/users -> %d %q", code, body)
	}
	if code, body := get(t, h, "/dashboard"); code != 200 || body != "web:/dashboard" {
		t.Errorf("/dashboard -> %d %q", code, body)
	}
}

func TestUpdatingServesMaintenanceNotAnError(t *testing.T) {
	state := runstate.New("test")
	state.Set(runstate.Updating, "swapping binaries")
	h := gatewayFor(t, state)

	code, _ := get(t, h, "/dashboard")
	if code != http.StatusServiceUnavailable {
		t.Errorf("during an update the front door should answer 503, got %d", code)
	}
}

func TestStatusStaysLiveDuringAnUpdate(t *testing.T) {
	state := runstate.New("test")
	state.Set(runstate.Updating, "swapping binaries")
	h := gatewayFor(t, state)

	// The maintenance page polls this endpoint to know when to reload.
	code, body := get(t, h, "/_panel/status")
	if code != 200 {
		t.Fatalf("status endpoint returned %d", code)
	}
	if want := string(runstate.Updating); !contains(body, want) {
		t.Errorf("status body %q does not mention %q", body, want)
	}
}

func TestLongerPrefixWins(t *testing.T) {
	state := runstate.New("test")
	state.Set(runstate.Running, "up")
	graphql := serveOn(t, "graphql")
	api := serveOn(t, "api")
	web := serveOn(t, "web")
	spec := appdef.Spec{Services: []appdef.Service{
		{Name: "api", Port: api, Routes: []string{"/api/"}},
		{Name: "graphql", Port: graphql, Routes: []string{"/api/v1/graphql"}},
		{Name: "web", Port: web, Routes: []string{"/"}},
	}}
	h := New(Options{Listen: ":0", Spec: spec, State: state}).Handler

	if _, body := get(t, h, "/api/v1/graphql"); body != "graphql:/api/v1/graphql" {
		t.Errorf("the more specific route should win, got %q", body)
	}
	if _, body := get(t, h, "/api/v1/users"); body != "api:/api/v1/users" {
		t.Errorf("everything else under /api/ stays with the api service, got %q", body)
	}
}

func TestUnreachableServiceShowsMaintenance(t *testing.T) {
	state := runstate.New("test")
	state.Set(runstate.Running, "up")
	// A port nothing listens on: the proxy must not leak a gateway error.
	free := freePort(t)
	spec := appdef.Spec{Services: []appdef.Service{
		{Name: "web", Port: free, Routes: []string{"/"}},
	}}
	h := New(Options{Listen: ":0", Spec: spec, State: state}).Handler

	code, _ := get(t, h, "/")
	if code != http.StatusServiceUnavailable {
		t.Errorf("a dead upstream should show the maintenance page, got %d", code)
	}
}

func freePort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()
	// Give the kernel a moment to release it.
	time.Sleep(10 * time.Millisecond)
	return port
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
