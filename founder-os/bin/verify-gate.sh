#!/usr/bin/env bash
# Stop hook: before the agent is allowed to end its turn, run the project's
# test command (if one exists) so a "done" claim is backed by evidence
# instead of just a diff. If tests fail, block the stop and hand the
# failures back so the agent keeps working instead of declaring success.
#
# The {"decision":"block","reason":...} JSON contract used below is
# confirmed current (code.claude.com/docs/en/hooks, checked directly).
set -euo pipefail

# Fail-safe: an unexpected error anywhere below (e.g. `node` missing,
# `mktemp` failing) must never leave this Stop hook crashing with no JSON
# output at all -- that's undefined behavior for Claude Code's Stop hook
# contract, and the opposite of the "fail open, log loudly" philosophy
# already followed in bin/policy-check.js and adapters/opencode/plugin.ts.
# This only fires on a genuinely unexpected failure (set -e triggers ERR);
# every intentional exit path below calls `exit 0` directly, which does
# not trigger ERR, so normal success/failure decisions are unaffected.
# shellcheck disable=SC2317
handle_unexpected_error() {
  local exit_code=$?
  echo "verify-gate: unexpected error (exit ${exit_code}) -- failing open, allowing the stop. Investigate this hook script." >&2
  echo '{"decision":"allow"}'
  exit 0
}
trap handle_unexpected_error ERR

# stop_hook_active is true when Claude is already in a forced-continuation
# turn caused by this same hook blocking last time. Without this check, a
# persistently-failing test suite would re-block every subsequent turn
# forever (Claude Code has a built-in override after 8 consecutive blocks,
# but a filed upstream bug -- anthropics/claude-code#55754 -- shows that
# safeguard doesn't reliably prevent a whole session getting burned first).
# Always allow on the second pass rather than re-running tests again.
PAYLOAD="$(cat)"
STOP_HOOK_ACTIVE="$(node -e '
  let d = "";
  process.stdin.on("data", c => d += c);
  process.stdin.on("end", () => {
    try {
      const p = JSON.parse(d);
      process.stdout.write(p.stop_hook_active ? "true" : "false");
    } catch (e) {
      process.stdout.write("false");
    }
  });
' <<<"$PAYLOAD")"

if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# Check specifically for scripts.test, not just the substring "test" anywhere
# in package.json (a bare `grep -q '"test"'` would false-positive on e.g. a
# "keywords": ["test"] field with no actual test script, causing `npm test`
# to fail with "Missing script" and the founder seeing a misleading
# "tests are failing" block).
HAS_TEST_SCRIPT="false"
if [[ -f package.json ]]; then
  HAS_TEST_SCRIPT="$(node -e '
    try {
      const pkg = JSON.parse(require("fs").readFileSync("package.json", "utf8"));
      process.stdout.write(pkg.scripts && pkg.scripts.test ? "true" : "false");
    } catch (e) {
      process.stdout.write("false");
    }
  ')"
fi

if [[ "$HAS_TEST_SCRIPT" != "true" ]]; then
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
  # $'...' (ANSI-C quoting) so \n is an actual newline, not the literal two
  # characters "\" and "n" ending up in the JSON reason text.
  REASON=$'Tests are failing, so this isn\'t verifiably done yet. Fix the failures below before finishing:\n\n'"$(tail -n 40 "$TEST_OUT")"
  node -e '
    const reason = process.argv[1];
    process.stdout.write(JSON.stringify({decision:"block",reason}));
  ' "$REASON"
  exit 0
fi
