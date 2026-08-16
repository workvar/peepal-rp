// Package remote executes the commands the developer's hub sends back on a
// heartbeat: restart a service, fetch logs, apply an update, run one of the
// diagnostic commands the definition allows. The customer's machine never
// accepts an inbound connection; every instruction arrives as the reply to a
// request the panel itself made.
package remote

import (
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/cmdline"
	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/telemetry"
)

// Command names the hub may send.
const (
	CmdRestart   = "restart"    // restart one service, or all of them
	CmdStop      = "stop"       // stop the application, leaving the panel up
	CmdStart     = "start"      // start it again
	CmdStatus    = "status"     // return the current health snapshot
	CmdLogs      = "logs"       // return the tail of the agent log
	CmdUpdate    = "update"     // pull, rebuild and restart now
	CmdRebuild   = "rebuild"    // rebuild without pulling
	CmdExec      = "exec"       // run an allow-listed diagnostic command
	CmdEnvGet    = "env"        // return the non-secret environment
	CmdPanelInfo = "panel_info" // versions, paths, uptime
)

// Handlers are supplied by whatever is running the stack: the panel in
// foreground mode, or the headless agent.
type Handlers struct {
	Restart func(ctx context.Context, service string) error
	Stop    func(ctx context.Context) error
	Start   func(ctx context.Context) error
	Status  func(ctx context.Context) (string, error)
	Logs    func(lines int) (string, error)
	Update  func(ctx context.Context) (string, error)
	Rebuild func(ctx context.Context) (string, error)
	Env     func() (string, error)
	Info    func() (string, error)
}

// Executor applies commands and reports results back to the hub.
type Executor struct {
	Spec     appdef.Spec
	Client   *telemetry.Client
	Handlers Handlers
}

// Apply runs every command in a batch, one at a time. Commands are rare and
// often disruptive, so they are deliberately not run concurrently.
func (e *Executor) Apply(ctx context.Context, cmds []telemetry.Command) {
	for _, c := range cmds {
		start := time.Now()
		out, err := e.one(ctx, c)
		res := telemetry.Result{ID: c.ID, OK: err == nil, Output: out,
			Elapsed: time.Since(start).Round(time.Millisecond).String()}
		if err != nil {
			res.Error = err.Error()
			logx.Errorf("remote command %s failed: %v", c.Name, err)
		} else {
			logx.Infof("remote command %s applied", c.Name)
		}
		e.Client.Report(ctx, res)
	}
}

func (e *Executor) one(ctx context.Context, c telemetry.Command) (string, error) {
	if !e.Spec.Monitoring.RemoteControl {
		return "", fmt.Errorf("remote control is disabled on this installation")
	}
	h := e.Handlers
	switch c.Name {
	case CmdRestart:
		if h.Restart == nil {
			return "", unsupported(c.Name)
		}
		return "restarted", h.Restart(ctx, c.Args["service"])
	case CmdStop:
		if h.Stop == nil {
			return "", unsupported(c.Name)
		}
		return "stopped", h.Stop(ctx)
	case CmdStart:
		if h.Start == nil {
			return "", unsupported(c.Name)
		}
		return "started", h.Start(ctx)
	case CmdStatus:
		if h.Status == nil {
			return "", unsupported(c.Name)
		}
		return h.Status(ctx)
	case CmdLogs:
		if h.Logs == nil {
			return "", unsupported(c.Name)
		}
		n, _ := strconv.Atoi(c.Args["lines"])
		if n <= 0 || n > 2000 {
			n = 200
		}
		return h.Logs(n)
	case CmdUpdate:
		if h.Update == nil {
			return "", unsupported(c.Name)
		}
		return h.Update(ctx)
	case CmdRebuild:
		if h.Rebuild == nil {
			return "", unsupported(c.Name)
		}
		return h.Rebuild(ctx)
	case CmdEnvGet:
		if h.Env == nil {
			return "", unsupported(c.Name)
		}
		return h.Env()
	case CmdPanelInfo:
		if h.Info == nil {
			return "", unsupported(c.Name)
		}
		return h.Info()
	case CmdExec:
		return e.execAllowed(ctx, c.Args["command"])
	}
	return "", fmt.Errorf("unknown command %q", c.Name)
}

// execAllowed runs a diagnostic command only if the definition lists it. The
// allow-list is the whole security model here: without it, a compromised hub
// would own every customer machine.
func (e *Executor) execAllowed(ctx context.Context, line string) (string, error) {
	if !e.Spec.Monitoring.AllowExec {
		return "", fmt.Errorf("exec is disabled on this installation")
	}
	line = strings.TrimSpace(line)
	if !allowed(line, e.Spec.Monitoring.ExecAllow) {
		return "", fmt.Errorf("%q is not in monitoring.exec_allow", line)
	}
	argv, err := cmdline.Split(line)
	if err != nil {
		return "", err
	}
	runCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	out, err := exec.CommandContext(runCtx, argv[0], argv[1:]...).CombinedOutput()
	return string(out), err
}

// allowed matches an entry exactly, or as a prefix when the entry ends in *.
func allowed(line string, list []string) bool {
	for _, entry := range list {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if strings.HasSuffix(entry, "*") {
			if strings.HasPrefix(line, strings.TrimSuffix(entry, "*")) {
				return true
			}
			continue
		}
		if line == entry {
			return true
		}
	}
	return false
}

func unsupported(name string) error {
	return fmt.Errorf("this installation cannot handle %q right now", name)
}
