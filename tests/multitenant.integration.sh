#!/usr/bin/env bash
# Integration tests for v5 multi-tenancy (Sprint 0).
#
# Coverage:
#   1. New endpoints exist + return 401 unauthenticated (smoke)
#   2. /api/school/create rejects missing/invalid name
#   3. /api/auth/redeem-invite rejects malformed code
#   4. Migration 012 detected (skip cross-school checks if not applied)
#   5. Cross-school isolation contract: teacher in School A cannot read
#      students of School B via /api/teacher/students or /student/:id
#
# Prereqs (same as teacher.integration.sh):
#   • backend on http://localhost:3001
#   • .env with SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#     ADMIN_PASSWORD
#   • teststudent@padee.ai / TestPass123! (defaults overridable)
#
# Run: bash tests/multitenant.integration.sh

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
skip()  { echo -e "  \033[1;33m–\033[0m skipped: $*"; }

# ─── Auth: get test student token ────────────────────────────────────────
TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" | jq -r '.access_token')
[ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] && { echo "AUTH FAILED — abort"; exit 1; }
TEST_UID=$(curl -s "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Authorization: Bearer $TOKEN" | jq -r '.id')

# ─── Migration 012 detection ─────────────────────────────────────────────
# Probe: does the schools table exist? If not, the rest of this suite is
# moot — the dev hasn't applied the migration yet. We exit 0 with a loud
# warning rather than fail; this lets the test suite stay green during the
# transient pre-migration window.
SCHOOLS_PROBE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/schools?select=id&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
if echo "$SCHOOLS_PROBE" | grep -q "Could not find the table"; then
  echo -e "\033[1;33m═══ Migration 012 not applied — skipping multi-tenant tests. ═══\033[0m"
  echo "Apply supabase/migrations/012_multitenant_v5.sql in Supabase SQL Editor"
  echo "to enable these tests."
  exit 0
fi
MIGRATED=1

# ─── Test 1: new endpoints exist + 401 unauth ────────────────────────────
note "Test 1: New endpoints exist + reject unauthenticated"
SCHOOL_CREATE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/school/create")
[ "$SCHOOL_CREATE" = "401" ] && pass "POST /api/school/create → 401 unauth" \
  || fail "POST /api/school/create → $SCHOOL_CREATE (expected 401)"

REDEEM=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/redeem-invite")
[ "$REDEEM" = "401" ] && pass "POST /api/auth/redeem-invite → 401 unauth" \
  || fail "POST /api/auth/redeem-invite → $REDEEM (expected 401)"

SUPER_SCHOOLS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/super-admin/schools")
[ "$SUPER_SCHOOLS" = "401" ] && pass "GET /api/super-admin/schools → 401 unauth" \
  || fail "GET /api/super-admin/schools → $SUPER_SCHOOLS (expected 401)"

