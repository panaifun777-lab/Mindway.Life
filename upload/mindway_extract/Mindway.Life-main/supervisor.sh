#!/bin/bash
cd /home/z/my-project

# Start proxy (it's lightweight, won't crash)
node /home/z/my-project/proxy.js &
PROXY_PID=$!
echo "Proxy PID: $PROXY_PID"

# Next.js restart loop
while true; do
  echo "$(date): Starting Next.js..." >> /tmp/supervisor.log
  NODE_OPTIONS="--max-old-space-size=4096" npx next dev -p 3001 --webpack >> /tmp/nx-sup.log 2>&1
  EXIT=$?
  echo "$(date): Next.js exited with code $EXIT" >> /tmp/supervisor.log
  sleep 5
done
