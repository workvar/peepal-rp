// Package envexample parses backend/.env.example into typed variables for the
// interactive install walkthrough.
package envexample

import (
	"bufio"
	"io"
	"strings"
)

// Var is one KEY=value entry from .env.example with classification flags.
type Var struct {
	Key, Default, Comment string
	Required, Secret, Optional bool
}

var alwaysRequired = map[string]struct{}{
	"JWT_SECRET":           {},
	"DB_PATH":              {},
	"SUPER_ADMIN_EMAIL":    {},
	"SUPER_ADMIN_PASSWORD": {},
}

// Parse reads KEY=value lines from r, attaching preceding # comments to each
// key and classifying required / optional / secret.
func Parse(r io.Reader) ([]Var, error) {
	sc := bufio.NewScanner(r)
	var (
		pending []string
		out     []Var
	)
	for sc.Scan() {
		line := strings.TrimRight(sc.Text(), "\r")
		trimmed := strings.TrimSpace(line)
		switch {
		case trimmed == "":
			pending = nil
		case strings.HasPrefix(trimmed, "#"):
			pending = append(pending, strings.TrimSpace(strings.TrimPrefix(trimmed, "#")))
		default:
			key, val, ok := strings.Cut(trimmed, "=")
			if !ok {
				pending = nil
				continue
			}
			key = strings.TrimSpace(key)
			if key == "" {
				pending = nil
				continue
			}
			val = strings.Trim(strings.TrimSpace(val), `"`)
			comment := strings.Join(pending, " ")
			pending = nil
			out = append(out, classify(key, val, comment))
		}
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func classify(key, def, comment string) Var {
	v := Var{Key: key, Default: def, Comment: comment}

	upper := strings.ToUpper(key)
	if strings.Contains(upper, "SECRET") ||
		strings.Contains(upper, "PASSWORD") ||
		strings.Contains(upper, "TOKEN") {
		v.Secret = true
	}

	if def == "" && strings.Contains(strings.ToLower(comment), "required") {
		v.Required = true
	}
	if _, ok := alwaysRequired[key]; ok {
		v.Required = true
	}

	if !v.Required {
		v.Optional = true
	}
	return v
}
