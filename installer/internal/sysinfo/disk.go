package sysinfo

import (
	"os"
	"path/filepath"
)

// FreeDiskForPath walks up to the nearest directory that exists, so the check
// works before the install directory has been created.
func FreeDiskForPath(path string) uint64 {
	for p := filepath.Clean(path); ; p = filepath.Dir(p) {
		if _, err := os.Stat(p); err == nil {
			return FreeDiskBytes(p)
		}
		if parent := filepath.Dir(p); parent == p {
			return 0
		}
	}
}
