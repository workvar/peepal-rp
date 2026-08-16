package service

import (
	"fmt"
	"os/exec"
	"strings"
)

// taskName is the Scheduled Task the agent runs under. A scheduled task is
// used rather than a Windows service because the agent is a plain console
// program: it never talks to the Service Control Manager, which would kill a
// real service for failing to report as started.
const taskName = "PeepalAgent"

type windowsTask struct{}

func (windowsTask) Install(d Definition) error {
	cmd := `"` + d.ExecPath + `"`
	for _, a := range d.Args {
		cmd += ` "` + a + `"`
	}
	// /RL HIGHEST keeps the elevated token needed to bind port 80.
	return run("schtasks", "/Create", "/F",
		"/TN", taskName,
		"/TR", cmd,
		"/SC", "ONSTART",
		"/RU", "SYSTEM",
		"/RL", "HIGHEST",
		"/DELAY", "0000:30",
	)
}

func (w windowsTask) Uninstall() error {
	w.Stop()
	return run("schtasks", "/Delete", "/F", "/TN", taskName)
}

func (w windowsTask) Start() error {
	w.Stop()
	return run("schtasks", "/Run", "/TN", taskName)
}

func (windowsTask) Stop() error {
	run("schtasks", "/End", "/TN", taskName)
	// /End only stops the task action; make sure no stray agent survives.
	exec.Command("taskkill", "/F", "/IM", "peepal-agent.exe").Run()
	return nil
}

func (windowsTask) Installed() bool {
	out, err := exec.Command("schtasks", "/Query", "/TN", taskName).CombinedOutput()
	return err == nil && strings.Contains(string(out), taskName)
}

func (windowsTask) Describe() string {
	return fmt.Sprintf(`schtasks /Query /TN %s | schtasks /Run /TN %s`, taskName, taskName)
}
