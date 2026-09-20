#!/bin/sh
# Runs after dpkg/rpm unpacks the files. When a terminal is attached (the
# normal "sudo apt install ./peepal.deb" case) the setup runs immediately and
# asks its questions; in an automated pipeline it prints what to run instead.
#
# Always exit 0: a failed wizard must not leave the package unconfigured, or
# apt is bricked on the next command (dpkg lock / --configure loop).
SETUP=/usr/local/apps/peepal-rp/bin/peepal-installer

if [ -t 0 ] && [ -t 1 ]; then
  if ! "$SETUP" --dir /opt/apps/peepal-rp; then
    cat <<'MSG'

  Setup did not finish. The Peepal package is installed; finish with:

      sudo peepal-setup

MSG
  fi
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
