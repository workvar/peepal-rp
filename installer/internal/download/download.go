// Package download fetches files over HTTPS with progress reporting, resume-
// free simplicity and optional SHA-256 verification.
package download

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// Client is a shared HTTP client with generous timeouts for slow campus links.
var Client = &http.Client{Timeout: 30 * time.Minute}

// Reporter receives byte counts during a transfer.
type Reporter interface {
	Update(n int64)
	Done()
}

// Options configures a single download.
type Options struct {
	URL     string
	Dest    string
	Headers map[string]string
	// SHA256 is compared against the downloaded bytes when non-empty.
	SHA256   string
	Progress Reporter
}

// ToFile downloads o.URL to o.Dest, writing to a temporary file first so a
// partial transfer never looks like a complete one.
func ToFile(ctx context.Context, o Options) error {
	if err := os.MkdirAll(filepath.Dir(o.Dest), 0o755); err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, o.URL, nil)
	if err != nil {
		return err
	}
	for k, v := range o.Headers {
		req.Header.Set(k, v)
	}
	resp, err := Client.Do(req)
	if err != nil {
		return fmt.Errorf("GET %s: %w", o.URL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: unexpected status %s", o.URL, resp.Status)
	}

	tmp := o.Dest + ".part"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	sum := sha256.New()
	cw := &countWriter{total: resp.ContentLength, rep: o.Progress}
	_, err = io.Copy(io.MultiWriter(f, sum, cw), resp.Body)
	closeErr := f.Close()
	if o.Progress != nil {
		o.Progress.Done()
	}
	if err != nil {
		os.Remove(tmp)
		return err
	}
	if closeErr != nil {
		os.Remove(tmp)
		return closeErr
	}
	if o.SHA256 != "" {
		if got := hex.EncodeToString(sum.Sum(nil)); got != o.SHA256 {
			os.Remove(tmp)
			return fmt.Errorf("checksum mismatch for %s: want %s, got %s", filepath.Base(o.Dest), o.SHA256, got)
		}
	}
	return os.Rename(tmp, o.Dest)
}

// Bytes fetches a small resource (a checksum file, an API response) into memory.
func Bytes(ctx context.Context, url string, headers map[string]string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s: %s: %s", url, resp.Status, truncate(body))
	}
	return body, nil
}

func truncate(b []byte) string {
	if len(b) > 200 {
		return string(b[:200]) + "..."
	}
	return string(b)
}

type countWriter struct {
	n     int64
	total int64
	rep   Reporter
}

func (c *countWriter) Write(p []byte) (int, error) {
	c.n += int64(len(p))
	if c.rep != nil {
		c.rep.Update(c.n)
	}
	return len(p), nil
}
