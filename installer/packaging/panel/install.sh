#!/usr/bin/env bash
# Linux installation script.
#
#   sudo ./install.sh                 # install and open the control panel
#   sudo ./install.sh --headless      # install and run without a window
#
# It puts the panel and the definition in place, installs the desktop entry,
# and hands over to the panel, which does the real work: prerequisites,
# clone, database, environment, build and service registration.
set -euo pipefail

APP_NAME="peepal"
DISPLAY_NAME="Peepal ERP"
PREFIX="/opt/$APP_NAME"
BIN="$PREFIX/bin"
HERE="$(cd "$(dirname "$0")" && pwd)"
HEADLESS=0

for arg in "$@"; do
  case "$arg" in
    --headless) HEADLESS=1 ;;
    --prefix=*) PREFIX="${arg#*=}"; BIN="$PREFIX/bin" ;;
    -h|--help)
      sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this with sudo: the panel installs packages and registers a service." >&2
  exit 1
fi

# The panel installs git, Go and Node itself, but it needs a package manager
# or curl to do it. Fail early with a readable message rather than halfway in.
if ! command -v apt-get >/dev/null && ! command -v dnf >/dev/null && \
   ! command -v yum >/dev/null && ! command -v pacman >/dev/null && \
   ! command -v zypper >/dev/null && ! command -v apk >/dev/null; then
  echo "No supported package manager found." >&2
  echo "Install git, Go 1.22+ and Node 20+ by hand, then re-run this script." >&2
fi

echo "==> Installing $DISPLAY_NAME control panel into $PREFIX"
install -d "$BIN" "$PREFIX/share"
install -m 0755 "$HERE/peepal-panel" "$BIN/peepal-panel"
install -m 0644 "$HERE/app.yml" "$PREFIX/share/app.yml"
ln -sf "$BIN/peepal-panel" /usr/local/bin/peepal-panel

# A desktop entry, so the operator finds it in the applications menu rather
# than having to remember a command.
if [ -d /usr/share/applications ]; then
  cat > /usr/share/applications/peepal-panel.desktop <<EOF
[Desktop Entry]
Type=Application
Name=$DISPLAY_NAME Control Panel
Comment=Install, supervise and monitor $DISPLAY_NAME
Exec=pkexec $BIN/peepal-panel -config $PREFIX/share/app.yml
Icon=utilities-system-monitor
Categories=System;Settings;
Terminal=false
EOF
fi

echo "==> Starting the control panel"
if [ "$HEADLESS" -eq 1 ]; then
  exec "$BIN/peepal-panel" -headless -config "$PREFIX/share/app.yml"
fi

# Wails needs a session bus and a display; fall back to a clear message
# instead of a crash on a server with no desktop.
if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
  cat <<EOF

This machine has no graphical session, so the control panel cannot open a
window. On a server, install once from a machine that has one, or run:

  sudo $BIN/peepal-panel -headless -config $PREFIX/share/app.yml

EOF
  exit 0
fi

exec "$BIN/peepal-panel" -config "$PREFIX/share/app.yml"
