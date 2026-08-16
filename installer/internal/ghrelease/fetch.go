package ghrelease

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/peepal/installer/internal/download"
)

// ChecksumsFile is the asset every release is expected to carry: lines of
// "<sha256>  <filename>", as produced by sha256sum.
const ChecksumsFile = "checksums.txt"

// FetchAsset downloads one asset into dir and verifies it against
// checksums.txt when that asset is present in the release.
func (c Client) FetchAsset(ctx context.Context, repo string, rel Release, name, dir string, rep download.Reporter) (string, error) {
	asset, ok := rel.Asset(name)
	if !ok {
		return "", fmt.Errorf("release %s of %s has no asset named %q", rel.Tag, repo, name)
	}
	sum, err := c.checksum(ctx, repo, rel, name)
	if err != nil {
		return "", err
	}
	dest := filepath.Join(dir, name)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	err = download.ToFile(ctx, download.Options{
		URL:      AssetURL(repo, asset.ID),
		Dest:     dest,
		Headers:  c.AssetHeaders(),
		SHA256:   sum,
		Progress: rep,
	})
	if err != nil {
		return "", err
	}
	return dest, nil
}

// checksum returns the expected digest for name, or "" when the release does
// not publish a checksums file.
func (c Client) checksum(ctx context.Context, repo string, rel Release, name string) (string, error) {
	asset, ok := rel.Asset(ChecksumsFile)
	if !ok {
		return "", nil
	}
	body, err := download.Bytes(ctx, AssetURL(repo, asset.ID), c.AssetHeaders())
	if err != nil {
		return "", fmt.Errorf("reading %s from %s: %w", ChecksumsFile, repo, err)
	}
	for _, line := range strings.Split(string(body), "\n") {
		fields := strings.Fields(line)
		if len(fields) == 2 && strings.TrimPrefix(fields[1], "*") == name {
			return fields[0], nil
		}
	}
	return "", fmt.Errorf("%s in %s does not list %s", ChecksumsFile, repo, name)
}
