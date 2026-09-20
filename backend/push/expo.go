package push

// expo.go — delivery through Expo's push service.
//
// Expo is the transport rather than FCM and APNs directly because it fronts
// both behind one HTTP call and one token format, which removes the native
// credential handling (APNs keys, FCM service accounts) from this codebase
// entirely. The trade-off is a third party in the delivery path; the Message
// type above exists so replacing it later is a change to this file alone.
//
// What this file is careful about:
//
//   - The API answers 200 with PER-MESSAGE errors. A caller that only checks
//     the HTTP status will happily believe it delivered to a token that has
//     been dead for months, so the response body is parsed properly.
//   - "DeviceNotRegistered" is the service telling us a token is gone for good.
//     Those are returned to the caller to disable, which is the only mechanism
//     that keeps the device_tokens table from filling with corpses.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"collegeerp/config"
)

const (
	expoSendURL = "https://exp.host/--/api/v2/push/send"
	// expoChunkSize is the service's documented maximum per request.
	expoChunkSize = 100
	// errDeviceNotRegistered is the only per-message error that means "stop
	// trying forever" rather than "retry later".
	errDeviceNotRegistered = "DeviceNotRegistered"
)

// expoMessage is the wire shape. Field names are fixed by the service.
type expoMessage struct {
	To       []string          `json:"to"`
	Title    string            `json:"title"`
	Body     string            `json:"body,omitempty"`
	Data     map[string]string `json:"data,omitempty"`
	Sound    string            `json:"sound,omitempty"`
	Priority string            `json:"priority,omitempty"`
	Badge    *int              `json:"badge,omitempty"`
	// ChannelID is Android-only and must already exist on the client. The app
	// creates one channel per category at startup.
	ChannelID string `json:"channelId,omitempty"`
}

type expoTicket struct {
	Status  string `json:"status"`
	ID      string `json:"id"`
	Message string `json:"message"`
	Details struct {
		Error string `json:"error"`
	} `json:"details"`
}

type expoResponse struct {
	Data   []expoTicket `json:"data"`
	Errors []struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"errors"`
}

// Result reports what happened to one send.
type Result struct {
	// Sent is how many messages the service accepted.
	Sent int
	// Unregistered lists tokens the service says no longer exist. The caller
	// must disable them; nothing else will ever tell us again.
	Unregistered []string
	// Failed counts per-message errors that are not permanent.
	Failed int
}

// Client talks to the Expo push service.
type Client struct {
	HTTP  *http.Client
	URL   string
	Token string // optional Expo access token, for accounts with push security on
}

// NewClient builds a client from configuration. Returns nil when push is not
// configured, which is the signal callers use to skip delivery entirely rather
// than log an error on every notification.
func NewClient() *Client {
	if !config.App.PushEnabled {
		return nil
	}
	return &Client{
		HTTP:  &http.Client{Timeout: 15 * time.Second},
		URL:   expoSendURL,
		Token: config.App.ExpoAccessToken,
	}
}

// Send delivers one message to every token on it, chunked to the service limit.
//
// Errors are returned only for a failure of the whole exchange (network, bad
// status). Per-message outcomes come back in Result, because a batch where one
// token is dead and ninety-nine are fine is a success with cleanup to do, not
// a failure.
func (c *Client) Send(ctx context.Context, m Message) (Result, error) {
	var out Result
	if c == nil || !m.Valid() {
		return out, nil
	}

	for _, chunk := range chunkTokens(m.To, expoChunkSize) {
		res, err := c.sendChunk(ctx, m, chunk)
		if err != nil {
			return out, err
		}
		out.Sent += res.Sent
		out.Failed += res.Failed
		out.Unregistered = append(out.Unregistered, res.Unregistered...)
	}
	return out, nil
}

func (c *Client) sendChunk(ctx context.Context, m Message, tokens []string) (Result, error) {
	var out Result

	payload := expoMessage{
		To:        tokens,
		Title:     m.Title,
		Body:      m.Body,
		Data:      m.Data,
		Sound:     "default",
		Priority:  m.normalisePriority(),
		Badge:     m.Badge,
		ChannelID: m.Category,
	}
	buf, err := json.Marshal([]expoMessage{payload})
	if err != nil {
		return out, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.URL, bytes.NewReader(buf))
	if err != nil {
		return out, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return out, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return out, fmt.Errorf("push: expo returned %s", resp.Status)
	}

	var body expoResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return out, fmt.Errorf("push: could not read expo response: %w", err)
	}
	if len(body.Errors) > 0 {
		return out, fmt.Errorf("push: expo rejected the request: %s", body.Errors[0].Message)
	}

	// Tickets come back positionally, one per token in the chunk.
	for i, ticket := range body.Data {
		if strings.EqualFold(ticket.Status, "ok") {
			out.Sent++
			continue
		}
		out.Failed++
		if ticket.Details.Error == errDeviceNotRegistered && i < len(tokens) {
			out.Unregistered = append(out.Unregistered, tokens[i])
		}
	}
	return out, nil
}

// chunkTokens splits a recipient list into service-sized batches.
func chunkTokens(tokens []string, size int) [][]string {
	if size <= 0 || len(tokens) <= size {
		return [][]string{tokens}
	}
	var out [][]string
	for start := 0; start < len(tokens); start += size {
		end := start + size
		if end > len(tokens) {
			end = len(tokens)
		}
		out = append(out, tokens[start:end])
	}
	return out
}
