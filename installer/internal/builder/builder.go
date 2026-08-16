// Package builder runs the build steps a definition lists: dependency
// installs, compilations, asset bundling. Steps run through the platform
// shell, in the repository directory, with the panel's private runtimes ahead
// of the system ones on PATH.
package builder

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/cmdline"
	"github.com/peepal/installer/internal/workspace"
)

// Logf receives every line the build produces.
type Logf func(string, ...any)

// Options configures a build run.
type Options struct {
	Spec   appdef.Spec
	Layout workspace.Layout
	Vars   appdef.Vars
	// PathEntries are prepended to PATH, so a privately installed Go or Node
	// wins over an older system copy.
	PathEntries []string
	Log         Logf
}

// Run executes every applicable step in order and stops at the first failure.
func Run(ctx context.Context, o Options) error {
	for _, step := range o.Spec.Build {
		if !appdef.StepApplies(step) {
			o.Log("Skipping %q (not for %s)", step.Name, hostOS())
			continue
		}
		if err := RunStep(ctx, o, step); err != nil {
			return fmt.Errorf("build step %q failed: %w", step.Name, err)
		}
	}
	return nil
}

// RunStep executes one step. It is exported so the panel can offer a "rebuild
// frontend only" action.
func RunStep(ctx context.Context, o Options, step appdef.Step) error {
	repo, ok := o.Spec.Repo(step.Repo)
	if !ok {
		return fmt.Errorf("unknown repo %q", step.Repo)
	}
	dir := o.Layout.WorkDir(repo, step.Dir)
	if _, err := os.Stat(dir); err != nil {
		return fmt.Errorf("%s does not exist; clone the repositories first", dir)
	}
	line, err := appdef.Expand(step.Run, o.Vars)
	if err != nil {
		return err
	}
	extra, err := appdef.ExpandMap(step.Env, o.Vars)
	if err != nil {
		return err
	}

	timeout := time.Duration(step.TimeoutMinutes) * time.Minute
	runCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	o.Log("→ %s: %s", step.Name, line)
	argv := cmdline.Shell(line)
	cmd := exec.CommandContext(runCtx, argv[0], argv[1:]...)
	cmd.Dir = dir
	cmd.Env = Environment(o.PathEntries, extra)

	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	if err := cmd.Start(); err != nil {
		return err
	}
	go stream(stdout, o.Log)
	go stream(stderr, o.Log)

	if err := cmd.Wait(); err != nil {
		if runCtx.Err() == context.DeadlineExceeded {
			return fmt.Errorf("timed out after %s", timeout)
		}
		return err
	}
	return nil
}

// Environment builds the process environment: the panel's runtimes first on
// PATH, then the caller's additions.
func Environment(pathEntries []string, extra map[string]string) []string {
	env := os.Environ()
	if len(pathEntries) > 0 {
		env = withPath(env, pathEntries)
	}
	for k, v := range extra {
		env = append(env, k+"="+v)
	}
	return env
}

// withPath rewrites the PATH entry in place rather than appending a second
// one, which Windows would ignore.
func withPath(env, prepend []string) []string {
	sep := string(os.PathListSeparator)
	prefix := strings.Join(prepend, sep)
	for i, e := range env {
		k, v, _ := strings.Cut(e, "=")
		if strings.EqualFold(k, "PATH") {
			env[i] = k + "=" + prefix + sep + v
			return env
		}
	}
	return append(env, "PATH="+prefix)
}

// stream forwards a pipe line by line so the panel shows progress live
// instead of a wall of text at the end.
func stream(r io.Reader, log Logf) {
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 0, 64*1024), 1<<20)
	for sc.Scan() {
		log("%s", sc.Text())
	}
}

func hostOS() string { return runtime.GOOS }
