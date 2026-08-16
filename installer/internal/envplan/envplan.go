// Package envplan turns the definition's env list, the operator's answers and
// the resolved database and routing into concrete .env files. Every entry a
// definition declares is written out, so an operator can open one file and
// see the whole configuration rather than guessing which variables exist.
package envplan

import (
	"fmt"
	"sort"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/workspace"
)

// Entry is one resolved variable, as the panel displays it.
type Entry struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Secret  bool   `json:"secret"`
	Target  string `json:"target"`
	Comment string `json:"comment"`
	// Prompt is non-empty when the operator supplied (or must supply) it.
	Prompt string `json:"prompt"`
}

// Plan is the full environment across all services.
type Plan struct {
	Entries []Entry `json:"entries"`
}

// Input is everything that feeds the environment.
type Input struct {
	Spec appdef.Spec
	Vars appdef.Vars
	// Answers holds values the operator typed for prompted variables.
	Answers map[string]string
	// Extra holds values computed by the panel: database URL, public URL,
	// cookie domain, service ports.
	Extra map[string]string
	// Existing preserves values from a previous install so an update never
	// rotates a JWT secret and logs everyone out.
	Existing envfile.Vars
}

// Build resolves every declared variable. Precedence, highest first: the
// operator's answer, a previously saved value, the computed extras, the
// definition's template, then a freshly generated secret.
func Build(in Input) (Plan, error) {
	var p Plan
	for _, ev := range in.Spec.Env {
		e := Entry{Key: ev.Key, Secret: ev.Secret, Target: ev.Target,
			Comment: ev.Comment, Prompt: ev.Prompt}
		switch {
		case in.Answers[ev.Key] != "":
			e.Value = in.Answers[ev.Key]
		case ev.Secret && in.Existing[ev.Key] != "":
			e.Value = in.Existing[ev.Key]
		case in.Extra[ev.Key] != "":
			e.Value = in.Extra[ev.Key]
		case ev.Value != "":
			v, err := appdef.Expand(ev.Value, in.Vars)
			if err != nil {
				return p, err
			}
			e.Value = v
		case ev.Secret:
			e.Value = envfile.Secret(ev.SecretBytes)
		case in.Existing[ev.Key] != "":
			e.Value = in.Existing[ev.Key]
		}
		p.Entries = append(p.Entries, e)
	}
	// Extras that the definition did not declare are still written, so a
	// computed DATABASE_URL is never silently dropped.
	for k, v := range in.Extra {
		if p.has(k) {
			continue
		}
		p.Entries = append(p.Entries, Entry{Key: k, Value: v, Secret: isSecretName(k)})
	}
	sort.Slice(p.Entries, func(i, j int) bool { return p.Entries[i].Key < p.Entries[j].Key })
	return p, nil
}

// Missing lists prompted variables the operator has not answered yet, so the
// wizard can refuse to continue before anything is written to disk.
func (p Plan) Missing() []string {
	var out []string
	for _, e := range p.Entries {
		if e.Prompt != "" && e.Value == "" {
			out = append(out, e.Key)
		}
	}
	return out
}

// For returns the variables that belong in one service's env file: the
// service's own entries plus every untargeted one.
func (p Plan) For(service string) envfile.Vars {
	v := envfile.Vars{}
	for _, e := range p.Entries {
		if e.Target == "" || e.Target == service {
			v[e.Key] = e.Value
		}
	}
	return v
}

// Write renders one env file per service under the data directory.
func (p Plan) Write(l workspace.Layout, spec appdef.Spec) error {
	for _, sv := range spec.Services {
		if err := envfile.Write(l.EnvFile(sv.Name), p.For(sv.Name)); err != nil {
			return fmt.Errorf("writing the %s environment: %w", sv.Name, err)
		}
	}
	return nil
}

func (p Plan) has(key string) bool {
	for _, e := range p.Entries {
		if e.Key == key {
			return true
		}
	}
	return false
}

// isSecretName hides the obvious ones in the UI even when the definition
// forgot to mark them.
func isSecretName(k string) bool {
	for _, needle := range []string{"SECRET", "PASSWORD", "TOKEN", "KEY", "DSN", "DATABASE_URL"} {
		if contains(k, needle) {
			return true
		}
	}
	return false
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
