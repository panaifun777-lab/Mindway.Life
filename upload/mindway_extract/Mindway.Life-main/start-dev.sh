#!/bin/bash
# Dev server with auto-restart
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js dev server..." >> dev.log
  NODE_OPTIONS="--max-old-space-size=4096" node node_modules/.bin/next dev -p 3000 >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> dev.log
  sleep 3
done
