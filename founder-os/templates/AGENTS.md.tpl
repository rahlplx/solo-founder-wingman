<!--
  Generated/maintained by founder-os. If an AGENTS.md already existed (e.g.
  created by this tool's own `/init`), founder-os APPENDS/ENRICHES it rather
  than overwriting — never destroy a host tool's native scaffold.
  Sections marked [managed by founder-os] are maintained by founder-os
  tooling where implemented -- today, only CHANGELOG.md is auto-appended by
  bin/doc-sync.sh; these AGENTS.md sections are not yet auto-rewritten and
  should be kept current by hand until that lands.
  Everything else in this file is yours to edit freely and will be preserved.
-->

# Project Rules for AI Agents

## About This Project
{{ONE_PARAGRAPH_DESCRIPTION}}
<!-- what it is, who it's for, what problem it solves -->

## Tech Stack (don't change without asking)
- Frontend: {{FRONTEND_STACK}}
- Backend: {{BACKEND_STACK}}
- Payments: {{PAYMENTS_STACK}}
- Hosting: {{HOSTING_STACK}}

## Rules
- Never delete existing functionality when adding new features
- All new pages must be mobile-responsive
- Always add error handling for user-facing features
- Write tests for any new feature — I can't read code, I need PASS/FAIL output
- One change per prompt/session where possible; test after each change
- Before claiming a task is "done," show the verification evidence (test
  output, screenshot, or curl result) — a diff is not proof

## Known Limitations by Platform [managed by founder-os]

This project's safety rails degrade gracefully depending on which AI coding
agent you're using. Read this before assuming equal protection everywhere —
in plain terms first, technical detail second.

- **On Claude Code and OpenCode**, risky actions (deleting files, force-push,
  dropping a database table, etc.) can be automatically stopped or paused
  for your confirmation before they run — a real safety net, not just a
  suggestion.
- **On Codex**, there's no equivalent automatic stop. Instead, Codex asks
  for your approval before it does anything outside a safe sandbox — so
  you're still in the loop, but the tool can't proactively block one
  specific dangerous command the way it can on the other two platforms. Be
  extra careful reviewing what Codex asks to run, especially deploy and
  delete commands.
- **On OpenCode specifically**, there's no separate "are you sure?" pause —
  anything this project's rules flag gets fully stopped, not just paused for
  confirmation, because the platform doesn't offer a middle option (confirmed
  July 2026).
- **No platform can catch everything.** The way risky commands get detected
  is by recognizing patterns in the text of the command — it cannot truly
  understand intent the way a person can. A sufficiently deliberate attempt
  to disguise a command can get past this, the same way a lock keeps out
  casual intruders but not a determined professional. Treat this as a strong
  safety net for mistakes and momentum, not a guarantee against a
  determined bad actor.

| Platform | Destructive-command blocking | Mechanism |
|---|---|---|
| Claude Code | Enforced by code (PreToolUse hook), supports hard-block or ask-to-confirm | `hooks/hooks.json` intercepts before the tool call runs |
| OpenCode | Enforced by code (`tool.execute.before`); no distinct "ask" mode exists on this platform (confirmed), so confirm-level rules also hard-block | `plugin.ts` intercepts before the tool call runs |
| Codex CLI | Enforced by sandbox policy only, no code hook exists | `config.toml` `approval_policy=on-request` + `sandbox_mode=workspace-write` — requires you to actually approve each risky action, don't set `approval_policy=never` |

LSP-based background diagnostics (a cheap pre-check before the verify gate)
only run on Claude Code — OpenCode and Codex rely more heavily on the
agent-led test suite for the same signal.

The 3-Layer Review's "second AI" layer only catches genuinely different bugs
if it's actually a different model provider — a same-family subagent persona
is a weaker substitute. Paste into a different provider when it matters.

## Current Status [managed by founder-os]
- {{FEATURE_1}}: 📋 Planned
- {{FEATURE_2}}: 📋 Planned

## Known Issues [managed by founder-os]
- (none yet)
