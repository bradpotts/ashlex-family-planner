#!/usr/bin/env bash
# Run as the "app" user from /opt/family-weekend after pulling new code.
# Needs a sudoers rule allowing only: systemctl restart family-weekend
set -euo pipefail
cd "$(dirname "$0")"
npm ci
npm run build
npm prune --omit=dev
sudo systemctl restart family-weekend
sleep 2
curl -fsS http://127.0.0.1:3000/api/health && echo " ← health OK"
