---
name: multi-model-review
description: Run the 3-Layer Review (you: visual/functional check, a second AI: code quality, a security-focused AI: vulnerabilities), and be explicit about the limits of same-model-family review. Use after any major feature; for anything security-critical, pair with /security-audit.
---

# Multi-Model Review (3-Layer Review)

The founder can't read code, so "review" has to produce an actionable
verdict, not prose. The three layers catch different classes of problems
and aren't interchangeable — running one doesn't excuse skipping another.

## What to do

1. **Layer 1 — founder, visual + functional.** Point to `/verify-path` for
   the structured PASS/FAIL walkthrough. This skill precedes that step,
   it doesn't replace it.

2. **Layer 2 — second AI, code quality.** Use the Red/Yellow/Green prompt
   already codified in `commands/review-code.md` — BUGS, SECURITY,
   PERFORMANCE, QUALITY.

3. **Be honest about the cross-model caveat.** A same-model-family
   subagent persona is a weaker substitute for true cross-model review —
   different model families miss different things, and a persona prompt
   alone doesn't reproduce that. For anything that matters (payments,
   auth, user data), recommend pasting a redacted excerpt into a genuinely
   different model provider rather than relying on an in-session "act as
   reviewer" persona. Always strip secrets, tokens, and user data before
   exporting anything outside the session — cross-model review is not
   worth a leak.

4. **Layer 3 — security AI.** Don't fold security review into this same
   pass. Hand off explicitly to `/security-audit` (the LOCK checklist) —
   `commands/review-code.md` already says to do this; keep both
   consistent.

5. **Consolidate into one Red/Yellow/Green verdict per layer**, with a
   specific fix for anything not Green — never "this could be improved."

6. **State which layers actually ran** before declaring anything
   "reviewed." A clean Layer 2 pass isn't evidence of security. A clean
   Layer 1 pass isn't evidence of code quality.

## Anti-patterns to avoid

- Presenting an in-session "second AI persona" as equivalent to real
  cross-model review without saying so.
- Skipping `/security-audit` for anything touching auth, payments, or user
  data — even after Layers 1-2 come back clean.
- Prose instead of Red/Yellow/Green with a specific, actionable fix.
