package service

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

const unitPath = "/etc/systemd/system/" + Name + ".service"

// systemd registers a unit file. Running as root is required so the agent can
// bind port 80 and drop privileges for the database.
type systemd struct{}

func (systemd) Install(d Definition) error {
	unit := strings.Join([]string{
		"[Unit]",
		"Description=" + d.Description,
		"After=network-online.target",
		"Wants=network-online.target",
		"",
		"[Service]",
		"Type=simple",
		"ExecStart=" + quoteCmd(d.ExecPath, d.Args),
		"WorkingDirectory=" + d.WorkingDir,
		"Restart=always",
		"RestartSec=10",
		// The agent supervises its own children, so give the whole cgroup
		// time to stop before systemd escalates to SIGKILL.
		"TimeoutStopSec=90",
		"KillMode=mixed",
		"LimitNOFILE=65535",
		"",
		"[Install]",
		"WantedBy=multi-user.target",
		"",
	}, "\n")
	if err := os.WriteFile(unitPath, []byte(unit), 0o644); err != nil {
		return err
	}
	if err := run("systemctl", "daemon-reload"); err != nil {
		return err
	}
	return run("systemctl", "enable", Name)
}

func (systemd) Uninstall() error {
	run("systemctl", "disable", "--now", Name)
	os.Remove(unitPath)
	return run("systemctl", "daemon-reload")
}

func (systemd) Start() error { return run("systemctl", "restart", Name) }
func (systemd) Stop() error  { return run("systemctl", "stop", Name) }

func (systemd) Installed() bool {
	_, err := os.Stat(unitPath)
	return err == nil
}

func (systemd) Describe() string {
	return fmt.Sprintf("systemctl status %s | systemctl restart %s | journalctl -u %s -f", Name, Name, Name)
}

func run(bin string, args ...string) error {
	cmd := exec.Command(bin, args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("%s %s: %w\n%s", bin, strings.Join(args, " "), err, out)
	}
	return nil
}

// quoteCmd renders an ExecStart line, quoting any argument with spaces.
func quoteCmd(bin string, args []string) string {
	parts := []string{maybeQuote(bin)}
	for _, a := range args {
		parts = append(parts, maybeQuote(a))
	}
	return strings.Join(parts, " ")
}

func maybeQuote(s string) string {
	if strings.ContainsAny(s, " \t") {
		return `"` + s + `"`
	}
	return s
}
