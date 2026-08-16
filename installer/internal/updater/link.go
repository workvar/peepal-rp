package updater

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// relink restores the pointers a fresh release directory does not carry:
// the .env file and the uploads directory, both of which live in the data
// directory so they survive every update.
func (u *Updater) relink() error {
	if err := LinkDir(u.Layout.Uploads(), filepath.Join(u.Layout.Backend(), "uploads")); err != nil {
		return err
	}
	return CopyFile(u.Layout.EnvFile(), u.Layout.BackendEnv())
}

// CopyFile restores a persistent file into a freshly unpacked release.
func CopyFile(src, dst string) error {
	b, err := os.ReadFile(src)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return os.WriteFile(dst, b, 0o600)
}

// LinkDir points link at target, replacing whatever was there. Windows uses a
// directory junction, which needs no special privilege for the service.
func LinkDir(target, link string) error {
	if err := os.MkdirAll(target, 0o755); err != nil {
		return err
	}
	os.RemoveAll(link)
	if err := os.MkdirAll(filepath.Dir(link), 0o755); err != nil {
		return err
	}
	if runtime.GOOS == "windows" {
		return exec.Command("cmd", "/c", "mklink", "/J", link, target).Run()
	}
	return os.Symlink(target, link)
}
