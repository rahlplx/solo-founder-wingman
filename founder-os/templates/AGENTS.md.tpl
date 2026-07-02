<!--
  Generated/maintained by founder-os. If an AGENTS.md already existed (e.g.
  created by this tool's own `/init`), founder-os APPENDS/ENRICHES it rather
  than overwriting — never destroy a host tool's native scaffold.
  Sections marked [managed by founder-os] are rewritten by bin/doc-sync.sh;
  everything else is yours to edit freely and will be preserved.
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
agent you're using. Read this before assuming equal protection everywhere.

| Platform | Destructive-command blocking | Mechanism |
|---|---|---|
| Claude Code | Enforced by code (PreToolUse hook) | `hooks/hooks.json` intercepts and can hard-block |
| OpenCode | Enforced by code (`tool.execute.before`) | plugin.ts intercepts and can hard-block |
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
