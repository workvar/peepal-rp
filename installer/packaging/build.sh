#!/usr/bin/env bash
# Cross-compiles peepal-installer and peepal-agent for every supported client
# platform into dist/<os>_<arch>/. Run from the installer directory.
#
#   VERSION=1.4.0 PEEPAL_TOKEN=ghp_xxx ./packaging/build.sh
#
# PEEPAL_TOKEN is the read-only fine-grained PAT with Contents:read on both
# release repositories. It is baked into the binary so client machines can
# download private assets; treat every built artifact as a secret.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${VERSION:-dev}"
BACKEND_REPO="${BACKEND_REPO:-peepal/peepal-backend}"
FRONTEND_REPO="${FRONTEND_REPO:-peepal/peepal-frontend}"
CHANNEL="${CHANNEL:-stable}"
TOKEN="${PEEPAL_TOKEN:-}"

PKG=github.com/peepal/installer/internal/buildinfo
LDFLAGS="-s -w"
LDFLAGS="$LDFLAGS -X $PKG.Version=$VERSION"
LDFLAGS="$LDFLAGS -X $PKG.BackendRepo=$BACKEND_REPO"
LDFLAGS="$LDFLAGS -X $PKG.FrontendRepo=$FRONTEND_REPO"
LDFLAGS="$LDFLAGS -X $PKG.Channel=$CHANNEL"
LDFLAGS="$LDFLAGS -X $PKG.Token=$TOKEN"

TARGETS="${TARGETS:-linux/amd64 linux/arm64 darwin/amd64 darwin/arm64 windows/amd64}"

rm -rf dist
for target in $TARGETS; do
  os="${target%/*}"; arch="${target#*/}"
  out="dist/${os}_${arch}"
  mkdir -p "$out"
  ext=""; [ "$os" = windows ] && ext=".exe"
  for cmd in peepal-installer peepal-agent; do
    echo "building $cmd for $target"
    CGO_ENABLED=0 GOOS="$os" GOARCH="$arch" \
      go build -trimpath -ldflags "$LDFLAGS" -o "$out/${cmd}${ext}" "./cmd/$cmd"
  done
done

echo
echo "binaries in dist/:"
find dist -type f -exec ls -lh {} \; | awk '{print "  " $9 " (" $5 ")"}'
