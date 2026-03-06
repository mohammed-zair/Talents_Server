#!/usr/bin/env bash
set -euo pipefail

echo "=== PM2 status ==="
pm2 list

echo
echo "=== Backend AI/CV errors (last 400 lines) ==="
pm2 logs job-gate-backend --lines 400 --nostream | grep -Ei "cv|upload|analy|error|fail|status=4|status=5|could not extract|object has no attribute|get" || true

echo
echo "=== AI service errors (last 400 lines) ==="
pm2 logs job-gate-ai --lines 400 --nostream | grep -Ei "cv|analy|error|traceback|attributeerror|extract|400|500" || true

echo
echo "=== Registration endpoint status summary (nginx access.log) ==="
sudo grep -E "/api/auth/register-jobseeker|/api/companies/register" /var/log/nginx/access.log \
  | awk '{print $9}' \
  | sort | uniq -c | sort -nr

echo
echo "=== CV endpoint status summary (nginx access.log) ==="
sudo grep -E "/api/users/profile/cv|/api/ai/cv/analyze-file|/api/ai/cv/analyze/" /var/log/nginx/access.log \
  | awk '{print $9}' \
  | sort | uniq -c | sort -nr

echo
echo "=== Latest 4xx/5xx for register + CV endpoints ==="
sudo grep -E "/api/auth/register-jobseeker|/api/companies/register|/api/users/profile/cv|/api/ai/cv/analyze-file|/api/ai/cv/analyze/" /var/log/nginx/access.log \
  | awk '$9 ~ /^[45]/ {print $0}' \
  | tail -n 120
