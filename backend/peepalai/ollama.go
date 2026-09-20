package peepalai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"collegeerp/config"
)

// Minimal Ollama chat client. PeepalAI only ever talks to the local Ollama
// daemon on the server (OLLAMA_URL, default http://localhost:11434) — no
// data leaves the machine.

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model    string                 `json:"model"`
	Messages []chatMessage          `json:"messages"`
	Stream   bool                   `json:"stream"`
	Options  map[string]interface{} `json:"options,omitempty"`
}

type chatResponse struct {
	Message chatMessage `json:"message"`
	Error   string      `json:"error"`
}

var httpClient = &http.Client{Timeout: 120 * time.Second}

// ollamaChat sends one system+user exchange and returns the reply content.
func ollamaChat(ctx context.Context, system, user string) (string, error) {
	body, err := json.Marshal(chatRequest{
		Model: config.App.OllamaModel,
		Messages: []chatMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
		Stream:  false,
		Options: map[string]interface{}{"temperature": 0, "num_ctx": 8192},
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		config.App.OllamaURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("PeepalAI is unavailable: cannot reach the local Ollama service")
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	var out chatResponse
	if err := json.Unmarshal(data, &out); err != nil {
		return "", fmt.Errorf("unexpected response from Ollama")
	}
	if out.Error != "" {
		return "", fmt.Errorf("Ollama error: %s", out.Error)
	}
	return out.Message.Content, nil
}
