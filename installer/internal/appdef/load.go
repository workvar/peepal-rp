package appdef

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"gopkg.in/yaml.v3"
)

// FileName is the conventional name of the definition next to the panel
// binary or inside the data directory.
const FileName = "app.yml"

// Load reads and validates a definition file.
func Load(path string) (Spec, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return Spec{}, err
	}
	return Parse(b)
}

// Parse reads a definition from memory, applies defaults and validates it.
func Parse(b []byte) (Spec, error) {
	var s Spec
	if err := yaml.Unmarshal(b, &s); err != nil {
		return s, fmt.Errorf("invalid app definition: %w", err)
	}
	s.applyDefaults()
	return s, s.Validate()
}

// Save writes a definition back out, which is how the panel persists the
// operator's answers (domain, ports, hub token) for the next run.
func Save(path string, s Spec) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	b, err := yaml.Marshal(s)
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// Discover looks for a definition in the usual places: an explicit path, the
// data directory, then next to the running executable.
func Discover(explicit, dataDir string) (string, error) {
	candidates := []string{}
	if explicit != "" {
		candidates = append(candidates, explicit)
	}
	if dataDir != "" {
		candidates = append(candidates, filepath.Join(dataDir, FileName))
	}
	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(dir, FileName),
			filepath.Join(dir, "..", "share", FileName),
		)
	}
	candidates = append(candidates, FileName)
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c, nil
		}
	}
	return "", fmt.Errorf("no %s found; pass -config with the path to one", FileName)
}

// Validate reports the mistakes that would otherwise surface halfway through
// an install, when half the machine is already changed.
func (s *Spec) Validate() error {
	if s.App.Name == "" {
		return fmt.Errorf("app.name is required")
	}
	if len(s.Repos) == 0 {
		return fmt.Errorf("at least one repo is required")
	}
	for _, r := range s.Repos {
		if r.URL == "" {
			return fmt.Errorf("repo %q has no url", r.Name)
		}
	}
	for _, st := range s.Build {
		if _, ok := s.Repo(st.Repo); !ok {
			return fmt.Errorf("build step %q references unknown repo %q", st.Name, st.Repo)
		}
	}
	seenRoot := false
	for _, sv := range s.Services {
		if sv.Run == "" {
			return fmt.Errorf("service %q has no run command", sv.Name)
		}
		if _, ok := s.Repo(sv.Repo); sv.Repo != "" && !ok {
			return fmt.Errorf("service %q references unknown repo %q", sv.Name, sv.Repo)
		}
		for _, route := range sv.Routes {
			if route == "/" {
				seenRoot = true
			}
		}
	}
	if len(s.Services) > 0 && !seenRoot {
		return fmt.Errorf(`no service claims the "/" route; one of them must be the fallback`)
	}
	if s.NeedsDatabase() && s.Database.URLVar == "" {
		return fmt.Errorf("database.url_var is required when a database is configured")
	}
	switch s.Updates.Track {
	case "", "release", "branch", "prerelease":
	default:
		return fmt.Errorf("updates.track must be release, branch or prerelease, not %q", s.Updates.Track)
	}
	switch s.Auth.Method {
	case "", "none", "token", "ssh":
	default:
		return fmt.Errorf("auth.method must be none, token or ssh, not %q", s.Auth.Method)
	}
	return nil
}

// applyDefaults fills in everything the author is allowed to leave out.
func (s *Spec) applyDefaults() {
	if s.App.DisplayName == "" {
		s.App.DisplayName = s.App.Name
	}
	if s.Routing.HTTPPort == 0 {
		s.Routing.HTTPPort = 80
	}
	if s.Routing.Mode == "" {
		s.Routing.Mode = "local"
	}
	if s.Updates.CheckEveryMinutes == 0 {
		s.Updates.CheckEveryMinutes = 60
	}
	if s.Updates.Strategy == "" {
		s.Updates.Strategy = "git"
	}
	if s.Updates.Track == "" {
		// A customer machine follows releases unless told otherwise: an
		// unreviewed commit on main should never reach one.
		s.Updates.Track = "release"
	}
	if s.Auth.Method == "" {
		s.Auth.Method = "none"
	}
	if s.Auth.UsesToken() && s.Auth.User == "" {
		s.Auth.User = "x-access-token"
	}
	if s.Monitoring.HeartbeatSeconds == 0 {
		s.Monitoring.HeartbeatSeconds = 60
	}
	if s.NeedsDatabase() {
		if s.Database.Name == "" {
			s.Database.Name = s.App.Name
		}
		if s.Database.User == "" {
			s.Database.User = s.App.Name
		}
		if s.Database.Port == 0 {
			s.Database.Port = 5433
		}
	}
	for i := range s.Repos {
		if s.Repos[i].Branch == "" {
			s.Repos[i].Branch = "main"
		}
		if s.Repos[i].Dir == "" {
			s.Repos[i].Dir = s.Repos[i].Name
		}
	}
	for i := range s.Toolchain {
		if s.Toolchain[i].Command == "" {
			s.Toolchain[i].Command = s.Toolchain[i].Name
		}
	}
	for i := range s.Build {
		if s.Build[i].TimeoutMinutes == 0 {
			s.Build[i].TimeoutMinutes = 20
		}
	}
	for i := range s.Env {
		if s.Env[i].Secret && s.Env[i].SecretBytes == 0 {
			s.Env[i].SecretBytes = 32
		}
	}
}

// StepApplies reports whether a build step should run on this machine.
func StepApplies(st Step) bool {
	if len(st.OS) == 0 {
		return true
	}
	for _, o := range st.OS {
		if o == runtime.GOOS {
			return true
		}
	}
	return false
}
