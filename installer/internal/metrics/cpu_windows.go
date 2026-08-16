package metrics

import (
	"os/exec"
	"strconv"
	"strings"
)

// readCPU uses the kernel's cumulative processor times, so the reading is a
// true delta rather than the instantaneous sample wmic returns.
func readCPU() (cpuTimes, bool) {
	const ps = `$t = Get-CimInstance Win32_PerfRawData_PerfOS_Processor | ` +
		`Where-Object {$_.Name -eq "_Total"}; ` +
		`"$($t.PercentProcessorTime) $($t.TimeStamp_Sys100NS)"`
	out, err := exec.Command("powershell", "-NoProfile", "-Command", ps).Output()
	if err != nil {
		return cpuTimes{}, false
	}
	f := strings.Fields(strings.TrimSpace(string(out)))
	if len(f) != 2 {
		return cpuTimes{}, false
	}
	idle, err1 := strconv.ParseUint(f[0], 10, 64)
	total, err2 := strconv.ParseUint(f[1], 10, 64)
	if err1 != nil || err2 != nil || total < idle {
		return cpuTimes{}, false
	}
	// PercentProcessorTime on this counter is idle time; busy is the rest.
	return cpuTimes{busy: total - idle, total: total}, true
}

func usedMemory(total uint64) uint64 {
	const ps = `(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory`
	out, err := exec.Command("powershell", "-NoProfile", "-Command", ps).Output()
	if err != nil {
		return 0
	}
	kb, err := strconv.ParseUint(strings.TrimSpace(string(out)), 10, 64)
	if err != nil {
		return 0
	}
	free := kb * 1024
	if free > total {
		return 0
	}
	return total - free
}
