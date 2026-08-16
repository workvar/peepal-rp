// Package buildinfo holds values stamped in at link time with -ldflags.
// Nothing here is a secret at rest in git; the release token is injected by CI.
package buildinfo

var (
	// Version of the installer/agent itself (e.g. "1.4.0").
	Version = "dev"

	// BackendRepo and FrontendRepo are "owner/name" GitHub slugs. The app is
	// split across two private repositories, each cutting its own tags.
	BackendRepo  = "peepal/peepal-backend"
	FrontendRepo = "peepal/peepal-frontend"

	// Token is a read-only fine-grained PAT with "Contents: read" on both
	// repos. Injected at build time by CI so client machines can download
	// private release assets without a GitHub account.
	Token = ""

	// Channel selects which releases are considered. "stable" ignores
	// prereleases; "beta" accepts them.
	Channel = "stable"
)

// Prereleases reports whether the current channel accepts prerelease tags.
func Prereleases() bool { return Channel != "stable" }