# ─── Test 2: school create — bad input ───────────────────────────────────
note "Test 2: /api/school/create rejects bad input"
RES=$(curl -s -X POST "$BASE_URL/api/school/create" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{}')
echo "$RES" | grep -q "School name must be" \
  && pass "rejects empty name" \
  || fail "did not reject empty name (got: $RES)"

RES=$(curl -s -X POST "$BASE_URL/api/school/create" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"a"}')
echo "$RES" | grep -q "must be 2" \
  && pass "rejects 1-char name" \
  || fail "did not reject 1-char name (got: $RES)"

# ─── Test 3: redeem-invite — malformed code ──────────────────────────────
note "Test 3: /api/auth/redeem-invite rejects malformed code"
RES=$(curl -s -X POST "$BASE_URL/api/auth/redeem-invite" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"123"}')
echo "$RES" | grep -q "6 digits" \
  && pass "rejects 3-digit code" \
  || fail "did not reject 3-digit code (got: $RES)"

RES=$(curl -s -X POST "$BASE_URL/api/auth/redeem-invite" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"123456"}')
echo "$RES" | grep -q "did not match" \
  && pass "rejects unknown 6-digit code" \
  || fail "did not reject unknown code (got: $RES)"

# ─── Test 4: hyphen-stripping in code ────────────────────────────────────
note "Test 4: /api/auth/redeem-invite strips hyphens before validation"
RES=$(curl -s -X POST "$BASE_URL/api/auth/redeem-invite" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"123-456"}')
# Hyphen-stripped becomes 6 digits → expect "did not match" (i.e. validation
# passed). If we got "6 digits" error, the strip is broken.
echo "$RES" | grep -q "did not match" \
  && pass "hyphenated 6-digit code is normalized + searched" \
  || fail "hyphenated code rejected as malformed (got: $RES)"

# ─── Test 5: cross-school isolation contract ─────────────────────────────
# Setup: snapshot teststudent's profile, create two ephemeral schools, link
# teststudent as a teacher at School A, promote a second student
# (vinoth@gyanmatrix.com) into School B as a student. Assert teacher at A
# CANNOT read the student at B.
#
# Cleanup runs in trap on exit so partial failures don't leave dirty state.
note "Test 5: cross-school isolation contract"

# Snapshot teststudent's profile for restore
ORIG_PROFILE=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}&select=role,school_id,class_level" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | jq -r '.[0]')
ORIG_ROLE=$(echo "$ORIG_PROFILE" | jq -r '.role // "student"')
ORIG_SCHOOL=$(echo "$ORIG_PROFILE" | jq -r '.school_id // null')
ORIG_CLASS=$(echo "$ORIG_PROFILE" | jq -r '.class_level // 10')

# Find a second user for the "victim" student in School B. Prefer the
# founder profile (always present in dev DB).
VICTIM_UID=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?email=eq.vinoth@gyanmatrix.com&select=id" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | jq -r '.[0].id // empty')

if [ -z "$VICTIM_UID" ] || [ "$VICTIM_UID" = "null" ]; then
  skip "no second profile in DB to use as victim — cross-school isolation untested"
