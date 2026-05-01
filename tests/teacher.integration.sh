#!/usr/bin/env bash
# Integration tests for the teacher.ts fixes (no formal test runner — bash + curl + jq).
# Strategy: promote teststudent (TEST_EMAIL/TEST_PASSWORD) to teacher in
# class_level=8 so we can verify class-scoping. Demote at the end via trap.
#
# Prereqs:
#   • backend running on http://localhost:3001 (npm run dev:server or dev:all)
#   • .env at repo root with SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
#     SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD
#   • a test student account; defaults to teststudent@padee.ai / TestPass123!
#     override via TEST_EMAIL / TEST_PASSWORD env
#
# Run: bash tests/teacher.integration.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"
set -a; source .env; set +a

TEST_EMAIL="${TEST_EMAIL:-teststudent@padee.ai}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPass123!}"
BASE_URL="${BASE_URL:-http://localhost:3001}"

PASS=0
FAIL=0
declare -a FAILURES=()

note()  { echo -e "\n\033[1;36m▶ $*\033[0m"; }
pass()  { echo -e "  \033[1;32m✓\033[0m $*"; PASS=$((PASS+1)); }
fail()  { echo -e "  \033[1;31m✗\033[0m $*"; FAIL=$((FAIL+1)); FAILURES+=("$*"); }

assert_eq() {
  local expected="$1" actual="$2" label="$3"
  if [ "$expected" = "$actual" ]; then pass "$label  (got: $actual)"
  else fail "$label  (expected: $expected, got: $actual)"
  fi
}

# Refresh teststudent token (it expires every hour)
TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" | jq -r '.access_token')
[ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] && { echo "AUTH FAILED — abort"; exit 1; }
TEST_UID=$(curl -s "${SUPABASE_URL}/auth/v1/user" -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Authorization: Bearer $TOKEN" | jq -r '.id')
echo "teststudent uid: $TEST_UID"

# Snapshot original role + class so we can restore exactly
ORIG_PROFILE=$(curl -s "http://localhost:3001/api/admin/users" -H "X-Admin-Password: $ADMIN_PASSWORD" \
  | jq --arg uid "$TEST_UID" '.users[] | select(.id == $uid)')
ORIG_ROLE=$(echo "$ORIG_PROFILE" | jq -r '.role // "student"')
ORIG_CLASS=$(echo "$ORIG_PROFILE" | jq -r '.class_level // 10')
echo "original role=$ORIG_ROLE class=$ORIG_CLASS"

# Promote teststudent to teacher (we'll also need to set class_level=8 via service-role)
curl -s -X POST $BASE_URL/api/admin/set-role \
  -H "X-Admin-Password: $ADMIN_PASSWORD" -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"role\":\"teacher\"}" > /dev/null
# Set class_level=8 directly via service-role (no admin endpoint for that)
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"class_level":8}' > /dev/null
sleep 0.5

# Restore on exit (always runs, even on test failure)
restore() {
  echo "▶ Restoring teststudent: role=$ORIG_ROLE class=$ORIG_CLASS"
  curl -s -X POST http://localhost:3001/api/admin/set-role \
    -H "X-Admin-Password: $ADMIN_PASSWORD" -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"role\":\"$ORIG_ROLE\"}" > /dev/null
  curl -s -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d "{\"class_level\":$ORIG_CLASS}" > /dev/null
}
trap restore EXIT

# Find a class-10 student (the existing test student is unique; we'll use the
# real founder profile id which exists with class_level=10. Or we just use
# a student id that exists in class 8 vs class 10.)
# Strategy: query all users; use whichever class-10 student id we find that's
# NOT the test student. Fall back to vinoth@gyanmatrix.com's id.
FOUNDER_UID=$(curl -s "http://localhost:3001/api/admin/users" -H "X-Admin-Password: $ADMIN_PASSWORD" \
  | jq -r '[.users[] | select(.email == "vinoth@gyanmatrix.com")][0].id')
CLASS10_STUDENT=$(curl -s "http://localhost:3001/api/admin/users" -H "X-Admin-Password: $ADMIN_PASSWORD" \
  | jq -r --arg uid "$TEST_UID" '[.users[] | select(.role=="student" and .class_level==10 and .id != $uid)][0].id')

# ─── Test 1: ADMIN_PASSWORD refuse-to-start ──────────────────────────────
note "Test 1: ADMIN_PASSWORD refuse-to-start"
# tsx -e doesn't support top-level await (CJS shim) so we use a temp .mjs probe
# that uses .then/.catch for the dynamic import.
cat > /tmp/probe-adminAuth.mjs <<'PROBE_EOF'
import('/Users/admin/padee.ai/server/lib/adminAuth.ts')
  .then(() => console.log('LOADED_NO_THROW'))
  .catch(e => console.log('THREW:', (e?.message || String(e)).slice(0, 120)))
