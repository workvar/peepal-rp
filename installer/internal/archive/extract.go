// Package archive unpacks the .zip and .tar.gz artifacts the installer
// downloads, guarding against path traversal in untrusted archives.
package archive

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Extract dispatches on file extension.
func Extract(src, dest string) error {
	switch {
	case strings.HasSuffix(src, ".zip"):
		return Zip(src, dest)
	case strings.HasSuffix(src, ".tar.gz"), strings.HasSuffix(src, ".tgz"):
		return TarGz(src, dest)
	}
	return fmt.Errorf("unsupported archive format: %s", filepath.Base(src))
}

// TarGz unpacks a gzipped tarball into dest.
func TarGz(src, dest string) error {
	f, err := os.Open(src)
	if err != nil {
		return err
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		h, err := tr.Next()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		target, err := safeJoin(dest, h.Name)
		if err != nil {
			return err
		}
		switch h.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := writeFile(target, tr, os.FileMode(h.Mode)&0o777); err != nil {
				return err
			}
		case tar.TypeSymlink:
			os.Remove(target)
			if err := os.Symlink(h.Linkname, target); err != nil {
				return err
			}
		}
	}
}

// Zip unpacks a zip archive into dest.
func Zip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()
	for _, entry := range r.File {
		target, err := safeJoin(dest, entry.Name)
		if err != nil {
			return err
		}
		if entry.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}
		rc, err := entry.Open()
		if err != nil {
			return err
		}
		err = writeFile(target, rc, entry.Mode().Perm())
		rc.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

// StripRoot moves the contents of a single top-level directory up into dir.
// Most upstream tarballs (Node, Postgres) nest everything one level deep.
func StripRoot(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	if len(entries) != 1 || !entries[0].IsDir() {
		return nil
	}
	inner := filepath.Join(dir, entries[0].Name())
	children, err := os.ReadDir(inner)
	if err != nil {
		return err
	}
	for _, c := range children {
		if err := os.Rename(filepath.Join(inner, c.Name()), filepath.Join(dir, c.Name())); err != nil {
			return err
		}
	}
	return os.Remove(inner)
}

func writeFile(target string, r io.Reader, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	if mode == 0 {
		mode = 0o644
	}
	out, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, r)
	return err
}

// safeJoin rejects entries that would escape dest via ".." or absolute paths.
func safeJoin(dest, name string) (string, error) {
	clean := filepath.Clean(filepath.FromSlash(name))
	if filepath.IsAbs(clean) || strings.HasPrefix(clean, "..") {
		return "", fmt.Errorf("refusing unsafe archive path %q", name)
	}
	return filepath.Join(dest, clean), nil
}
