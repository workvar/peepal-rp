#!/usr/bin/env bash
# Builds Peepal-<version>.pkg for macOS.
#
#   VERSION=1.4.0 ARCH=arm64 ./packaging/macos/build-pkg.sh
#
# Set SIGN_ID and NOTARY_PROFILE to produce a signed, notarised package;
# without them the customer sees a Gatekeeper warning on first open.
set -euo pipefail

cd "$(dirname "$0")/../.."

VERSION="${VERSION:-dev}"
ARCH="${ARCH:-arm64}"
BIN="dist/darwin_${ARCH}"
ROOT="build/pkgroot"
OUT="dist/Peepal-${VERSION}-${ARCH}.pkg"

[ -x "$BIN/peepal-installer" ] || { echo "run packaging/build.sh first"; exit 1; }

rm -rf "$ROOT" build/scripts
mkdir -p "$ROOT/usr/local/peepal/bin" build/scripts

cp "$BIN/peepal-installer" "$BIN/peepal-agent" "$ROOT/usr/local/peepal/bin/"
chmod 755 "$ROOT/usr/local/peepal/bin/"*

# The setup asks questions, and a pkg postinstall script has no terminal of
# its own, so it opens one.
cp packaging/macos/scripts/postinstall build/scripts/postinstall
cp packaging/macos/Peepal\ Setup.command "$ROOT/usr/local/peepal/bin/peepal-setup.command"
chmod 755 build/scripts/postinstall "$ROOT/usr/local/peepal/bin/peepal-setup.command"

pkgbuild \
  --root "$ROOT" \
  --scripts build/scripts \
  --identifier com.peepal.erp \
  --version "$VERSION" \
  --install-location / \
  "$OUT"

if [ -n "${SIGN_ID:-}" ]; then
  productsign --sign "$SIGN_ID" "$OUT" "$OUT.signed"
  mv "$OUT.signed" "$OUT"
  if [ -n "${NOTARY_PROFILE:-}" ]; then
    xcrun notarytool submit "$OUT" --keychain-profile "$NOTARY_PROFILE" --wait
    xcrun stapler staple "$OUT"
  fi
fi

echo "built $OUT"
