#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=4096" node node_modules/.bin/next dev -p 3000 2>&1 | tee -a dev.log
  echo "[$(date)] Server crashed, restarting..." >> dev.log
  sleep 3
done
