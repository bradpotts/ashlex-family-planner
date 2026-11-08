#!/usr/bin/env bash
# One-shot server setup for a fresh Ubuntu host. Run as root from the repo root:
#   sudo bash deploy/setup-server.sh
# Safe to re-run. Never touches sshd config, root credentials, or SSH keys.
set -euo pipefail

APP_DIR=/opt/family-weekend
APP_USER=app

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo bash deploy/setup-server.sh)" >&2
  exit 1
fi

echo "==> Firewall: allow SSH first so admin access is never lost, then HTTP"
apt-get update -y
apt-get install -y ufw curl rsync ca-certificates
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable

echo "==> Node 24 + nginx"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y nginx

echo "==> Unprivileged service user"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

echo "==> App files -> $APP_DIR"
mkdir -p "$APP_DIR"
rsync -a --delete --exclude node_modules --exclude dist --exclude .git --exclude .env ./ "$APP_DIR"/
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> Install + build as $APP_USER"
cd "$APP_DIR"
sudo -u "$APP_USER" -H npm ci --no-audit --no-fund
sudo -u "$APP_USER" -H npm run build
sudo -u "$APP_USER" -H npm prune --omit=dev --no-audit --no-fund

echo "==> systemd service"
cp deploy/family-weekend.service /etc/systemd/system/family-weekend.service
systemctl daemon-reload
systemctl enable family-weekend
systemctl restart family-weekend

echo "==> Let the app user restart only its own service (used by deploy.sh)"
echo "$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart family-weekend" > /etc/sudoers.d/family-weekend
chmod 440 /etc/sudoers.d/family-weekend
visudo -cf /etc/sudoers.d/family-weekend

echo "==> nginx"
cp deploy/nginx.conf /etc/nginx/sites-available/family-weekend
ln -sf /etc/nginx/sites-available/family-weekend /etc/nginx/sites-enabled/family-weekend
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

echo "==> Checks"
sleep 2
curl -fsS http://127.0.0.1:3000/api/health && echo "  <- node OK"
curl -fsS -o /dev/null -w "  nginx / -> HTTP %{http_code}\n" http://127.0.0.1/
ss -tlnp | grep -E ':(22|80|3000)\b' || true
ufw status
echo "Done. Open http://<server-ip>/ in a browser."
