package proxy

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/peepal/installer/internal/runstate"
)

// WriteMaintenance answers with HTTP 503 and a page that explains what is
// happening. API callers get JSON so the frontend can show its own banner.
func WriteMaintenance(w http.ResponseWriter, r *http.Request, snap runstate.Snapshot) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Retry-After", "20")

	if wantsJSON(r) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]any{
			"success": false,
			"error":   "service_unavailable",
			"message": headline(snap) + " " + snap.Step + ". Please wait a moment and try again.",
			"state":   snap.Mode,
		})
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusServiceUnavailable)
	page.Execute(w, map[string]any{
		"Headline": headline(snap),
		"Step":     snap.Step,
		"Failed":   snap.Mode == runstate.Failed,
		"Error":    snap.LastError,
	})
}

func wantsJSON(r *http.Request) bool {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		return true
	}
	accept := r.Header.Get("Accept")
	return strings.Contains(accept, "application/json") && !strings.Contains(accept, "text/html")
}

func headline(snap runstate.Snapshot) string {
	switch snap.Mode {
	case runstate.Updating:
		return "Peepal is updating."
	case runstate.Failed:
		return "Peepal could not finish starting."
	default:
		return "Peepal is starting."
	}
}
