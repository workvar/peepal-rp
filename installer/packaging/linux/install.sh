#!/usr/bin/env bash
# One-line Linux install:
#
#   curl -fsSL https://get.peepal.example/install.sh | sudo bash
#
# Downloads the .deb or .rpm that matches this machine from the installer's
# release repository and hands over to the package manager, which triggers the
# interactive setup.
set -euo pipefail

REPO="${PEEPAL_INSTALLER_REPO:-peepal/peepal-installer}"
TOKEN="${PEEPAL_TOKEN:-}"

[ "$(id -u)" -eq 0 ] || { echo "Run this with sudo."; exit 1; }

case "$(uname -m)" in
  x86_64)  ARCH=amd64 ;;
  aarch64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

if command -v dpkg >/dev/null 2>&1; then
  EXT=deb
elif command -v rpm >/dev/null 2>&1; then
  EXT=rpm
else
  echo "No dpkg or rpm found; use the tarball install instead."
  exit 1
fi

auth=()
[ -n "$TOKEN" ] && auth=(-H "Authorization: Bearer $TOKEN")

echo "Looking up the latest Peepal installer..."
api="https://api.github.com/repos/${REPO}/releases/latest"
asset_url=$(curl -fsSL "${auth[@]}" -H "Accept: application/vnd.github+json" "$api" \
  | grep -o "\"url\": *\"[^\"]*releases/assets/[0-9]*\"[^}]*\"name\": *\"peepal_[^\"]*_${ARCH}\.${EXT}\"" \
  | head -1 | grep -o 'releases/assets/[0-9]*' | head -1)

if [ -z "$asset_url" ]; then
  echo "Could not find a ${EXT} package for ${ARCH} in ${REPO}."
  exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
echo "Downloading..."
curl -fsSL "${auth[@]}" -H "Accept: application/octet-stream" \
  -o "$tmp/peepal.$EXT" "https://api.github.com/repos/${REPO}/${asset_url}"

echo "Installing..."
if [ "$EXT" = deb ]; then
  apt-get install -y "$tmp/peepal.deb"
else
  rpm -Uvh --replacepkgs "$tmp/peepal.rpm"
fi
