package vcs

import (
	"encoding/base64"
	"net/url"
	"strings"
)

// Auth is how the panel proves it may read a private repository.
//
// The token is passed to each git invocation as an `http.extraheader`
// override rather than being written into the remote URL. That matters:
// a URL credential ends up in .git/config in plain text, in every log line
// git prints and in the output of `git remote -v`, where a support engineer
// or a backup would pick it up. The header form lives only in the argument
// list of one process.
type Auth struct {
	// Token is a GitHub fine-grained PAT, a classic PAT with `repo`, or a
	// GitHub App installation token. Empty means an anonymous clone.
	Token string
	// User is the basic-auth username. GitHub ignores it for PATs;
	// x-access-token is required for App installation tokens.
	User string
}

// Args returns the global git flags that carry the credential. They go before
// the subcommand: git -c http.extraheader=... clone ...
func (a Auth) Args() []string {
	if a.Token == "" {
		return nil
	}
	user := a.User
	if user == "" {
		user = "x-access-token"
	}
	basic := base64.StdEncoding.EncodeToString([]byte(user + ":" + a.Token))
	return []string{"-c", "http.extraheader=Authorization: Basic " + basic}
}

// Redact hides a token that leaked into a URL or an error message, so nothing
// the panel logs or ships to the hub carries the credential.
func (a Auth) Redact(s string) string {
	if a.Token == "" {
		return s
	}
	return strings.ReplaceAll(s, a.Token, "***")
}

// NeedsToken reports whether a URL is one a token would apply to. An ssh://
// or git@ remote authenticates with a deploy key instead, and passing a
// header there is meaningless.
func NeedsToken(rawURL string) bool {
	if strings.HasPrefix(rawURL, "git@") || strings.HasPrefix(rawURL, "ssh://") {
		return false
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	return u.Scheme == "https" || u.Scheme == "http"
}

// OwnerRepo splits a GitHub URL into its owner and repository names, which is
// what the token check needs. It returns empty strings for anything that is
// not recognisably a GitHub HTTPS or SSH remote.
func OwnerRepo(rawURL string) (owner, repo string) {
	s := strings.TrimSuffix(rawURL, ".git")
	if i := strings.Index(s, "github.com"); i >= 0 {
		s = s[i+len("github.com"):]
	} else {
		return "", ""
	}
	s = strings.TrimLeft(s, ":/")
	parts := strings.Split(s, "/")
	if len(parts) < 2 {
		return "", ""
	}
	return parts[0], parts[1]
}
