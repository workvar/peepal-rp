package appdef

import (
	"os"
	"testing"
)

// TestShippedDefinition is the guard that matters: the file we ship must
// parse and validate, or every customer install fails at the first screen.
func TestShippedDefinition(t *testing.T) {
	b, err := os.ReadFile("../../peepal.yml")
	if err != nil {
		t.Skip("peepal.yml not present")
	}
	spec, err := Parse(b)
	if err != nil {
		t.Fatalf("peepal.yml does not validate: %v", err)
	}
	if spec.App.Name != "peepal" {
		t.Errorf("app name = %q", spec.App.Name)
	}
	if len(spec.Services) != 2 {
		t.Errorf("want 2 services, got %d", len(spec.Services))
	}
	if !spec.NeedsDatabase() {
		t.Error("the ERP needs a database")
	}
}

func TestValidateRejectsMissingFallbackRoute(t *testing.T) {
	_, err := Parse([]byte(`
app: {name: demo}
repos: [{name: app, url: https://example.com/x.git}]
services:
  - {name: api, repo: app, run: ./api, port: 3001, routes: ["/api/"]}
`))
	if err == nil {
		t.Fatal("a definition with no \"/\" route should be rejected")
	}
}

func TestDefaultsFillIn(t *testing.T) {
	spec, err := Parse([]byte(`
app: {name: demo}
repos: [{name: app, url: https://example.com/x.git}]
services:
  - {name: web, repo: app, run: ./web, port: 3000, routes: ["/"]}
`))
	if err != nil {
		t.Fatal(err)
	}
	if spec.Repos[0].Branch != "main" {
		t.Errorf("branch default = %q", spec.Repos[0].Branch)
	}
	if spec.Routing.HTTPPort != 80 {
		t.Errorf("port default = %d", spec.Routing.HTTPPort)
	}
	if spec.App.DisplayName != "demo" {
		t.Errorf("display name default = %q", spec.App.DisplayName)
	}
}

func TestExpandFailsOnUnknownVariable(t *testing.T) {
	if _, err := Expand("{{.Nope}}", Vars{"Root": "/opt"}); err == nil {
		t.Fatal("an unknown variable must be an error, not an empty string")
	}
}

// TestShippedDefinitionIsWiredForTheRealRepo guards the two settings a
// customer install depends on and which are easy to lose in an edit.
func TestShippedDefinitionIsWiredForTheRealRepo(t *testing.T) {
	b, err := os.ReadFile("../../peepal.yml")
	if err != nil {
		t.Skip("peepal.yml not present")
	}
	spec, err := Parse(b)
	if err != nil {
		t.Fatal(err)
	}
	if spec.Primary().URL != "https://github.com/workvar/peepal-rp.git" {
		t.Errorf("repo url = %q", spec.Primary().URL)
	}
	if spec.Primary().Branch != "main" {
		t.Errorf("branch = %q, want main", spec.Primary().Branch)
	}
	if spec.Updates.Track != "release" {
		t.Errorf("track = %q; customers must follow tagged releases", spec.Updates.Track)
	}
	if !spec.Auth.UsesToken() {
		t.Error("the repository is private; auth.method must be token")
	}
	if spec.Auth.Token != "" {
		t.Error("the shipped definition must not carry a credential")
	}
	// Service commands must point at the checkout directory the repo declares.
	for _, sv := range spec.Services {
		if sv.Run[0] == '{' && !contains(sv.Run, spec.Primary().Dir) {
			t.Errorf("service %q runs %q, which does not match repo dir %q",
				sv.Name, sv.Run, spec.Primary().Dir)
		}
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
