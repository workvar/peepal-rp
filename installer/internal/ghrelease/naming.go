package ghrelease

import "runtime"

// BackendAsset is the per-platform backend tarball name a release must carry,
// e.g. "peepal-backend_linux_amd64.tar.gz".
func BackendAsset() string {
	return "peepal-backend_" + runtime.GOOS + "_" + runtime.GOARCH + ".tar.gz"
}

// FrontendAsset is the Next.js standalone bundle. It is pure JavaScript, so a
// single artifact serves every platform; the Node runtime ships separately.
func FrontendAsset() string { return "peepal-frontend.tar.gz" }
