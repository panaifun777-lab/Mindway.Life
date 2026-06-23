"""
Reverse SSH tunnel: VPS:3199 -> sandbox:3100 (ZAI proxy)
Uses paramiko directly for precise control over reverse forwarding.
"""
import paramiko
import socket
import select
import threading
import time
import sys
import os

VPS_HOST = '45.207.215.7'
VPS_USER = 'root'
VPS_PASS = 'vhrpRTTY1725'
VPS_PORT = 22
REMOTE_PORT = 3199
LOCAL_HOST = '127.0.0.1'
LOCAL_PORT = 3100

def handler(chan, local_host, local_port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect((local_host, local_port))
    except Exception as e:
        print(f'[Tunnel] Forward to {local_host}:{local_port} failed: {e}', flush=True)
        chan.close()
        return
    
    print(f'[Tunnel] Forwarding established', flush=True)
    while True:
        r, w, x = select.select([sock, chan], [], [])
        if sock in r:
            data = sock.recv(4096)
            if not data:
                break
            chan.send(data)
        if chan in r:
            data = chan.recv(4096)
            if not data:
                break
            sock.send(data)
    chan.close()
    sock.close()

def main():
    while True:
        try:
            print(f'[Tunnel] Connecting to {VPS_HOST}:{VPS_PORT}...', flush=True)
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASS, timeout=30)
            
            transport = client.get_transport()
            transport.set_keepalive(30)
            
            # Request reverse port forwarding (bind to 0.0.0.0 on VPS)
            print(f'[Tunnel] Requesting port forward 0.0.0.0:{REMOTE_PORT}...', flush=True)
            transport.request_port_forward('0.0.0.0', REMOTE_PORT)
            print(f'[Tunnel] ✅ Reverse tunnel active: VPS:0.0.0.0:{REMOTE_PORT} -> sandbox:{LOCAL_HOST}:{LOCAL_PORT}', flush=True)
            
            # Accept incoming connections
            while True:
                chan = transport.accept(1000)
                if chan is None:
                    continue
                thr = threading.Thread(target=handler, args=(chan, LOCAL_HOST, LOCAL_PORT))
                thr.daemon = True
                thr.start()
                
        except Exception as e:
            print(f'[Tunnel] Error: {e}. Retrying in 5s...', flush=True)
            time.sleep(5)

if __name__ == '__main__':
    main()
