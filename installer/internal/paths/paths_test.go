package paths

import (
	"path/filepath"
	"runtime"
	"testing"
)

func TestDefaultRoots(t *testing.T) {
	d := Default()
	var wantRoot string
	switch runtime.GOOS {
	case "windows":
		wantRoot = `C:\Program Files\PeepalRP`
	case "darwin":
		wantRoot = "/usr/local/apps/peepal-rp"
	case "linux":
		wantRoot = "/opt/apps/peepal-rp"
	default:
		wantRoot = "/opt/apps/peepal-rp"
	}
	if d.Root != wantRoot {
		t.Fatalf("Default().Root = %q, want %q", d.Root, wantRoot)
	}
	wantData := filepath.Join(wantRoot, "data")
	if d.Data != wantData {
		t.Fatalf("Default().Data = %q, want %q", d.Data, wantData)
	}
}
