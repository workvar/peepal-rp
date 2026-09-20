package agentclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestUpdateStatusAndApply(t *testing.T) {
	var gotAuth string
	var gotMethods []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotMethods = append(gotMethods, r.Method+" "+r.URL.Path)
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/_peepal/control/update":
			_ = json.NewEncoder(w).Encode(Status{
				InstalledBackend:  "1.0.0",
				InstalledFrontend: "1.0.0",
				AvailableBackend:  "1.1.0",
				AvailableFrontend: "1.1.0",
				UpdateAvailable:   true,
			})
		case r.Method == http.MethodPost && r.URL.Path == "/_peepal/control/check":
			_ = json.NewEncoder(w).Encode(Status{
				InstalledBackend:  "1.0.0",
				InstalledFrontend: "1.0.0",
				AvailableBackend:  "1.1.0",
				AvailableFrontend: "1.1.0",
				UpdateAvailable:   true,
			})
		case r.Method == http.MethodPost && r.URL.Path == "/_peepal/control/update":
			_ = json.NewEncoder(w).Encode(map[string]bool{"applied": true})
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	c := &Client{BaseURL: srv.URL, Token: "secret", HTTP: srv.Client()}
	st, err := c.UpdateStatus(context.Background())
	if err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	if !st.UpdateAvailable || st.AvailableBackend != "1.1.0" {
		t.Fatalf("unexpected status: %+v", st)
	}
	if gotAuth != "Bearer secret" {
		t.Fatalf("auth header = %q", gotAuth)
	}

	st, err = c.Check(context.Background())
	if err != nil {
		t.Fatalf("Check: %v", err)
	}
	if !st.UpdateAvailable {
		t.Fatalf("Check update_available=false")
	}

	applied, err := c.Apply(context.Background())
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if !applied {
		t.Fatal("Apply applied=false")
	}

	want := []string{
		"GET /_peepal/control/update",
		"POST /_peepal/control/check",
		"POST /_peepal/control/update",
	}
	if len(gotMethods) != len(want) {
		t.Fatalf("methods = %v, want %v", gotMethods, want)
	}
	for i := range want {
		if gotMethods[i] != want[i] {
			t.Fatalf("methods[%d] = %s, want %s", i, gotMethods[i], want[i])
		}
	}
}

func TestUpdateStatusUnreachable(t *testing.T) {
	c := &Client{BaseURL: "http://127.0.0.1:1", Token: "x", HTTP: &http.Client{}}
	_, err := c.UpdateStatus(context.Background())
	if err == nil {
		t.Fatal("expected error for unreachable agent")
	}
}
