#!/usr/bin/env bash
# Runs the AI Session Intake INTEGRATION tests (real endpoint + real Supabase,
# real LLM when OPENAI_API_KEY is configured). Unlike `npm test` (fast,
# deterministic, provider/DB mocked), this drives the live local stack exactly
# as a student's browser would.
#
# Preconditions (the script checks and explains each):
#   1. `supabase start` is running
#   2. the fixture is seeded  (npm run seed:local)
#   3. the API server is up    (npm run dev:api, i.e. scripts/dev-with-api.sh)
#
# It exports .env.local so both this shell AND the test process see
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. The OpenAI key is only ever used by
# the server process; the tests never read or print it.
#
# Usage:  npm run test:integration

set -euo pipefail
cd "$(dirname "$0")/.."

API_PORT="${INTAKE_API_PORT:-3010}"
API_BASE="http://127.0.0.1:${API_PORT}"

fail() { echo "✗ $*" >&2; exit 1; }

[ -f .env.local ] || fail "Missing .env.local (see README 'Local setup')."

# Export .env.local into this shell (skipping comments/blank lines) so the
# test process inherits SUPABASE_* for read-only fixture lookups.
while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; esac
  export "${line?}"
done < .env.local

if [[ "${SUPABASE_URL:-}" != http://127.0.0.1:* && "${SUPABASE_URL:-}" != http://localhost:* ]]; then
  fail "SUPABASE_URL (\"${SUPABASE_URL:-<unset>}\") is not local. Integration tests only run against a local stack."
fi

echo "• Checking local Supabase..."
supabase status >/dev/null 2>&1 || fail "Local Supabase is not running. Start it with: supabase start"

echo "• Checking API server at ${API_BASE}..."
if ! curl -s -m 5 -o /dev/null "${API_BASE}/api/student-login" -X POST; then
  fail "API server not reachable at ${API_BASE}. Start it in another terminal with: npm run dev:api"
fi

echo "• Checking the seeded fixture (mock student login)..."
LOGIN_HTTP=$(curl -s -m 8 -o /dev/null -w "%{http_code}" -X POST "${API_BASE}/api/student-login" \
  -H 'Content-Type: application/json' -d '{"studentId":"s1001","password":"Student123!"}')
if [ "$LOGIN_HTTP" != "200" ]; then
  fail "Mock student s1001 could not log in (HTTP ${LOGIN_HTTP}). Seed the fixture with: npm run seed:local"
fi

if [ -n "${OPENAI_API_KEY:-}" ]; then
  echo "• OpenAI key present on server → integration tests will exercise the REAL LLM."
else
  echo "• No OpenAI key → endpoint will serve its deterministic fallback; contract still asserted."
fi

export INTAKE_API_BASE="${API_BASE}"
echo "• Running integration scenarios..."
node --test tests/integration/*.test.mjs
