#!/usr/bin/env bash
# Integration tests for recommendations.ts + cron/recompute-recommendations.ts.
#
# Covers:
#   • /api/recommendations/today response shape (hero_type, supporting_cards,
#     expires_at format)
#   • /api/recommendations/today triggers a recompute when cache empty/expired
#   • /api/recommendations/acted-on flips acted_on flag on the cached row
#   • /api/recommendations/recompute requires admin password OR admin role
#     token (Bearer student token → 403)
#   • /api/recommendations/recompute returns 202 Accepted immediately (async)
#
# Run: bash tests/recommendations.integration.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"
set -a; source .env; set +a

TEST_EMAIL="${TEST_EMAIL:-teststudent@padee.ai}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPass123!}"
BASE_URL="${BASE_URL:-http://localhost:3001}"

PASS=0; FAIL=0; declare -a FAILURES=()
note() { echo -e "\n\033[1;36m▶ $*\033[0m"; }
pass() { echo -e "  \033[1;32m✓\033[0m $*"; PASS=$((PASS+1)); }
fail() { echo -e "  \033[1;31m✗\033[0m $*"; FAIL=$((FAIL+1)); FAILURES+=("$*"); }
assert_eq() {
  if [ "$1" = "$2" ]; then pass "$3  (got: $2)"
  else fail "$3  (expected: $1, got: $2)"
  fi
}

TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" | jq -r '.access_token')
[ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] && { echo "AUTH FAILED"; exit 1; }
TEST_UID=$(curl -s "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Authorization: Bearer $TOKEN" | jq -r '.id')

# ─── Test 1: /today response shape ───────────────────────────────────────
note "Test 1: /today returns valid recommendation shape"
RESP=$(curl -s "$BASE_URL/api/recommendations/today" -H "Authorization: Bearer $TOKEN")
HAS_HERO_TYPE=$(echo "$RESP" | jq 'has("hero_type")')
assert_eq "true" "$HAS_HERO_TYPE" "/today response has hero_type field"
HERO_TYPE=$(echo "$RESP" | jq -r '.hero_type')
case "$HERO_TYPE" in
  none|fix_critical|fix_attention|revise|next_chapter)
    pass "hero_type is a valid enum value: $HERO_TYPE" ;;
  *)
    fail "hero_type unexpected value: $HERO_TYPE" ;;
esac

# ─── Test 2: /today recomputes on cache miss ─────────────────────────────
note "Test 2: /today triggers recompute when cache row is absent"
# Wipe any existing recommendation for the test student
curl -s -X DELETE "${SUPABASE_URL}/rest/v1/student_recommendations?student_id=eq.${TEST_UID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Prefer: return=minimal" > /dev/null
sleep 0.3
# Hit /today — should trigger inline recompute, return a row
RESP=$(curl -s "$BASE_URL/api/recommendations/today" -H "Authorization: Bearer $TOKEN")
HERO_TYPE=$(echo "$RESP" | jq -r '.hero_type')
[ "$HERO_TYPE" != "null" ] && pass "/today returned hero_type=$HERO_TYPE after cache wipe (recompute fired)" \
  || fail "/today returned null hero_type after cache wipe (recompute didn't fire?)"

# Verify a fresh row exists in DB
DB_ROW=$(curl -s "${SUPABASE_URL}/rest/v1/student_recommendations?student_id=eq.${TEST_UID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | jq '.[0]')
[ "$DB_ROW" != "null" ] && [ -n "$DB_ROW" ] && pass "recompute wrote a student_recommendations row" \
  || fail "no student_recommendations row created by recompute"

# expires_at should be a future timestamp (next IST midnight)
EXPIRES=$(echo "$DB_ROW" | jq -r '.expires_at')
NOW_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [ "$EXPIRES" \> "$NOW_TS" ] 2>/dev/null; then
  pass "expires_at is in the future ($EXPIRES > $NOW_TS)"
else
  fail "expires_at not in future (got: $EXPIRES, now: $NOW_TS)"
fi

# ─── Test 3: /acted-on flips the flag ────────────────────────────────────
note "Test 3: /acted-on marks recommendation as acted on"
RESP=$(curl -s -X POST "$BASE_URL/api/recommendations/acted-on" \
  -H "Authorization: Bearer $TOKEN")
OK=$(echo "$RESP" | jq -r '.ok')
assert_eq "true" "$OK" "/acted-on returns {ok: true}"

# Verify the flag in DB
ACTED=$(curl -s "${SUPABASE_URL}/rest/v1/student_recommendations?student_id=eq.${TEST_UID}&select=acted_on,acted_on_at" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -r '.[0].acted_on')
assert_eq "true" "$ACTED" "acted_on flag flipped to true in DB"
ACTED_AT=$(curl -s "${SUPABASE_URL}/rest/v1/student_recommendations?student_id=eq.${TEST_UID}&select=acted_on_at" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -r '.[0].acted_on_at')
[ "$ACTED_AT" != "null" ] && pass "acted_on_at timestamp set" \
  || fail "acted_on_at still null after /acted-on"

# ─── Test 4: /recompute auth ─────────────────────────────────────────────
note "Test 4: /recompute auth"
# 4a: no auth → 401
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/recommendations/recompute")
HTTP=$(echo "$RESP" | tail -1)
assert_eq "401" "$HTTP" "no auth → 401"

# 4b: student token (no admin role) → 403
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/recommendations/recompute" \
  -H "Authorization: Bearer $TOKEN")
HTTP=$(echo "$RESP" | tail -1)
assert_eq "403" "$HTTP" "student bearer token → 403"

# 4c: wrong admin password → 401 (Bearer fallback fails too since no Authorization)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/recommendations/recompute" \
  -H "X-Admin-Password: definitely-wrong")
HTTP=$(echo "$RESP" | tail -1)
assert_eq "401" "$HTTP" "wrong admin password (no token) → 401"

# 4d: correct admin password → 202 (async, returns immediately)
T0=$(date +%s)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/recommendations/recompute" \
  -H "X-Admin-Password: $ADMIN_PASSWORD")
T1=$(date +%s)
ELAPSED=$((T1 - T0))
HTTP=$(echo "$RESP" | sed '$d' | tail -1 | grep -oE '[0-9]{3}$' || true)
HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_eq "202" "$HTTP" "correct admin password → 202 Accepted"
STATUS=$(echo "$BODY" | jq -r '.status')
assert_eq "started" "$STATUS" "/recompute response.status = 'started'"
# 202 should return in <3s even if the actual recompute takes minutes
if [ "$ELAPSED" -lt 3 ]; then
  pass "/recompute returned in ${ELAPSED}s (async, not blocking)"
else
  fail "/recompute took ${ELAPSED}s — response should return immediately"
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
echo -e "\033[1;32mAll recommendations tests passed.\033[0m"
