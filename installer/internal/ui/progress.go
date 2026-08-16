package ui

import (
	"fmt"
	"time"
)

// Progress renders a single-line download/extract bar that overwrites itself.
type Progress struct {
	label string
	total int64
	last  time.Time
	done  bool
}

// NewProgress starts a bar; total may be 0 when the size is unknown.
func NewProgress(label string, total int64) *Progress {
	p := &Progress{label: label, total: total}
	p.Update(0)
	return p
}

// Update redraws at most five times a second.
func (p *Progress) Update(n int64) {
	if p.done || time.Since(p.last) < 200*time.Millisecond {
		return
	}
	p.last = time.Now()
	if p.total <= 0 {
		fmt.Printf("\r    %s %s   ", p.label, mib(n))
		return
	}
	pct := int(n * 100 / p.total)
	filled := pct * 30 / 100
	bar := ""
	for i := 0; i < 30; i++ {
		if i < filled {
			bar += "="
		} else {
			bar += " "
		}
	}
	fmt.Printf("\r    %s [%s] %3d%% (%s)   ", p.label, bar, pct, mib(n))
}

// Done finishes the line.
func (p *Progress) Done() {
	p.done = true
	fmt.Printf("\r  + %s done%s\n", p.label, "                                             ")
}

func mib(n int64) string { return fmt.Sprintf("%.1f MiB", float64(n)/(1<<20)) }
