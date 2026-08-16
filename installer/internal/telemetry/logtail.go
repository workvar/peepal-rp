package telemetry

import (
	"bufio"
	"context"
	"os"
	"strings"
	"time"
)

// Tail follows a log file and ships it to the hub in batches. Error lines go
// out immediately as their own event so the developer sees a crash within
// seconds; everything else is batched to keep the traffic small.
type Tail struct {
	Path      string
	Client    *Client
	ShipAll   bool          // send every line, not just errors
	Interval  time.Duration // batch flush period; 15s when zero
	BatchSize int           // lines per batch; 200 when zero
}

// Run follows the file until ctx is cancelled. A truncated or rotated file is
// picked up again on the next poll.
func (t *Tail) Run(ctx context.Context) {
	if t.Interval == 0 {
		t.Interval = 15 * time.Second
	}
	if t.BatchSize == 0 {
		t.BatchSize = 200
	}
	var (
		offset int64
		batch  []string
		ticker = time.NewTicker(2 * time.Second)
		flush  = time.NewTicker(t.Interval)
	)
	defer ticker.Stop()
	defer flush.Stop()

	for {
		select {
		case <-ctx.Done():
			t.send(batch)
			return
		case <-flush.C:
			batch = t.sendAndReset(batch)
		case <-ticker.C:
			lines, next := readFrom(t.Path, offset)
			offset = next
			for _, line := range lines {
				if isError(line) {
					t.Client.Send(Event{Kind: Error, Message: line})
					continue
				}
				if t.ShipAll {
					batch = append(batch, line)
				}
			}
			if len(batch) >= t.BatchSize {
				batch = t.sendAndReset(batch)
			}
		}
	}
}

func (t *Tail) sendAndReset(batch []string) []string {
	t.send(batch)
	return nil
}

func (t *Tail) send(batch []string) {
	if len(batch) == 0 {
		return
	}
	t.Client.Send(Event{Kind: Log, Lines: batch})
}

// readFrom returns the lines written since offset and the new offset. A file
// that shrank was rotated, so reading restarts at the beginning.
func readFrom(path string, offset int64) ([]string, int64) {
	f, err := os.Open(path)
	if err != nil {
		return nil, offset
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return nil, offset
	}
	if st.Size() < offset {
		offset = 0
	}
	if st.Size() == offset {
		return nil, offset
	}
	if _, err := f.Seek(offset, 0); err != nil {
		return nil, offset
	}
	var lines []string
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 64*1024), 1<<20)
	for sc.Scan() {
		lines = append(lines, sc.Text())
	}
	return lines, st.Size()
}

// isError spots the lines worth waking a developer for.
func isError(line string) bool {
	l := strings.ToUpper(line)
	for _, needle := range []string{"ERROR", "FATAL", "PANIC", "EXITED UNEXPECTEDLY", "TRACEBACK"} {
		if strings.Contains(l, needle) {
			return true
		}
	}
	return false
}
