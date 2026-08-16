package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Client posts events to the hub. It never blocks the caller: events go into
// a bounded queue and a background goroutine drains it, so a hub outage slows
// nothing down on the customer's machine.
type Client struct {
	BaseURL   string
	Token     string
	App       string
	InstallID string
	Version   string

	// Enabled false makes every method a no-op, which is how an operator
	// turns monitoring off without the rest of the code caring.
	Enabled bool

	http  *http.Client
	once  sync.Once
	queue chan Event

	mu       sync.Mutex
	lastErr  string
	sent     int
	dropped  int
	lastSent time.Time
}

// Stats is what the panel shows on its monitoring card.
type Stats struct {
	Sent     int       `json:"sent"`
	Dropped  int       `json:"dropped"`
	LastSent time.Time `json:"last_sent"`
	LastErr  string    `json:"last_error,omitempty"`
	Enabled  bool      `json:"enabled"`
	Hub      string    `json:"hub"`
}

// Start launches the background sender. Calling it twice is safe.
func (c *Client) Start(ctx context.Context) {
	c.once.Do(func() {
		c.http = &http.Client{Timeout: 20 * time.Second}
		c.queue = make(chan Event, 256)
		go c.drain(ctx)
	})
}

// Send queues an event, dropping it if the queue is full rather than blocking
// the caller.
func (c *Client) Send(e Event) {
	if !c.Enabled || c.queue == nil {
		return
	}
	e.At, e.App, e.InstallID, e.Version = time.Now().UTC(), c.App, c.InstallID, c.Version
	select {
	case c.queue <- e:
	default:
		c.mu.Lock()
		c.dropped++
		c.mu.Unlock()
	}
}

// Post sends one event synchronously and returns the hub's reply, which may
// carry commands. The heartbeat uses this; everything else uses Send.
func (c *Client) Post(ctx context.Context, e Event) (Ack, error) {
	var ack Ack
	if !c.Enabled {
		return ack, nil
	}
	if c.http == nil {
		c.http = &http.Client{Timeout: 20 * time.Second}
	}
	e.At, e.App, e.InstallID, e.Version = time.Now().UTC(), c.App, c.InstallID, c.Version
	body, err := json.Marshal(e)
	if err != nil {
		return ack, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url("/api/events"), bytes.NewReader(body))
	if err != nil {
		return ack, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.Token)
	resp, err := c.http.Do(req)
	if err != nil {
		c.note(err.Error())
		return ack, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		err := fmt.Errorf("hub returned %s", resp.Status)
		c.note(err.Error())
		return ack, err
	}
	c.ok()
	json.NewDecoder(resp.Body).Decode(&ack)
	return ack, nil
}

// Report sends a command result back to the hub.
func (c *Client) Report(ctx context.Context, r Result) error {
	if !c.Enabled {
		return nil
	}
	body, _ := json.Marshal(r)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url("/api/results"), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.Token)
	req.Header.Set("X-Install-ID", c.InstallID)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	return nil
}

// Stats reports what the sender has been doing.
func (c *Client) Stats() Stats {
	c.mu.Lock()
	defer c.mu.Unlock()
	return Stats{Sent: c.sent, Dropped: c.dropped, LastSent: c.lastSent,
		LastErr: c.lastErr, Enabled: c.Enabled, Hub: c.BaseURL}
}

func (c *Client) drain(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case e := <-c.queue:
			// One retry: a hub restart should not lose a crash report.
			if _, err := c.Post(ctx, e); err != nil {
				select {
				case <-ctx.Done():
					return
				case <-time.After(10 * time.Second):
				}
				c.Post(ctx, e)
			}
		}
	}
}

func (c *Client) url(path string) string {
	return strings.TrimSuffix(c.BaseURL, "/") + path
}

func (c *Client) note(msg string) {
	c.mu.Lock()
	c.lastErr = msg
	c.mu.Unlock()
}

func (c *Client) ok() {
	c.mu.Lock()
	c.sent++
	c.lastSent = time.Now()
	c.lastErr = ""
	c.mu.Unlock()
}
