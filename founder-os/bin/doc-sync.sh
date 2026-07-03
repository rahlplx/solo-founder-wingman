#!/usr/bin/env bash
# PostToolUse hook: after a Bash tool call (e.g. a git commit), append a
# dated entry to CHANGELOG.md's [Unreleased] section summarizing what
# changed, following the git-hook -> LLM-summarize -> append pattern used by
# agent-watch / Changeish / agentuity-agent-changelog (no dominant existing
# tool to depend on, so this is a minimal from-scratch implementation of
# that established shape).
#
# Scaffold note: this stub only fires the append when the underlying command
# was a `git commit`; a full implementation should have the calling agent
# pass a one-line summary of the change via the hook payload rather than
# re-deriving it here.
set -euo pipefail

# Fail-safe: an unexpected error anywhere below must never crash this
# PostToolUse hook or block the agent's turn -- the changelog append is
# best-effort, not safety-critical, so any genuinely unexpected failure
# (set -e triggers ERR) just skips the append for this turn, loudly, and
# exits 0. Every intentional exit path below is the implicit `exit 0` at
# the end of the script, which does not trigger ERR.
# shellcheck disable=SC2317
handle_unexpected_error() {
  local exit_code=$?
  echo "doc-sync: unexpected error (exit ${exit_code}) -- skipping changelog auto-append for this turn, not blocking. Investigate this hook script." >&2
  exit 0
}
trap handle_unexpected_error ERR

PAYLOAD="$(cat)"
COMMAND="$(node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const p=JSON.parse(d);process.stdout.write((p.tool_input&&p.tool_input.command)||"")}catch(e){}})' <<<"$PAYLOAD")"

# settings.json's docSyncOnCommit (default true) lets a founder turn this
# off entirely without editing hooks.json -- was previously unread by any
# script despite being a documented setting.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETTINGS_PATH="$SCRIPT_DIR/../settings.json"
DOC_SYNC_ON_COMMIT="true"
if [[ -f "$SETTINGS_PATH" ]]; then
  DOC_SYNC_ON_COMMIT="$(node -e '
    try {
      const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      process.stdout.write(s.docSyncOnCommit === false ? "false" : "true");
    } catch (e) {
      process.stdout.write("true");
    }
  ' "$SETTINGS_PATH")"
fi

if [[ "$DOC_SYNC_ON_COMMIT" == "true" && "$COMMAND" == *"git commit"* ]]; then
  CHANGELOG="$(git rev-parse --show-toplevel 2>/dev/null || echo .)/CHANGELOG.md"
  # Only append if HEAD's commit timestamp is very recent -- this hook only
  # knows the *command text* contained "git commit", not whether it actually
  # succeeded (rejected by a pre-commit hook, or nothing staged). Without
  # this check, a failed attempt would still append the *previous*
  # successful commit's message again, as if the failed change had shipped.
  COMMIT_AGE=999999
  if git rev-parse HEAD >/dev/null 2>&1; then
    COMMIT_TS="$(git log -1 --pretty=%ct 2>/dev/null || echo 0)"
    NOW_TS="$(date +%s)"
    COMMIT_AGE=$((NOW_TS - COMMIT_TS))
  fi
  if [[ -f "$CHANGELOG" && "$COMMIT_AGE" -le 10 ]]; then
    MSG="$(git log -1 --pretty=%s 2>/dev/null || echo "change")"
    DATE="$(date +%Y-%m-%d)"
    TMP="$(mktemp)"
    if awk -v msg="$MSG" -v date="$DATE" '
      /^### Added$/ && !done { print; print "- " msg " (" date ")"; done=1; next }
      { print }
      END { exit (done ? 0 : 1) }
    ' "$CHANGELOG" > "$TMP"; then
      mv "$TMP" "$CHANGELOG"
    else
      echo "doc-sync: CHANGELOG.md doesn't have the expected '### Added' section under [Unreleased] -- skipped auto-append, changelog left untouched" >&2
      rm -f "$TMP"
    fi
  fi
fi

exit 0
