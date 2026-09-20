#!/bin/sh
# Runs after dpkg/rpm unpacks the files. When a terminal is attached (the
# normal "sudo apt install ./peepal.deb" case) the setup runs immediately and
# asks its questions; in an automated pipeline it prints what to run instead.
set -e

SETUP=/usr/local/apps/peepal-rp/bin/peepal-installer

if [ -t 0 ] && [ -t 1 ]; then
  "$SETUP" --dir /opt/apps/peepal-rp
else
  cat <<'MSG'

  Peepal is unpacked but not yet configured.
  Finish the setup with:

      sudo peepal-setup

  Or run it without questions:

      sudo peepal-setup --unattended \
           --admin-email admin@example.edu --admin-password 'choose-one'

MSG
fi
exit 0
