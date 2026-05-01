#!/usr/bin/env bash
# Integration tests for /api/user/onboarding fixes (commit be9cb47):
#   • studyDays: [] is preserved as [] (not collapsed to null)
#   • Supabase errors surface as 500 instead of silent {ok: true}
#   • Profile reads back the values that were written
#
# Side effect: this test mutates the test student's profile. Snapshot/restore
# pattern via bash trap ensures we leave it as we found it.
#
# Run: bash tests/onboarding.integration.sh

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

# Snapshot current profile so we can restore via service-role
TEST_UID=$(curl -s "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Authorization: Bearer $TOKEN" | jq -r '.id')
SNAP=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=class_level,active_track,daily_pledge_xp,study_days,board" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | jq '.[0]')
echo "snapshot: $SNAP"

restore() {
  echo "▶ Restoring profile snapshot"
  curl -s -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d "$SNAP" > /dev/null
}
trap restore EXIT

# ─── Test 1: studyDays: [] preserved as [], not null ─────────────────────
note "Test 1: studyDays: [] preserved (not silently collapsed to null)"
curl -s -X POST "$BASE_URL/api/user/onboarding" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"studyDays":[]}' > /dev/null
sleep 0.3
STORED=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=study_days" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq '.[0].study_days')
# Critical distinction: must be `[]`, not `null`. The bug was that `[]` was
# being collapsed to null which then meant "all days pledged" downstream —
# the inverse of the user's intent.
assert_eq "[]" "$STORED" "empty studyDays stored as empty array (not null)"

# ─── Test 2: studyDays with valid days stored correctly ───────────────────
note "Test 2: valid studyDays array stored as filtered array"
curl -s -X POST "$BASE_URL/api/user/onboarding" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"studyDays":["mon","wed","fri"]}' > /dev/null
sleep 0.3
STORED=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=study_days" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -c '.[0].study_days')
assert_eq '["mon","wed","fri"]' "$STORED" "valid days persisted as-is"

# ─── Test 3: invalid weekday codes filtered out ──────────────────────────
note "Test 3: invalid weekday codes filtered out"
curl -s -X POST "$BASE_URL/api/user/onboarding" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"studyDays":["mon","funday","wed","monday"]}' > /dev/null
sleep 0.3
STORED=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=study_days" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -c '.[0].study_days')
assert_eq '["mon","wed"]' "$STORED" '"funday" and "monday" filtered out'

# ─── Test 4: partial-update doesn't touch other fields ───────────────────
note "Test 4: partial /onboarding update preserves untouched fields"
# Set a known board, then send only studyDays — board should stay
curl -s -X POST "$BASE_URL/api/user/onboarding" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"board":"CBSE","studyDays":["mon","tue","wed","thu","fri"]}' > /dev/null
sleep 0.3
curl -s -X POST "$BASE_URL/api/user/onboarding" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"studyDays":["sat","sun"]}' > /dev/null
sleep 0.3
BOARD=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=board" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -r '.[0].board')
assert_eq "CBSE" "$BOARD" "board preserved across partial update"

# ─── Test 5: dailyPledgeXp range validation (5-500) ──────────────────────
note "Test 5: dailyPledgeXp accepts in-range, ignores out-of-range"
curl -s -X POST "$BASE_URL/api/user/onboarding" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"dailyPledgeXp":75}' > /dev/null
sleep 0.3
STORED=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=daily_pledge_xp" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -r '.[0].daily_pledge_xp')
assert_eq "75" "$STORED" "in-range pledge (75) stored"

# Out-of-range: 5000 should be ignored (silently — current behaviour)
PRE=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=daily_pledge_xp" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -r '.[0].daily_pledge_xp')
curl -s -X POST "$BASE_URL/api/user/onboarding" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"dailyPledgeXp":5000}' > /dev/null
sleep 0.3
POST=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=daily_pledge_xp" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -r '.[0].daily_pledge_xp')
assert_eq "$PRE" "$POST" "out-of-range pledge (5000) ignored, prior value retained"

# ─── Test 6: empty body returns ok without mutating ──────────────────────
note "Test 6: empty onboarding body is a no-op"
PRE=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq '.[0] | {class_level, board, daily_pledge_xp, study_days}')
RESP=$(curl -s -X POST "$BASE_URL/api/user/onboarding" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}')
assert_eq "true" "$(echo "$RESP" | jq -r '.ok')" "/onboarding {} → {ok:true}"
POST=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq '.[0] | {class_level, board, daily_pledge_xp, study_days}')
assert_eq "$PRE" "$POST" "empty body left profile unchanged"

# ─── Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "\033[1m──────────────────────────────────────\033[0m"
echo -e "\033[1mPASSED: $PASS  FAILED: $FAIL\033[0m"
if [ "$FAIL" -gt 0 ]; then
  echo -e "\033[1;31mFailures:\033[0m"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo -e "\033[1;32mAll onboarding tests passed.\033[0m"
