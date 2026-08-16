// Package toolchain makes sure Git, Go, Node and anything else a definition
// asks for exist on the machine before a build is attempted. It prefers the
// platform's package manager and falls back to the vendors' own archives, so
// a machine with no winget and no apt still ends up with a working toolchain.
package toolchain

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/peepal/installer/internal/appdef"
)

// Logf reports progress to the panel.
type Logf func(string, ...any)

// Status is what the panel shows next to each prerequisite.
type Status struct {
	Name    string `json:"name"`
	Command string `json:"command"`
	Found   bool   `json:"found"`
	Path    string `json:"path"`
	Version string `json:"version"`
	// OK is false when the tool is missing or older than min_version.
	OK       bool   `json:"ok"`
	Wanted   string `json:"wanted"`
	Optional bool   `json:"optional"`
}

// Check inspects every tool without changing anything.
func Check(tools []appdef.Tool) []Status {
	out := make([]Status, 0, len(tools))
	for _, t := range tools {
		out = append(out, check(t))
	}
	return out
}

func check(t appdef.Tool) Status {
	s := Status{Name: t.Name, Command: t.Command, Wanted: t.MinVersion, Optional: t.Optional}
	path, err := exec.LookPath(t.Command)
	if err != nil {
		return s
	}
	s.Found, s.Path = true, path
	s.Version = version(path, t.Name)
	s.OK = t.MinVersion == "" || atLeast(s.Version, t.MinVersion)
	return s
}

// Ensure installs every tool that is missing or too old. It returns the
// post-install status list so the caller can report what happened.
func Ensure(ctx context.Context, tools []appdef.Tool, dirs Dirs, log Logf) ([]Status, error) {
	var firstErr error
	out := make([]Status, 0, len(tools))
	for _, t := range tools {
		s := check(t)
		if s.OK {
			log("%s %s already present", t.Name, s.Version)
			out = append(out, s)
			continue
		}
		log("Installing %s...", t.Name)
		if err := install(ctx, t, dirs, log); err != nil {
			if t.Optional {
				log("WARNING: %s could not be installed (%v); continuing without it", t.Name, err)
				out = append(out, s)
				continue
			}
			if firstErr == nil {
				firstErr = fmt.Errorf("installing %s: %w", t.Name, err)
			}
			out = append(out, s)
			continue
		}
		s = check(t)
		if !s.OK && !t.Optional {
			// The package manager reported success but PATH does not show it,
			// which normally means a new shell is needed.
			log("WARNING: %s installed but not visible on PATH yet", t.Name)
		}
		out = append(out, s)
	}
	return out, firstErr
}

// version runs the tool's usual version flag and returns a bare number.
func version(path, name string) string {
	args := []string{"--version"}
	if name == "go" {
		args = []string{"version"}
	}
	out, err := exec.Command(path, args...).Output()
	if err != nil {
		return ""
	}
	return firstVersion(string(out))
}

// firstVersion picks the first dotted number out of arbitrary version output.
func firstVersion(s string) string {
	for _, f := range strings.Fields(s) {
		f = strings.TrimPrefix(strings.TrimPrefix(f, "v"), "go")
		if len(f) == 0 {
			continue
		}
		if f[0] < '0' || f[0] > '9' {
			continue
		}
		if strings.Contains(f, ".") {
			return strings.TrimRight(f, ",;")
		}
	}
	return ""
}

// atLeast compares dotted versions numerically, ignoring suffixes.
func atLeast(have, want string) bool {
	if have == "" {
		return false
	}
	h, w := parts(have), parts(want)
	for i := 0; i < len(w); i++ {
		var hv int
		if i < len(h) {
			hv = h[i]
		}
		if hv != w[i] {
			return hv > w[i]
		}
	}
	return true
}

func parts(v string) []int {
	fields := strings.Split(v, ".")
	out := make([]int, 0, len(fields))
	for _, f := range fields {
		n := 0
		for _, c := range f {
			if c < '0' || c > '9' {
				break
			}
			n = n*10 + int(c-'0')
		}
		out = append(out, n)
	}
	return out
}
