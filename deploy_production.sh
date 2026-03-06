#!/bin/bash
set -euo pipefail

BASE_DIR="$HOME/projects/job_gate"
BACKEND_DIR="$BASE_DIR/job_gate_backend"
ADMIN_DIR="$BASE_DIR/job_gate_admin"
AI_DIR="$BASE_DIR/job_gate_ai"
COMPANIES_DIR="$BASE_DIR/job_gate_companies"
SEEKERS_DIR="$BASE_DIR/job_gate_seekers"
LANDING_DIR="$BASE_DIR/talents_landing"

ADMIN_TARGET="/var/www/html/admin"
COMPANIES_TARGET="/var/www/html/companies"
SEEKERS_TARGET="/var/www/html/job-seekers"
LANDING_TARGET="/var/www/html/landing"

echo "======================================"
echo "🚀 Deploying Job-Gate PRODUCTION..."
echo "======================================"

update_repo() {
  local DIR=$1
  echo ""
  echo "📌 Updating repo: $DIR"
  cd "$DIR"

  git fetch origin main

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)

  if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Already up to date."
  else
    echo "⚠️ Updates found."

    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "⚠️ Local changes detected → stashing..."
      git stash push -m "auto-stash before deploy $(date)" || true
    fi

    echo "⬇️ Pulling latest code..."
    git pull origin main
  fi
}

install_backend() {
  echo "📦 Installing backend dependencies..."
  cd "$BACKEND_DIR"
  npm install --omit=dev
  echo "🔄 Restarting backend..."
  pm2 restart job-gate-backend --update-env || pm2 start server.js --name job-gate-backend --update-env
}

build_admin() {
  echo "📦 Installing admin deps..."
  cd "$ADMIN_DIR"
  npm install
  echo "🏗️ Building admin..."
  export PUBLIC_URL=/admin
  npm run build

  echo "🚚 Deploy admin to $ADMIN_TARGET ..."
  sudo mkdir -p "$ADMIN_TARGET"
  sudo rm -rf "$ADMIN_TARGET"/*
  sudo cp -r build/* "$ADMIN_TARGET"/
  sudo chown -R www-data:www-data "$ADMIN_TARGET"
}

build_companies() {
  echo "📦 Installing companies deps..."
  cd "$COMPANIES_DIR"
  npm install
  echo "🏗️ Building companies..."
  export VITE_API_BASE_URL=https://talents-we-trust.tech/api
  npm run build

  echo "🚚 Deploy companies to $COMPANIES_TARGET ..."
  sudo mkdir -p "$COMPANIES_TARGET"
  sudo rm -rf "$COMPANIES_TARGET"/*
  sudo cp -r dist/* "$COMPANIES_TARGET"/
  sudo chown -R www-data:www-data "$COMPANIES_TARGET"
}

build_seekers() {
  echo "📦 Installing job-seekers deps..."
  cd "$SEEKERS_DIR"
  npm install
  echo "🏗️ Building job-seekers..."
  export VITE_API_BASE_URL=https://talents-we-trust.tech/api
  npm run build

  echo "🚚 Deploy job-seekers to $SEEKERS_TARGET ..."
  sudo mkdir -p "$SEEKERS_TARGET"
  sudo rm -rf "$SEEKERS_TARGET"/*
  sudo cp -r dist/* "$SEEKERS_TARGET"/
  sudo chown -R www-data:www-data "$SEEKERS_TARGET"
}

build_landing() {
  echo "📦 Installing landing deps..."
  cd "$LANDING_DIR"
  npm ci
  echo "🏗️ Building landing (Vite)..."
  npm run build

  if [ ! -d "$LANDING_DIR/dist" ]; then
    echo "❌ ERROR: landing build failed (dist/ missing)"
    exit 1
  fi

  echo "🚚 Deploy landing to $LANDING_TARGET (safe)..."
  sudo mkdir -p "$LANDING_TARGET"
  sudo rsync -a --delete "$LANDING_DIR/dist"/ "$LANDING_TARGET"/
  sudo chown -R www-data:www-data "$LANDING_TARGET"
  sudo find "$LANDING_TARGET" -type d -exec chmod 755 {} \;
  sudo find "$LANDING_TARGET" -type f -exec chmod 644 {} \;
}

setup_ai() {
  echo "🐍 Updating AI environment..."
  cd "$AI_DIR"

  if [ ! -d venv ]; then
    python3 -m venv venv
  fi

  source venv/bin/activate
  pip install --upgrade pip wheel setuptools
  pip install -r requirements.txt
  deactivate

  echo "🔄 Restarting AI..."
  pm2 restart job-gate-ai --update-env || pm2 start run.py --name job-gate-ai --interpreter python3 --update-env
}

restart_nginx() {
  echo "🔄 Restarting Nginx..."
  sudo nginx -t
  sudo systemctl restart nginx
}

echo ""
echo "✅ Step 1: BACKEND"
update_repo "$BACKEND_DIR"
install_backend

echo ""
echo "✅ Step 2: ADMIN"
update_repo "$ADMIN_DIR"
build_admin

echo ""
echo "✅ Step 3: COMPANIES"
update_repo "$COMPANIES_DIR"
build_companies

echo ""
echo "✅ Step 4: JOB-SEEKERS"
update_repo "$SEEKERS_DIR"
build_seekers

echo ""
echo "✅ Step 5: LANDING"
update_repo "$LANDING_DIR"
build_landing

echo ""
echo "✅ Step 6: AI"
update_repo "$AI_DIR"
setup_ai

echo ""
echo "✅ Step 7: Restart Nginx"
restart_nginx

pm2 save --force

echo ""
echo "======================================"
echo "✅ PRODUCTION Deployment DONE!"
echo "======================================"

echo ""
echo "🌍 Health Checks:"
curl -s http://127.0.0.1:5000/api/health || true
echo ""
curl -s http://127.0.0.1/ai/health || true
echo ""

echo ""
echo "📌 PM2 Status:"
pm2 status
