// Package appconfig is the installer's handoff to the agent: everything the
// supervisor needs to run the stack lives in one JSON file.
package appconfig

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Config is written by the installer and read by the agent on every start.
type Config struct {
	InstallRoot string `json:"install_root"`

	// HTTPPort is the single port clients browse to; the agent proxies from
	// here to the frontend and backend.
	HTTPPort int `json:"http_port"`
	// BackendPort and FrontendPort are loopback-only.
	BackendPort  int `json:"backend_port"`
	FrontendPort int `json:"frontend_port"`
	PostgresPort int `json:"postgres_port"`

	DBName     string `json:"db_name"`
	DBUser     string `json:"db_user"`
	DBPassword string `json:"db_password"`

	// AI holds the optional local-LLM configuration.
	AI AIConfig `json:"ai"`

	// AgentToken authenticates the backend to the agent's loopback control API.
	AgentToken string `json:"agent_token"`

	// Updates controls the GitHub polling behaviour.
	Updates UpdateConfig `json:"updates"`
}

// AIConfig describes the Ask PeepalAI local model setup.
type AIConfig struct {
	Enabled bool   `json:"enabled"`
	URL     string `json:"url"`
	Model   string `json:"model"`
	// Managed means the installer installed Ollama and the agent should keep
	// it running; false when the machine already had its own Ollama.
	Managed bool `json:"managed"`
}

// UpdateConfig controls automatic updates from the two private repos.
type UpdateConfig struct {
	Enabled      bool   `json:"enabled"`
	BackendRepo  string `json:"backend_repo"`
	FrontendRepo string `json:"frontend_repo"`
	Channel      string `json:"channel"`
	// CheckEveryMinutes is how often the agent asks GitHub for a newer tag.
	CheckEveryMinutes int `json:"check_every_minutes"`
	// Window restricts installs to a quiet period, e.g. 2 -> 5 means updates
	// only apply between 02:00 and 05:00 local time. Equal values disable it.
	WindowStartHour int `json:"window_start_hour"`
	WindowEndHour   int `json:"window_end_hour"`
}

// Default returns a config with sensible ports that avoid clashing with an
// existing Postgres (5432) or dev server.
func Default(root string) Config {
	return Config{
		InstallRoot:  root,
		HTTPPort:     80,
		BackendPort:  3001,
		FrontendPort: 3000,
		PostgresPort: 5433,
		DBName:       "peepal",
		DBUser:       "peepal",
		Updates: UpdateConfig{
			Enabled:           true,
			Channel:           "stable",
			CheckEveryMinutes: 60,
		},
	}
}

// Load reads a config file.
func Load(path string) (Config, error) {
	var c Config
	b, err := os.ReadFile(path)
	if err != nil {
		return c, err
	}
	return c, json.Unmarshal(b, &c)
}

// Save writes the config atomically with owner-only permissions, since it
// carries the database password.
func Save(path string, c Config) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// DSN builds the Postgres connection string the backend expects in DB_PATH.
func (c Config) DSN() string {
	return "postgres://" + c.DBUser + ":" + c.DBPassword +
		"@127.0.0.1:" + itoa(c.PostgresPort) + "/" + c.DBName + "?sslmode=disable"
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
