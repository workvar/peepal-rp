package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/peepal/installer/internal/download"
)

// DefaultURL is where the backend expects the daemon (OLLAMA_URL).
const DefaultURL = "http://127.0.0.1:11434"

// Installed reports the path of an existing ollama binary.
func Installed() (string, bool) {
	p, err := exec.LookPath("ollama")
	return p, err == nil
}

// Running probes the daemon's HTTP API.
func Running(ctx context.Context, url string) bool {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url+"/api/tags", nil)
	if err != nil {
		return false
	}
	c := &http.Client{Timeout: 3 * time.Second}
	resp, err := c.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// Install puts Ollama on the machine using the vendor's own installers, which
// also register its background service. Returns true when we installed it (as
// opposed to finding an existing copy the customer manages themselves).
func Install(ctx context.Context, cacheDir string, log func(string, ...any)) (bool, error) {
	if _, ok := Installed(); ok {
		log("Ollama is already installed; leaving it as the customer configured it.")
		return false, nil
	}
	switch runtime.GOOS {
	case "linux":
		log("Running the official Ollama install script...")
		cmd := exec.CommandContext(ctx, "sh", "-c", "curl -fsSL https://ollama.com/install.sh | sh")
		cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
		return true, cmd.Run()
	case "darwin":
		if _, ok := sysWhich("brew"); ok {
			log("Installing Ollama with Homebrew...")
			cmd := exec.CommandContext(ctx, "brew", "install", "--cask", "ollama")
			cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
			return true, cmd.Run()
		}
		return false, fmt.Errorf("Homebrew is not installed; download Ollama from https://ollama.com/download and re-run with AI enabled")
	case "windows":
		log("Downloading the Ollama installer...")
		dest := cacheDir + `\OllamaSetup.exe`
		if err := download.ToFile(ctx, download.Options{URL: "https://ollama.com/download/OllamaSetup.exe", Dest: dest}); err != nil {
			return false, err
		}
		log("Running the Ollama installer silently...")
		return true, exec.CommandContext(ctx, dest, "/VERYSILENT", "/NORESTART").Run()
	}
	return false, fmt.Errorf("unsupported platform for automatic Ollama install: %s", runtime.GOOS)
}

// Pull downloads a model, streaming Ollama's progress lines to log.
func Pull(ctx context.Context, model string, log func(string, ...any)) error {
	bin, ok := Installed()
	if !ok {
		return fmt.Errorf("ollama is not on PATH after installation; open a new terminal and re-run")
	}
	log("Pulling %s (this can take several minutes on a slow link)...", model)
	cmd := exec.CommandContext(ctx, bin, "pull", model)
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	return cmd.Run()
}

// HasModel asks the daemon whether a tag is already present, so re-running the
// installer does not re-download several gigabytes.
func HasModel(ctx context.Context, url, model string) bool {
	body, err := download.Bytes(ctx, url+"/api/tags", nil)
	if err != nil {
		return false
	}
	var payload struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if json.Unmarshal(body, &payload) != nil {
		return false
	}
	for _, m := range payload.Models {
		if m.Name == model || strings.HasPrefix(m.Name, model+":") {
			return true
		}
	}
	return false
}

// WaitReady blocks until the daemon answers or the deadline passes.
func WaitReady(ctx context.Context, url string, d time.Duration) bool {
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if Running(ctx, url) {
			return true
		}
		time.Sleep(2 * time.Second)
	}
	return false
}

func sysWhich(name string) (string, bool) {
	p, err := exec.LookPath(name)
	return p, err == nil
}
