#!/usr/bin/env bash
# Stops and cleans up everything started by scripts/dev-with-api.sh:
#   - the `vercel dev` functions server (and its own internal Vite child)
#   - the standalone frontend Vite dev server
#
# Safe to run any time, including when nothing is running (it just reports
# "nothing to stop"). Does NOT touch Docker/Supabase — use `supabase stop`
# separately if you want to stop the local database too.
#
# Usage:
#   ./scripts/dev-stop.sh

set -uo pipefail

echo "Looking for local dev processes..."

# Matches:
#   - "vercel dev ..."                     -> the functions server
#   - "node_modules/.bin/vite ..."         -> the standalone frontend AND
#                                              vercel dev's own internal Vite
#                                              child (it launches one too)
patterns=("vercel dev" "node_modules/.bin/vite")

found_any=false
for pattern in "${patterns[@]}"; do
  pids=$(pgrep -f "$pattern" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    found_any=true
    echo "Stopping \"$pattern\" (pid: $(echo "$pids" | tr '\n' ' '))"
    pkill -f "$pattern" 2>/dev/null
  fi
done

if [ "$found_any" = false ]; then
  echo "Nothing to stop — no local dev servers were running."
  exit 0
fi

sleep 1

# Anything still alive after a plain kill gets a harder nudge.
still_running=false
for pattern in "${patterns[@]}"; do
  if pgrep -f "$pattern" >/dev/null 2>&1; then
    still_running=true
    echo "Still running, forcing: \"$pattern\""
    pkill -9 -f "$pattern" 2>/dev/null
  fi
done
[ "$still_running" = true ] && sleep 1

if pgrep -f "vercel dev" >/dev/null 2>&1 || pgrep -f "node_modules/.bin/vite" >/dev/null 2>&1; then
  echo "Warning: some processes may still be running — check 'ps aux | grep -E \"vite|vercel dev\"'." >&2
  exit 1
fi

echo "Stopped. Ports 3010 and 5173 are free."
echo "(Local Supabase/Docker is untouched — run 'supabase stop' separately if you want that down too.)"
