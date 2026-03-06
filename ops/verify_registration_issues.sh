#!/usr/bin/env bash
set -euo pipefail

WINDOW_HOURS="${1:-24}"
SINCE="$(date -d "${WINDOW_HOURS} hours ago" '+%d/%b/%Y:%H:%M:%S')"

echo "=== Registration traffic since ${SINCE} (${WINDOW_HOURS}h) ==="
sudo awk -v since="$SINCE" '
  $4 >= "["since && ($7 ~ /\/api\/auth\/register-jobseeker/ || $7 ~ /\/api\/companies\/register/) { print }
' /var/log/nginx/access.log > /tmp/reg_window.log

if [[ ! -s /tmp/reg_window.log ]]; then
  echo "No registration requests found in window."
  exit 0
fi

echo
echo "Status counts:"
awk '{print $9}' /tmp/reg_window.log | sort | uniq -c | sort -nr

echo
echo "Top failing lines (4xx/5xx):"
awk '$9 ~ /^[45]/ {print}' /tmp/reg_window.log | tail -n 120

echo
echo "Tip: run again for 72h -> ./ops/verify_registration_issues.sh 72"
