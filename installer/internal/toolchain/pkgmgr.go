package toolchain

import (
	"context"
	"os/exec"
	"runtime"
	"strings"
)

// manager is one package manager and the argument shape it expects.
type manager struct {
	name string
	// command builds the full argument list for installing pkg.
	command func(pkg string) []string
	// elevate wraps the command with sudo on Unix when not already root.
	elevate bool
}

// managers returns the package managers present on this machine, best first.
func managers() []manager {
	switch runtime.GOOS {
	case "windows":
		return present([]manager{
			{name: "winget", command: func(p string) []string {
				return []string{"winget", "install", "--id", p, "-e", "--silent",
					"--accept-package-agreements", "--accept-source-agreements"}
			}},
			{name: "choco", command: func(p string) []string {
				return []string{"choco", "install", p, "-y", "--no-progress"}
			}},
			{name: "scoop", command: func(p string) []string {
				return []string{"scoop", "install", p}
			}},
		})
	case "darwin":
		return present([]manager{
			{name: "brew", command: func(p string) []string { return []string{"brew", "install", p} }},
		})
	default:
		return present([]manager{
			{name: "apt-get", elevate: true, command: func(p string) []string {
				return []string{"apt-get", "install", "-y", p}
			}},
			{name: "dnf", elevate: true, command: func(p string) []string {
				return []string{"dnf", "install", "-y", p}
			}},
			{name: "yum", elevate: true, command: func(p string) []string {
				return []string{"yum", "install", "-y", p}
			}},
			{name: "zypper", elevate: true, command: func(p string) []string {
				return []string{"zypper", "--non-interactive", "install", p}
			}},
			{name: "pacman", elevate: true, command: func(p string) []string {
				return []string{"pacman", "-S", "--noconfirm", p}
			}},
			{name: "apk", elevate: true, command: func(p string) []string {
				return []string{"apk", "add", p}
			}},
		})
	}
}

func present(all []manager) []manager {
	out := make([]manager, 0, len(all))
	for _, m := range all {
		if _, err := exec.LookPath(m.name); err == nil {
			out = append(out, m)
		}
	}
	return out
}

// defaultPackages maps a tool to the package name each manager knows it by.
// A definition can override any of these with tool.packages.
var defaultPackages = map[string]map[string]string{
	"git": {
		"winget": "Git.Git", "choco": "git", "scoop": "git", "brew": "git",
		"apt-get": "git", "dnf": "git", "yum": "git", "zypper": "git",
		"pacman": "git", "apk": "git",
	},
	"go": {
		"winget": "GoLang.Go", "choco": "golang", "scoop": "go", "brew": "go",
		"apt-get": "golang-go", "dnf": "golang", "yum": "golang", "zypper": "go",
		"pacman": "go", "apk": "go",
	},
	"node": {
		"winget": "OpenJS.NodeJS.LTS", "choco": "nodejs-lts", "scoop": "nodejs-lts",
		"brew": "node@20", "apt-get": "nodejs", "dnf": "nodejs", "yum": "nodejs",
		"zypper": "nodejs20", "pacman": "nodejs", "apk": "nodejs",
	},
	"npm": {
		"apt-get": "npm", "dnf": "npm", "yum": "npm", "zypper": "npm",
		"pacman": "npm", "apk": "npm",
	},
}

// packageFor resolves the package name for a tool under one manager.
func packageFor(toolName string, override map[string]string, mgr string) string {
	if p, ok := override[mgr]; ok {
		return p
	}
	if p, ok := defaultPackages[toolName][mgr]; ok {
		return p
	}
	return toolName
}

// runManager installs pkg with m, refreshing apt's index first because a
// fresh container image usually has none.
func runManager(ctx context.Context, m manager, pkg string, log Logf) error {
	if m.name == "apt-get" {
		_ = run(ctx, elevated([]string{"apt-get", "update"}, m.elevate), log)
	}
	return run(ctx, elevated(m.command(pkg), m.elevate), log)
}

// elevated prefixes sudo when the process is not already root.
func elevated(args []string, need bool) []string {
	if !need || runtime.GOOS == "windows" || isRoot() {
		return args
	}
	if _, err := exec.LookPath("sudo"); err != nil {
		return args
	}
	return append([]string{"sudo", "-n"}, args...)
}

func run(ctx context.Context, args []string, log Logf) error {
	cmd := exec.CommandContext(ctx, args[0], args[1:]...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		log("%s failed: %v: %s", strings.Join(args, " "), err, trim(string(out)))
		return err
	}
	return nil
}

func trim(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 400 {
		return s[len(s)-400:]
	}
	return s
}
