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

# Set (possibly empty) before the trap can ever fire -- set -u would
# otherwise turn a reference to an unset LOCK_DIR inside the trap handler
# into its own unexpected error.
LOCK_DIR=""

# Fail-safe: an unexpected error anywhere below must never crash this
# PostToolUse hook or block the agent's turn -- the changelog append is
# best-effort, not safety-critical, so any genuinely unexpected failure
# (set -e triggers ERR) just skips the append for this turn, loudly, and
# exits 0. Every intentional exit path below is the implicit `exit 0` at
# the end of the script, which does not trigger ERR.
# shellcheck disable=SC2317
handle_unexpected_error() {
  local exit_code=$?
  [[ -n "$LOCK_DIR" ]] && rmdir "$LOCK_DIR" 2>/dev/null || true
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

  if git rev-parse HEAD >/dev/null 2>&1; then
    CURRENT_SHA="$(git rev-parse HEAD)"
    GIT_DIR="$(git rev-parse --git-dir 2>/dev/null || echo .git)"
    # State lives inside .git itself (never a tracked file, unique per
    # clone) rather than a wall-clock "commit age <= 10s" heuristic. Keying
    # off the actual HEAD SHA -- not a time window -- fixes two real bugs
    # the old heuristic had: (1) a later, unrelated command whose text
    # merely *contains* the substring "git commit" (e.g. a comment) no
    # longer re-appends the same already-synced commit a second time, since
    # HEAD hasn't moved since LAST_SHA was recorded; (2) a failed commit
    # attempt (rejected by a pre-commit hook, nothing staged) still leaves
    # HEAD unchanged, so it's correctly skipped rather than re-appending
    # the previous successful commit's message as if the failed one shipped.
    LAST_SHA_FILE="$GIT_DIR/founder-os-doc-sync-last-sha"
    LAST_SHA=""
    [[ -f "$LAST_SHA_FILE" ]] && LAST_SHA="$(cat "$LAST_SHA_FILE" 2>/dev/null || true)"

    if [[ "$CURRENT_SHA" != "$LAST_SHA" && -f "$CHANGELOG" ]]; then
      # A short-lived, non-blocking lock around the read-awk-mv sequence --
      # best-effort only (this hook must never hang or block the agent's
      # turn), so a lock held by another concurrent invocation just means
      # this turn's append is skipped rather than risking two writers
      # interleaving on the same CHANGELOG.md.
      LOCK_DIR="$GIT_DIR/founder-os-doc-sync.lock"
      if mkdir "$LOCK_DIR" 2>/dev/null; then
        MSG="$(git log -1 --pretty=%s 2>/dev/null || echo "change")"
        DATE="$(date +%Y-%m-%d)"
        TMP="$(mktemp)"
        # MSG/DATE are passed as environment variables (not awk -v
        # assignments) and read back via ENVIRON[] in BEGIN -- awk's -v and
        # command-line var=value forms run the value through backslash
        # escape processing (per POSIX), which would mangle a commit
        # subject containing a literal "\n"/"\t"/Windows path into real
        # control characters. ENVIRON[] is not subject to that processing.
        if MSG="$MSG" DATE="$DATE" awk '
          BEGIN { msg = ENVIRON["MSG"]; date = ENVIRON["DATE"] }
          /^## \[Unreleased\]/ { in_unreleased=1; print; next }
          in_unreleased && /^## / { in_unreleased=0 }
          in_unreleased && /^### Added$/ && !done { print; print "- " msg " (" date ")"; done=1; next }
          { print }
          END { exit (done ? 0 : 1) }
        ' "$CHANGELOG" > "$TMP"; then
          mv "$TMP" "$CHANGELOG"
          echo "$CURRENT_SHA" > "$LAST_SHA_FILE"
        else
          echo "doc-sync: CHANGELOG.md doesn't have the expected '### Added' section under [Unreleased] -- skipped auto-append, changelog left untouched" >&2
          rm -f "$TMP"
        fi
        rmdir "$LOCK_DIR" 2>/dev/null || true
      fi
    fi
  fi
fi

exit 0
