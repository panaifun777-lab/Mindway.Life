#!/bin/bash
# Supervisor: keep ZAI proxy + reverse tunnel alive
cd /home/z/my-project

# 1. Start ZAI proxy if not running
if ! pgrep -f "mini-services/zai-proxy/index.js" > /dev/null; then
  echo "[$(date)] Starting ZAI proxy..."
  cd /home/z/my-project/mini-services/zai-proxy
  nohup node index.js > /tmp/zai-proxy.log 2>&1 &
  echo $! > /tmp/zai-proxy.pid
  cd /home/z/my-project
  sleep 3
fi

# 2. Start reverse tunnel if not running
if ! pgrep -f "reverse_tunnel.py" > /dev/null; then
  echo "[$(date)] Starting reverse tunnel..."
  nohup python3 /home/z/my-project/reverse_tunnel.py > /tmp/tunnel.log 2>&1 &
  echo $! > /tmp/tunnel.pid
  sleep 5
fi

# 3. Verify both are running
PROXY_ALIVE=$(pgrep -f "mini-services/zai-proxy/index.js" | head -1)
TUNNEL_ALIVE=$(pgrep -f "reverse_tunnel.py" | head -1)
echo "[$(date)] ZAI proxy PID: $PROXY_ALIVE, Tunnel PID: $TUNNEL_ALIVE"
