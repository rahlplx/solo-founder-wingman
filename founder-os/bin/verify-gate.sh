#!/usr/bin/env bash
# Stop hook: before the agent is allowed to end its turn, run the project's
# test command (if one exists) so a "done" claim is backed by evidence
# instead of just a diff. If tests fail, block the stop and hand the
# failures back so the agent keeps working instead of declaring success.
#
# Scaffold note: verify the exact Stop-hook JSON contract (this uses
# {"decision":"block","reason":...} to force continuation) against the
# current Claude Code hooks reference before relying on this in production.
set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

if [[ ! -f package.json ]] || ! grep -q '"test"' package.json 2>/dev/null; then
  # No test command configured yet -- nothing to gate on. Allow to stop.
  echo '{"decision":"allow"}'
  exit 0
fi

TEST_OUT="$(mktemp)"
trap 'rm -f "$TEST_OUT"' EXIT

if npm test --silent > "$TEST_OUT" 2>&1; then
  echo '{"decision":"allow"}'
  exit 0
else
  REASON="Tests are failing, so this isn't verifiably done yet. Fix the failures below before finishing:\n\n$(tail -n 40 "$TEST_OUT")"
  node -e '
    const reason = process.argv[1];
    process.stdout.write(JSON.stringify({decision:"block",reason}));
  ' "$REASON"
  exit 0
fi
