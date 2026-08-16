//go:build !linux && !windows

package metrics

import (
	"os/exec"
	"strconv"
	"strings"
)

// readCPU on macOS asks the kernel for host CPU load ticks. They are
// cumulative, which is exactly the shape the sampler wants.
func readCPU() (cpuTimes, bool) {
	out, err := exec.Command("sysctl", "-n", "kern.cp_time").Output()
	if err != nil {
		return cpuTimes{}, false
	}
	// user nice system intr idle
	f := strings.Fields(strings.TrimSpace(string(out)))
	if len(f) < 5 {
		return cpuTimes{}, false
	}
	var t cpuTimes
	for i, s := range f[:5] {
		v, err := strconv.ParseUint(s, 10, 64)
		if err != nil {
			return cpuTimes{}, false
		}
		t.total += v
		if i != 4 { // the last field is idle
			t.busy += v
		}
	}
	return t, true
}

// usedMemory counts the pages the kernel is not free to hand out.
func usedMemory(total uint64) uint64 {
	out, err := exec.Command("vm_stat").Output()
	if err != nil {
		return 0
	}
	pageSize := uint64(4096)
	var free, speculative uint64
	for _, line := range strings.Split(string(out), "\n") {
		key, val, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		n, err := strconv.ParseUint(strings.Trim(strings.TrimSpace(val), "."), 10, 64)
		if err != nil {
			continue
		}
		switch strings.TrimSpace(key) {
		case "Pages free":
			free = n
		case "Pages speculative":
			speculative = n
		}
	}
	avail := (free + speculative) * pageSize
	if avail > total {
		return 0
	}
	return total - avail
}
