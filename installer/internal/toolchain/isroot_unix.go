//go:build !windows

package toolchain

import "os"

func isRoot() bool { return os.Geteuid() == 0 }
