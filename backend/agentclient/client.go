// Package agentclient talks to the peepal-agent loopback control API.
package agentclient

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Status mirrors agentctl.StatusResponse JSON field names.
type Status struct {
	InstalledBackend  string `json:"installed_backend"`
	InstalledFrontend string `json:"installed_frontend"`
	AvailableBackend  string `json:"available_backend"`
	AvailableFrontend string `json:"available_frontend"`
	UpdateAvailable   bool   `json:"update_available"`
	AutoApply         bool   `json:"auto_apply"`
	WindowStartHour   int    `json:"window_start_hour"`
	WindowEndHour     int    `json:"window_end_hour"`
}

// Client calls the agent control endpoints over HTTP.
type Client struct {
	BaseURL string
	Token   string
	HTTP    *http.Client
}

func (c *Client) httpClient() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return &http.Client{Timeout: 15 * time.Second}
}

func (c *Client) base() string {
	return strings.TrimRight(c.BaseURL, "/")
}

// UpdateStatus GET /_peepal/control/update — current installed/available versions.
func (c *Client) UpdateStatus(ctx context.Context) (Status, error) {
	return c.doStatus(ctx, http.MethodGet, "/_peepal/control/update")
}

// Check POST /_peepal/control/check — poll for newer releases without applying.
func (c *Client) Check(ctx context.Context) (Status, error) {
	return c.doStatus(ctx, http.MethodPost, "/_peepal/control/check")
}

// Apply POST /_peepal/control/update — trigger CheckAndApply on the agent.
func (c *Client) Apply(ctx context.Context) (bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.base()+"/_peepal/control/update", nil)
	if err != nil {
		return false, err
	}
	c.setAuth(req)
	resp, err := c.httpClient().Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return false, fmt.Errorf("agent apply: %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}
	var out struct {
		Applied bool `json:"applied"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return false, fmt.Errorf("agent apply decode: %w", err)
	}
	return out.Applied, nil
}

func (c *Client) doStatus(ctx context.Context, method, path string) (Status, error) {
	var zero Status
	req, err := http.NewRequestWithContext(ctx, method, c.base()+path, nil)
	if err != nil {
		return zero, err
	}
	c.setAuth(req)
	resp, err := c.httpClient().Do(req)
	if err != nil {
		return zero, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return zero, fmt.Errorf("agent status: %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}
	var st Status
	if err := json.Unmarshal(body, &st); err != nil {
		return zero, fmt.Errorf("agent status decode: %w", err)
	}
	return st, nil
}

func (c *Client) setAuth(req *http.Request) {
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}
}
