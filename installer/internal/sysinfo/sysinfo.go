// Package sysinfo inspects the client machine so the installer can decide
// what it is safe to install: memory, GPU, disk, privileges and free ports.
package sysinfo

import (
	"fmt"
	"net"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

// Machine is the snapshot the installer prints and reasons about.
type Machine struct {
	OS       string
	Arch     string
	CPUs     int
	RAMBytes uint64
	// VRAMBytes is best-effort: 0 means "no discrete GPU detected", which is
	// not the same as "no GPU".
	VRAMBytes uint64
	// UnifiedMemory is true on Apple Silicon, where the GPU shares system RAM.
	UnifiedMemory bool
}

// Detect gathers everything in one pass.
func Detect() Machine {
	m := Machine{
		OS:            runtime.GOOS,
		Arch:          runtime.GOARCH,
		CPUs:          runtime.NumCPU(),
		RAMBytes:      totalRAM(),
		UnifiedMemory: runtime.GOOS == "darwin" && runtime.GOARCH == "arm64",
	}
	m.VRAMBytes = totalVRAM()
	return m
}

// RAMGB is the rounded memory size used in the console summary.
func (m Machine) RAMGB() float64 { return float64(m.RAMBytes) / (1 << 30) }

// VRAMGB is the rounded GPU memory size.
func (m Machine) VRAMGB() float64 { return float64(m.VRAMBytes) / (1 << 30) }

// String renders a one-line summary.
func (m Machine) String() string {
	s := fmt.Sprintf("%s/%s, %d CPU cores, %.1f GB RAM", m.OS, m.Arch, m.CPUs, m.RAMGB())
	switch {
	case m.UnifiedMemory:
		s += " (unified GPU memory)"
	case m.VRAMBytes > 0:
		s += fmt.Sprintf(", %.1f GB VRAM", m.VRAMGB())
	}
	return s
}

func totalRAM() uint64 {
	switch runtime.GOOS {
	case "linux":
		return linuxMemTotal()
	case "darwin":
		return uint64(cmdInt("sysctl", "-n", "hw.memsize"))
	case "windows":
		return uint64(cmdInt("powershell", "-NoProfile", "-Command",
			"(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory"))
	}
	return 0
}

func totalVRAM() uint64 {
	switch runtime.GOOS {
	case "windows":
		// AdapterRAM caps out at 4 GB on some drivers; treat it as a floor.
		return uint64(cmdInt("powershell", "-NoProfile", "-Command",
			"(Get-CimInstance Win32_VideoController | Sort-Object AdapterRAM -Descending | Select-Object -First 1).AdapterRAM"))
	case "linux":
		mb := cmdInt("nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits")
		return uint64(mb) * 1024 * 1024
	}
	return 0
}

func linuxMemTotal() uint64 {
	out, err := exec.Command("sh", "-c", "grep MemTotal /proc/meminfo").Output()
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(out))
	if len(fields) < 2 {
		return 0
	}
	kb, _ := strconv.ParseUint(fields[1], 10, 64)
	return kb * 1024
}

func cmdInt(name string, args ...string) int64 {
	out, err := exec.Command(name, args...).Output()
	if err != nil {
		return 0
	}
	n, err := strconv.ParseInt(strings.TrimSpace(strings.Split(string(out), "\n")[0]), 10, 64)
	if err != nil {
		return 0
	}
	return n
}

// PortFree reports whether the installer can bind a TCP port on all
// interfaces, which is how it detects an existing web server or Postgres.
func PortFree(port int) bool {
	ln, err := net.Listen("tcp", ":"+strconv.Itoa(port))
	if err != nil {
		return false
	}
	ln.Close()
	return true
}

// FirstFreePort walks upward from start until it finds an unused port.
func FirstFreePort(start int) int {
	for p := start; p < start+50; p++ {
		if PortFree(p) {
			return p
		}
	}
	return start
}
