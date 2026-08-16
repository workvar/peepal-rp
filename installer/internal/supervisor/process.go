// Package supervisor keeps the PostgreSQL, backend and frontend processes
// alive under one parent, so a single OS service controls the whole stack.
package supervisor

import (
	"context"
	"os/exec"
	"sync"
	"time"

	"github.com/peepal/installer/internal/logx"
)

// Builder produces a fresh command each time the process needs starting.
// Commands cannot be reused after Wait returns, hence the factory.
type Builder func(ctx context.Context) *exec.Cmd

// Process is one supervised child with exponential restart backoff.
type Process struct {
	Name  string
	Build Builder
	// Optional means a crash is logged but does not take the stack down.
	Optional bool

	mu       sync.Mutex
	cmd      *exec.Cmd
	stopping bool
	done     chan struct{}
}

// Start launches the process and keeps restarting it until Stop is called or
// ctx is cancelled.
func (p *Process) Start(ctx context.Context) {
	p.mu.Lock()
	p.stopping = false
	p.done = make(chan struct{})
	done := p.done
	p.mu.Unlock()

	go func() {
		defer close(done)
		backoff := time.Second
		for {
			if ctx.Err() != nil || p.isStopping() {
				return
			}
			cmd := p.Build(ctx)
			cmd.Stdout = logx.Writer()
			cmd.Stderr = logx.Writer()
			if err := cmd.Start(); err != nil {
				logx.Errorf("%s failed to start: %v", p.Name, err)
			} else {
				p.setCmd(cmd)
				logx.Infof("%s started (pid %d)", p.Name, cmd.Process.Pid)
				err = cmd.Wait()
				if p.isStopping() || ctx.Err() != nil {
					logx.Infof("%s stopped", p.Name)
					return
				}
				logx.Warnf("%s exited unexpectedly: %v; restarting in %s", p.Name, err, backoff)
			}
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
			if backoff < 60*time.Second {
				backoff *= 2
			}
		}
	}()
}

// Stop signals the child and waits for the supervising goroutine to finish.
func (p *Process) Stop(timeout time.Duration) {
	p.mu.Lock()
	p.stopping = true
	cmd, done := p.cmd, p.done
	p.mu.Unlock()

	if cmd != nil && cmd.Process != nil {
		terminate(cmd)
	}
	if done == nil {
		return
	}
	select {
	case <-done:
	case <-time.After(timeout):
		p.mu.Lock()
		cmd = p.cmd
		p.mu.Unlock()
		if cmd != nil && cmd.Process != nil {
			logx.Warnf("%s did not exit in %s; killing it", p.Name, timeout)
			cmd.Process.Kill()
		}
	}
}

// Running reports whether a child process is currently alive.
func (p *Process) Running() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.cmd != nil && p.cmd.Process != nil && p.cmd.ProcessState == nil
}

func (p *Process) setCmd(c *exec.Cmd) {
	p.mu.Lock()
	p.cmd = c
	p.mu.Unlock()
}

func (p *Process) isStopping() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.stopping
}
