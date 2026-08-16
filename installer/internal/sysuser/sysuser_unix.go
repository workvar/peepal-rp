//go:build !windows

// Package sysuser creates and uses the unprivileged account that long-running
// services run under. PostgreSQL flatly refuses to start as root, and running
// the app server as root is bad practice, so the agent drops privileges for
// every child it spawns.
package sysuser

import (
	"fmt"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"
	"strconv"
	"syscall"
)

// name is the base account name; macOS hides service accounts behind a
// leading underscore.
const name = "peepal"

// Account is the OS account the installer creates and the agent runs its
// children as.
func Account() string {
	if runtime.GOOS == "darwin" {
		return "_" + name
	}
	return name
}

// Ensure creates the service account when it does not exist and returns the
// name to use. On macOS the account is created with dscl; on Linux useradd.
func Ensure(homeDir string) (string, error) {
	want := Account()
	if _, err := user.Lookup(want); err == nil {
		return want, nil
	}
	if runtime.GOOS == "darwin" {
		if err := createDarwin(want, homeDir); err != nil {
			return "", err
		}
		return want, nil
	}
	if _, err := exec.LookPath("useradd"); err != nil {
		return "", fmt.Errorf("useradd not available; create the %q user manually", want)
	}
	args := []string{"--system", "--home-dir", homeDir, "--shell", "/usr/sbin/nologin", want}
	if out, err := exec.Command("useradd", args...).CombinedOutput(); err != nil {
		if _, lookErr := user.Lookup(want); lookErr != nil {
			return "", fmt.Errorf("useradd: %w\n%s", err, out)
		}
	}
	return want, nil
}

// createDarwin adds a hidden service account through the directory service.
func createDarwin(name, homeDir string) error {
	uid, err := freeDarwinUID()
	if err != nil {
		return err
	}
	rec := "/Users/" + name
	steps := [][]string{
		{".", "-create", rec},
		{".", "-create", rec, "UserShell", "/usr/bin/false"},
		{".", "-create", rec, "RealName", "Peepal Service"},
		{".", "-create", rec, "UniqueID", strconv.Itoa(uid)},
		{".", "-create", rec, "PrimaryGroupID", "20"},
		{".", "-create", rec, "NFSHomeDirectory", homeDir},
		{".", "-create", rec, "IsHidden", "1"},
	}
	for _, s := range steps {
		if out, err := exec.Command("dscl", s...).CombinedOutput(); err != nil {
			return fmt.Errorf("dscl %v: %w\n%s", s, err, out)
		}
	}
	return nil
}

// freeDarwinUID finds an unused UID in the service range.
func freeDarwinUID() (int, error) {
	for uid := 450; uid < 500; uid++ {
		if _, err := user.LookupId(strconv.Itoa(uid)); err != nil {
			return uid, nil
		}
	}
	return 0, fmt.Errorf("no free service UID between 450 and 500")
}

// Apply makes cmd run as the named account. With an empty name, or when the
// current process is not root, cmd is left untouched.
func Apply(cmd *exec.Cmd, name string) {
	if name == "" || syscall.Geteuid() != 0 {
		return
	}
	u, err := user.Lookup(name)
	if err != nil {
		return
	}
	uid, err1 := strconv.Atoi(u.Uid)
	gid, err2 := strconv.Atoi(u.Gid)
	if err1 != nil || err2 != nil {
		return
	}
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.Credential = &syscall.Credential{Uid: uint32(uid), Gid: uint32(gid)}
}

// Chown recursively gives a path to the service account.
func Chown(path, name string) error {
	if name == "" || syscall.Geteuid() != 0 {
		return nil
	}
	u, err := user.Lookup(name)
	if err != nil {
		return nil
	}
	args := []string{"-R", u.Uid + ":" + u.Gid, filepath.Clean(path)}
	if out, err := exec.Command("chown", args...).CombinedOutput(); err != nil {
		return fmt.Errorf("chown %s: %w\n%s", path, err, out)
	}
	return nil
}
