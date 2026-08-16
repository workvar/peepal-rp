package runner

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// resolve finds the program a service asked for. exec.Command looks a bare
// name up in the *parent's* PATH, which would miss the Node or Go the panel
// installed privately, so the private directories are searched first.
func resolve(name string, pathEntries []string) string {
	if name == "" || strings.ContainsAny(name, `/\`) {
		return name // already a path
	}
	for _, dir := range pathEntries {
		for _, candidate := range withExt(filepath.Join(dir, name)) {
			if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
				return candidate
			}
		}
	}
	if p, err := exec.LookPath(name); err == nil {
		return p
	}
	return name
}

// withExt adds the Windows executable extensions, which is how npm (a .cmd
// shim) is found alongside node.exe.
func withExt(base string) []string {
	if runtime.GOOS != "windows" {
		return []string{base}
	}
	return []string{base + ".exe", base + ".cmd", base + ".bat", base}
}
