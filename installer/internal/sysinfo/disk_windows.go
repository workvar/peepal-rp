//go:build windows

package sysinfo

import (
	"syscall"
	"unsafe"
)

// FreeDiskBytes returns the space available on the volume holding path.
func FreeDiskBytes(path string) uint64 {
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0
	}
	var free, total, totalFree uint64
	proc := syscall.NewLazyDLL("kernel32.dll").NewProc("GetDiskFreeSpaceExW")
	r, _, _ := proc.Call(uintptr(unsafe.Pointer(p)),
		uintptr(unsafe.Pointer(&free)),
		uintptr(unsafe.Pointer(&total)),
		uintptr(unsafe.Pointer(&totalFree)))
	if r == 0 {
		return 0
	}
	return free
}
