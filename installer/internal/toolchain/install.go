package toolchain

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/nodert"
)

// Dirs are the private runtime directories the panel owns. Portable installs
// land here instead of touching the system, which keeps uninstall clean.
type Dirs struct {
	Node  string
	Go    string
	Cache string
}

// install tries the package managers, then the vendor archive fallback.
func install(ctx context.Context, t appdef.Tool, dirs Dirs, log Logf) error {
	var lastErr error
	for _, m := range managers() {
		pkg := packageFor(t.Name, t.Packages, m.name)
		log("  %s install %s", m.name, pkg)
		if err := runManager(ctx, m, pkg, log); err == nil {
			return nil
		} else {
			lastErr = err
		}
	}
	if err := fallback(ctx, t, dirs, log); err == nil {
		return nil
	} else if lastErr == nil {
		lastErr = err
	} else {
		lastErr = fmt.Errorf("%v; portable install also failed: %w", lastErr, err)
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no package manager available and no portable build for %s", t.Name)
	}
	return lastErr
}

// fallback installs a private copy under the app's runtime directory for the
// tools that publish portable archives.
func fallback(ctx context.Context, t appdef.Tool, dirs Dirs, log Logf) error {
	switch t.Name {
	case "node", "npm":
		log("  downloading Node.js %s", nodert.Version)
		return nodert.Ensure(ctx, dirs.Node, dirs.Cache, nil)
	case "go":
		return ensureGo(ctx, dirs, log)
	}
	return fmt.Errorf("no portable build available for %s", t.Name)
}

// PathEntries returns the bin directories that must be prepended to PATH so
// build steps and services see the privately installed runtimes.
func PathEntries(dirs Dirs) []string {
	var out []string
	add := func(p string) {
		if p == "" {
			return
		}
		if st, err := os.Stat(p); err == nil && st.IsDir() {
			out = append(out, p)
		}
	}
	if runtime.GOOS == "windows" {
		add(dirs.Node)
	} else {
		add(filepath.Join(dirs.Node, "bin"))
	}
	add(filepath.Join(dirs.Go, "bin"))
	return out
}
