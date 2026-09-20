package envexample

import (
	"fmt"

	"github.com/peepal/installer/internal/envfile"
)

// AskFunc obtains a value for one variable. For Secret vars, returning an
// empty string with a nil error means "generate a random secret".
type AskFunc func(v Var) (string, error)

// installerInjected keys are set by the installer after Walk; never prompt.
var installerInjected = map[string]struct{}{
	"PEEPAL_AGENT_TOKEN": {},
	"PEEPAL_AGENT_URL":   {},
	"PORT":               {},
	"DB_PATH":            {},
	"APP_ENV":            {},
}

// Walk builds envfile.Vars from parsed example vars.
//
// When existing is empty, every non-injected var is prompted.
// When existing is set, all existing values are copied through and only new
// required keys missing from existing are prompted.
func Walk(vars []Var, existing envfile.Vars, ask AskFunc) (envfile.Vars, error) {
	out := envfile.Vars{}
	hasExisting := len(existing) > 0
	if hasExisting {
		for k, v := range existing {
			out[k] = v
		}
	}

	for _, v := range vars {
		if _, skip := installerInjected[v.Key]; skip {
			continue
		}
		if hasExisting {
			if _, ok := existing[v.Key]; ok {
				continue
			}
			if !v.Required {
				if v.Default != "" {
					out[v.Key] = v.Default
				}
				continue
			}
		}

		val, err := ask(v)
		if err != nil {
			return nil, err
		}
		if val == "" && v.Secret {
			val = envfile.Secret(32)
		}
		if val == "" && v.Required {
			return nil, fmt.Errorf("%s is required", v.Key)
		}
		if val == "" && v.Default != "" {
			val = v.Default
		}
		if val != "" {
			out[v.Key] = val
		}
	}
	return out, nil
}

// IsInstallerInjected reports whether key is owned by the installer.
func IsInstallerInjected(key string) bool {
	_, ok := installerInjected[key]
	return ok
}
