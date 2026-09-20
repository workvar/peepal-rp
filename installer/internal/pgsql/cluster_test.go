package pgsql

import (
	"path/filepath"
	"reflect"
	"strings"
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
		socketDirFor(dataDir),
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

func TestExtraConfOverridesDebianUnixSocketDir(t *testing.T) {
	t.Parallel()
	c := Cluster{
		DataDir: filepath.Join("/opt/apps/peepal-rp", "data", "pgdata"),
		Port:    5433,
	}
	body := c.extraConf()
	if !strings.Contains(body, "unix_socket_directories = '"+c.socketDir()+"'") {
		t.Fatalf("extraConf must override Debian's /var/run/postgresql socket:\n%s", body)
	}
	if !strings.Contains(body, "listen_addresses = '127.0.0.1'") {
		t.Fatalf("extraConf missing listen_addresses:\n%s", body)
	}
	if strings.Contains(body, "/var/run/postgresql") {
		t.Fatal("must not keep the distro unix socket directory")
	}
}

func TestDistroPostgresIsNotManaged(t *testing.T) {
	t.Parallel()
	if !isDistroBinDir("/usr/lib/postgresql/17/bin") {
		t.Fatal("Debian/Raspberry Pi OS cluster bins are a distro install")
	}
	if managedInstall("/usr/lib/postgresql/17/bin") {
		t.Fatal("must reuse the system server, not initdb a second cluster")
	}
	if !managedInstall("/opt/apps/peepal-rp/runtime/pgsql/bin") {
		t.Fatal("bundled binaries are still managed by the agent")
	}
}

func TestPsqlConnArgsPeerUsesDistroSocket(t *testing.T) {
	t.Parallel()
	c := Cluster{Port: 5432, Peer: true}
	got := c.psqlConnArgs()
	if got[1] != "/var/run/postgresql" {
		t.Fatalf("peer host = %q", got[1])
	}
	c.Peer = false
	got = c.psqlConnArgs()
	if got[1] != "127.0.0.1" {
		t.Fatalf("tcp host = %q", got[1])
	}
}
