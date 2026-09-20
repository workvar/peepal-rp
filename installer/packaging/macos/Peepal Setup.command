#!/bin/bash
# Double-clickable wrapper around the setup program. It exists because macOS
# packages cannot ask questions during installation.
cd /usr/local/apps/peepal-rp/bin
echo "Peepal setup needs administrator rights."
sudo ./peepal-installer --dir /usr/local/apps/peepal-rp
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Setup finished. Opening Peepal..."
  open http://localhost/
else
  echo "Setup exited with status $status. The log is in /usr/local/apps/peepal-rp/data/logs."
fi
echo "You can close this window."
