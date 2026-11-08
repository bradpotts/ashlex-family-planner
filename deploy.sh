#!/bin/bash
set -e
cd /opt/family-weekend
sudo -u app git pull
sudo -u app npm ci
sudo -u app npm run build
systemctl restart family-weekend
sleep 2
curl -s http://127.0.0.1/api/health; echo
