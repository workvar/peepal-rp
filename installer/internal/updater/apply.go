package updater

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/peepal/installer/internal/archive"
	"github.com/peepal/installer/internal/ghrelease"
	"github.com/peepal/installer/internal/logx"
	"github.com/peepal/installer/internal/runstate"
	"github.com/peepal/installer/internal/sysuser"
)

// plan is the set of components a single update touches.
type plan struct {
	state    State
	backend  *ghrelease.Release
	frontend *ghrelease.Release
}

// apply downloads, swaps and verifies. Everything is staged first so the
// window where the app is actually down is only as long as a directory
// rename plus a restart.
func (u *Updater) apply(ctx context.Context, p plan) error {
	u.Status.Set(runstate.Updating, "Downloading the new version")
	staging := filepath.Join(u.Layout.Staging(), time.Now().Format("20060102-150405"))
	defer os.RemoveAll(staging)

	var stagedBackend, stagedFrontend string
	var err error
	if p.backend != nil {
		stagedBackend, err = u.stage(ctx, u.Cfg.Updates.BackendRepo, *p.backend, ghrelease.BackendAsset(), filepath.Join(staging, "backend"))
		if err != nil {
			return fmt.Errorf("staging backend %s: %w", p.backend.Tag, err)
		}
	}
	if p.frontend != nil {
		stagedFrontend, err = u.stage(ctx, u.Cfg.Updates.FrontendRepo, *p.frontend, ghrelease.FrontendAsset(), filepath.Join(staging, "frontend"))
		if err != nil {
			return fmt.Errorf("staging frontend %s: %w", p.frontend.Tag, err)
		}
	}

	u.Status.SetStep("Stopping the application")
	u.Hooks.StopApp()

	// Keep the outgoing directories so a failed start can be rolled back.
	var rollbacks []func()
	swap := func(staged, live string) error {
		if staged == "" {
			return nil
		}
		backup := live + ".previous"
		os.RemoveAll(backup)
		if _, err := os.Stat(live); err == nil {
			if err := os.Rename(live, backup); err != nil {
				return err
			}
			rollbacks = append(rollbacks, func() {
				os.RemoveAll(live)
				os.Rename(backup, live)
			})
		}
		if err := os.Rename(staged, live); err != nil {
			return err
		}
		return nil
	}

	u.Status.SetStep("Installing new files")
	if err := swap(stagedBackend, u.Layout.Backend()); err != nil {
		rollback(rollbacks)
		u.Hooks.StartApp()
		return fmt.Errorf("swapping backend: %w", err)
	}
	if err := swap(stagedFrontend, u.Layout.Frontend()); err != nil {
		rollback(rollbacks)
		u.Hooks.StartApp()
		return fmt.Errorf("swapping frontend: %w", err)
	}

	// Configuration and uploaded files live outside the release directories,
	// but the backend expects to find them beside itself.
	if err := u.relink(); err != nil {
		logx.Warnf("re-linking runtime directories: %v", err)
	}
	sysuser.Chown(u.Layout.Apps(), sysuser.Account())

	if p.backend != nil && u.Hooks.Migrate != nil {
		u.Status.SetStep("Updating the database schema")
		if err := u.Hooks.Migrate(ctx); err != nil {
			rollback(rollbacks)
			u.Hooks.StartApp()
			return fmt.Errorf("database migration: %w", err)
		}
	}

	u.Status.SetStep("Restarting the application")
	u.Hooks.StartApp()

	if u.Hooks.Healthy != nil && !u.Hooks.Healthy(ctx, 3*time.Minute) {
		logx.Errorf("the updated stack did not become healthy; rolling back")
		u.Status.SetStep("Rolling back to the previous version")
		u.Hooks.StopApp()
		rollback(rollbacks)
		u.Hooks.StartApp()
		u.Hooks.Healthy(ctx, 3*time.Minute)
		u.Status.Set(runstate.Running, "Serving the previous version")
		return fmt.Errorf("new version failed its health check and was rolled back")
	}

	// Success: drop the backups and record the new tags.
	os.RemoveAll(u.Layout.Backend() + ".previous")
	os.RemoveAll(u.Layout.Frontend() + ".previous")

	st := p.state
	if p.backend != nil {
		st.BackendTag = p.backend.Tag
	}
	if p.frontend != nil {
		st.FrontendTag = p.frontend.Tag
	}
	st.LastUpdate, st.LastError = time.Now(), ""
	if err := SaveState(u.Layout.StateFile(), st); err != nil {
		logx.Warnf("could not write state file: %v", err)
	}
	u.Status.SetVersions(st.BackendTag, st.FrontendTag)
	u.Status.Set(runstate.Running, "Up to date")
	return nil
}

// stage downloads one asset and unpacks it into dir, returning dir.
func (u *Updater) stage(ctx context.Context, repo string, rel ghrelease.Release, asset, dir string) (string, error) {
	pkg, err := u.Client.FetchAsset(ctx, repo, rel, asset, filepath.Dir(dir), nil)
	if err != nil {
		return "", err
	}
	defer os.Remove(pkg)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	if err := archive.Extract(pkg, dir); err != nil {
		return "", err
	}
	if err := archive.StripRoot(dir); err != nil {
		return "", err
	}
	return dir, nil
}

func rollback(fns []func()) {
	for i := len(fns) - 1; i >= 0; i-- {
		fns[i]()
	}
}
