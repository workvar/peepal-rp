package service

import (
	"fmt"
	"os"
	"strings"
	"text/template"
)

const plistPath = "/Library/LaunchDaemons/com.peepal.agent.plist"
const plistLabel = "com.peepal.agent"

// launchd registers a system-wide daemon on macOS.
type launchd struct{}

var plistTmpl = template.Must(template.New("plist").Parse(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>{{ .Label }}</string>
  <key>ProgramArguments</key>
  <array>{{ range .Args }}
    <string>{{ . }}</string>{{ end }}
  </array>
  <key>WorkingDirectory</key><string>{{ .WorkingDir }}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>{{ .LogDir }}/launchd.out.log</string>
  <key>StandardErrorPath</key><string>{{ .LogDir }}/launchd.err.log</string>
</dict>
</plist>
`))

func (launchd) Install(d Definition) error {
	args := append([]string{d.ExecPath}, d.Args...)
	f, err := os.Create(plistPath)
	if err != nil {
		return err
	}
	defer f.Close()
	err = plistTmpl.Execute(f, map[string]any{
		"Label":      plistLabel,
		"Args":       args,
		"WorkingDir": d.WorkingDir,
		"LogDir":     strings.TrimSuffix(d.WorkingDir, "/") + "/data/logs",
	})
	if err != nil {
		return err
	}
	if err := os.Chmod(plistPath, 0o644); err != nil {
		return err
	}
	return run("launchctl", "load", "-w", plistPath)
}

func (launchd) Uninstall() error {
	run("launchctl", "unload", "-w", plistPath)
	return os.Remove(plistPath)
}

func (launchd) Start() error {
	run("launchctl", "load", "-w", plistPath)
	return run("launchctl", "kickstart", "-k", "system/"+plistLabel)
}

func (launchd) Stop() error { return run("launchctl", "unload", plistPath) }

func (launchd) Installed() bool {
	_, err := os.Stat(plistPath)
	return err == nil
}

func (launchd) Describe() string {
	return fmt.Sprintf("sudo launchctl kickstart -k system/%s | tail -f /var/log/system.log", plistLabel)
}
