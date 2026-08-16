// Package telemetry is the outbound half of the monitoring story: the panel
// posts heartbeats, log lines and crashes to the developer's hub. Everything
// is outbound HTTPS, so no port has to be opened on the customer's network.
package telemetry

import "time"

// Kind classifies one event.
type Kind string

const (
	Heartbeat Kind = "heartbeat" // periodic metrics, always sent
	Log       Kind = "log"       // a batch of log lines
	Error     Kind = "error"     // a crash, a failed update, a failed build
	Lifecycle Kind = "lifecycle" // installed, started, stopped, updated
)

// Event is one message on the wire.
type Event struct {
	Kind      Kind              `json:"kind"`
	At        time.Time         `json:"at"`
	App       string            `json:"app"`
	InstallID string            `json:"install_id"`
	Version   string            `json:"version"`
	Message   string            `json:"message,omitempty"`
	Lines     []string          `json:"lines,omitempty"`
	Metrics   *Metrics          `json:"metrics,omitempty"`
	Labels    map[string]string `json:"labels,omitempty"`
}

// Metrics is the snapshot a heartbeat carries.
type Metrics struct {
	Mode          string            `json:"mode"`
	UptimeSeconds int64             `json:"uptime_seconds"`
	CPUPercent    float64           `json:"cpu_percent"`
	MemUsedBytes  uint64            `json:"mem_used_bytes"`
	MemTotalBytes uint64            `json:"mem_total_bytes"`
	DiskFreeBytes uint64            `json:"disk_free_bytes"`
	Services      []ServiceMetric   `json:"services"`
	Commits       map[string]string `json:"commits,omitempty"`
}

// ServiceMetric is one supervised process in a heartbeat.
type ServiceMetric struct {
	Name    string `json:"name"`
	Running bool   `json:"running"`
	Healthy bool   `json:"healthy"`
	Port    int    `json:"port"`
}

// Ack is the hub's reply. Commands ride back on the heartbeat response, which
// is what makes remote control work without an inbound connection.
type Ack struct {
	OK       bool      `json:"ok"`
	Commands []Command `json:"commands,omitempty"`
}

// Command is one instruction from the hub.
type Command struct {
	ID   string            `json:"id"`
	Name string            `json:"name"`
	Args map[string]string `json:"args,omitempty"`
}

// Result is the panel's reply to a command.
type Result struct {
	ID      string `json:"id"`
	OK      bool   `json:"ok"`
	Output  string `json:"output,omitempty"`
	Error   string `json:"error,omitempty"`
	Elapsed string `json:"elapsed,omitempty"`
}
