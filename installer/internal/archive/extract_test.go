package archive

import (
	"archive/tar"
	"compress/gzip"
	"os"
	"path/filepath"
	"testing"
)

// A malicious release must not be able to write outside the target directory.
func TestTarGzRejectsTraversal(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "evil.tar.gz")
	writeTar(t, src, "../escaped.txt")

	if err := TarGz(src, filepath.Join(dir, "dest")); err == nil {
		t.Fatal("expected the traversal entry to be rejected")
	}
	if _, err := os.Stat(filepath.Join(dir, "escaped.txt")); err == nil {
		t.Fatal("archive escaped the destination directory")
	}
}

func TestStripRootUnnestsSingleDirectory(t *testing.T) {
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "node-v20.17.0-linux-x64", "bin"), 0o755)
	os.WriteFile(filepath.Join(dir, "node-v20.17.0-linux-x64", "bin", "node"), []byte("x"), 0o755)

	if err := StripRoot(dir); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "bin", "node")); err != nil {
		t.Fatalf("expected bin/node at the top level: %v", err)
	}
}

func writeTar(t *testing.T, path, name string) {
	t.Helper()
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	gz := gzip.NewWriter(f)
	tw := tar.NewWriter(gz)
	body := []byte("pwned")
	tw.WriteHeader(&tar.Header{Name: name, Mode: 0o644, Size: int64(len(body)), Typeflag: tar.TypeReg})
	tw.Write(body)
	tw.Close()
	gz.Close()
}
