#!/bin/bash
cd /home/z/my-project
while true; do
  PORT=3000 NODE_OPTIONS="--max-old-space-size=2048" node .next/standalone/server.js
  echo "$(date): Server exited, restarting in 3s..." >> /tmp/restart.log
  sleep 3
done
