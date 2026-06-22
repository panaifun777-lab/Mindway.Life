#!/bin/bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js -p 3000
  sleep 2
done