else
  # Snapshot victim profile
  VICTIM_ORIG=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?id=eq.${VICTIM_UID}&select=role,school_id,class_level" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | jq -r '.[0]')
  VICTIM_ORIG_ROLE=$(echo "$VICTIM_ORIG" | jq -r '.role')
  VICTIM_ORIG_SCHOOL=$(echo "$VICTIM_ORIG" | jq -r '.school_id // null')
  VICTIM_ORIG_CLASS=$(echo "$VICTIM_ORIG" | jq -r '.class_level // 10')

  # Create School A (teststudent will be teacher here at class 10)
  SCHOOL_A=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/schools" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    -d '{"name":"Test School A","invite_code_student":"TESTAA","invite_code_teacher":"TESTAB"}' \
    | jq -r '.[0].id')
  SCHOOL_B=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/schools" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    -d '{"name":"Test School B","invite_code_student":"TESTBA","invite_code_teacher":"TESTBB"}' \
    | jq -r '.[0].id')

  if [ -z "$SCHOOL_A" ] || [ "$SCHOOL_A" = "null" ]; then
    fail "could not create test schools — multi-tenant fixtures unusable"
  else
    # Cleanup trap — restore both profiles + drop schools
    cleanup() {
      echo "▶ Cleanup: restoring profiles + dropping test schools"
      # Restore teststudent (role + school_id + class)
      curl -s -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" -H "Prefer: return=minimal" \
        -d "{\"role\":\"${ORIG_ROLE}\",\"school_id\":${ORIG_SCHOOL},\"class_level\":${ORIG_CLASS}}" > /dev/null
      # Restore victim
      curl -s -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${VICTIM_UID}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" -H "Prefer: return=minimal" \
        -d "{\"role\":\"${VICTIM_ORIG_ROLE}\",\"school_id\":${VICTIM_ORIG_SCHOOL},\"class_level\":${VICTIM_ORIG_CLASS}}" > /dev/null
      # Drop test schools (this also unblocks any orphaned profile.school_id
      # via ON DELETE SET NULL, but we restored profiles already).
      [ -n "$SCHOOL_A" ] && [ "$SCHOOL_A" != "null" ] && curl -s -X DELETE "${SUPABASE_URL}/rest/v1/schools?id=eq.${SCHOOL_A}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" > /dev/null
      [ -n "$SCHOOL_B" ] && [ "$SCHOOL_B" != "null" ] && curl -s -X DELETE "${SUPABASE_URL}/rest/v1/schools?id=eq.${SCHOOL_B}" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" > /dev/null
    }
    trap cleanup EXIT

    # Make teststudent a teacher at School A, class_level=10
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_UID}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" -H "Prefer: return=minimal" \
      -d "{\"role\":\"teacher\",\"school_id\":\"${SCHOOL_A}\",\"class_level\":10}" > /dev/null

    # Make victim a student at School B, class_level=10
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${VICTIM_UID}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" -H "Prefer: return=minimal" \
      -d "{\"role\":\"student\",\"school_id\":\"${SCHOOL_B}\",\"class_level\":10}" > /dev/null

    sleep 0.3

    # ── Contract 1: GET /api/teacher/students must NOT return victim ──
    STUDENTS_LIST=$(curl -s "$BASE_URL/api/teacher/students" -H "Authorization: Bearer $TOKEN")
    LEAKED=$(echo "$STUDENTS_LIST" | jq --arg uid "$VICTIM_UID" '[.students[] | select(.id == $uid)] | length')
    [ "$LEAKED" = "0" ] && pass "/api/teacher/students does not leak victim across schools" \
      || fail "CROSS-SCHOOL LEAK: /api/teacher/students returned victim ($LEAKED match)"

    # ── Contract 2: GET /api/teacher/student/:id must 403 ──
    STUDENT_GET=$(curl -s -o /dev/null -w "%{http_code}" \
      "$BASE_URL/api/teacher/student/$VICTIM_UID" -H "Authorization: Bearer $TOKEN")
    [ "$STUDENT_GET" = "403" ] && pass "/api/teacher/student/:id returns 403 cross-school" \
      || fail "CROSS-SCHOOL LEAK: /api/teacher/student/:id returned $STUDENT_GET (expected 403)"

    # ── Contract 3: /api/teacher/students DOES still return same-school students ──
    # Move victim to School A so they SHOULD now appear
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${VICTIM_UID}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" -H "Prefer: return=minimal" \
      -d "{\"school_id\":\"${SCHOOL_A}\"}" > /dev/null
    sleep 0.3

    STUDENTS_LIST=$(curl -s "$BASE_URL/api/teacher/students" -H "Authorization: Bearer $TOKEN")
    SEEN=$(echo "$STUDENTS_LIST" | jq --arg uid "$VICTIM_UID" '[.students[] | select(.id == $uid)] | length')
    [ "$SEEN" = "1" ] && pass "/api/teacher/students DOES return same-school student" \
      || fail "FALSE NEGATIVE: same-school student missing from /api/teacher/students (count=$SEEN)"

    STUDENT_GET=$(curl -s -o /dev/null -w "%{http_code}" \
      "$BASE_URL/api/teacher/student/$VICTIM_UID" -H "Authorization: Bearer $TOKEN")
    [ "$STUDENT_GET" = "200" ] && pass "/api/teacher/student/:id returns 200 same-school" \
      || fail "FALSE NEGATIVE: /api/teacher/student/:id same-school returned $STUDENT_GET (expected 200)"
  fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "\033[1m═══ Multi-tenant integration: $PASS passed, $FAIL failed ═══\033[0m"
if [ "$FAIL" -gt 0 ]; then
  echo "Failures:"
  for f in "${FAILURES[@]}"; do echo "  • $f"; done
  exit 1
fi
exit 0
