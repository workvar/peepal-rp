package setup

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/appstate"
	"github.com/peepal/installer/internal/builder"
	"github.com/peepal/installer/internal/dbsetup"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/envplan"
	"github.com/peepal/installer/internal/pgsql"
	"github.com/peepal/installer/internal/routing"
	"github.com/peepal/installer/internal/sysinfo"
	"github.com/peepal/installer/internal/toolchain"
	"github.com/peepal/installer/internal/vcs"
	"github.com/peepal/installer/internal/workspace"
)

// Answers is everything the wizard collected.
type Answers struct {
	InstallRoot string            `json:"install_root"`
	Database    dbsetup.Choice    `json:"database"`
	Routing     routing.Choice    `json:"routing"`
	Env         map[string]string `json:"env"`
	// RepoToken authenticates to a private Git host. It is stored only in
	// the data-directory copy of the definition, which is written 0600.
	RepoToken string `json:"repo_token"`
	// Hub settings, so an operator can point one install at a staging hub.
	HubURL   string `json:"hub_url"`
	HubToken string `json:"hub_token"`
	// RegisterService false leaves the app running only while the panel is
	// open, which is what a developer wants on their own laptop.
	RegisterService bool `json:"register_service"`
	AutoUpdate      bool `json:"auto_update"`
}

// Result is what the panel needs to start supervising.
type Result struct {
	Spec        appdef.Spec        `json:"spec"`
	Layout      workspace.Layout   `json:"layout"`
	Vars        appdef.Vars        `json:"vars"`
	Database    dbsetup.Result     `json:"database"`
	Routing     routing.Plan       `json:"routing"`
	Env         envplan.Plan       `json:"env"`
	PathEntries []string           `json:"path_entries"`
	Cluster     *pgsql.Cluster     `json:"-"`
	Tools       []toolchain.Status `json:"tools"`
	// Release is the version that ended up checked out.
	Release string `json:"release"`
}

