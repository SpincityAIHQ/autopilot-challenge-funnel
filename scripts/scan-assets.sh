#!/usr/bin/env bash
# scripts/scan-assets.sh
# Repeatable client-bundle + repo-wide launch-blocker scanner.
#
# Fails (nonzero exit) if any of the following is true:
#   * The client build output directory cannot be located.
#   * Any unique paid-body phrase from src/lib/resource-content.server.ts
#     appears in a real client JS/HTML/CSS asset.
#   * Any stale public-copy pattern appears anywhere except an allowlisted set
#     of QA/docs files.
#   * Any canonical funnel route file is missing.

set -euo pipefail

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; NC=$'\033[0m'

fail=0
say_pass() { echo "${GREEN}PASS${NC} $*"; }
say_fail() { echo "${RED}FAIL${NC} $*"; fail=1; }
say_note() { echo "${YELLOW}NOTE${NC} $*"; }

# 1. Locate client bundle dir.
CANDIDATES=(dist/client dist/static .output/public build/client)
CLIENT_DIR=""
for c in "${CANDIDATES[@]}"; do
  if [[ -d "$c" ]]; then CLIENT_DIR="$c"; break; fi
done
if [[ -z "$CLIENT_DIR" ]]; then
  say_fail "no client build output found (looked in: ${CANDIDATES[*]}). Run bun run build first."
  exit 1
fi
say_note "scanning client bundle at: $CLIENT_DIR"

# 2. Unique paid-body phrases (must exist server-side, must NOT exist client-side).
PAID_PHRASES=(
  "Name the wall"
  "Reliability math"
  "Rules of the fence"
  "Homework: bring"
)
SERVER_FILE="src/lib/resource-content.server.ts"
if [[ ! -f "$SERVER_FILE" ]]; then
  say_fail "server-only paid content file missing: $SERVER_FILE"
else
  for phrase in "${PAID_PHRASES[@]}"; do
    if grep -Fq "$phrase" "$SERVER_FILE"; then
      say_pass "server-only phrase present: '$phrase'"
    else
      say_fail "expected paid phrase missing from $SERVER_FILE: '$phrase'"
    fi
  done
fi

leak_count=0
for phrase in "${PAID_PHRASES[@]}"; do
  if hits=$(grep -Rl -F --include='*.js' --include='*.mjs' --include='*.cjs' \
              --include='*.html' --include='*.css' \
              "$phrase" "$CLIENT_DIR" 2>/dev/null); then
    if [[ -n "$hits" ]]; then
      say_fail "paid phrase leaked into client: '$phrase' → $hits"
      leak_count=$((leak_count + 1))
    fi
  fi
done
[[ $leak_count -eq 0 ]] && say_pass "0 paid-content leaks in $CLIENT_DIR"

# 3. Repo-wide stale public copy scan.
# Patterns are anchored so "Aug 1" does not match "Aug 10", "Aug 2" does not
# match "Aug 24/25/26", and legacy dates are matched by exact substring.
STALE_PATTERNS=(
  'AUTOPILOT Challenge'
  'The AUTOPILOT Challenge'
  '2026-08-01'
  '2026-08-02'
  '\bAug 1, 2026\b'
  '\bAug 2, 2026\b'
  '\bAug 1[–-]2\b'
  '12[–-]4 ?PM'
  '\bFounder Seat\b'
  'one working AI-powered job'
  'working first job, running'
  'turn one on [—-] live'
  'By Sunday evening'
)
# Files exempt from stale scan:
#  * this scanner
#  * SQL QA script (owns literal legacy tokens for verification)
#  * .lovable/plan.md (historical planning notes, never user-facing)
#  * supabase/migrations/* (immutable historical migration filenames/comments)
#  * src/tests/* (assertions may pin legacy tokens on purpose)
#  * src/styles.css (project header comment, never rendered)
#  * docs/operator-launch-checklist.md (checklist for scrubbing legacy tokens)
ALLOW_REGEX='^\./(scripts/scan-assets\.sh|scripts/verify-resource-sessions\.sql|\.lovable/plan\.md|supabase/migrations/|src/tests/|src/styles\.css|docs/operator-launch-checklist\.md)'

stale_hits=0
for pat in "${STALE_PATTERNS[@]}"; do
  if hits=$(grep -RIEn \
              --exclude-dir=node_modules --exclude-dir=dist \
              --exclude-dir=.output --exclude-dir=build \
              --exclude-dir=.git --exclude-dir=.vinxi \
              "$pat" . 2>/dev/null); then
    if [[ -n "$hits" ]]; then
      filtered=$(echo "$hits" | grep -Ev "$ALLOW_REGEX" || true)
      if [[ -n "$filtered" ]]; then
        say_fail "stale copy '$pat':"
        echo "$filtered"
        stale_hits=$((stale_hits + 1))
      fi
    fi
  fi
done
[[ $stale_hits -eq 0 ]] && say_pass "0 stale public-copy hits"


# 4. Canonical funnel route presence.
REQUIRED_ROUTES=(
  "src/routes/offer/vip-upgrade.tsx"
  "src/routes/offer/implementation-vault.tsx"
  "src/routes/strategy-intensive.tsx"
  "src/routes/offer/mentorship.tsx"
  "src/routes/offer/keynote.tsx"
  "src/routes/next-keynote.tsx"
  "src/routes/api/public/resources/exchange.ts"
  "src/routes/api/public/resources/read.ts"
  "src/routes/api/public/resources/logout.ts"
)
for r in "${REQUIRED_ROUTES[@]}"; do
  if [[ -f "$r" ]]; then say_pass "route present: $r"
  else say_fail "route missing: $r"; fi
done

exit $fail
