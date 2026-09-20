package envexample

import (
	"strings"
	"testing"

	"github.com/peepal/installer/internal/envfile"
)

const sampleExample = `
PORT=3001
APP_ENV=development

# Generate with: openssl rand -base64 48  (min 32 chars, required)
JWT_SECRET=

# PostgreSQL connection string
DB_PATH=postgres://USER:PASSWORD@localhost:5432/DBNAME?sslmode=disable

# Seeded on first run. Required; the default placeholder is rejected.
SUPER_ADMIN_EMAIL=superadmin@platform.com
SUPER_ADMIN_PASSWORD=

# Comma-separated allowlist of frontend origins
CORS_ORIGINS=http://localhost:3000

COOKIE_DOMAIN=

# Installer-managed on on-prem installs (optional for local dev)
PEEPAL_AGENT_URL=http://127.0.0.1:9080
PEEPAL_AGENT_TOKEN=
`

func TestParseClassification(t *testing.T) {
	vars, err := Parse(strings.NewReader(sampleExample))
	if err != nil {
		t.Fatal(err)
	}
	byKey := map[string]Var{}
	for _, v := range vars {
		byKey[v.Key] = v
	}

	cases := []struct {
		key                string
		required, secret, optional bool
		def                string
		commentContains    string
	}{
		{"JWT_SECRET", true, true, false, "", "required"},
		{"DB_PATH", true, false, false, "postgres://USER:PASSWORD@localhost:5432/DBNAME?sslmode=disable", ""},
		{"SUPER_ADMIN_EMAIL", true, false, false, "superadmin@platform.com", "Required"},
		{"SUPER_ADMIN_PASSWORD", true, true, false, "", ""},
		{"CORS_ORIGINS", false, false, true, "http://localhost:3000", ""},
		{"COOKIE_DOMAIN", false, false, true, "", ""},
		{"PORT", false, false, true, "3001", ""},
		{"PEEPAL_AGENT_TOKEN", false, true, true, "", ""},
		{"ACCESS_TOKEN_TTL", false, true, true, "", ""}, // not in sample; skip if absent
	}

	for _, tc := range cases {
		v, ok := byKey[tc.key]
		if !ok {
			if tc.key == "ACCESS_TOKEN_TTL" {
				continue
			}
			t.Fatalf("missing key %s", tc.key)
		}
		if v.Required != tc.required {
			t.Errorf("%s Required=%v want %v", tc.key, v.Required, tc.required)
		}
		if v.Secret != tc.secret {
			t.Errorf("%s Secret=%v want %v", tc.key, v.Secret, tc.secret)
		}
		if v.Optional != tc.optional {
			t.Errorf("%s Optional=%v want %v", tc.key, v.Optional, tc.optional)
		}
		if tc.def != "" && v.Default != tc.def {
			t.Errorf("%s Default=%q want %q", tc.key, v.Default, tc.def)
		}
		if tc.commentContains != "" && !strings.Contains(v.Comment, tc.commentContains) {
			t.Errorf("%s Comment=%q missing %q", tc.key, v.Comment, tc.commentContains)
		}
	}
}

func TestWalkFirstInstallPromptsAll(t *testing.T) {
	vars, err := Parse(strings.NewReader(sampleExample))
	if err != nil {
		t.Fatal(err)
	}
	asked := map[string]int{}
	out, err := Walk(vars, nil, func(v Var) (string, error) {
		asked[v.Key]++
		if v.Secret {
			return "", nil // generate
		}
		if v.Default != "" {
			return v.Default, nil
		}
		return "user-value", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	// Injected keys must not be prompted.
	for _, k := range []string{"PEEPAL_AGENT_TOKEN", "PEEPAL_AGENT_URL", "PORT", "DB_PATH", "APP_ENV"} {
		if asked[k] != 0 {
			t.Errorf("prompted injected key %s", k)
		}
		if _, ok := out[k]; ok {
			t.Errorf("Walk should not set injected key %s", k)
		}
	}
	if asked["JWT_SECRET"] != 1 {
		t.Errorf("JWT_SECRET asked=%d", asked["JWT_SECRET"])
	}
	if out["JWT_SECRET"] == "" {
		t.Error("expected generated JWT_SECRET")
	}
	if out["CORS_ORIGINS"] != "http://localhost:3000" {
		t.Errorf("CORS_ORIGINS=%q", out["CORS_ORIGINS"])
	}
}

func TestWalkExistingOnlyNewRequired(t *testing.T) {
	vars, err := Parse(strings.NewReader(sampleExample + "\n# brand new required secret\nNEW_API_SECRET=\n"))
	if err != nil {
		t.Fatal(err)
	}
	existing := envfile.Vars{
		"JWT_SECRET":           "keep-me",
		"DB_PATH":              "postgres://old",
		"SUPER_ADMIN_EMAIL":    "a@b.c",
		"SUPER_ADMIN_PASSWORD": "secret",
		"CORS_ORIGINS":         "http://old",
	}
	asked := map[string]int{}
	out, err := Walk(vars, existing, func(v Var) (string, error) {
		asked[v.Key]++
		return "new-secret-value", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if out["JWT_SECRET"] != "keep-me" {
		t.Errorf("rotated JWT_SECRET: %q", out["JWT_SECRET"])
	}
	if asked["JWT_SECRET"] != 0 {
		t.Error("should not re-prompt existing JWT_SECRET")
	}
	if asked["NEW_API_SECRET"] != 1 {
		t.Errorf("NEW_API_SECRET asked=%d want 1", asked["NEW_API_SECRET"])
	}
	if out["NEW_API_SECRET"] != "new-secret-value" {
		t.Errorf("NEW_API_SECRET=%q", out["NEW_API_SECRET"])
	}
	// New optional with default should be filled without prompt.
	if asked["COOKIE_DOMAIN"] != 0 {
		t.Error("should not prompt for new optional COOKIE_DOMAIN")
	}
}
