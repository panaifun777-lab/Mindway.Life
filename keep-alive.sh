#!/bin/bash
# Robust keep-alive: restart proxy + tunnel if either dies
# Called every minute by cron or in a loop

cd /home/z/my-project

LOG=/tmp/keepalive.log
echo "$(date): Keep-alive check" >> $LOG

# 1. Ensure ZAI proxy is running
if ! curl -s --max-time 3 http://127.0.0.1:3100/health > /dev/null 2>&1; then
  echo "$(date): ZAI proxy down, restarting..." >> $LOG
  pkill -f "zai-proxy/index.js" 2>/dev/null
  sleep 1
  cd /home/z/my-project/mini-services/zai-proxy
  nohup node index.js > /tmp/zai-proxy.log 2>&1 &
  cd /home/z/my-project
  sleep 3
fi

# 2. Ensure reverse tunnel is running
if ! pgrep -f "reverse_tunnel.py" > /dev/null 2>&1; then
  echo "$(date): Tunnel down, restarting..." >> $LOG
  nohup python3 /home/z/my-project/reverse_tunnel.py > /tmp/tunnel.log 2>&1 &
  sleep 5
fi

# 3. Verify tunnel works from VPS (optional, may slow down)
# Skip this check to avoid SSH overhead
