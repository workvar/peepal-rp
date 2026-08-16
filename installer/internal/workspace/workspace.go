// Package workspace resolves every directory the control panel uses for one
// application. It is the generic counterpart of internal/paths: the layout is
// derived from the app definition instead of being fixed to one product.
package workspace

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/peepal/installer/internal/appdef"
)

// Layout is the resolved directory tree of one installation.
type Layout struct {
	Root string // programs, checkouts, runtimes
	Data string // database, logs, env files, state
}

// For returns the layout for a definition, honouring app.install_root.
func For(s appdef.Spec) Layout {
	if s.App.InstallRoot != "" {
		return New(s.App.InstallRoot)
	}
	return New(defaultRoot(s.App.Name))
}

// New roots everything at dir. Data lives inside it, so one directory can be
// archived or removed.
func New(dir string) Layout {
	return Layout{Root: dir, Data: filepath.Join(dir, "data")}
}

func defaultRoot(name string) string {
	title := strings.ToUpper(name[:1]) + name[1:]
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(`C:\Program Files`, title)
	case "darwin":
		return filepath.Join("/usr/local", name)
	default:
		return filepath.Join("/opt", name)
	}
}

func (l Layout) Bin() string     { return filepath.Join(l.Root, "bin") }
func (l Layout) Src() string     { return filepath.Join(l.Root, "src") }
func (l Layout) Runtime() string { return filepath.Join(l.Root, "runtime") }
func (l Layout) NodeDir() string { return filepath.Join(l.Runtime(), "node") }
func (l Layout) GoDir() string   { return filepath.Join(l.Runtime(), "go") }
func (l Layout) PgRoot() string  { return filepath.Join(l.Runtime(), "pgsql") }
func (l Layout) Cache() string   { return filepath.Join(l.Data, "cache") }
func (l Layout) Logs() string    { return filepath.Join(l.Data, "logs") }
func (l Layout) PgData() string  { return filepath.Join(l.Data, "pgdata") }
func (l Layout) Uploads() string { return filepath.Join(l.Data, "uploads") }

// SpecFile is the persisted app definition, including the operator's answers.
func (l Layout) SpecFile() string { return filepath.Join(l.Data, appdef.FileName) }

// StateFile records installed commits and the last update check.
func (l Layout) StateFile() string { return filepath.Join(l.Data, "state.json") }

// RepoDir is where one repository is checked out.
func (l Layout) RepoDir(r appdef.Repo) string { return filepath.Join(l.Src(), r.Dir) }

// WorkDir is the directory a step or service runs in: the repo checkout plus
// the optional subdirectory of a monorepo, plus the step's own relative dir.
func (l Layout) WorkDir(r appdef.Repo, rel string) string {
	d := l.RepoDir(r)
	if r.Subdir != "" {
		d = filepath.Join(d, r.Subdir)
	}
	if rel != "" {
		d = filepath.Join(d, rel)
	}
	return d
}

// EnvFile is the persistent environment for one service. It lives in the data
// directory so a rebuild that wipes the checkout cannot lose it.
func (l Layout) EnvFile(service string) string {
	return filepath.Join(l.Data, "env", service+".env")
}

// AgentLog is the file the panel tails and the shipper follows.
func (l Layout) AgentLog() string { return filepath.Join(l.Logs(), "agent.log") }

// EnsureDirs creates the directories that must exist before an install runs.
func (l Layout) EnsureDirs() error {
	for _, d := range []string{l.Bin(), l.Src(), l.Runtime(), l.Cache(), l.Logs(),
		l.Uploads(), filepath.Join(l.Data, "env")} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			return err
		}
	}
	return nil
}
