---
name: ship-checklist
description: Run the SHIP checklist (Stable, Hidden secrets, Inputs validated, Performance) immediately before every deploy, using the agent's own tools directly. Use right before any git push to a branch that auto-deploys, after /verify-path and /security-audit have already passed.
---

# Ship Checklist (SHIP method)

Deploy for this founder is just `git push` plus autodeploy — no staging
gate, no ops team. This checklist is the last human-in-the-loop-shaped
check before that happens, run fresh, every time.

## What to do

1. **Confirm prerequisites already passed.** This isn't a replacement for
   `/verify-path` (functional evidence) or `/security-audit` (LOCK) — if
   either hasn't run for what changed this session, run it first.

2. **S — Stable.** Re-walk (or re-run the automated suite for) all main
   features end-to-end — a final regression check, not a repeat of the
   full PATH walkthrough.

3. **H — Hidden secrets.** Grep for secret-shaped strings in client-bundled
   code, confirm `.env` (or equivalent) is gitignored, not committed. This
   overlaps `security-audit`'s K — re-check anyway, it's cheap and catches
   anything that changed since.

4. **I — Inputs validated.** Spot-check new or changed forms reject empty
   or malformed input gracefully instead of crashing.

5. **P — Performance.** Open the app and note whether it feels snappy. For
   anything data-heavy, sanity-check there's no obvious unbounded fetch or
   N+1 query introduced this session.

6. **Report one Red/Yellow/Green SHIP verdict.** If Green, pause and wait
   for explicit founder confirmation before running `git push` — a Green
   verdict means it's safe to ask, not license to push automatically. Red
   or Yellow means fix first — don't ship with a caveat attached instead
   of a fix.

7. **After the deploy actually happens, hand off to `/ship-retro`.** This
   checklist gets the feature out the door; `/ship-retro` is the short
   follow-up that captures what that build actually taught, once, right
   after shipping.

This skill is fully self-contained: no dedicated bin script exists or is
needed for it. All four checks run directly via tools the agent already
has (Bash for grep/tests, Read for code inspection, the `playwright` MCP
server for a final visual pass) — the same pattern `/verify-path` and
`/security-audit` already use. `bin/verify-gate.sh` (the existing Stop
hook) is the enforcement backstop specifically for the Stable check;
treat it as the mechanism behind that one item, not a substitute for
running this whole checklist.

## Anti-patterns to avoid

- Skipping straight to `git push` because `/verify-path` already ran once
  earlier in the session — SHIP runs fresh, right before shipping.
- Treating Yellow as good enough to ship instead of fixing it or getting
  explicit founder sign-off on the specific named risk.
- Inventing a new script for this — don't add a deploy-precheck script
  unless the founder explicitly asks for a repeatable CLI-only precheck
  that runs outside the agent loop.
