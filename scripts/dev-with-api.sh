#!/usr/bin/env bash
# Runs the frontend (plain Vite) and api/*.ts functions (vercel dev) TOGETHER
# against your LOCAL Docker Supabase stack, on http://localhost:5173.
#
# Why two processes instead of one `vercel dev`: vercel.json's catch-all SPA
# rewrite ("/(.*)" -> "/index.html") is meant for production routing, but
# `vercel dev` applies it to every local request too -- including Vite's own
# module/asset requests (/src/*.tsx, /@vite/client, ...). That leaves the
# React app never actually loading in the browser, even though curl-level
# API calls look fine. Running plain Vite for the frontend avoids that, and
# a second `vercel dev` instance (bound to a different port, functions only)
# serves api/*.ts; vite.config.ts proxies /api/* requests to it.
#
# Why the env dance: vercel dev's function runtime does not read .env.local
# the way Vite does for the frontend -- it only sees vars already exported in
# the shell that launches it (or, worse, pulled from the REMOTE Vercel
# project's env). This script exports .env.local into the shell first, so
# api/*.ts functions see your local Supabase URL/keys.
#
# Usage:
#   ./scripts/dev-with-api.sh
#   -> frontend:        http://localhost:5173
#   -> functions only:  http://localhost:3010  (proxied from 5173 automatically)
#
# Requires: `supabase start` already running, and .env.local present
# (see .env.example / README.md "Local setup").

set -euo pipefail
cd "$(dirname "$0")/.."

API_PORT="${1:-3010}"
FRONTEND_PORT="${2:-5173}"

if [ ! -f .env.local ]; then
  echo "Missing .env.local — copy .env.example and fill in local Supabase values first." >&2
  exit 1
fi

# Export every KEY=VALUE line from .env.local into this shell, skipping
# comments/blank lines, so both child processes inherit them.
while IFS= read -r line; do
  case "$line" in
    ''|'#'*) continue ;;
  esac
  export "${line?}"
done < .env.local

if [[ "${SUPABASE_URL:-}" != http://127.0.0.1:* && "${SUPABASE_URL:-}" != http://localhost:* ]]; then
  echo "Refusing to start: SUPABASE_URL (\"${SUPABASE_URL:-<unset>}\") does not look local." >&2
  echo "Check .env.local — this script only ever runs against a local Supabase stack." >&2
  exit 1
fi

cleanup() {
  echo "Stopping dev servers..."
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "Starting api/*.ts functions (vercel dev, --local) on port ${API_PORT} ..."
vercel dev --yes --local --listen "$API_PORT" > /tmp/dev-with-api-functions.log 2>&1 &
API_PID=$!

echo "Waiting for functions server to come up..."
for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://127.0.0.1:${API_PORT}/api/student-login" -X POST; then
    break
  fi
  sleep 1
done

echo "Starting frontend (vite) on port ${FRONTEND_PORT}, proxying /api -> ${API_PORT} ..."
VITE_DEV_API_PROXY_TARGET="http://127.0.0.1:${API_PORT}" \
  node_modules/.bin/vite --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

echo
echo "Ready: http://localhost:${FRONTEND_PORT}  (functions proxied from :${API_PORT})"
echo "Logs for the functions server: /tmp/dev-with-api-functions.log"
echo "Press Ctrl+C to stop both."
wait