PROBE_EOF
OUT=$(ADMIN_PASSWORD="" npx tsx /tmp/probe-adminAuth.mjs 2>&1 | tail -1)
echo "$OUT" | grep -q "ADMIN_PASSWORD environment variable is required" \
  && pass "module throws when ADMIN_PASSWORD env unset" \
  || fail "module did not throw on missing ADMIN_PASSWORD (output: $OUT)"
rm -f /tmp/probe-adminAuth.mjs

# ─── Test 2: concept_mastery column names work ───────────────────────────
note "Test 2: /student/:id no longer fails on concept_mastery schema mismatch"
# teststudent is now a class-8 teacher; can fetch a class-8 student.
# But teststudent IS a class-8 student-promoted-to-teacher; let's use teststudent's
# own uid (teacher viewing themselves) — class_level matches teststudent's own
# now (8). Or simpler: use any uid and verify the SQL doesn't error.
RESP=$(curl -s -w "\nHTTP_%{http_code}" "http://localhost:3001/api/teacher/student/$TEST_UID" \
  -H "Authorization: Bearer $TOKEN")
HTTP=$(echo "$RESP" | grep "^HTTP_" | sed 's/^HTTP_//')
BODY=$(echo "$RESP" | sed '$d')
# Either 200 (works, returns rows) or 403 (class mismatch since teststudent is class 8 viewing self in class 8 — should be 200).
# Critical: must NOT be 500 (which would indicate Postgres column-not-found error).
if [ "$HTTP" = "500" ]; then
  fail "/student/:id returned 500 — schema mismatch likely still present"
elif echo "$BODY" | jq -e '.error' > /dev/null 2>&1; then
  ERR=$(echo "$BODY" | jq -r '.error')
  if echo "$ERR" | grep -qiE "column|does not exist|accuracy|consistency|practised"; then
    fail "/student/:id error mentions column/schema: $ERR"
  else
    pass "/student/:id returned non-500, non-column error: $ERR"
  fi
