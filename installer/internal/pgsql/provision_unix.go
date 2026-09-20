package pgsql

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/peepal/installer/internal/archive"
	"github.com/peepal/installer/internal/download"
)

// edbBinaries maps a platform to EnterpriseDB's redistributable archive.
// These are plain zip/tar.gz bundles of the server, with no installer.
var edbBinaries = map[string]string{
	"linux/amd64":  "https://get.enterprisedb.com/postgresql/postgresql-16.4-1-linux-x64-binaries.tar.gz",
	"darwin/amd64": "https://get.enterprisedb.com/postgresql/postgresql-16.4-1-osx-binaries.zip",
	"darwin/arm64": "https://get.enterprisedb.com/postgresql/postgresql-16.4-1-osx-binaries.zip",
}

// installPortable downloads a self-contained server into pgRoot.
func installPortable(ctx context.Context, pgRoot, cacheDir string, log Logf) (Install, error) {
	url, ok := edbBinaries[runtime.GOOS+"/"+runtime.GOARCH]
	if !ok {
		return Install{}, fmt.Errorf("no portable PostgreSQL build for %s/%s", runtime.GOOS, runtime.GOARCH)
	}
	log("Downloading PostgreSQL %s...", MajorVersion)
	pkg := filepath.Join(cacheDir, filepath.Base(url))
	if err := download.ToFile(ctx, download.Options{URL: url, Dest: pkg}); err != nil {
		return Install{}, err
	}
	if err := os.MkdirAll(pgRoot, 0o755); err != nil {
		return Install{}, err
	}
	if err := archive.Extract(pkg, pgRoot); err != nil {
		return Install{}, err
	}
	// Both archives nest everything under a "pgsql" directory.
	if err := archive.StripRoot(pgRoot); err != nil {
		return Install{}, err
	}
	os.Remove(pkg)

	in := Install{BinDir: filepath.Join(pgRoot, "bin"), Managed: true, Source: "portable binaries"}
	if !hasInitdb(in.BinDir) {
		return Install{}, fmt.Errorf("portable archive did not contain %s", in.Bin("initdb"))
	}
	return in, nil
}

// installViaBrew uses Homebrew, which is the only source of native arm64
// builds on macOS.
func installViaBrew(ctx context.Context, log Logf) (Install, error) {
	brew, err := exec.LookPath("brew")
	if err != nil {
		return Install{}, fmt.Errorf("homebrew not installed")
	}
	log("Installing postgresql@%s with Homebrew...", MajorVersion)
	cmd := exec.CommandContext(ctx, brew, "install", "postgresql@"+MajorVersion)
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		return Install{}, err
	}
	prefix, err := exec.CommandContext(ctx, brew, "--prefix", "postgresql@"+MajorVersion).Output()
	if err != nil {
		return Install{}, err
	}
	dir := filepath.Join(trimLine(string(prefix)), "bin")
	if !hasInitdb(dir) {
		return Install{}, fmt.Errorf("homebrew install did not produce %s/initdb", dir)
	}
	return Install{BinDir: dir, Managed: true, Source: "homebrew"}, nil
}

// installViaPackageManager is the last resort on Linux distributions where no
// portable build exists (notably arm64 servers).
func installViaPackageManager(ctx context.Context, log Logf) (Install, error) {
	if insideDpkg() {
		return Install{}, fmt.Errorf("cannot install PostgreSQL with apt while dpkg is still configuring this package")
	}
	type mgr struct {
		bin  string
		args [][]string
	}
	candidates := []mgr{
		// Distro metapackage (17 on Debian Trixie / Raspberry Pi OS, 16 on Bookworm).
		{"apt-get", [][]string{{"update"}, {"install", "-y", "postgresql"}}},
		{"dnf", [][]string{{"install", "-y", "postgresql-server"}}},
		{"yum", [][]string{{"install", "-y", "postgresql-server"}}},
		{"zypper", [][]string{{"--non-interactive", "install", "postgresql-server"}}},
		{"pacman", [][]string{{"-Sy", "--noconfirm", "postgresql"}}},
	}
	for _, m := range candidates {
		bin, err := exec.LookPath(m.bin)
		if err != nil {
			continue
		}
		log("Installing PostgreSQL with %s...", m.bin)
		for _, args := range m.args {
			cmd := exec.CommandContext(ctx, bin, args...)
			cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
			cmd.Env = append(os.Environ(), "DEBIAN_FRONTEND=noninteractive")
			if err := cmd.Run(); err != nil {
				return Install{}, fmt.Errorf("%s %v: %w", m.bin, args, err)
			}
		}
		if in, ok := Locate(""); ok {
			in.Source = m.bin
			return in, nil
		}
		return Install{}, fmt.Errorf("%s reported success but initdb is still missing", m.bin)
	}
	return Install{}, fmt.Errorf("no supported package manager found")
}

func trimLine(s string) string {
	for len(s) > 0 && (s[len(s)-1] == '\n' || s[len(s)-1] == '\r' || s[len(s)-1] == ' ') {
		s = s[:len(s)-1]
	}
	return s
}
