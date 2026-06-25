#!/usr/bin/env python3
"""
Persistent supervisor for ZAI proxy + reverse tunnel.
Runs in foreground, restarts components if they die.
"""
import subprocess
import time
import socket
import os
import sys
import signal

PROXY_SCRIPT = '/home/z/my-project/mini-services/zai-proxy/index.js'
TUNNEL_SCRIPT = '/home/z/my-project/reverse_tunnel.py'
PROXY_LOG = '/tmp/zai-proxy.log'
TUNNEL_LOG = '/tmp/tunnel.log'

proxy_proc = None
tunnel_proc = None

def is_port_open(host, port, timeout=2):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except:
        return False

def start_proxy():
    global proxy_proc
    if proxy_proc and proxy_proc.poll() is None:
        return
    print(f"[{time.strftime('%H:%M:%S')}] Starting ZAI proxy...", flush=True)
    with open(PROXY_LOG, 'w') as f:
        proxy_proc = subprocess.Popen(
            ['node', PROXY_SCRIPT],
            stdout=f, stderr=subprocess.STDOUT,
            cwd='/home/z/my-project/mini-services/zai-proxy'
        )

def start_tunnel():
    global tunnel_proc
    if tunnel_proc and tunnel_proc.poll() is None:
        return
    print(f"[{time.strftime('%H:%M:%S')}] Starting reverse tunnel...", flush=True)
    with open(TUNNEL_LOG, 'w') as f:
        tunnel_proc = subprocess.Popen(
            ['python3', TUNNEL_SCRIPT],
            stdout=f, stderr=subprocess.STDOUT
        )

def cleanup(signum=None, frame=None):
    print(f"\n[{time.strftime('%H:%M:%S')}] Cleaning up...", flush=True)
    if proxy_proc: proxy_proc.terminate()
    if tunnel_proc: tunnel_proc.terminate()
    sys.exit(0)

def main():
    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)
    
    print(f"[{time.strftime('%H:%M:%S')}] Supervisor started", flush=True)
    
    while True:
        # Check ZAI proxy
        if not is_port_open('127.0.0.1', 3100):
            print(f"[{time.strftime('%H:%M:%S')}] ZAI proxy down, restarting...", flush=True)
            if proxy_proc: proxy_proc.terminate()
            start_proxy()
            time.sleep(3)
        
        # Check tunnel (check if process alive)
        if tunnel_proc is None or tunnel_proc.poll() is not None:
            print(f"[{time.strftime('%H:%M:%S')}] Tunnel down, restarting...", flush=True)
            start_tunnel()
            time.sleep(5)
        
        # Check tunnel log for errors
        try:
            with open(TUNNEL_LOG, 'r') as f:
                log_tail = f.read()[-500:]
            if 'Error' in log_tail and 'active: True' not in log_tail:
                # Tunnel might be stuck, restart
                pass
        except:
            pass
        
        time.sleep(10)

if __name__ == '__main__':
    main()
