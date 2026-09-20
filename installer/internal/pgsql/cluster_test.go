package pgsql

import (
	"path/filepath"
	"reflect"
	"testing"
)

func TestOwnershipPathsIncludePwFileParent(t *testing.T) {
	t.Parallel()
	dataDir := filepath.Join("/opt/apps/peepal-rp", "data", "pgdata")
	pwFile := filepath.Join(filepath.Dir(dataDir), ".pgpw")
	got := ownershipPaths(dataDir, pwFile)
	want := []string{
		dataDir,
		filepath.Dir(dataDir),
		pwFile,
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("ownershipPaths = %v, want %v", got, want)
	}
}

func TestPwFileSitsBesideClusterNotInsideIt(t *testing.T) {
	t.Parallel()
	dataDir := filepath.Join("/opt/apps/peepal-rp", "data", "pgdata")
	pw := pwFileFor(dataDir)
	if filepath.Dir(pw) != filepath.Dir(dataDir) {
		t.Fatalf("pwfile %q must live in the data dir, not inside pgdata", pw)
	}
	if filepath.Base(pw) != ".pgpw" {
		t.Fatalf("pwfile = %q", pw)
	}
}
