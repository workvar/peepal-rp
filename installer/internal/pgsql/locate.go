package pgsql

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
)

// Locate finds an existing PostgreSQL install: first the one this installer
// previously unpacked, then PATH, then the conventional system locations.
func Locate(pgRoot string) (Install, bool) {
	if dir := filepath.Join(pgRoot, "bin"); hasInitdb(dir) {
		return Install{BinDir: dir, Managed: true, Source: "bundled"}, true
	}
	if p, err := exec.LookPath(exeName("initdb")); err == nil {
		dir := filepath.Dir(p)
		return Install{BinDir: dir, Managed: runtime.GOOS != "windows", Source: "system PATH"}, true
	}
	for _, dir := range systemDirs() {
		if hasInitdb(dir) {
			return Install{BinDir: dir, Managed: runtime.GOOS != "windows", Source: "system install"}, true
		}
	}
	return Install{}, false
}

// systemDirs lists the usual homes of a distro or vendor package.
func systemDirs() []string {
	v := MajorVersion
	switch runtime.GOOS {
	case "windows":
		return []string{
			`C:\Program Files\PostgreSQL\` + v + `\bin`,
			`C:\Program Files\Peepal\runtime\pgsql\bin`,
		}
	case "darwin":
		return []string{
			"/opt/homebrew/opt/postgresql@" + v + "/bin",
			"/usr/local/opt/postgresql@" + v + "/bin",
			"/Library/PostgreSQL/" + v + "/bin",
		}
	default:
		dirs := distroBinDirs("/usr/lib/postgresql/*/bin")
		return append(dirs,
			"/usr/lib/postgresql/"+v+"/bin",
			"/usr/pgsql-"+v+"/bin",
			"/usr/local/pgsql/bin",
			"/usr/bin",
		)
	}
}

// distroBinDirs returns Debian/Ubuntu cluster bins (any major version), newest first.
// Raspberry Pi OS Trixie ships PostgreSQL 17, not 16.
func distroBinDirs(pattern string) []string {
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil
	}
	var out []string
	for _, dir := range matches {
		if hasInitdb(dir) {
			out = append(out, dir)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return postgresDirVersion(out[i]) > postgresDirVersion(out[j])
	})
	return out
}

func postgresDirVersion(dir string) int {
	n, _ := strconv.Atoi(filepath.Base(filepath.Dir(dir)))
	return n
}

func insideDpkg() bool {
	return strings.TrimSpace(os.Getenv("DPKG_RUNNING_VERSION")) != ""
}

func hasInitdb(dir string) bool {
	st, err := os.Stat(filepath.Join(dir, exeName("initdb")))
	return err == nil && !st.IsDir()
}

func exeName(n string) string {
	if runtime.GOOS == "windows" {
		return n + ".exe"
	}
	return n
}
