package envplan

import (
	"testing"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/envfile"
)

func demoSpec() appdef.Spec {
	s, err := appdef.Parse([]byte(`
app: {name: demo}
repos: [{name: app, url: https://example.com/x.git}]
env:
  - {key: JWT_SECRET, secret: true, target: api}
  - {key: UPLOAD_DIR, value: "{{.Uploads}}", target: api}
  - {key: ADMIN_EMAIL, prompt: Administrator email}
  - {key: NODE_ENV, value: production, target: web}
services:
  - {name: api, repo: app, run: ./api, port: 3001, routes: ["/api/"]}
  - {name: web, repo: app, run: ./web, port: 3000, routes: ["/"]}
`))
	if err != nil {
		panic(err)
	}
	return s
}

func build(t *testing.T, in Input) Plan {
	t.Helper()
	p, err := Build(in)
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func TestSecretsSurviveAnUpdate(t *testing.T) {
	// Regenerating JWT_SECRET on every rebuild would log every user out.
	in := Input{Spec: demoSpec(), Vars: appdef.Vars{"Uploads": "/var/lib/demo/uploads"},
		Answers:  map[string]string{"ADMIN_EMAIL": "a@b.edu"},
		Existing: envfile.Vars{"JWT_SECRET": "kept-from-last-time"}}
	p := build(t, in)
	if got := p.For("api")["JWT_SECRET"]; got != "kept-from-last-time" {
		t.Errorf("JWT_SECRET = %q, want the existing value", got)
	}
}

func TestSecretIsGeneratedWhenAbsent(t *testing.T) {
	p := build(t, Input{Spec: demoSpec(), Vars: appdef.Vars{"Uploads": "/u"},
		Answers: map[string]string{"ADMIN_EMAIL": "a@b.edu"}})
	if len(p.For("api")["JWT_SECRET"]) < 20 {
		t.Error("a missing secret should be generated")
	}
}

func TestTargetingSplitsTheFiles(t *testing.T) {
	p := build(t, Input{Spec: demoSpec(), Vars: appdef.Vars{"Uploads": "/u"},
		Answers: map[string]string{"ADMIN_EMAIL": "a@b.edu"}})
	api, web := p.For("api"), p.For("web")
	if _, ok := web["JWT_SECRET"]; ok {
		t.Error("the backend secret must not reach the frontend")
	}
	if _, ok := api["NODE_ENV"]; ok {
		t.Error("NODE_ENV is targeted at the frontend only")
	}
	// Untargeted entries go everywhere.
	if api["ADMIN_EMAIL"] == "" || web["ADMIN_EMAIL"] == "" {
		t.Error("an untargeted variable belongs in every file")
	}
}

func TestMissingPromptIsReported(t *testing.T) {
	p := build(t, Input{Spec: demoSpec(), Vars: appdef.Vars{"Uploads": "/u"}})
	missing := p.Missing()
	if len(missing) != 1 || missing[0] != "ADMIN_EMAIL" {
		t.Errorf("Missing() = %v, want [ADMIN_EMAIL]", missing)
	}
}

func TestComputedExtrasAreWrittenEvenIfUndeclared(t *testing.T) {
	p := build(t, Input{Spec: demoSpec(), Vars: appdef.Vars{"Uploads": "/u"},
		Answers: map[string]string{"ADMIN_EMAIL": "a@b.edu"},
		Extra:   map[string]string{"DB_PATH": "postgres://u:p@h/db"}})
	if p.For("api")["DB_PATH"] == "" {
		t.Error("a computed database URL must never be silently dropped")
	}
}
