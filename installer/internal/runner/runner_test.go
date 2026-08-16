package runner

import (
	"context"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/envfile"
	"github.com/peepal/installer/internal/workspace"
)

// TestSupervisesAndReportsHealth runs a real child process end to end: the
// runner has to expand the command, find the binary, pass the port through
// the environment and then agree with itself about whether it is up.
func TestSupervisesAndReportsHealth(t *testing.T) {
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 is not available")
	}
	root := t.TempDir()
	layout := workspace.New(root)
	if err := layout.EnsureDirs(); err != nil {
		t.Fatal(err)
	}
	// The runner runs services from their repository directory.
	svcDir := filepath.Join(layout.Src(), "app")
	if err := os.MkdirAll(svcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(svcDir, "index.html"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	port := freePort(t)
	spec := appdef.Spec{
		App:   appdef.App{Name: "demo"},
		Repos: []appdef.Repo{{Name: "app", Dir: "app"}},
		Services: []appdef.Service{{
			Name: "web", Repo: "app", Port: port, Routes: []string{"/"},
			Run: "python3 -m http.server {{.WebPort}} --bind 127.0.0.1",
		}},
	}
	r := New(&Runner{
		Spec: spec, Layout: layout,
		Vars: appdef.Vars{"WebPort": itoa(port)},
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	r.Group.Start(ctx)
	t.Cleanup(func() { r.Group.StopAll(5 * time.Second) })

	if !r.Healthy(ctx, 20*time.Second) {
		t.Fatal("the service never became healthy")
	}
	checks := r.Check(ctx)
	if len(checks) != 1 || !checks[0].Running || !checks[0].Healthy {
		t.Fatalf("Check() = %+v", checks)
	}

	// Stopping the app must actually stop it, or an update would swap files
	// under a running process.
	r.Group.StopApp(r.AppProcesses(), 5*time.Second)
	if portOpen(port) {
		t.Error("the port is still open after StopApp")
	}
}

// TestEnvironmentMergesFileAndPort proves the env file, the service's own
// additions and the port variable all reach the child.
func TestEnvironmentMergesFileAndPort(t *testing.T) {
	root := t.TempDir()
	layout := workspace.New(root)
	if err := layout.EnsureDirs(); err != nil {
		t.Fatal(err)
	}
	if err := envfile.Write(layout.EnvFile("api"), envfile.Vars{"FROM_FILE": "yes"}); err != nil {
		t.Fatal(err)
	}
	spec := appdef.Spec{
		Repos: []appdef.Repo{{Name: "app", Dir: "app"}},
		Services: []appdef.Service{{
			Name: "api", Repo: "app", Port: 4321, PortVar: "APP_PORT", Run: "true",
			Env: map[string]string{"FROM_SPEC": "{{.AppName}}"},
		}},
	}
	r := New(&Runner{Spec: spec, Layout: layout, Vars: appdef.Vars{"AppName": "demo"}})
	env := r.environment(spec.Services[0])

	if env["FROM_FILE"] != "yes" {
		t.Error("the persisted env file was not merged")
	}
	if env["FROM_SPEC"] != "demo" {
		t.Errorf("FROM_SPEC = %q, want the expanded template", env["FROM_SPEC"])
	}
	if env["APP_PORT"] != "4321" {
		t.Errorf("APP_PORT = %q", env["APP_PORT"])
	}
}

func freePort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return ln.Addr().(*net.TCPAddr).Port
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [8]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
