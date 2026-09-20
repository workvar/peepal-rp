package updater

import (
	"context"
	"fmt"
	"time"

	"github.com/peepal/installer/internal/appconfig"
	"github.com/peepal/installer/internal/ghrelease"
	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/runstate"
	"github.com/peepal/installer/internal/semver"
)

// Hooks let the agent stop and restart the app around a swap without the
// updater knowing anything about process supervision.
type Hooks struct {
	StopApp  func()
	StartApp func()
	// Migrate runs the backend's schema migration after new code lands.
	Migrate func(ctx context.Context) error
	// Healthy reports whether the freshly started stack answers.
	Healthy func(ctx context.Context, within time.Duration) bool
}

// Updater polls GitHub and applies new releases.
type Updater struct {
	Cfg    appconfig.Config
	Layout paths.Layout
	Client ghrelease.Client
	Status *runstate.State
	Hooks  Hooks
}

// Run polls forever on the configured interval. The first check happens a
// minute after boot so a restart never fights with a user logging in.
func (u *Updater) Run(ctx context.Context) {
	if !u.Cfg.Updates.Enabled {
		logx.Infof("automatic updates are disabled")
		return
	}
	interval := time.Duration(u.Cfg.Updates.CheckEveryMinutes) * time.Minute
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
			if applied, err := u.CheckAndApply(ctx); err != nil {
				logx.Errorf("update check failed: %v", err)
			} else if applied {
				logx.Infof("update applied")
			}
			timer.Reset(interval)
		}
	}
}

// LatestAvailable returns the newest published tags without applying anything.
// Empty strings are returned for repos that cannot be reached.
func (u *Updater) LatestAvailable(ctx context.Context) (backend, frontend string) {
	if r, err := u.Client.Latest(ctx, u.Cfg.Updates.BackendRepo); err == nil {
		backend = r.Tag
	}
	if r, err := u.Client.Latest(ctx, u.Cfg.Updates.FrontendRepo); err == nil {
		frontend = r.Tag
	}
	return backend, frontend
}

// CheckAndApply performs one poll. It returns true when something changed.
func (u *Updater) CheckAndApply(ctx context.Context) (bool, error) {
	state := LoadState(u.Layout.StateFile())
	state.LastCheck = time.Now()

	backend, errB := u.Client.Latest(ctx, u.Cfg.Updates.BackendRepo)
	frontend, errF := u.Client.Latest(ctx, u.Cfg.Updates.FrontendRepo)
	if errB != nil && errF != nil {
		return false, fmt.Errorf("neither repository could be reached: %v; %v", errB, errF)
	}

	needBackend := errB == nil && semver.Newer(backend.Tag, state.BackendTag)
	needFrontend := errF == nil && semver.Newer(frontend.Tag, state.FrontendTag)
	if !needBackend && !needFrontend {
		SaveState(u.Layout.StateFile(), state)
		return false, nil
	}
	if !u.inWindow(time.Now()) {
		logx.Infof("new release available but outside the %02d:00-%02d:00 update window; deferring",
			u.Cfg.Updates.WindowStartHour, u.Cfg.Updates.WindowEndHour)
		SaveState(u.Layout.StateFile(), state)
		return false, nil
	}

	plan := plan{state: state}
	if needBackend {
		plan.backend = &backend
		logx.Infof("backend %s -> %s", or(state.BackendTag, "none"), backend.Tag)
	}
	if needFrontend {
		plan.frontend = &frontend
		logx.Infof("frontend %s -> %s", or(state.FrontendTag, "none"), frontend.Tag)
	}
	if err := u.apply(ctx, plan); err != nil {
		u.Status.Fail("Update failed; the previous version was restored", err)
		state.LastError = err.Error()
		SaveState(u.Layout.StateFile(), state)
		return false, err
	}
	return true, nil
}

// inWindow honours the quiet-hours setting. Equal start and end hours mean
// updates may run at any time.
func (u *Updater) inWindow(now time.Time) bool {
	s, e := u.Cfg.Updates.WindowStartHour, u.Cfg.Updates.WindowEndHour
	if s == e {
		return true
	}
	h := now.Hour()
	if s < e {
		return h >= s && h < e
	}
	return h >= s || h < e // window wraps past midnight
}

func or(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
