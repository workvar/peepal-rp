package control

import (
	"bufio"
	"os"
	"strings"
)

// Logs returns the last n lines of the agent log, which is what both the
// panel's log view and a remote "logs" command read.
func (c *Controller) Logs(n int) (string, error) {
	if n <= 0 {
		n = 200
	}
	lines, err := tail(c.Layout.AgentLog(), n)
	if err != nil {
		return "", err
	}
	return strings.Join(lines, "\n"), nil
}

// tail reads the whole file and keeps the last n lines in a ring. The log is
// rotated at 8 MiB, so this never reads more than that.
func tail(path string, n int) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{"(no log yet)"}, nil
		}
		return nil, err
	}
	defer f.Close()

	ring := make([]string, 0, n)
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 64*1024), 1<<20)
	for sc.Scan() {
		if len(ring) == n {
			ring = ring[1:]
		}
		ring = append(ring, sc.Text())
	}
	return ring, sc.Err()
}
