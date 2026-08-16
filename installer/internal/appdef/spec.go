// Package appdef describes any application the control panel can install,
// supervise and update. Nothing about Peepal is hard-coded here: a single
// YAML file names the repositories, the toolchain, the build commands, the
// services and the environment, and the panel does the rest.
package appdef

// Spec is one deployable product.
type Spec struct {
	// App identifies the product in the UI, in service names and in the
	// telemetry the developer receives.
	App App `yaml:"app"`

	// Toolchain lists the programs that must exist before anything is built.
	Toolchain []Tool `yaml:"toolchain"`

	// Repos are cloned from Git. The first repo marked primary supplies the
	// version string shown in the panel.
	Repos []Repo `yaml:"repos"`

	// Auth is how a private repository is reached.
	Auth Auth `yaml:"auth"`

	// Database describes the storage the app needs, if any.
	Database Database `yaml:"database"`

	// Env is the full set of environment entries the panel writes out. Every
	// entry appears in the generated .env files, so an operator can see and
	// edit all of them in one place.
	Env []EnvVar `yaml:"env"`

	// Build runs after cloning and after every update.
	Build []Step `yaml:"build"`

	// Services are the long-running processes the agent supervises.
	Services []Service `yaml:"services"`

	// Routing configures the single front-door port and the public URL.
	Routing Routing `yaml:"routing"`

	// Updates controls how new code is pulled.
	Updates Updates `yaml:"updates"`

	// Monitoring controls what is sent back to the developer.
	Monitoring Monitoring `yaml:"monitoring"`
}

// App is the product identity.
type App struct {
	Name        string `yaml:"name"`         // slug: peepal
	DisplayName string `yaml:"display_name"` // Peepal ERP
	Description string `yaml:"description"`
	Vendor      string `yaml:"vendor"`
	// InstallRoot overrides the platform default install directory.
	InstallRoot string `yaml:"install_root"`
	// ServiceUser is the unprivileged account the services run as on Unix.
	ServiceUser string `yaml:"service_user"`
}

// Tool is one prerequisite program.
type Tool struct {
	Name string `yaml:"name"` // git, go, node
	// MinVersion is compared against the output of VersionCmd, when both are set.
	MinVersion string `yaml:"min_version"`
	// Command is what must resolve on PATH; defaults to Name.
	Command string `yaml:"command"`
	// Packages maps a package manager to the package name, for the cases
	// where they differ (nodejs vs node, golang vs go).
	Packages map[string]string `yaml:"packages"`
	// Optional tools only produce a warning when they cannot be installed.
	Optional bool `yaml:"optional"`
}

// Repo is one Git checkout.
type Repo struct {
	Name    string `yaml:"name"`   // backend
	URL     string `yaml:"url"`    // https://github.com/org/repo.git
	Branch  string `yaml:"branch"` // main
	Dir     string `yaml:"dir"`    // relative to <root>/src
	Primary bool   `yaml:"primary"`
	// Subdir points at a folder inside a monorepo checkout; empty means the
	// repository root.
	Subdir string `yaml:"subdir"`
}

// Database describes the storage requirement.
type Database struct {
	// Engine is postgres or none.
	Engine string `yaml:"engine"`
	// Name and User are used when the panel provisions a local cluster.
	Name string `yaml:"name"`
	User string `yaml:"user"`
	Port int    `yaml:"port"`
	// URLVar is the environment key that receives the connection string,
	// whether the database is local or a cloud instance.
	URLVar string `yaml:"url_var"`
	// AllowCloud lets the operator paste an external URI instead.
	AllowCloud bool `yaml:"allow_cloud"`
}

// EnvVar is one line of the generated environment file.
type EnvVar struct {
	Key string `yaml:"key"`
	// Value may reference {{.Var}} placeholders; see template.go.
	Value string `yaml:"value"`
	// Secret generates a random value when Value is empty and hides it in the UI.
	Secret bool `yaml:"secret"`
	// SecretBytes is the entropy used for generated secrets (default 32).
	SecretBytes int `yaml:"secret_bytes"`
	// Prompt, when set, asks the operator for the value during setup.
	Prompt string `yaml:"prompt"`
	// Target names the service whose .env receives this entry; empty means
	// every service.
	Target string `yaml:"target"`
	// Comment is shown next to the field in the panel.
	Comment string `yaml:"comment"`
}

// Step is one shell command run in a repository directory.
type Step struct {
	Name string `yaml:"name"`
	Repo string `yaml:"repo"`
	// Dir is relative to the repo checkout; empty means its root.
	Dir string `yaml:"dir"`
	Run string `yaml:"run"`
	// OS restricts the step to the listed GOOS values; empty means all.
	OS []string `yaml:"os"`
	// Env adds variables for this step only.
	Env map[string]string `yaml:"env"`
	// TimeoutMinutes defaults to 20; builds of a Next.js app are slow.
	TimeoutMinutes int `yaml:"timeout_minutes"`
}