else
  # 200 with valid concept_mastery shape (might be empty array)
  HAS_KEYS=$(echo "$BODY" | jq -r '
    if (.concept_mastery | length) > 0
      then (.concept_mastery[0] | has("accuracy_score") and has("consistency_score") and has("last_practiced_at"))
      else true end' 2>/dev/null)
  assert_eq "true" "$HAS_KEYS" "concept_mastery rows have correct column names (or array empty)"
fi

# ─── Test 3: Class-scoping on /students ──────────────────────────────────
note "Test 3: /students class-scoping (teststudent now teacher in class 8)"
# 3a: teacher requests own class implicitly → 200, returns class 8 students
LIST=$(curl -s "http://localhost:3001/api/teacher/students" -H "Authorization: Bearer $TOKEN")
NON8_COUNT=$(echo "$LIST" | jq '[.students[] | select(.class_level != 8)] | length')
assert_eq "0" "$NON8_COUNT" "default /students returns only teacher's own class (8)"

# 3b: teacher tries to view class 10 → 403
RESP=$(curl -s -w "\n%{http_code}" "http://localhost:3001/api/teacher/students?class=10" -H "Authorization: Bearer $TOKEN")
HTTP=$(echo "$RESP" | tail -1)
assert_eq "403" "$HTTP" "/students?class=10 from class-8 teacher → 403"

# 3c: teacher views own class explicitly → 200
RESP=$(curl -s -w "\n%{http_code}" "http://localhost:3001/api/teacher/students?class=8" -H "Authorization: Bearer $TOKEN")
HTTP=$(echo "$RESP" | tail -1)
assert_eq "200" "$HTTP" "/students?class=8 from class-8 teacher → 200"

# ─── Test 4: Class-scoping on /student/:id ───────────────────────────────
note "Test 4: /student/:id class-scoping"
# teststudent is class 8 teacher; fetching a class 10 student should 403
if [ "$CLASS10_STUDENT" != "null" ] && [ -n "$CLASS10_STUDENT" ]; then
  RESP=$(curl -s -w "\n%{http_code}" "http://localhost:3001/api/teacher/student/$CLASS10_STUDENT" \
    -H "Authorization: Bearer $TOKEN")
  HTTP=$(echo "$RESP" | tail -1)
  assert_eq "403" "$HTTP" "class-8 teacher → /student/:id of class-10 student returns 403"
else
  echo "  ⚠ skipping cross-class /student/:id test (no class-10 student found)"
fi
# Same-class self lookup → should be 200 (teststudent is now class-8 teacher fetching themselves)
RESP=$(curl -s -w "\n%{http_code}" "http://localhost:3001/api/teacher/student/$TEST_UID" \
  -H "Authorization: Bearer $TOKEN")
HTTP=$(echo "$RESP" | tail -1)
# Note: teststudent's profile.class_level is 8 (we set it). Their own role
# is 'teacher' but the profile is in class 8 = teacher's class = 200 expected.
assert_eq "200" "$HTTP" "class-8 teacher → /student/:id of self (class 8) returns 200"

# Bogus uid → 404
RESP=$(curl -s -w "\n%{http_code}" "http://localhost:3001/api/teacher/student/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN")
HTTP=$(echo "$RESP" | tail -1)
assert_eq "404" "$HTTP" "/student/:id with bogus uuid → 404"

# ─── Test 5: /flagged summary parallel counts ────────────────────────────
note "Test 5: /flagged summary returns counts (parallel-counts path)"
SUMMARY=$(curl -s "http://localhost:3001/api/teacher/flagged?status=pending&limit=2" \
  -H "X-Admin-Password: $ADMIN_PASSWORD" | jq '.summary')
HAS_KEYS=$(echo "$SUMMARY" | jq 'has("pending") and has("correct") and has("wrong") and has("partial") and has("total")')
assert_eq "true" "$HAS_KEYS" "summary has pending/correct/wrong/partial/total"
TOTAL=$(echo "$SUMMARY" | jq '.total')
SUM=$(echo "$SUMMARY" | jq '.pending + .correct + .wrong + .partial')
assert_eq "$TOTAL" "$SUM" "summary.total equals sum of status counts"

# ─── Test 6: /flagged/:id/reopen FK guard ────────────────────────────────
note "Test 6: /flagged/:id/reopen reviewer FK guard"
# Find any flag (or accept that there's nothing to reopen → skip)
FLAG_ID=$(curl -s "http://localhost:3001/api/teacher/flagged?status=all&limit=1" \
  -H "X-Admin-Password: $ADMIN_PASSWORD" | jq -r '.flagged[0].id // empty')
if [ -z "$FLAG_ID" ]; then
  echo "  ⚠ skipping reopen test (no flagged_responses in DB)"
else
  # First, mark it reviewed by admin password (to set up a reviewable state)
  curl -s -X POST "http://localhost:3001/api/teacher/flagged/$FLAG_ID/review" \
    -H "X-Admin-Password: $ADMIN_PASSWORD" -H "Content-Type: application/json" \
    -d '{"status":"correct","teacher_notes":"test setup"}' > /dev/null
  sleep 0.3
  # Reopen via admin password should succeed (override path)
  RESP=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:3001/api/teacher/flagged/$FLAG_ID/reopen" \
    -H "X-Admin-Password: $ADMIN_PASSWORD")
  HTTP=$(echo "$RESP" | tail -1)
  assert_eq "200" "$HTTP" "admin-password reopen of any flag → 200 (override allowed)"
fi

# ─── Test 7: [admin panel] prefix on teacher_notes ───────────────────────
note "Test 7: [admin panel] prefix when reviewed via X-Admin-Password"
if [ -n "$FLAG_ID" ]; then
  curl -s -X POST "http://localhost:3001/api/teacher/flagged/$FLAG_ID/review" \
    -H "X-Admin-Password: $ADMIN_PASSWORD" -H "Content-Type: application/json" \
    -d '{"status":"wrong","teacher_notes":"AI got the sign convention backwards"}' > /dev/null
  sleep 0.3
  NOTES=$(curl -s "http://localhost:3001/api/teacher/flagged/$FLAG_ID" \
    -H "X-Admin-Password: $ADMIN_PASSWORD" | jq -r '.flagged.teacher_notes')
  if echo "$NOTES" | grep -q "^\[admin panel\]"; then
    pass "teacher_notes prefixed with [admin panel] for password-auth: '$NOTES'"
  else
    fail "teacher_notes missing [admin panel] prefix (got: '$NOTES')"
  fi
fi

# ─── Test 8: IST 30-day activity buckets ─────────────────────────────────
note "Test 8: /student/:id activity_30d buckets in IST calendar days"
RESP=$(curl -s "http://localhost:3001/api/teacher/student/$TEST_UID" -H "Authorization: Bearer $TOKEN")
ACTIVITY=$(echo "$RESP" | jq '.activity_30d')
# Each row should have date as YYYY-MM-DD
BAD_DATES=$(echo "$ACTIVITY" | jq '[.[] | select((.date | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")) | not)] | length')
assert_eq "0" "$BAD_DATES" "all activity_30d rows have YYYY-MM-DD date format"
# Sorted ascending
SORTED_OK=$(echo "$ACTIVITY" | jq 'reduce .[] as $r ([true, ""]; if .[1] != "" and $r.date < .[1] then [false, $r.date] else [true, $r.date] end) | .[0]')
assert_eq "true" "$SORTED_OK" "activity_30d sorted ascending by date"

# ─── Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "\033[1m──────────────────────────────────────\033[0m"
echo -e "\033[1mPASSED: $PASS  FAILED: $FAIL\033[0m"
if [ "$FAIL" -gt 0 ]; then
  echo -e "\033[1;31mFailures:\033[0m"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo -e "\033[1;32mAll tests passed.\033[0m"
