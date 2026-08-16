// Package control is the running installation: the supervised services, the
// front door, the heartbeat to the developer's hub and the update loop. Both
// the graphical panel and the headless agent drive the same Controller, so
// the two can never drift apart.
package control

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/appstate"
	"github.com/peepal/installer/internal/gateway"
	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/metrics"
	"github.com/peepal/installer/internal/pgsql"
	"github.com/peepal/installer/internal/remote"
	"github.com/peepal/installer/internal/runner"
	"github.com/peepal/installer/internal/runstate"
	"github.com/peepal/installer/internal/telemetry"
	"github.com/peepal/installer/internal/workspace"
)

// Options builds a Controller.
type Options struct {
	Spec        appdef.Spec
	Layout      workspace.Layout
	Vars        appdef.Vars
	Cluster     *pgsql.Cluster
	PathEntries []string
	Version     string
}

// Controller owns everything that runs after setup.
type Controller struct {
	Spec    appdef.Spec
	Layout  workspace.Layout
	Vars    appdef.Vars
	Version string

	Runner *runner.Runner
	State  *runstate.State
	Hub    *telemetry.Client

	sampler  *metrics.Sampler
	server   *http.Server
	exec     *remote.Executor
	started  time.Time
	mu       sync.Mutex
	running  bool
	cancel   context.CancelFunc
	updating bool
}

// New assembles a controller without starting anything.
func New(o Options) *Controller {
	c := &Controller{
		Spec: o.Spec, Layout: o.Layout, Vars: o.Vars, Version: o.Version,
		State:   runstate.New(o.Version),
		sampler: &metrics.Sampler{Path: o.Layout.Data},
	}
	c.Runner = runner.New(&runner.Runner{
		Spec: o.Spec, Layout: o.Layout, Vars: o.Vars,
		Cluster: o.Cluster, PathEntries: o.PathEntries,
	})
	c.Hub = &telemetry.Client{
		BaseURL:   o.Spec.Monitoring.HubURL,
		Token:     o.Spec.Monitoring.Token,
		App:       o.Spec.App.Name,
		InstallID: telemetry.InstallID(o.Layout.Data),
		Version:   o.Version,
		Enabled:   o.Spec.Monitoring.Enabled && o.Spec.Monitoring.HubURL != "",
	}
	c.exec = &remote.Executor{Spec: o.Spec, Client: c.Hub, Handlers: c.handlers()}
	return c
}

// Start brings the stack up: services, front door, heartbeat, log shipping
// and the update loop. It returns as soon as the processes are launched;
// health is reported through State.
func (c *Controller) Start(parent context.Context) error {
	c.mu.Lock()
	if c.running {
		c.mu.Unlock()
		return fmt.Errorf("already running")
	}
	ctx, cancel := context.WithCancel(parent)
	c.cancel, c.running, c.started = cancel, true, time.Now()
	c.mu.Unlock()

	c.State.Set(runstate.Starting, "Starting services")
	c.Runner.Group.Start(ctx)

	c.server = gateway.New(gateway.Options{
		Listen: ":" + strconv.Itoa(c.Spec.Routing.HTTPPort),
		Spec:   c.Spec,
		State:  c.State,
	})
	go func() {
		logx.Infof("front door listening on port %d", c.Spec.Routing.HTTPPort)
		if err := c.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logx.Errorf("front door failed: %v", err)
			c.State.Fail("The front door could not bind its port", err)
		}
	}()

	go c.waitHealthy(ctx)

	c.Hub.Start(ctx)
	if c.Hub.Enabled {
		go c.heartbeat(ctx)
		go (&telemetry.Tail{
			Path:    c.Layout.AgentLog(),
			Client:  c.Hub,
			ShipAll: c.Spec.Monitoring.ShipLogs,
		}).Run(ctx)
		c.Hub.Send(telemetry.Event{Kind: telemetry.Lifecycle, Message: "started"})
	}
	go c.updateLoop(ctx)
	return nil
}

// Stop shuts the stack down but leaves the panel running.
func (c *Controller) Stop(ctx context.Context) error {
	c.mu.Lock()
	cancel, running := c.cancel, c.running
	c.running = false
	c.mu.Unlock()
	if !running {
		return nil
	}
	if c.server != nil {
		shutdown, done := context.WithTimeout(context.Background(), 15*time.Second)
		defer done()
		c.server.Shutdown(shutdown)
	}
	c.Runner.Group.StopAll(30 * time.Second)
	if cancel != nil {
		cancel()
	}
	c.State.Set(runstate.Failed, "Stopped by the operator")
	if c.Hub.Enabled {
		c.Hub.Send(telemetry.Event{Kind: telemetry.Lifecycle, Message: "stopped"})
	}
	return nil
}

// Running reports whether the stack is up.
func (c *Controller) Running() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.running
}

// Uptime is how long the stack has been up, for the dashboard.
func (c *Controller) Uptime() time.Duration {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.running {
		return 0
	}
	return time.Since(c.started)
}

// RestartService restarts one service, or the whole application when name is
// empty. The database is deliberately left alone.
func (c *Controller) RestartService(ctx context.Context, name string) error {
	names := c.Runner.AppProcesses()
	if name != "" {
		if _, ok := c.Spec.Service(name); !ok {
			return fmt.Errorf("no service named %q", name)
		}
		names = []string{name}
	}
	c.State.Set(runstate.Starting, "Restarting "+display(name))
	c.Runner.Group.StopApp(names, 30*time.Second)
	c.Runner.Group.StartApp(names)
	go c.waitHealthy(ctx)
	return nil
}

func (c *Controller) waitHealthy(ctx context.Context) {
	if c.Runner.Healthy(ctx, 5*time.Minute) {
		c.State.Set(runstate.Running, "Running")
		logx.Infof("all services are healthy")
		return
	}
	if ctx.Err() != nil {
		return
	}
	c.State.Fail("Some services did not start", nil)
	c.Hub.Send(telemetry.Event{Kind: telemetry.Error, Message: "services did not become healthy"})
}

// heartbeat posts metrics on the configured interval and applies whatever
// commands come back in the reply.
func (c *Controller) heartbeat(ctx context.Context) {
	every := time.Duration(c.Spec.Monitoring.HeartbeatSeconds) * time.Second
	if every < 15*time.Second {
		every = 15 * time.Second
	}
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			ack, err := c.Hub.Post(ctx, telemetry.Event{
				Kind:    telemetry.Heartbeat,
				Metrics: c.Metrics(ctx),
			})
			if err != nil {
				continue
			}
			if len(ack.Commands) > 0 {
				c.exec.Apply(ctx, ack.Commands)
			}
		}
	}
}

// Metrics builds the heartbeat payload, which is also what the dashboard
// renders.
func (c *Controller) Metrics(ctx context.Context) *telemetry.Metrics {
	snap := c.sampler.Sample()
	m := &telemetry.Metrics{
		Mode:          string(c.State.Get().Mode),
		UptimeSeconds: int64(c.Uptime().Seconds()),
		CPUPercent:    snap.CPUPercent,
		MemUsedBytes:  snap.MemUsedBytes,
		MemTotalBytes: snap.MemTotalBytes,
		DiskFreeBytes: snap.DiskFreeBytes,
		Commits:       appstate.Load(c.Layout.StateFile()).Commits,
	}
	for _, h := range c.Runner.Check(ctx) {
		m.Services = append(m.Services, telemetry.ServiceMetric{
			Name: h.Service, Running: h.Running, Healthy: h.Healthy, Port: h.Port,
		})
	}
	return m
}

func display(name string) string {
	if name == "" {
		return "the application"
	}
	return name
}
