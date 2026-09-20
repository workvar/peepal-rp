package pgsql

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDistroBinDirsPrefersNewest(t *testing.T) {
	t.Parallel()
	root := t.TempDir()
	for _, v := range []string{"15", "17", "16"} {
		dir := filepath.Join(root, v, "bin")
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, exeName("initdb")), []byte("x"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.MkdirAll(filepath.Join(root, "14", "bin"), 0o755); err != nil {
		t.Fatal(err)
	}

	got := distroBinDirs(filepath.Join(root, "*", "bin"))
	if len(got) != 3 {
		t.Fatalf("got %d dirs: %v", len(got), got)
	}
	if !strings.Contains(got[0], string(filepath.Separator)+"17"+string(filepath.Separator)) {
		t.Errorf("want version 17 first, got %q", got[0])
	}
}

func TestInsideDpkg(t *testing.T) {
	t.Setenv("DPKG_RUNNING_VERSION", "1.22.6")
	if !insideDpkg() {
		t.Fatal("expected inside dpkg when DPKG_RUNNING_VERSION is set")
	}
	t.Setenv("DPKG_RUNNING_VERSION", "")
	if insideDpkg() {
		t.Fatal("empty DPKG_RUNNING_VERSION is not a dpkg postinst")
	}
}
