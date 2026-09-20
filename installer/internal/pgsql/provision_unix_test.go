package pgsql

import (
	"context"
	"testing"
)

func TestInstallViaPackageManagerRefusesDpkgLock(t *testing.T) {
	t.Setenv("DPKG_RUNNING_VERSION", "1.22.6")
	_, err := installViaPackageManager(context.Background(), func(string, ...any) {})
	if err == nil {
		t.Fatal("apt must not run from a .deb postinst")
	}
}
