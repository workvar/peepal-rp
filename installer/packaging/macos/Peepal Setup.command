#!/bin/bash
# Double-clickable wrapper around the setup program. It exists because macOS
# packages cannot ask questions during installation.
cd /usr/local/peepal/bin
echo "Peepal setup needs administrator rights."
sudo ./peepal-installer --dir /usr/local/peepal
status=$?
echo
if [ $status -eq 0 ]; then
  echo "Setup finished. Opening Peepal..."
  open http://localhost/
else
  echo "Setup exited with status $status. The log is in /usr/local/peepal/data/logs."
fi
echo "You can close this window."
