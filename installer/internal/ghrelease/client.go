// Package ghrelease talks to the GitHub Releases API for the two private
// repositories the product is split across.
package ghrelease

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"

	"github.com/peepal/installer/internal/download"
	"github.com/peepal/installer/internal/semver"
)

const api = "https://api.github.com"

// Client reads releases from one or more repos with a single token.
type Client struct {
	Token string
	// AllowPrerelease includes prerelease tags when picking the latest.
	AllowPrerelease bool
}

// Asset is one downloadable file attached to a release.
type Asset struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Size int64  `json:"size"`
	URL  string `json:"url"`
}

// Release is the subset of the API payload we care about.
type Release struct {
	Tag        string  `json:"tag_name"`
	Draft      bool    `json:"draft"`
	Prerelease bool    `json:"prerelease"`
	Body       string  `json:"body"`
	Assets     []Asset `json:"assets"`
}

// Asset finds an attached file by exact name.
func (r Release) Asset(name string) (Asset, bool) {
	for _, a := range r.Assets {
		if a.Name == name {
			return a, true
		}
	}
	return Asset{}, false
}

// Latest returns the highest semver tag published on repo ("owner/name"),
// honouring the prerelease policy. Draft releases are always skipped.
func (c Client) Latest(ctx context.Context, repo string) (Release, error) {
	body, err := download.Bytes(ctx, fmt.Sprintf("%s/repos/%s/releases?per_page=30", api, repo), c.headers("application/vnd.github+json"))
	if err != nil {
		return Release{}, fmt.Errorf("listing releases for %s: %w", repo, err)
	}
	var all []Release
	if err := json.Unmarshal(body, &all); err != nil {
		return Release{}, fmt.Errorf("parsing releases for %s: %w", repo, err)
	}
	var usable []Release
	for _, r := range all {
		if r.Draft || (r.Prerelease && !c.AllowPrerelease) {
			continue
		}
		usable = append(usable, r)
	}
	if len(usable) == 0 {
		return Release{}, fmt.Errorf("%s has no published releases on this channel", repo)
	}
	sort.Slice(usable, func(i, j int) bool {
		return semver.Parse(usable[i].Tag).Compare(semver.Parse(usable[j].Tag)) > 0
	})
	return usable[0], nil
}

// ByTag fetches one specific release, used for pinned installs and rollbacks.
func (c Client) ByTag(ctx context.Context, repo, tag string) (Release, error) {
	body, err := download.Bytes(ctx, fmt.Sprintf("%s/repos/%s/releases/tags/%s", api, repo, tag), c.headers("application/vnd.github+json"))
	if err != nil {
		return Release{}, fmt.Errorf("fetching %s@%s: %w", repo, tag, err)
	}
	var r Release
	return r, json.Unmarshal(body, &r)
}

// AssetHeaders returns the request headers required to download a private
// release asset through the API (the browser URL will not work).
func (c Client) AssetHeaders() map[string]string { return c.headers("application/octet-stream") }

// AssetURL is the API endpoint that streams the asset bytes.
func AssetURL(repo string, id int64) string {
	return fmt.Sprintf("%s/repos/%s/releases/assets/%d", api, repo, id)
}

func (c Client) headers(accept string) map[string]string {
	h := map[string]string{
		"Accept":               accept,
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent":           "peepal-installer",
	}
	if c.Token != "" {
		h["Authorization"] = "Bearer " + c.Token
	}
	return h
}
