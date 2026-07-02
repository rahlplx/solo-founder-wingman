---
name: verify-path
description: Gate any "this is done" claim behind actual evidence using the PATH walkthrough method (Primary flow, Alternate paths, Transitions, Happy+Hostile testing), since the founder cannot read the code to verify it themselves. Run this before presenting any feature as complete, and before /ship.
---

# Verify (PATH walkthrough)

The founder cannot read the diff you produced. A confident-sounding "done"
is not evidence — it's a claim. Your job in this skill is to actually
produce the evidence, in a form the founder can judge without reading code:
a PASS/FAIL report they can act on.

This skill is one layer of the Verification Engine (alongside agent-led TDD
and the 3-Layer Review) and is what `bin/verify-gate.sh` checks for before
letting a "done" claim reach the founder — treat that hook as the enforcement
mechanism and this skill as the actual work it's enforcing.

## What to do

Walk through the feature using all four PATH dimensions. Don't skip any —
each catches a different class of bug:

1. **P — Primary flow.** Walk the single most important user action from
   start to finish, exactly as a real user would. State each step and its
   result.

2. **A — Alternate paths.** Deliberately try what happens with wrong inputs,
   empty fields, the back button, a page refresh mid-flow. Non-technical
   founders won't think to try these; you have to.

3. **T — Transitions.** Confirm state persists correctly moving between
   pages/steps — does data survive a refresh? Does the right thing render
   after a redirect?

4. **H — Happy + Hostile.** Test once as a cooperative user, then once
   actively trying to break it (double-submit a form, submit while offline,
   paste something absurd into a text field).

## Then, produce evidence, not narration

- If automated tests exist for this feature, run them and report actual
  PASS/FAIL counts — not "tests look good."
- If they don't exist yet, write them now, following the project's
  established test setup, then run them.
- If the change is visual/UI, capture a screenshot (via the Playwright MCP
  server if configured) rather than describing what it should look like.
- If an LSP server is configured (Claude Code only), treat its diagnostics as
  a free pre-check — don't report "done" if there are unresolved errors it
  flagged, even if you haven't run the full test suite yet.

## Report format

Give the founder a short PASS/FAIL summary per PATH dimension, plain
English, no jargon:

```
Primary flow:     PASS — user can create and view a schedule end-to-end
Alternate paths:  FAIL — submitting an empty shift crashes the page
Transitions:      PASS
Happy + Hostile:  PASS — double-submit correctly shows "already saved"

Not done yet — 1 failure above. Fixing now.
```

Only say "done" when every dimension is PASS and you have the evidence to
back it, not before.
