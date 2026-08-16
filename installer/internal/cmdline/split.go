// Package cmdline turns a command written as one string in the YAML
// definition into the argument list exec.Command expects, honouring quotes
// the way a shell would.
package cmdline

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

// Split parses "node server.js --port 3000" into its arguments. Single and
// double quotes group words; a backslash escapes the next character on Unix.
func Split(s string) ([]string, error) {
	var (
		args    []string
		cur     strings.Builder
		quote   rune
		escaped bool
		started bool
	)
	for _, r := range s {
		switch {
		case escaped:
			cur.WriteRune(r)
			escaped = false
		case r == '\\' && quote != '\'' && runtime.GOOS != "windows":
			escaped = true
		case quote != 0:
			if r == quote {
				quote = 0
			} else {
				cur.WriteRune(r)
			}
		case r == '\'' || r == '"':
			quote, started = r, true
		case r == ' ' || r == '\t' || r == '\n':
			if cur.Len() > 0 || started {
				args = append(args, cur.String())
				cur.Reset()
				started = false
			}
		default:
			cur.WriteRune(r)
		}
	}
	if quote != 0 {
		return nil, fmt.Errorf("unbalanced %c in command: %s", quote, s)
	}
	if cur.Len() > 0 || started {
		args = append(args, cur.String())
	}
	if len(args) == 0 {
		return nil, fmt.Errorf("empty command")
	}
	return args, nil
}

// Shell wraps a command line for the platform's shell, which build steps need
// because they use pipes, && and environment expansion.
func Shell(line string) []string {
	if runtime.GOOS == "windows" {
		if ps, err := exec.LookPath("powershell"); err == nil {
			return []string{ps, "-NoProfile", "-NonInteractive", "-Command", line}
		}
		return []string{"cmd", "/C", line}
	}
	return []string{"/bin/sh", "-lc", line}
}
