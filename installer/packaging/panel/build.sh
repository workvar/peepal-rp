#!/usr/bin/env bash
# Builds the control panel and the hub for Linux (and macOS).
#
#   VERSION=1.0.0 ./packaging/panel/build.sh
#
# The panel is a Wails application, so it needs the GTK and WebKit development
# packages on the build machine. The hub is a plain Go binary and needs
# nothing. Both land in dist/.
set -euo pipefail

VERSION="${VERSION:-dev}"
# REPO_TOKEN bakes read access to the private repository into the panel, so a
# customer never has to be handed a credential. Treat the resulting artefact
# as a secret and rotate the token when a relationship ends.
REPO_TOKEN="${REPO_TOKEN:-}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/dist"
LDFLAGS="-s -w -X github.com/peepal/installer/internal/buildinfo.Version=$VERSION"
if [ -n "$REPO_TOKEN" ]; then
  LDFLAGS="$LDFLAGS -X github.com/peepal/installer/internal/setup.BuiltInToken=$REPO_TOKEN"
  echo "note: this build embeds a repository token; treat the artefacts as secrets"
fi

mkdir -p "$OUT"
cd "$ROOT"

if ! command -v wails >/dev/null 2>&1; then
  echo "installing the wails CLI..."
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  export PATH="$PATH:$(go env GOPATH)/bin"
fi

echo "==> control panel $VERSION"
( cd cmd/peepal-panel && wails build -clean -ldflags "$LDFLAGS" -o "peepal-panel" )
cp "cmd/peepal-panel/build/bin/peepal-panel" "$OUT/peepal-panel"

echo "==> hub $VERSION"
CGO_ENABLED=0 go build -ldflags "$LDFLAGS" -o "$OUT/peepal-hub" ./cmd/peepal-hub

# The definition ships next to the binary; the panel looks for it there.
cp "$ROOT/peepal.yml" "$OUT/app.yml"

echo
echo "built:"
ls -lh "$OUT"
