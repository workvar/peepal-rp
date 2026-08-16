// Package logx is a tiny leveled logger that writes to stderr and, when
// configured, to a size-capped rotating file.
package logx

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const maxBytes = 8 << 20 // rotate at 8 MiB, keep one previous file

var (
	mu      sync.Mutex
	file    *os.File
	written int64
	path    string
	sink    io.Writer = os.Stderr
)

// ToFile mirrors all output into p (created if needed).
func ToFile(p string) error {
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	f, err := os.OpenFile(p, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o640)
	if err != nil {
		return err
	}
	st, _ := f.Stat()
	mu.Lock()
	defer mu.Unlock()
	file, path, written = f, p, st.Size()
	return nil
}

// Writer returns the current sink, useful as a child process's stdout.
func Writer() io.Writer {
	return writerFunc(func(b []byte) (int, error) { emit(string(b)); return len(b), nil })
}

type writerFunc func([]byte) (int, error)

func (w writerFunc) Write(b []byte) (int, error) { return w(b) }

// Infof logs an informational line.
func Infof(format string, a ...any) { emit("INFO  " + fmt.Sprintf(format, a...) + "\n") }

// Warnf logs a warning line.
func Warnf(format string, a ...any) { emit("WARN  " + fmt.Sprintf(format, a...) + "\n") }

// Errorf logs an error line.
func Errorf(format string, a ...any) { emit("ERROR " + fmt.Sprintf(format, a...) + "\n") }

func emit(msg string) {
	line := time.Now().Format("2006-01-02 15:04:05") + " " + msg
	mu.Lock()
	defer mu.Unlock()
	fmt.Fprint(sink, line)
	if file == nil {
		return
	}
	n, _ := file.WriteString(line)
	written += int64(n)
	if written > maxBytes {
		rotate()
	}
}

// rotate must be called with mu held.
func rotate() {
	file.Close()
	os.Remove(path + ".1")
	os.Rename(path, path+".1")
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o640)
	if err != nil {
		file = nil
		return
	}
	file, written = f, 0
}
