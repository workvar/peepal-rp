#!/bin/sh
# Stops and unregisters the service before the files disappear. The database
# and uploaded files in /opt/apps/peepal-rp/data are deliberately left behind.
set -e
SETUP=/usr/local/apps/peepal-rp/bin/peepal-installer
if [ -x "$SETUP" ]; then
  "$SETUP" --uninstall --unattended --keep-data --dir /opt/apps/peepal-rp || true
fi
exit 0
