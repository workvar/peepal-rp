package toolchain

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/peepal/installer/internal/archive"
	"github.com/peepal/installer/internal/download"
)

// goIndex is the machine-readable release list go.dev publishes. Using it
// means the panel never ships a pinned Go version that goes stale.
const goIndex = "https://go.dev/dl/?mode=json"

type goRelease struct {
	Version string `json:"version"` // go1.23.4
	Stable  bool   `json:"stable"`
	Files   []struct {
		Filename string `json:"filename"`
		OS       string `json:"os"`
		Arch     string `json:"arch"`
		Kind     string `json:"kind"`
		SHA256   string `json:"sha256"`
	} `json:"files"`
}

// ensureGo installs a private Go toolchain under dirs.Go.
func ensureGo(ctx context.Context, dirs Dirs, log Logf) error {
	if goInstalled(dirs.Go) {
		return nil
	}
	body, err := download.Bytes(ctx, goIndex, nil)
	if err != nil {
		return fmt.Errorf("fetching the Go release list: %w", err)
	}
	var releases []goRelease
	if err := json.Unmarshal(body, &releases); err != nil {
		return fmt.Errorf("parsing the Go release list: %w", err)
	}
	name, sum, ver := pickGo(releases)
	if name == "" {
		return fmt.Errorf("no Go archive for %s/%s", runtime.GOOS, runtime.GOARCH)
	}
	log("  downloading %s", name)

	pkg := filepath.Join(dirs.Cache, name)
	err = download.ToFile(ctx, download.Options{
		URL:    "https://go.dev/dl/" + name,
		Dest:   pkg,
		SHA256: sum,
	})
	if err != nil {
		return err
	}
	if err := os.RemoveAll(dirs.Go); err != nil {
		return err
	}
	if err := os.MkdirAll(dirs.Go, 0o755); err != nil {
		return err
	}
	if err := archive.Extract(pkg, dirs.Go); err != nil {
		return err
	}
	// Every Go archive unpacks into a single "go" directory.
	if err := archive.StripRoot(dirs.Go); err != nil {
		return err
	}
	os.Remove(pkg)
	log("  installed %s at %s", ver, dirs.Go)
	return nil
}

// pickGo returns the archive, checksum and version for this platform from the
// newest stable release.
func pickGo(releases []goRelease) (name, sum, version string) {
	for _, r := range releases {
		if !r.Stable {
			continue
		}
		for _, f := range r.Files {
			if f.Kind == "archive" && f.OS == runtime.GOOS && f.Arch == runtime.GOARCH {
				return f.Filename, f.SHA256, r.Version
			}
		}
	}
	return "", "", ""
}

func goInstalled(dir string) bool {
	bin := filepath.Join(dir, "bin", "go")
	if runtime.GOOS == "windows" {
		bin += ".exe"
	}
	if _, err := os.Stat(bin); err != nil {
		return false
	}
	out, err := exec.Command(bin, "version").Output()
	return err == nil && strings.HasPrefix(string(out), "go version")
}
