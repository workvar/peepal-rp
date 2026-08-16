package control

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/peepal/installer/internal/appstate"
	"github.com/peepal/installer/internal/builder"
	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/runstate"
	"github.com/peepal/installer/internal/semver"
	"github.com/peepal/installer/internal/telemetry"
	"github.com/peepal/installer/internal/vcs"
)

// TrackRelease means only a published semver tag counts as an update; it is
// the default, because an unreviewed commit on main should never reach a
// customer machine.
const TrackRelease = "release"

// Pending is one repository with newer code waiting.
type Pending struct {
	Repo string `json:"repo"`
	// Current and Latest are tags when tracking releases, commits otherwise.
	Current string `json:"current"`
	Latest  string `json:"latest"`
	// Kind is release or commit, so the panel can label it honestly.
	Kind string `json:"kind"`
}

// updateLoop polls on the configured interval. The first check waits a minute
// so a restart never fights with someone logging in.
func (c *Controller) updateLoop(ctx context.Context) {
	if !c.Spec.Updates.Enabled {
		logx.Infof("automatic updates are disabled")
		return
	}
	interval := time.Duration(c.Spec.Updates.CheckEveryMinutes) * time.Minute
	if interval < 5*time.Minute {
		interval = 5 * time.Minute
	}
	timer := time.NewTimer(time.Minute)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			c.pollOnce(ctx)
			timer.Reset(interval)
		}
	}
}

func (c *Controller) pollOnce(ctx context.Context) {
	pending, err := c.CheckUpdates(ctx)
	if err != nil {
		logx.Errorf("update check failed: %v", err)
		return
	}
	if len(pending) == 0 {
		return
	}
	summary := describePending(pending)
	logx.Infof("update available: %s", summary)
	c.Hub.Send(telemetry.Event{Kind: telemetry.Lifecycle, Message: "update available: " + summary})

	if !c.Spec.Updates.AutoApply {
		return
	}
	if !c.inWindow(time.Now()) {
		logx.Infof("outside the %02d:00-%02d:00 update window; deferring",
			c.Spec.Updates.WindowStartHour, c.Spec.Updates.WindowEndHour)
		return
	}
	if _, err := c.ApplyUpdate(ctx); err != nil {
		logx.Errorf("update failed: %v", err)
	}
}

// tracksReleases reports whether this install waits for a tag.
func (c *Controller) tracksReleases() bool {
	return c.Spec.Updates.Track != "branch"
}

// CheckUpdates asks each remote what is available, without touching the
// working copies. Tracking releases, that is the highest semver tag; tracking
// the branch, it is the branch head.
func (c *Controller) CheckUpdates(ctx context.Context) ([]Pending, error) {
	st := appstate.Load(c.Layout.StateFile())
	var out []Pending
	var firstErr error

	for _, repo := range c.Spec.Repos {
		dir := c.Layout.RepoDir(repo)
		if c.tracksReleases() {
			tags, err := vcs.RemoteTags(ctx, c.auth(), dir)
			if err != nil {
				firstErr = keep(firstErr, repo.Name, err)
				continue
			}
			latest := semver.Latest(tags, c.allowPrerelease())
			if latest == "" {
				// No release published yet. Nothing to do, and not an error:
				// a repository can legitimately have no tags on day one.
				continue
			}
			if current := st.Releases[repo.Name]; semver.Newer(latest, current) {
				out = append(out, Pending{Repo: repo.Name, Current: current,
					Latest: latest, Kind: "release"})
			}
			continue
		}

		head, err := vcs.RemoteHead(ctx, c.auth(), dir, repo.Branch)
		if err != nil {
			firstErr = keep(firstErr, repo.Name, err)
			continue
		}
		if head != "" && head != st.Commits[repo.Name] {
			out = append(out, Pending{Repo: repo.Name, Current: st.Commits[repo.Name],
				Latest: head, Kind: "commit"})
		}
	}

	st.LastCheck = time.Now()
	appstate.Save(c.Layout.StateFile(), st)
	if len(out) == 0 && firstErr != nil {
		return nil, firstErr
	}
	return out, nil
}

