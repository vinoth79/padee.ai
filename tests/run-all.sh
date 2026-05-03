#!/usr/bin/env bash
# Run the full test suite. Exits non-zero on any failure.
#
# Phases:
#   1. Static analysis: tsc --noEmit (compile gate)
#   2. Unit tests: pure functions exported from server/lib/* (no backend needed)
#   3. Integration tests: hit the running backend (must be on :3001)
#
# Usage: bash tests/run-all.sh
#   Or:  npm test  (wired in package.json)

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

PHASES_FAILED=0
phase_done() {
  if [ "$1" -ne 0 ]; then
    PHASES_FAILED=$((PHASES_FAILED + 1))
    echo -e "\n\033[1;31m✗ $2 failed (exit $1)\033[0m"
  else
    echo -e "\n\033[1;32m✓ $2 passed\033[0m"
  fi
}

echo -e "\033[1;36m═══ Phase 1/3: Static analysis (tsc --noEmit) ═══\033[0m"
npx tsc --noEmit
phase_done $? "tsc --noEmit"

echo -e "\n\033[1;36m═══ Phase 2/3: Unit tests ═══\033[0m"
npx tsx tests/safeParseLLMJson.test.mjs
phase_done $? "safeParseLLMJson unit tests"

npx tsx tests/conceptExtract.test.mjs
phase_done $? "conceptExtract unit tests"

npx tsx tests/conceptDetect.test.mjs
phase_done $? "conceptDetect unit tests"

echo -e "\n\033[1;36m═══ Phase 3/3: Integration tests (backend on :3001) ═══\033[0m"
# Check backend is up first; bail with a hint if not.
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health | grep -q "200"; then
  echo -e "\033[1;31m✗ Backend not responding on http://localhost:3001\033[0m"
  echo "  Start it with: npm run dev:server  (or npm run dev:all)"
  exit 1
fi

bash tests/cors.integration.sh
phase_done $? "CORS integration"

bash tests/onboarding.integration.sh
phase_done $? "Onboarding integration"

bash tests/grading.integration.sh
phase_done $? "Grading integration"

bash tests/teacher.integration.sh
phase_done $? "Teacher integration"

bash tests/recommendations.integration.sh
phase_done $? "Recommendations integration"

bash tests/multitenant.integration.sh
phase_done $? "Multi-tenant integration"

echo ""
echo -e "\033[1m═══════════════════════════════════════════\033[0m"
if [ "$PHASES_FAILED" -eq 0 ]; then
  echo -e "\033[1;32m✓ All test phases passed.\033[0m"
  exit 0
fi
echo -e "\033[1;31m✗ $PHASES_FAILED phase(s) failed.\033[0m"
exit 1
