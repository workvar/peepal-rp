package agentctl

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/peepal/installer/internal/appconfig"
)

func TestUnauthorized(t *testing.T) {
	srv := New(Options{Token: "secret", Cfg: appconfig.Config{}})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/_peepal/control/update", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	srv.Handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestNonLoopbackRejected(t *testing.T) {
	srv := New(Options{Token: "secret", Cfg: appconfig.Config{}})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/_peepal/control/update", nil)
	req.RemoteAddr = "192.168.1.10:54321"
	req.Header.Set("Authorization", "Bearer secret")
	srv.Handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestAuthorizedGet(t *testing.T) {
	srv := New(Options{
		Token: "secret",
		Cfg: appconfig.Config{
			Updates: appconfig.UpdateConfig{
				Enabled:         true,
				WindowStartHour: 2,
				WindowEndHour:   5,
			},
		},
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/_peepal/control/update", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("Authorization", "Bearer secret")
	srv.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body StatusResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !body.AutoApply {
		t.Error("auto_apply = false, want true")
	}
	if body.WindowStartHour != 2 || body.WindowEndHour != 5 {
		t.Errorf("window = %d-%d, want 2-5", body.WindowStartHour, body.WindowEndHour)
	}
}