// Run performs the whole installation. It is safe to re-run over an existing
// install: checkouts are updated rather than recreated, the database is
// reused and secrets already generated are kept.
func Run(ctx context.Context, spec appdef.Spec, a Answers, send Reporter) (Result, error) {
	r := &reporter{send: send}
	var res Result

	if a.InstallRoot != "" {
		spec.App.InstallRoot = a.InstallRoot
	}
	if a.HubURL != "" {
		spec.Monitoring.HubURL, spec.Monitoring.Enabled = a.HubURL, true
	}
	if a.HubToken != "" {
		spec.Monitoring.Token = a.HubToken
	}
	spec.Updates.AutoApply = a.AutoUpdate
	if a.RepoToken != "" {
		spec.Auth.Token, spec.Auth.Method = a.RepoToken, "token"
	}
	auth := RepoAuth(spec)

	layout := workspace.For(spec)
	res.Spec, res.Layout = spec, layout

	// 1. Preflight ---------------------------------------------------------
	r.enter(PhasePreflight)
	if err := preflight(r, spec, layout); err != nil {
		r.fail(err)
		return res, err
	}
	if err := layout.EnsureDirs(); err != nil {
		r.fail(err)
		return res, err
	}

	// 2. Toolchain ---------------------------------------------------------
	r.enter(PhaseToolchain)
	dirs := toolchain.Dirs{Node: layout.NodeDir(), Go: layout.GoDir(), Cache: layout.Cache()}
	tools, err := toolchain.Ensure(ctx, spec.Toolchain, dirs, toolchain.Logf(r.line))
	res.Tools = tools
	if err != nil {
		r.fail(err)
		return res, err
	}
	res.PathEntries = toolchain.PathEntries(dirs)

	// 3. Source ------------------------------------------------------------
	r.enter(PhaseClone)
	for _, repo := range spec.Repos {
		dir := layout.RepoDir(repo)
		r.line("Cloning %s from %s (%s)", repo.Name, repo.URL, repo.Branch)
		if err := vcs.Clone(ctx, auth, repo.URL, repo.Branch, dir, vcs.Logf(r.line)); err != nil {
			r.fail(cloneError(spec, repo, err))
			return res, cloneError(spec, repo, err)
		}
		// A fresh install runs the newest published release, not whatever
		// happens to be on the branch right now.
		if tracksReleases(spec) {
			tag, err := latestRelease(ctx, auth, dir, spec)
			if err != nil {
				r.line("WARNING: could not list releases for %s: %v", repo.Name, err)
			} else if tag == "" {
				r.line("%s has no release tag yet; installing the tip of %s", repo.Name, repo.Branch)
			} else {
				r.line("Installing release %s of %s", tag, repo.Name)
				if err := vcs.CheckoutTag(ctx, auth, dir, tag, vcs.Logf(r.line)); err != nil {
					r.fail(err)
					return res, err
				}
			}
		}
	}

	// 4. Database ----------------------------------------------------------
	r.enter(PhaseDatabase)
	db, err := dbsetup.Prepare(ctx, spec, layout, a.Database, spec.App.ServiceUser, dbsetup.Logf(r.line))
	if err != nil {
		r.fail(err)
		return res, err
	}
	res.Database = db
	if db.Mode == dbsetup.Local && db.Managed {
		res.Cluster = &db.Cluster
	}

	// 5. Environment -------------------------------------------------------
	r.enter(PhaseEnv)
	plan, vars, err := buildEnv(spec, layout, a, db)
	if err != nil {
		r.fail(err)
		return res, err
	}
	if missing := plan.Missing(); len(missing) > 0 {
		err := fmt.Errorf("these settings still need a value: %v", missing)
		r.fail(err)
		return res, err
	}
	if err := plan.Write(layout, spec); err != nil {
		r.fail(err)
		return res, err
	}
	res.Env, res.Vars = plan, vars
	route, err := routing.Resolve(spec, a.Routing)
	if err != nil {
		r.fail(err)
		return res, err
	}
	res.Routing = route
	spec.Routing.Mode, spec.Routing.Domain = string(route.Mode), route.Domain
	spec.Routing.HTTPPort, spec.Routing.TLS = route.Port, route.TLS
	res.Spec = spec
	r.line("The application will answer on %s", route.PublicURL)
	if route.Mode == routing.LocalMode {
		r.line("Other machines on this network can use %s", route.LANURL)
	}

	// 6. Build -------------------------------------------------------------
	r.enter(PhaseBuild)
	err = builder.Run(ctx, builder.Options{
		Spec: spec, Layout: layout, Vars: vars,
		PathEntries: res.PathEntries, Log: builder.Logf(r.line),
	})
	if err != nil {
		r.fail(err)
		return res, err
	}
	dbsetup.StopBootstrap()

	// 7. Service -----------------------------------------------------------
	r.enter(PhaseService)
	if a.RegisterService {
		if err := registerService(spec, layout, r); err != nil {
			// A missing service registration is a warning, not a failure:
			// the panel can still run the stack in the foreground.
			r.line("WARNING: %v", err)
		}
	} else {
		r.line("Skipped; the application runs while the panel is open.")
	}

	// 8. Persist -----------------------------------------------------------
	if err := appdef.Save(layout.SpecFile(), spec); err != nil {
		r.fail(err)
		return res, err
	}
	st := appstate.Load(layout.StateFile())
	st.InstalledAt, st.Setup = time.Now(), true
	st.Commits, st.Releases = map[string]string{}, map[string]string{}
	for _, repo := range spec.Repos {
		ck, err := vcs.Describe(ctx, layout.RepoDir(repo))
		if err != nil {
			continue
		}
		st.Commits[repo.Name] = ck.Commit
		if ck.Tag != "" {
			st.Releases[repo.Name] = ck.Tag
		}
		if repo.Primary || res.Release == "" {
			res.Release = ck.Version
		}
	}
	appstate.Save(layout.StateFile(), st)
	r.line("Installed %s", or(res.Release, "the current source"))

	r.done()
	return res, nil
}

