#!/usr/bin/env bash
# Serves the PRODUCTION BUILD (dist/) locally with /api routing, for the local
# release-candidate rehearsal. Mirrors scripts/dev-with-api.sh but uses the
# built bundle via `vite preview` instead of the dev server.
#
#   frontend (vite preview, serves dist/) :4173  ->  proxies /api -> :3010
#   api functions (vercel dev, api/*.ts)  :3010
#
# Local serving only. This is NOT proof of hosted production acceptance; hosted
# routing is handled by vercel.json on Vercel.
#
# Note: `vite preview` binds IPv6 localhost. Open http://localhost:4173
# (not http://127.0.0.1:4173).
#
# Requires: `supabase start` running, .env.local present, and a build
# (this script runs `npm run build` for you).
#
# Usage:  npm run preview:api      (or ./scripts/preview-with-api.sh)

set -euo pipefail
cd "$(dirname "$0")/.."

API_PORT="${1:-3010}"
PREVIEW_PORT="${2:-4173}"

if [ ! -f .env.local ]; then
  echo "Missing .env.local — copy .env.example and fill in local Supabase values first." >&2
  exit 1
fi

# Export every KEY=VALUE line from .env.local so both child processes inherit them.
while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; esac
  export "${line?}"
done < .env.local

if [[ "${SUPABASE_URL:-}" != http://127.0.0.1:* && "${SUPABASE_URL:-}" != http://localhost:* ]]; then
  echo "Refusing to start: SUPABASE_URL (\"${SUPABASE_URL:-<unset>}\") does not look local." >&2
  echo "This script only ever runs against a local Supabase stack." >&2
  exit 1
fi

echo "Building the production bundle (npm run build)..."
npm run build

cleanup() {
  echo "Stopping preview servers..."
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null
  [[ -n "${PREVIEW_PID:-}" ]] && kill "$PREVIEW_PID" 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "Starting api/*.ts functions (vercel dev) on port ${API_PORT} ..."
vercel dev --yes --local --listen "$API_PORT" > /tmp/preview-with-api-functions.log 2>&1 &
API_PID=$!

echo "Waiting for the functions server..."
for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://127.0.0.1:${API_PORT}/api/student-login" -X POST; then break; fi
  sleep 1
done

echo "Serving the production build (vite preview) on port ${PREVIEW_PORT}, proxying /api -> ${API_PORT} ..."
VITE_DEV_API_PROXY_TARGET="http://127.0.0.1:${API_PORT}" \
  node_modules/.bin/vite preview --port "$PREVIEW_PORT" &
PREVIEW_PID=$!

echo
echo "Ready: http://localhost:${PREVIEW_PORT}   (production build; functions proxied from :${API_PORT})"
echo "Student login: http://localhost:${PREVIEW_PORT}/student   Teacher: http://localhost:${PREVIEW_PORT}/admin"
echo "Functions log: /tmp/preview-with-api-functions.log"
echo "Press Ctrl+C to stop both."
wait
