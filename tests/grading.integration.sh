#!/usr/bin/env bash
# Integration tests for server-side grading: /test/start, /test/complete,
# /api/ai/practice, /api/ai/practice/complete.
#
# Locks the cheat-prevention contract introduced in commit 1c275cd:
#   • /test/start strips correctIndex + explanation from questions before
#     returning to the client.
#   • /test/complete and /practice/complete grade against the canonical
#     questions persisted server-side. Spurious `correct: true` flags from
#     the client are ignored.
#   • Both /complete endpoints reject the legacy contract (no sessionId)
#     with 400, reject already-completed sessions with 409, reject forged
#     sessionIds with 404.
#
# Prereqs:
#   • backend on http://localhost:3001
#   • .env with SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ADMIN_PASSWORD
#   • test student account (override via TEST_EMAIL/TEST_PASSWORD)
#
# Run: bash tests/grading.integration.sh

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

# Sign in as test student
TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" | jq -r '.access_token')
[ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] && { echo "AUTH FAILED"; exit 1; }

# ═══════════════════════════════════════════════════════════════════════════
# /api/test/start + /api/test/complete
# ═══════════════════════════════════════════════════════════════════════════

note "TEST FLOW — /api/test/start sanitises questions"
START=$(curl -s -X POST "$BASE_URL/api/test/start" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"mode":"self","subject":"Physics","classLevel":10,"questionCount":3,"difficulty":"easy"}')
SID=$(echo "$START" | jq -r '.sessionId')
[ "$SID" = "null" ] && { echo "Could not start test: $START"; exit 1; }

# 1. sessionId returned
[ -n "$SID" ] && [ "$SID" != "null" ] && pass "sessionId returned" \
  || fail "no sessionId in /start response"

# 2. correctIndex stripped from every question
HAS_CORRECT_IDX=$(echo "$START" | jq '[.questions[] | has("correctIndex")] | any')
assert_eq "false" "$HAS_CORRECT_IDX" "no correctIndex on any returned question"

# 3. explanation stripped from every question
HAS_EXPL=$(echo "$START" | jq '[.questions[] | has("explanation")] | any')
assert_eq "false" "$HAS_EXPL" "no explanation on any returned question"

# 4. question + options + topic preserved
HAS_QO=$(echo "$START" | jq '[.questions[] | has("question") and has("options")] | all')
assert_eq "true" "$HAS_QO" "every question has question + options"

note "TEST FLOW — /api/test/complete CHEAT TEST"
# Pick deliberately wrong answers (all 0). With 4 options random correct, expect ≤ ~25% by luck.
# Critical: client cannot inject `correct: true` to claim 100%.
ANSWERS=$(echo "$START" | jq -c '[.questions[] | {questionIdx: 0, selectedIdx: 0}] | to_entries | map({questionIdx: .key, selectedIdx: 0})')
COMPLETE_RESP=$(curl -s -X POST "$BASE_URL/api/test/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SID\",\"answers\":$ANSWERS,\"timeTakenSeconds\":10}")
ACCURACY=$(echo "$COMPLETE_RESP" | jq -r '.accuracy')
CORRECT_COUNT=$(echo "$COMPLETE_RESP" | jq -r '.correctCount')
TOTAL=$(echo "$COMPLETE_RESP" | jq -r '.totalQuestions')
[ "$ACCURACY" != "null" ] && pass "/complete returned graded result (accuracy=$ACCURACY%)" \
  || fail "/complete missing accuracy"
[ "$CORRECT_COUNT" -le "$TOTAL" ] 2>/dev/null && pass "correctCount ($CORRECT_COUNT) ≤ total ($TOTAL)" \
  || fail "correctCount > total (impossible — server lied)"

# Cheat: try to claim 100% via spurious correct:true. Server must ignore.
START2=$(curl -s -X POST "$BASE_URL/api/test/start" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"mode":"self","subject":"Physics","classLevel":10,"questionCount":2,"difficulty":"easy"}')
SID2=$(echo "$START2" | jq -r '.sessionId')
QCOUNT=$(echo "$START2" | jq '.questions | length')
# Build answers with wrong selectedIdx (always pick 3) AND inject correct:true
CHEAT_ANSWERS=$(jq -nc --argjson n "$QCOUNT" '[range(0; $n) | {questionIdx: ., selectedIdx: 3, correct: true}]')
CHEAT_RESP=$(curl -s -X POST "$BASE_URL/api/test/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SID2\",\"answers\":$CHEAT_ANSWERS,\"timeTakenSeconds\":1}")
CHEAT_CORRECT=$(echo "$CHEAT_RESP" | jq -r '.correctCount')
# selectedIdx=3 on every Q has expected hit rate ~25% with 4 options. Could be 0-2.
# What we verify: server graded based on canonical, NOT trusted client `correct: true`.
# If server trusted client, correctCount would equal QCOUNT.
if [ "$CHEAT_CORRECT" -lt "$QCOUNT" ]; then
  pass "spurious correct:true ignored (claimed $QCOUNT, server graded $CHEAT_CORRECT)"
else
  fail "server might be trusting client correct flag (claimed $QCOUNT, got $CHEAT_CORRECT — could be coincidence; re-run)"