// preflight refuses to start an install that cannot finish.
func preflight(r *reporter, spec appdef.Spec, l workspace.Layout) error {
	m := sysinfo.Detect()
	r.line("%s", m.String())

	if !sysinfo.IsAdmin() {
		return fmt.Errorf("administrator rights are required. %s", sysinfo.ElevationHint())
	}
	const needBytes = 5 << 30
	if free := sysinfo.FreeDiskForPath(l.Root); free > 0 && free < needBytes {
		return fmt.Errorf("only %.1f GB free at %s; 5 GB is needed to build",
			float64(free)/(1<<30), l.Root)
	}
	port := spec.Routing.HTTPPort
	if port > 0 && !sysinfo.PortFree(port) {
		return fmt.Errorf("port %d is already in use; choose another front-door port", port)
	}
	for _, sv := range spec.Services {
		if sv.Port > 0 && !sysinfo.PortFree(sv.Port) {
			r.line("WARNING: port %d (%s) is in use; the service may fail to start", sv.Port, sv.Name)
		}
	}
	return nil
}

// buildEnv assembles the variables and the environment plan.
func buildEnv(spec appdef.Spec, l workspace.Layout, a Answers, db dbsetup.Result) (envplan.Plan, appdef.Vars, error) {
	route, err := routing.Resolve(spec, a.Routing)
	if err != nil {
		return envplan.Plan{}, nil, err
	}
	vars := appdef.Vars{
		appdef.VarRoot:       l.Root,
		appdef.VarData:       l.Data,
		appdef.VarSrc:        l.Src(),
		appdef.VarUploads:    l.Uploads(),
		appdef.VarDatabase:   db.URL,
		appdef.VarPublicURL:  route.PublicURL,
		appdef.VarDomain:     route.Domain,
		appdef.VarHTTPPort:   strconv.Itoa(route.Port),
		appdef.VarAppName:    spec.App.Name,
		appdef.VarPlatform:   runtime.GOOS,
		appdef.VarNodeBin:    l.NodeDir(),
		appdef.VarGoBin:      l.GoDir(),
		appdef.VarServiceUsr: spec.App.ServiceUser,
		appdef.VarExe:        exeSuffix(),
	}

	extra := route.Env(spec.Routing)
	if db.URL != "" && spec.Database.URLVar != "" {
		extra[spec.Database.URLVar] = db.URL
	}
	for _, sv := range spec.Services {
		if sv.Port > 0 && sv.PortVar != "" {
			extra[sv.PortVar] = strconv.Itoa(sv.Port)
		}
	}

	// Existing secrets are reused so an update never invalidates sessions.
	existing := envfile.Vars{}
	for _, sv := range spec.Services {
		if v, err := envfile.Read(l.EnvFile(sv.Name)); err == nil {
			for k, val := range v {
				existing[k] = val
			}
		}
	}

	plan, err := envplan.Build(envplan.Input{
		Spec: spec, Vars: vars, Answers: a.Env, Extra: extra, Existing: existing,
	})
	return plan, vars, err
}

// exeSuffix lets one definition name a compiled binary on every platform.
func exeSuffix() string {
	if runtime.GOOS == "windows" {
		return ".exe"
	}
	return ""
}

// EnvFilePath is where an operator finds a service's generated environment.
func EnvFilePath(l workspace.Layout, service string) string {
	return filepath.Clean(l.EnvFile(service))
}

// exists is used by the panel to decide whether to open on the wizard.
func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// Installed reports whether setup has already completed at this layout.
func Installed(l workspace.Layout) bool {
	return exists(l.SpecFile()) && appstate.Load(l.StateFile()).Setup
}
