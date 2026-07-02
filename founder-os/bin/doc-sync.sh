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

PAYLOAD="$(cat)"
COMMAND="$(node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const p=JSON.parse(d);process.stdout.write((p.tool_input&&p.tool_input.command)||"")}catch(e){}})' <<<"$PAYLOAD")"

if [[ "$COMMAND" == *"git commit"* ]]; then
  CHANGELOG="$(git rev-parse --show-toplevel 2>/dev/null || echo .)/CHANGELOG.md"
  if [[ -f "$CHANGELOG" ]]; then
    MSG="$(git log -1 --pretty=%s 2>/dev/null || echo "change")"
    DATE="$(date +%Y-%m-%d)"
    TMP="$(mktemp)"
    awk -v msg="$MSG" -v date="$DATE" '
      /^### Added$/ && !done { print; print "- " msg " (" date ")"; done=1; next }
      { print }
    ' "$CHANGELOG" > "$TMP" && mv "$TMP" "$CHANGELOG"
  fi
fi

exit 0
