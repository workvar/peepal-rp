package main

import (
	"context"
	"os"
	"path/filepath"

	"github.com/peepal/installer/internal/archive"
	"github.com/peepal/installer/internal/ghrelease"
	"github.com/peepal/installer/internal/nodert"
	"github.com/peepal/installer/internal/paths"
	"github.com/peepal/installer/internal/sysuser"
	"github.com/peepal/installer/internal/ui"
	"github.com/peepal/installer/internal/updater"
)

// setupRuntime installs the Node.js runtime the frontend server needs.
func setupRuntime(ctx context.Context, l paths.Layout) {
	ui.Step(4, "Installing the runtime")
	if nodert.Installed(l.Node()) {
		ui.OK("Node.js %s already installed", nodert.Version)
		return
	}
	rep := ui.NewProgress("Node.js "+nodert.Version, 0)
	if err := nodert.Ensure(ctx, l.Node(), filepath.Join(l.Staging(), "cache"), rep); err != nil {
		ui.Fail("Could not install Node.js: %v", err)
	}
	ui.OK("Node.js %s installed", nodert.Version)
}

// setupApp downloads the backend and frontend releases and unpacks them.
func setupApp(ctx context.Context, l paths.Layout, o Options) updater.State {
	ui.Step(5, "Downloading Peepal")

	client := ghrelease.Client{Token: token(), AllowPrerelease: channel() != "stable"}
	cache := filepath.Join(l.Staging(), "cache")

	backend := fetchRelease(ctx, client, repoBackend(), o.BackendTag)
	frontend := fetchRelease(ctx, client, repoFrontend(), o.FrontendTag)
	ui.Info("Backend %s, frontend %s", backend.Tag, frontend.Tag)

	unpack(ctx, client, repoBackend(), backend, ghrelease.BackendAsset(), l.Backend(), cache)
	unpack(ctx, client, repoFrontend(), frontend, ghrelease.FrontendAsset(), l.Frontend(), cache)

	// Uploaded files must outlive every future update, so the backend's
	// uploads directory is a link into the data directory.
	if err := updater.LinkDir(l.Uploads(), filepath.Join(l.Backend(), "uploads")); err != nil {
		ui.Warn("Could not link the uploads directory: %v", err)
	}
	sysuser.Chown(l.Apps(), sysuser.Account())

	return updater.State{BackendTag: backend.Tag, FrontendTag: frontend.Tag}
}

// fetchRelease picks the latest release, or a pinned tag when one was given.
func fetchRelease(ctx context.Context, c ghrelease.Client, repo, tag string) ghrelease.Release {
	var (
		rel ghrelease.Release
		err error
	)
	if tag == "" {
		rel, err = c.Latest(ctx, repo)
	} else {
		rel, err = c.ByTag(ctx, repo, tag)
	}
	if err != nil {
		ui.Fail("Could not read releases from %s: %v\n      Check the machine's internet access and the installer's access token.", repo, err)
	}
	return rel
}

// unpack downloads one asset into a clean directory.
func unpack(ctx context.Context, c ghrelease.Client, repo string, rel ghrelease.Release, asset, dest, cache string) {
	rep := ui.NewProgress(asset, 0)
	pkg, err := c.FetchAsset(ctx, repo, rel, asset, cache, rep)
	if err != nil {
		ui.Fail("Download failed: %v", err)
	}
	defer os.Remove(pkg)

	if err := os.RemoveAll(dest); err != nil {
		ui.Fail("Could not clear %s: %v", dest, err)
	}
	if err := os.MkdirAll(dest, 0o755); err != nil {
		ui.Fail("Could not create %s: %v", dest, err)
	}
	if err := archive.Extract(pkg, dest); err != nil {
		ui.Fail("Could not unpack %s: %v", asset, err)
	}
	if err := archive.StripRoot(dest); err != nil {
		ui.Fail("Could not unpack %s: %v", asset, err)
	}
}

// saveTags records what was installed so the agent knows when a release is
// actually newer.
func saveTags(l paths.Layout, s updater.State) {
	if err := updater.SaveState(l.StateFile(), s); err != nil {
		ui.Warn("Could not record installed versions: %v", err)
	}
}
