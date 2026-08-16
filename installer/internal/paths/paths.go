// Package paths centralises every on-disk location the installer and agent
// use, so the layout is described once instead of being spelled out inline.
package paths

import (
	"path/filepath"
	"runtime"
)

// Layout is the resolved directory tree for one installation.
type Layout struct {
	Root string // program files (binaries, app releases)
	Data string // mutable state (database, logs, config)
}

// Default returns the conventional layout for the current OS.
func Default() Layout {
	switch runtime.GOOS {
	case "windows":
		return Layout{Root: `C:\Program Files\Peepal`, Data: `C:\ProgramData\Peepal`}
	case "darwin":
		return Layout{Root: "/usr/local/peepal", Data: "/Library/Application Support/Peepal"}
	default:
		return Layout{Root: "/opt/peepal", Data: "/var/lib/peepal"}
	}
}

// New builds a layout rooted at a custom install directory. Data lives under
// the root so that a single directory can be backed up or removed.
func New(root string) Layout { return Layout{Root: root, Data: filepath.Join(root, "data")} }

func (l Layout) Bin() string        { return filepath.Join(l.Root, "bin") }
func (l Layout) Apps() string       { return filepath.Join(l.Root, "app") }
func (l Layout) Backend() string    { return filepath.Join(l.Apps(), "backend") }
func (l Layout) Frontend() string   { return filepath.Join(l.Apps(), "frontend") }
func (l Layout) Node() string       { return filepath.Join(l.Root, "runtime", "node") }
func (l Layout) PgRoot() string     { return filepath.Join(l.Root, "runtime", "pgsql") }
func (l Layout) Staging() string    { return filepath.Join(l.Data, "staging") }
func (l Layout) PgData() string     { return filepath.Join(l.Data, "pgdata") }
func (l Layout) Uploads() string    { return filepath.Join(l.Data, "uploads") }
func (l Layout) Logs() string       { return filepath.Join(l.Data, "logs") }
func (l Layout) ConfigFile() string { return filepath.Join(l.Data, "config.json") }
func (l Layout) StateFile() string  { return filepath.Join(l.Data, "state.json") }

// EnvFile is the persistent copy of the backend environment. It lives in the
// data directory so an update, which replaces the whole backend directory,
// cannot lose it.
func (l Layout) EnvFile() string { return filepath.Join(l.Data, "backend.env") }

// BackendEnv is the copy the backend itself reads from its working directory.
func (l Layout) BackendEnv() string { return filepath.Join(l.Backend(), ".env") }

// AgentBin is the full path of the supervisor executable.
func (l Layout) AgentBin() string { return filepath.Join(l.Bin(), exe("peepal-agent")) }

// BackendBin is the compiled Go server shipped in the backend release.
func (l Layout) BackendBin() string { return filepath.Join(l.Backend(), exe("peepal-backend")) }

// NodeBin is the bundled Node.js runtime used to run the Next.js server.
func (l Layout) NodeBin() string {
	if runtime.GOOS == "windows" {
		return filepath.Join(l.Node(), "node.exe")
	}
	return filepath.Join(l.Node(), "bin", "node")
}

// FrontendEntry is the Next.js standalone server entrypoint.
func (l Layout) FrontendEntry() string { return filepath.Join(l.Frontend(), "server.js") }

func exe(name string) string {
	if runtime.GOOS == "windows" {
		return name + ".exe"
	}
	return name
}

// Exe appends .exe on Windows.
func Exe(name string) string { return exe(name) }