// Service is a supervised process.
type Service struct {
	Name string `yaml:"name"`
	Repo string `yaml:"repo"`
	Dir  string `yaml:"dir"`
	// Run is the command line, split with shell-like quoting.
	Run string `yaml:"run"`
	// Port is the loopback port the process listens on.
	Port int `yaml:"port"`
	// PortVar receives the port number in the process environment.
	PortVar string `yaml:"port_var"`
	// Health is a path polled on Port to decide the service is up.
	Health string `yaml:"health"`
	// Route sends matching request prefixes to this service. The service
	// with the "/" route is the fallback.
	Routes []string `yaml:"routes"`
	// Migrate runs once before the service starts, after every update.
	Migrate string `yaml:"migrate"`
	// Optional services may crash without failing the whole stack.
	Optional bool `yaml:"optional"`
	// Env adds variables for this service only.
	Env map[string]string `yaml:"env"`
}

// Routing configures the public entry point.
type Routing struct {
	// Mode is local or domain; the panel sets it during setup.
	Mode string `yaml:"mode"`
	// HTTPPort is the port the front door binds.
	HTTPPort int `yaml:"http_port"`
	// Domain is the public hostname when Mode is domain.
	Domain string `yaml:"domain"`
	// TLS enables the built-in ACME certificate for Domain.
	TLS bool `yaml:"tls"`
	// PublicURLVar receives the resolved base URL, e.g. NEXT_PUBLIC_APP_URL.
	PublicURLVar string `yaml:"public_url_var"`
	// CookieDomainVar receives the cookie domain, blank in local mode.
	CookieDomainVar string `yaml:"cookie_domain_var"`
}

// Updates controls how new code arrives.
type Updates struct {
	Enabled bool `yaml:"enabled"`
	// Strategy is git (pull and rebuild) or release (download assets).
	Strategy string `yaml:"strategy"`
	// Track decides what counts as "there is an update":
	//   release — a newer semver tag was pushed (the default, and what a
	//             customer machine should follow: an unreviewed commit on
	//             main never reaches them)
	//   branch  — any new commit on the tracked branch
	Track             string `yaml:"track"`
	CheckEveryMinutes int    `yaml:"check_every_minutes"`
	WindowStartHour   int    `yaml:"window_start_hour"`
	WindowEndHour     int    `yaml:"window_end_hour"`
	// AutoApply false means the panel only reports that an update is waiting.
	AutoApply bool `yaml:"auto_apply"`
}

// Monitoring is the developer-facing half of the panel.
type Monitoring struct {
	Enabled bool `yaml:"enabled"`
	// HubURL is the developer's collector, e.g. https://hub.example.com.
	HubURL string `yaml:"hub_url"`
	// Token authenticates this installation to the hub.
	Token string `yaml:"token"`
	// HeartbeatSeconds is how often metrics are posted.
	HeartbeatSeconds int `yaml:"heartbeat_seconds"`
	// ShipLogs sends log lines, not only errors and metrics.
	ShipLogs bool `yaml:"ship_logs"`
	// RemoteControl lets the hub queue restart, update and diagnostic commands.
	RemoteControl bool `yaml:"remote_control"`
	// AllowExec permits the hub to run the commands listed in ExecAllow.
	AllowExec bool     `yaml:"allow_exec"`
	ExecAllow []string `yaml:"exec_allow"`
}

// Auth describes how the panel authenticates to a private Git host.
type Auth struct {
	// Method is token (an HTTPS personal access token or a GitHub App
	// installation token), ssh (a deploy key already on the machine), or
	// none for a public repository.
	Method string `yaml:"method"`
	// Token is the credential itself. It is only ever written to the data
	// directory copy of this file, which is created with 0600 permissions;
	// the shipped definition should leave it empty and let the wizard, the
	// environment or the build-time default supply it.
	Token string `yaml:"token"`
	// TokenEnv names an environment variable to read the token from, which
	// is how a headless or scripted install avoids putting it in a file.
	TokenEnv string `yaml:"token_env"`
	// Prompt asks the operator for the token during setup when nothing else
	// supplied one.
	Prompt bool `yaml:"prompt"`
	// User is the HTTP basic username. GitHub ignores it for PATs, but
	// GitHub Apps require x-access-token and other hosts vary.
	User string `yaml:"user"`
}

// UsesToken reports whether Git commands need an Authorization header.
func (a Auth) UsesToken() bool { return a.Method == "token" }

// Primary returns the repository whose version labels the installation.
func (s Spec) Primary() Repo {
	for _, r := range s.Repos {
		if r.Primary {
			return r
		}
	}
	if len(s.Repos) > 0 {
		return s.Repos[0]
	}
	return Repo{}
}

// Repo looks a repository up by name.
func (s Spec) Repo(name string) (Repo, bool) {
	for _, r := range s.Repos {
		if r.Name == name {
			return r, true
		}
	}
	return Repo{}, false
}

// Service looks a service up by name.
func (s Spec) Service(name string) (Service, bool) {
	for _, sv := range s.Services {
		if sv.Name == name {
			return sv, true
		}
	}
	return Service{}, false
}

// NeedsDatabase reports whether a database has to be provisioned or supplied.
func (s Spec) NeedsDatabase() bool {
	return s.Database.Engine != "" && s.Database.Engine != "none"
}
