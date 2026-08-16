//go:build !windows

package sysinfo

import "syscall"

// FreeDiskBytes returns the space available to a non-root user under path.
func FreeDiskBytes(path string) uint64 {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return 0
	}
	return st.Bavail * uint64(st.Bsize)
}
