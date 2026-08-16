package setup

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/semver"
	"github.com/peepal/installer/internal/vcs"
)

// RepoAuth resolves the credential for a private repository. Precedence,
// highest first: what the operator typed (already folded into the spec), the
// environment variable the definition names, and the build-time default
// compiled into the panel.
//
// A token compiled into the binary makes the installer itself a secret: use
// a fine-grained PAT with Contents:read on this repository and nothing else,
// and rotate it when a customer relationship ends.
func RepoAuth(spec appdef.Spec) vcs.Auth {
	if !spec.Auth.UsesToken() {
		return vcs.Auth{}
	}
	token := spec.Auth.Token
	if token == "" && spec.Auth.TokenEnv != "" {
		token = os.Getenv(spec.Auth.TokenEnv)
	}
	if token == "" {
		token = BuiltInToken
	}
	return vcs.Auth{Token: token, User: spec.Auth.User}
}

// BuiltInToken is set at build time with
// -ldflags "-X .../internal/setup.BuiltInToken=github_pat_...".
// It lets a customer double-click an installer that already has read access,
// rather than being handed a credential to paste.
var BuiltInToken string

// NeedsToken reports whether the wizard has to ask for one: the definition
// wants token auth, no token has been supplied by any route, and at least one
// repository is fetched over HTTPS.
func NeedsToken(spec appdef.Spec) bool {
	if !spec.Auth.UsesToken() {
		return false
	}
	if RepoAuth(spec).Token != "" {
		return false
	}
	for _, r := range spec.Repos {
		if vcs.NeedsToken(r.URL) {
			return true
		}
	}
	return false
}

// CheckToken asks GitHub whether this token can actually read the repository,
// before the install spends ten minutes installing Go and Node and then fails
// at the clone. It returns an empty string when the token works.
func CheckToken(ctx context.Context, repoURL, token string) string {
	owner, repo := vcs.OwnerRepo(repoURL)
	if owner == "" {
		return "" // not a GitHub URL; let git report the problem
	}
	if token == "" {
		return "Enter an access token: this repository is private."
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo), nil)
	if err != nil {
		return err.Error()
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return "Could not reach github.com: " + err.Error()
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		var body struct {
			Private     bool `json:"private"`
			Permissions struct {
				Pull bool `json:"pull"`
			} `json:"permissions"`
		}
		json.NewDecoder(resp.Body).Decode(&body)
		if !body.Permissions.Pull {
			return "That token can see the repository but cannot clone it. It needs Contents: read."
		}
		return ""
	case http.StatusUnauthorized:
		return "That token was rejected. Check it was copied whole and has not expired."
	case http.StatusNotFound:
		// GitHub returns 404 rather than 403 for a private repository the
		// token cannot see, so say what is actually likely.
		return fmt.Sprintf("Cannot see %s/%s with that token. A fine-grained token must list this repository and grant Contents: read.", owner, repo)
	case http.StatusForbidden:
		return "That token is not allowed to read this repository (403). Check the organisation's token policy."
	}
	return "GitHub returned " + resp.Status
}

// tracksReleases reports whether this definition installs tagged releases
// rather than the tip of the branch.
func tracksReleases(spec appdef.Spec) bool { return spec.Updates.Track != "branch" }

// latestRelease returns the newest published tag on the remote.
func latestRelease(ctx context.Context, a vcs.Auth, dir string, spec appdef.Spec) (string, error) {
	tags, err := vcs.RemoteTags(ctx, a, dir)
	if err != nil {
		return "", err
	}
	return semver.Latest(tags, spec.Updates.Track == "prerelease"), nil
}

// cloneError turns git's terse failure into something an operator can act on.
// "Authentication failed" on a private repository almost always means the
// token, not the network.
func cloneError(spec appdef.Spec, repo appdef.Repo, err error) error {
	msg := err.Error()
	looksAuth := strings.Contains(msg, "Authentication failed") ||
		strings.Contains(msg, "could not read Username") ||
		strings.Contains(msg, "not found") ||
		strings.Contains(msg, "403") || strings.Contains(msg, "128")
	if looksAuth && spec.Auth.UsesToken() {
		return fmt.Errorf("could not clone %s. The repository is private, so this is usually the access token: check it has Contents: read on %s and has not expired. (%v)",
			repo.Name, repo.URL, err)
	}
	return err
}

func or(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
