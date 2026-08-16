// Package metrics samples the machine for the panel's dashboard and for the
// heartbeat sent to the developer's hub.
package metrics

import (
	"time"

	"github.com/peepal/installer/internal/sysinfo"
)

// Snapshot is one reading.
type Snapshot struct {
	At            time.Time `json:"at"`
	CPUPercent    float64   `json:"cpu_percent"`
	MemUsedBytes  uint64    `json:"mem_used_bytes"`
	MemTotalBytes uint64    `json:"mem_total_bytes"`
	DiskFreeBytes uint64    `json:"disk_free_bytes"`
	// MemPercent and DiskFree are what the dashboard gauges read.
	MemPercent float64 `json:"mem_percent"`
}

// Sampler keeps the previous CPU reading, since CPU use is a delta rather
// than an instantaneous value.
type Sampler struct {
	// Path is the directory whose free space is reported, normally the data
	// directory: that is the disk that actually fills up.
	Path string

	prev cpuTimes
	have bool
}

// Sample takes a reading.
func (s *Sampler) Sample() Snapshot {
	snap := Snapshot{
		At:            time.Now(),
		MemTotalBytes: sysinfo.Detect().RAMBytes,
		DiskFreeBytes: sysinfo.FreeDiskForPath(s.Path),
	}
	snap.MemUsedBytes = usedMemory(snap.MemTotalBytes)
	if snap.MemTotalBytes > 0 {
		snap.MemPercent = float64(snap.MemUsedBytes) / float64(snap.MemTotalBytes) * 100
	}

	cur, ok := readCPU()
	if ok && s.have {
		snap.CPUPercent = cur.percentSince(s.prev)
	}
	if ok {
		s.prev, s.have = cur, true
	}
	return snap
}

// cpuTimes is a busy/total pair; the platform files provide both.
type cpuTimes struct {
	busy  uint64
	total uint64
}

func (c cpuTimes) percentSince(prev cpuTimes) float64 {
	dt := c.total - prev.total
	if dt == 0 {
		return 0
	}
	p := float64(c.busy-prev.busy) / float64(dt) * 100
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return p
}
