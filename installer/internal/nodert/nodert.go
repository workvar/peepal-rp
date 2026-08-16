// Package nodert provisions the Node.js runtime that runs the Next.js
// standalone server. Bundling it means the client never has to install Node.
package nodert

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/peepal/installer/internal/archive"
	"github.com/peepal/installer/internal/download"
)

// Version is the LTS line the frontend is built and tested against.
const Version = "20.17.0"

const dist = "https://nodejs.org/dist"

// Ensure installs Node into dir unless a matching runtime is already there.
func Ensure(ctx context.Context, dir, cacheDir string, rep download.Reporter) error {
	if Installed(dir) {
		return nil
	}
	name, err := archiveName()
	if err != nil {
		return err
	}
	sum, err := checksum(ctx, name)
	if err != nil {
		return err
	}
	pkg := filepath.Join(cacheDir, name)
	err = download.ToFile(ctx, download.Options{
		URL:      fmt.Sprintf("%s/v%s/%s", dist, Version, name),
		Dest:     pkg,
		SHA256:   sum,
		Progress: rep,
	})
	if err != nil {
		return err
	}
	if err := os.RemoveAll(dir); err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	if err := archive.Extract(pkg, dir); err != nil {
		return err
	}
	if err := archive.StripRoot(dir); err != nil {
		return err
	}
	os.Remove(pkg)
	return nil
}

// Installed reports whether dir already holds a working node binary.
func Installed(dir string) bool {
	bin := Binary(dir)
	if _, err := os.Stat(bin); err != nil {
		return false
	}
	out, err := exec.Command(bin, "--version").Output()
	return err == nil && strings.HasPrefix(strings.TrimSpace(string(out)), "v"+majorOf(Version))
}

// Binary is the node executable inside an extracted distribution.
func Binary(dir string) string {
	if runtime.GOOS == "windows" {
		return filepath.Join(dir, "node.exe")
	}
	return filepath.Join(dir, "bin", "node")
}

// archiveName maps Go's platform names onto nodejs.org's.
func archiveName() (string, error) {
	arch := map[string]string{"amd64": "x64", "arm64": "arm64", "arm": "armv7l"}[runtime.GOARCH]
	if arch == "" {
		return "", fmt.Errorf("no Node.js build for %s", runtime.GOARCH)
	}
	switch runtime.GOOS {
	case "windows":
		return fmt.Sprintf("node-v%s-win-%s.zip", Version, arch), nil
	case "darwin":
		return fmt.Sprintf("node-v%s-darwin-%s.tar.gz", Version, arch), nil
	case "linux":
		return fmt.Sprintf("node-v%s-linux-%s.tar.gz", Version, arch), nil
	}
	return "", fmt.Errorf("no Node.js build for %s", runtime.GOOS)
}

// checksum reads the digest for name out of the release's SHASUMS256.txt.
func checksum(ctx context.Context, name string) (string, error) {
	body, err := download.Bytes(ctx, fmt.Sprintf("%s/v%s/SHASUMS256.txt", dist, Version), nil)
	if err != nil {
		return "", fmt.Errorf("fetching Node checksums: %w", err)
	}
	for _, line := range strings.Split(string(body), "\n") {
		f := strings.Fields(line)
		if len(f) == 2 && f[1] == name {
			return f[0], nil
		}
	}
	return "", fmt.Errorf("SHASUMS256.txt does not list %s", name)
}

func majorOf(v string) string { return strings.SplitN(v, ".", 2)[0] }