fi

note "TEST FLOW — /api/test/complete contract guards"
# Resubmit same session → 409
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/test/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SID\",\"answers\":[],\"timeTakenSeconds\":1}")
HTTP=$(echo "$RESP" | tail -1)
assert_eq "409" "$HTTP" "resubmit same sessionId → 409"

# Forge non-existent sessionId → 404
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/test/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sessionId":"00000000-0000-0000-0000-000000000000","answers":[{"questionIdx":0,"selectedIdx":0}],"timeTakenSeconds":1}')
HTTP=$(echo "$RESP" | tail -1)
assert_eq "404" "$HTTP" "forged sessionId → 404"

# Old contract (no sessionId) → 400
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/test/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"mode":"self","subject":"Physics","questions":[{"q":"x"}],"answers":[{"questionIdx":0,"selectedIdx":0,"correct":true}]}')
HTTP=$(echo "$RESP" | tail -1)
assert_eq "400" "$HTTP" "legacy contract (no sessionId) → 400"

# ═══════════════════════════════════════════════════════════════════════════
# /api/ai/practice + /api/ai/practice/complete
# ═══════════════════════════════════════════════════════════════════════════

note "PRACTICE FLOW — /api/ai/practice returns sessionId + canonical questions"
PRAC=$(curl -s -X POST "$BASE_URL/api/ai/practice" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"subject":"Physics","className":10,"count":2,"topic":"force"}')
PSID=$(echo "$PRAC" | jq -r '.sessionId')
[ -n "$PSID" ] && [ "$PSID" != "null" ] && pass "practice sessionId returned" \
  || fail "no sessionId in /practice response"

# Practice INTENTIONALLY ships correctIndex (instant feedback UX). Verify it's present.
HAS_CIDX=$(echo "$PRAC" | jq '[.questions[] | has("correctIndex")] | all')
assert_eq "true" "$HAS_CIDX" "practice questions retain correctIndex (instant-feedback UX)"

# Grounded flag on every question (per-question grounding flag from RAG commit)
HAS_GROUNDED=$(echo "$PRAC" | jq '[.questions[] | has("grounded")] | all')
assert_eq "true" "$HAS_GROUNDED" "every practice question has grounded flag"

# Round-level grounded summary
HAS_ROUND_GROUNDED=$(echo "$PRAC" | jq 'has("grounded") and has("ncertChunksUsed")')
assert_eq "true" "$HAS_ROUND_GROUNDED" "round-level grounded + ncertChunksUsed in response"

note "PRACTICE FLOW — /api/ai/practice/complete CHEAT TEST"
# Server stored canonical correctIndex. Client posts wrong selectedIdx + claims correct:true.
PQCOUNT=$(echo "$PRAC" | jq '.questions | length')
# Compute deliberately-wrong selectedIdx for each (correctIndex + 1) % 4
CHEAT_PRAC=$(echo "$PRAC" | jq --argjson n "$PQCOUNT" '[
  .questions | to_entries[] | {
    questionIdx: .key,
    selectedIdx: ((.value.correctIndex + 1) % 4),
    correct: true
  }
]')
PRAC_CHEAT_RESP=$(curl -s -X POST "$BASE_URL/api/ai/practice/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$PSID\",\"answers\":$CHEAT_PRAC,\"hintsUsed\":0}")
PRAC_CHEAT_CORRECT=$(echo "$PRAC_CHEAT_RESP" | jq -r '.correctCount')
PRAC_CHEAT_XP=$(echo "$PRAC_CHEAT_RESP" | jq -r '.xpAwarded')
assert_eq "0" "$PRAC_CHEAT_CORRECT" "spurious correct:true ignored on practice (every selectedIdx is wrong → 0 correct)"
assert_eq "0" "$PRAC_CHEAT_XP" "no XP awarded when no canonical-correct answers (cheat blocked)"

note "PRACTICE FLOW — /api/ai/practice/complete contract guards"
# Resubmit
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/practice/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$PSID\",\"answers\":[],\"hintsUsed\":0}")
HTTP=$(echo "$RESP" | tail -1)
assert_eq "409" "$HTTP" "resubmit practice → 409"

# Forge
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/practice/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sessionId":"00000000-0000-0000-0000-000000000000","answers":[{"questionIdx":0,"selectedIdx":0}],"hintsUsed":0}')
HTTP=$(echo "$RESP" | tail -1)
assert_eq "404" "$HTTP" "forged practice sessionId → 404"

# Legacy contract
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/practice/complete" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"subject":"Physics","className":10,"questions":[],"correctCount":5,"totalQuestions":5}')
HTTP=$(echo "$RESP" | tail -1)
assert_eq "400" "$HTTP" "legacy practice contract (no sessionId) → 400"

# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "\033[1m──────────────────────────────────────\033[0m"
echo -e "\033[1mPASSED: $PASS  FAILED: $FAIL\033[0m"
if [ "$FAIL" -gt 0 ]; then
  echo -e "\033[1;31mFailures:\033[0m"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo -e "\033[1;32mAll grading tests passed.\033[0m"