// ApplyUpdate pulls, rebuilds, migrates and restarts. On any failure it puts
// the previous commits back and restarts those, so a bad release costs a few
// minutes of maintenance page rather than a support visit.
func (c *Controller) ApplyUpdate(ctx context.Context) (string, error) {
	c.mu.Lock()
	if c.updating {
		c.mu.Unlock()
		return "", fmt.Errorf("an update is already running")
	}
	c.updating = true
	c.mu.Unlock()
	defer func() {
		c.mu.Lock()
		c.updating = false
		c.mu.Unlock()
	}()

	st := appstate.Load(c.Layout.StateFile())
	previous := copyMap(st.Commits)

	c.State.Set(runstate.Updating, "Fetching the latest release")
	var log strings.Builder
	logf := func(f string, a ...any) {
		line := fmt.Sprintf(f, a...)
		logx.Infof("%s", line)
		log.WriteString(line + "\n")
	}

	if err := c.fetchAll(ctx, logf); err != nil {
		return log.String(), c.rollback(ctx, previous, err, logf)
	}

	c.State.SetStep("Stopping the application")
	c.Runner.Group.StopApp(c.Runner.AppProcesses(), 30*time.Second)

	c.State.SetStep("Rebuilding")
	if err := c.build(ctx, logf); err != nil {
		return log.String(), c.rollback(ctx, previous, err, logf)
	}

	c.State.SetStep("Running migrations")
	if err := c.Runner.Migrate(ctx); err != nil {
		return log.String(), c.rollback(ctx, previous, err, logf)
	}

	c.State.SetStep("Starting the application")
	c.Runner.Group.StartApp(c.Runner.AppProcesses())
	if !c.Runner.Healthy(ctx, 5*time.Minute) {
		err := fmt.Errorf("the application did not become healthy after the update")
		return log.String(), c.rollback(ctx, previous, err, logf)
	}

	commits, releases := c.currentState(ctx)
	st.Commits, st.Releases = commits, releases
	st.Previous, st.LastUpdate, st.LastError = previous, time.Now(), ""
	appstate.Save(c.Layout.StateFile(), st)
	c.State.SetVersions(releases[c.Spec.Primary().Name], "")
	c.State.Set(runstate.Running, "Running")
	c.Hub.Send(telemetry.Event{Kind: telemetry.Lifecycle,
		Message: "update applied: " + c.Release()})
	logf("Update complete. Now running %s.", c.Release())
	return log.String(), nil
}

// Rebuild runs the build steps against the current checkouts, without
// fetching. It is the answer to "it built badly, try again".
func (c *Controller) Rebuild(ctx context.Context) (string, error) {
	var log strings.Builder
	logf := func(f string, a ...any) {
		line := fmt.Sprintf(f, a...)
		logx.Infof("%s", line)
		log.WriteString(line + "\n")
	}
	c.State.Set(runstate.Updating, "Rebuilding")
	c.Runner.Group.StopApp(c.Runner.AppProcesses(), 30*time.Second)
	err := c.build(ctx, logf)
	c.Runner.Group.StartApp(c.Runner.AppProcesses())
	go c.waitHealthy(ctx)
	return log.String(), err
}

// fetchAll brings every checkout to what should be running: the newest
// release tag, or the branch head when tracking the branch. Tracking
// releases still fetches the branch first, so the tag's commit is present
// and `git describe` has history to work with.
func (c *Controller) fetchAll(ctx context.Context, logf func(string, ...any)) error {
	for _, repo := range c.Spec.Repos {
		dir := c.Layout.RepoDir(repo)
		logf("Fetching %s (%s)", repo.Name, repo.Branch)
		if err := vcs.Fetch(ctx, c.auth(), dir, repo.Branch, vcs.Logf(logf)); err != nil {
			return err
		}
		if !c.tracksReleases() {
			continue
		}
		tags, err := vcs.RemoteTags(ctx, c.auth(), dir)
		if err != nil {
			return err
		}
		latest := semver.Latest(tags, c.allowPrerelease())
		if latest == "" {
			logf("%s has no release tag; staying on %s", repo.Name, repo.Branch)
			continue
		}
		logf("Checking out release %s of %s", latest, repo.Name)
		if err := vcs.CheckoutTag(ctx, c.auth(), dir, latest, vcs.Logf(logf)); err != nil {
			return err
		}
	}
	return nil
}

func (c *Controller) build(ctx context.Context, logf func(string, ...any)) error {
	return builder.Run(ctx, builder.Options{
		Spec: c.Spec, Layout: c.Layout, Vars: c.Vars,
		PathEntries: c.Runner.PathEntries, Log: builder.Logf(logf),
	})
}

