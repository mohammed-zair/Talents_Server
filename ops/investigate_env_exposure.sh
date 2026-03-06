#!/usr/bin/env bash
set -euo pipefail

TARGET_DATE="${1:-06/Mar/2026}"
TARGET_TIME="${2:-03:50}"

echo "=== Check suspicious /api/.env requests around ${TARGET_DATE} ${TARGET_TIME} ==="
sudo grep "/api/.env" /var/log/nginx/access.log | grep "${TARGET_DATE}:${TARGET_TIME}" || true

echo
echo "=== Any /api/.env requests (all) ==="
sudo grep "/api/.env" /var/log/nginx/access.log || true

echo
echo "=== Nginx deny rules for dotfiles (.env/.git) ==="
sudo nginx -T | grep -Ei "location|deny all|\\.env|\\.git|dotfile" || true

echo
echo "=== App/static paths that might expose dotfiles ==="
sudo find /var/www/html -maxdepth 4 \( -name ".env" -o -name ".git" \) 2>/dev/null || true

echo
echo "=== Backend project dotfiles (should never be web-served) ==="
sudo find /home/MZR/projects/job_gate -maxdepth 5 \( -name ".env" -o -name ".git" \) 2>/dev/null || true
