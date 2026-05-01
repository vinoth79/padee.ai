#!/usr/bin/env bash
# CORS integration tests for env-driven ALLOWED_ORIGINS (commit 045e33e).
#
# Exercises the Hono CORS middleware via OPTIONS preflight:
#   • allowed dev origins echo back Access-Control-Allow-Origin
#   • disallowed origins do NOT echo Allow-Origin (browser would block)
#   • all default localhost dev ports (5173, 5174, 5175, 3000) are allowed
#
# Note: this test exercises the CURRENT-RUNNING server's config. If
# ALLOWED_ORIGINS is set in your shell, it overrides the defaults — that's
# the production deployment shape.
#
# Run: bash tests/cors.integration.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BASE_URL="${BASE_URL:-http://localhost:3001}"

PASS=0; FAIL=0; declare -a FAILURES=()
note() { echo -e "\n\033[1;36m▶ $*\033[0m"; }
pass() { echo -e "  \033[1;32m✓\033[0m $*"; PASS=$((PASS+1)); }
fail() { echo -e "  \033[1;31m✗\033[0m $*"; FAIL=$((FAIL+1)); FAILURES+=("$*"); }

# Helper: send OPTIONS preflight with given Origin, capture Access-Control-Allow-Origin.
preflight_origin() {
  local origin="$1"
  curl -s -i -X OPTIONS "$BASE_URL/api/health" \
    -H "Origin: $origin" \
    -H "Access-Control-Request-Method: GET" 2>&1 \
    | grep -i "^access-control-allow-origin:" | head -1 | tr -d '\r'
}

note "Allowed default dev origins echo Allow-Origin"
for ORIGIN in "http://localhost:5173" "http://localhost:5174" "http://localhost:5175" "http://localhost:3000"; do
  HEADER=$(preflight_origin "$ORIGIN")
  if echo "$HEADER" | grep -qi "$ORIGIN"; then
    pass "$ORIGIN → echoed in Allow-Origin"
  else
    fail "$ORIGIN preflight did not echo Allow-Origin (got: '$HEADER')"
  fi
done

note "Disallowed origins do NOT echo Allow-Origin"
for ORIGIN in "https://evil.example.com" "http://attacker.test" "https://malicious-cdn.io"; do
  HEADER=$(preflight_origin "$ORIGIN")
  if [ -z "$HEADER" ] || ! echo "$HEADER" | grep -qi "$ORIGIN"; then
    pass "$ORIGIN → no Allow-Origin header (browser will block)"
  else
    fail "$ORIGIN was unexpectedly echoed in Allow-Origin: '$HEADER'"
  fi
done

note "Allow-Credentials present (cookies + auth headers cross-origin)"
HEADER=$(curl -s -i -X OPTIONS "$BASE_URL/api/health" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" 2>&1 \
  | grep -i "^access-control-allow-credentials:" | head -1 | tr -d '\r')
if echo "$HEADER" | grep -qi "true"; then
  pass "Access-Control-Allow-Credentials: true on allowed origin"
else
  fail "Allow-Credentials missing or false: '$HEADER'"
fi

# ─── Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "\033[1m──────────────────────────────────────\033[0m"
echo -e "\033[1mPASSED: $PASS  FAILED: $FAIL\033[0m"
if [ "$FAIL" -gt 0 ]; then
  echo -e "\033[1;31mFailures:\033[0m"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo -e "\033[1;32mAll CORS tests passed.\033[0m"
