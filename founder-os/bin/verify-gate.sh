#!/usr/bin/env bash
set -euo pipefail

# Optimized Stop Hook
PAYLOAD="$(cat)"

# Fast extraction using grep/sed for common case to avoid even jq/node overhead
if [[ "$PAYLOAD" == *'"stop_hook_active":true'* ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

TOP_LEVEL="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$TOP_LEVEL"

HAS_TEST_SCRIPT="false"
if [[ -f package.json ]]; then
  # Quick check for test script without parsing full JSON if possible
  if grep -q '"test":' package.json; then
    HAS_TEST_SCRIPT="true"
  fi
fi

if [[ "$HAS_TEST_SCRIPT" != "true" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

TEST_OUT="$(mktemp)"
trap 'rm -f "$TEST_OUT"' EXIT

if npm test --silent > "$TEST_OUT" 2>&1; then
  echo '{"decision":"allow"}'
  exit 0
else
  REASON=$'Tests are failing, so this isn't verifiably done yet. Fix the failures below before finishing:

'"$(tail -n 40 "$TEST_OUT")"
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
  else
    node -e 'console.log(JSON.stringify({decision:"block",reason:process.argv[1]}))' "$REASON"
  fi
  exit 0
fi
