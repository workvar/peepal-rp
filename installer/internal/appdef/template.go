package appdef

import (
	"bytes"
	"fmt"
	"text/template"
)

// Vars are the values a definition may reference with {{.Name}}.
// They are produced during setup and stay fixed for the life of an install.
type Vars map[string]string

// Well-known variable names. A definition may use any of these.
const (
	VarRoot       = "Root"        // install root
	VarData       = "Data"        // mutable data directory
	VarSrc        = "Src"         // where the repositories are checked out
	VarDatabase   = "DatabaseURL" // resolved connection string
	VarPublicURL  = "PublicURL"   // http://localhost:80 or https://erp.example.com
	VarDomain     = "Domain"      // empty in local mode
	VarHTTPPort   = "HTTPPort"
	VarUploads    = "Uploads"
	VarAppName    = "AppName"
	VarPlatform   = "Platform" // linux, windows, darwin
	VarNodeBin    = "NodeBin"
	VarGoBin      = "GoBin"
	VarServiceUsr = "ServiceUser"
	// VarExe is ".exe" on Windows and empty elsewhere, so one definition can
	// name a compiled binary on every platform.
	VarExe = "Exe"
)

// Expand renders one template string. Unknown keys are an error rather than
// an empty string, because a silently empty JWT secret is worse than a
// failed install.
func Expand(s string, v Vars) (string, error) {
	if s == "" {
		return "", nil
	}
	t, err := template.New("v").Option("missingkey=error").Parse(s)
	if err != nil {
		return "", fmt.Errorf("bad template %q: %w", s, err)
	}
	var out bytes.Buffer
	if err := t.Execute(&out, v); err != nil {
		return "", fmt.Errorf("cannot expand %q: %w", s, err)
	}
	return out.String(), nil
}

// ExpandMap renders every value in a map.
func ExpandMap(m map[string]string, v Vars) (map[string]string, error) {
	if len(m) == 0 {
		return nil, nil
	}
	out := make(map[string]string, len(m))
	for k, val := range m {
		e, err := Expand(val, v)
		if err != nil {
			return nil, err
		}
		out[k] = e
	}
	return out, nil
}

// Set stores a value, creating the map if needed.
func (v *Vars) Set(key, value string) {
	if *v == nil {
		*v = Vars{}
	}
	(*v)[key] = value
}
