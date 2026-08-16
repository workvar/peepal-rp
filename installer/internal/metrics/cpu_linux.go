package metrics

import (
	"os"
	"strconv"
	"strings"
)

// readCPU sums the aggregate line of /proc/stat.
func readCPU() (cpuTimes, bool) {
	b, err := os.ReadFile("/proc/stat")
	if err != nil {
		return cpuTimes{}, false
	}
	line, _, _ := strings.Cut(string(b), "\n")
	fields := strings.Fields(line)
	if len(fields) < 5 || fields[0] != "cpu" {
		return cpuTimes{}, false
	}
	var t cpuTimes
	for i, f := range fields[1:] {
		v, err := strconv.ParseUint(f, 10, 64)
		if err != nil {
			continue
		}
		t.total += v
		// Fields 3 and 4 are idle and iowait; everything else is work.
		if i != 3 && i != 4 {
			t.busy += v
		}
	}
	return t, true
}

// usedMemory reads MemAvailable, which accounts for reclaimable cache and is
// what a person means by "memory in use".
func usedMemory(total uint64) uint64 {
	b, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0
	}
	for _, line := range strings.Split(string(b), "\n") {
		if !strings.HasPrefix(line, "MemAvailable:") {
			continue
		}
		f := strings.Fields(line)
		if len(f) < 2 {
			return 0
		}
		kb, _ := strconv.ParseUint(f[1], 10, 64)
		avail := kb * 1024
		if avail > total {
			return 0
		}
		return total - avail
	}
	return 0
}
