#!/bin/sh
# Stops and unregisters the service before the files disappear. The database
# and uploaded files in /opt/peepal/data are deliberately left behind.
set -e
SETUP=/usr/local/peepal/bin/peepal-installer
if [ -x "$SETUP" ]; then
  "$SETUP" --uninstall --unattended --keep-data --dir /opt/peepal || true
fi
exit 0