// rollback resets every checkout to the commits that were running before and
// brings them back up.
func (c *Controller) rollback(ctx context.Context, previous map[string]string, cause error, logf func(string, ...any)) error {
	logf("Update failed: %v", cause)
	c.State.Fail("Update failed; restoring the previous version", cause)
	c.Hub.Send(telemetry.Event{Kind: telemetry.Error, Message: "update failed: " + cause.Error()})

	for _, repo := range c.Spec.Repos {
		sha := previous[repo.Name]
		if sha == "" {
			continue
		}
		logf("Restoring %s to %s", repo.Name, short(sha))
		if err := vcs.Reset(ctx, c.Layout.RepoDir(repo), sha, vcs.Logf(logf)); err != nil {
			logf("could not restore %s: %v", repo.Name, err)
		}
	}
	if err := c.build(ctx, logf); err != nil {
		logf("rebuild of the previous version failed: %v", err)
	}
	c.Runner.Group.StartApp(c.Runner.AppProcesses())
	go c.waitHealthy(ctx)

	st := appstate.Load(c.Layout.StateFile())
	st.LastError = cause.Error()
	appstate.Save(c.Layout.StateFile(), st)
	return cause
}

// currentState reads what is actually checked out, which is the only honest
// source for "what version is running".
func (c *Controller) currentState(ctx context.Context) (commits, releases map[string]string) {
	commits, releases = map[string]string{}, map[string]string{}
	for _, repo := range c.Spec.Repos {
		ck, err := vcs.Describe(ctx, c.Layout.RepoDir(repo))
		if err != nil {
			continue
		}
		commits[repo.Name] = ck.Commit
		if ck.Tag != "" {
			releases[repo.Name] = ck.Tag
		}
	}
	return commits, releases
}

// Release is the version string the panel puts on screen: the primary
// repository's tag, or its describe output when no release is checked out.
func (c *Controller) Release() string {
	ck, err := vcs.Describe(context.Background(), c.Layout.RepoDir(c.Spec.Primary()))
	if err != nil || ck.Version == "" {
		return "unknown"
	}
	return ck.Version
}

func (c *Controller) allowPrerelease() bool {
	return c.Spec.Updates.Strategy == "prerelease" || c.Spec.Updates.Track == "prerelease"
}

// inWindow honours quiet hours. Equal start and end hours mean any time.
func (c *Controller) inWindow(now time.Time) bool {
	s, e := c.Spec.Updates.WindowStartHour, c.Spec.Updates.WindowEndHour
	if s == e {
		return true
	}
	h := now.Hour()
	if s < e {
		return h >= s && h < e
	}
	return h >= s || h < e // the window wraps past midnight
}

// Checkouts describes every repository for the panel's repositories card.
func (c *Controller) Checkouts(ctx context.Context) []vcs.Checkout {
	out := make([]vcs.Checkout, 0, len(c.Spec.Repos))
	for _, repo := range c.Spec.Repos {
		ck, err := vcs.Describe(ctx, c.Layout.RepoDir(repo))
		if err != nil {
			ck = vcs.Checkout{Dir: c.Layout.RepoDir(repo), URL: repo.URL, Branch: repo.Branch}
		}
		out = append(out, ck)
	}
	return out
}

// auth is the credential for the private repository, rebuilt from the spec
// each time so a token replaced in app.yml takes effect on the next check.
func (c *Controller) auth() vcs.Auth {
	if !c.Spec.Auth.UsesToken() {
		return vcs.Auth{}
	}
	return vcs.Auth{Token: c.Spec.Auth.Token, User: c.Spec.Auth.User}
}

func describePending(p []Pending) string {
	parts := make([]string, 0, len(p))
	for _, one := range p {
		if one.Kind == "release" {
			parts = append(parts, fmt.Sprintf("%s %s → %s", one.Repo,
				or(one.Current, "none"), one.Latest))
			continue
		}
		parts = append(parts, fmt.Sprintf("%s %s", one.Repo, short(one.Latest)))
	}
	return strings.Join(parts, ", ")
}

func keep(first error, repo string, err error) error {
	if first != nil {
		return first
	}
	return fmt.Errorf("%s: %w", repo, err)
}

func copyMap(m map[string]string) map[string]string {
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

func short(sha string) string {
	if len(sha) > 7 {
		return sha[:7]
	}
	return sha
}

func or(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
