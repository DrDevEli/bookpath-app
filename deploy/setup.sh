#!/usr/bin/env bash
#
# BookPath production setup — turnkey provisioning for an Ubuntu VPS
# (Hetzner / Hostinger KVM / DigitalOcean / any Ubuntu 22.04 or 24.04 box).
#
# Usage (as root, on a fresh VPS):
#   ./deploy/setup.sh bookpath.org
#
# What it does, in order:
#   1. Installs nginx, docker, certbot, Node 20 (via NodeSource)
#   2. Clones the repo to /opt/bookpath
#   3. Starts MongoDB + Redis (docker compose, bound to 127.0.0.1 only)
#   4. Writes backend/.env from the template (you fill secrets afterward)
#   5. Builds the frontend + starts the backend under PM2
#   6. Installs the nginx site + SSL via certbot
#
# SECURITY NOTE: databases bind to 127.0.0.1 only — never exposed publicly.

set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="${REPO_URL:-https://github.com/DrDevEli/bookpath-app.git}"
APP_DIR="/opt/bookpath"

if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>   e.g. $0 bookpath.org"
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (or with sudo)."
  exit 1
fi

echo "==> Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx docker.io docker-compose-plugin certbot python3-certbot-nginx curl git gnupg

# Node 20 via NodeSource (skip if node >= 18 already present)
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -lt 18 ]; then
  echo "==> Installing Node 20 (NodeSource)..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Cloning repo to $APP_DIR..."
if [ -d "$APP_DIR/.git" ]; then
  (cd "$APP_DIR" && git pull --ff-only)
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Starting MongoDB + Redis (docker compose)..."
(cd "$APP_DIR/deploy" && docker compose up -d)

echo "==> Writing backend/.env (fill the CHANGE_ME secrets next)..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/deploy/.env.production.example" "$APP_DIR/backend/.env"
  echo "    -> backend/.env created. EDIT IT and set JWT_SECRET, SESSION_SECRET,"
  echo "       GOOGLE_BOOKS_API_KEY, OPENAI_API_KEY before going live."
else
  echo "    -> backend/.env already exists, leaving it untouched."
fi

echo "==> Installing backend deps + building frontend..."
(cd "$APP_DIR/backend" && npm ci --omit=dev || npm install --omit=dev)
(cd "$APP_DIR/frontend" && npm ci || npm install)
(cd "$APP_DIR/frontend" && CI=false npm run build)

echo "==> Starting backend under PM2..."
(cd "$APP_DIR" && pm2 start deploy/ecosystem.config.js)
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> Installing nginx site config..."
cp "$APP_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/bookpath"
ln -sf "/etc/nginx/sites-available/bookpath" "/etc/nginx/sites-enabled/bookpath"
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Issuing SSL certificate (certbot)..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos \
  --register-unsafely-without-email --redirect || \
  echo "    -> certbot skipped/failed. Re-run after DNS points at this VPS."

echo "==> Health check..."
sleep 2
curl -fsS "http://127.0.0.1:3001/health" && echo "" && echo "Backend healthy."

echo ""
echo "=============================================================="
echo " Done. Next manual steps:"
echo "  1. Point DNS: A record  $DOMAIN  ->  <this VPS IP>"
echo "  2.          : A record  www      ->  <this VPS IP>"
echo "  3. Edit $APP_DIR/backend/.env and set the CHANGE_ME secrets,"
echo "     then:  pm2 restart bookpath-backend"
echo "  4. Submit https://$DOMAIN/sitemap.xml in Google Search Console"
echo "=============================================================="
