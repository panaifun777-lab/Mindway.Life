#!/usr/bin/env python3
"""VPS SSH helper - run commands on remote VPS"""
import paramiko
import sys
import os

VPS_HOST = '45.207.215.7'
VPS_USER = 'root'
VPS_PASS = 'vhrpRTTY1725'
VPS_PORT = 22

def run_remote(cmd, timeout=300):
    """Run command on VPS and print output"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASS, timeout=15)
    
    print(f"$ {cmd}", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    
    # Stream output
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            data = stdout.channel.recv(4096).decode('utf-8', errors='replace')
            sys.stdout.write(data)
            sys.stdout.flush()
        if stdout.channel.recv_stderr_ready():
            data = stdout.channel.recv_stderr(4096).decode('utf-8', errors='replace')
            sys.stderr.write(data)
            sys.stderr.flush()
    
    exit_code = stdout.channel.recv_exit_status()
    # Get any remaining output
    remaining = stdout.read().decode('utf-8', errors='replace')
    if remaining:
        sys.stdout.write(remaining)
    
    client.close()
    return exit_code

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 vps_ssh.py '<command>'")
        sys.exit(1)
    
    cmd = sys.argv[1]
    exit_code = run_remote(cmd, timeout=int(sys.argv[2]) if len(sys.argv) > 2 else 300)
    sys.exit(exit_code)
