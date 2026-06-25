#!/usr/bin/env python3
"""VPS SSH helper - run commands on remote VPS"""
import paramiko
import sys

VPS_HOST = '45.207.215.7'
VPS_USER = 'root'
VPS_PASS = 'vhrpRTTY1725'
VPS_PORT = 22

def run_remote(cmd, timeout=300):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASS, timeout=15)
    print(f"$ {cmd}", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            sys.stdout.write(stdout.channel.recv(4096).decode('utf-8', errors='replace'))
            sys.stdout.flush()
    remaining = stdout.read().decode('utf-8', errors='replace')
    if remaining: sys.stdout.write(remaining)
    client.close()
    return stdout.channel.recv_exit_status()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 vps_ssh.py '<command>' [timeout]"); sys.exit(1)
    sys.exit(run_remote(sys.argv[1], timeout=int(sys.argv[2]) if len(sys.argv) > 2 else 300))
