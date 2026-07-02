---
name: refactor-safely
description: Diagnose whether an area of code has real technical debt using the smell-test warning signs, then refactor it safely without changing user-facing behavior. This is the fuller diagnostic version of /refactor-cleanup — use this when it's unclear whether or where to refactor, not just to run the cleanup itself.
---

# Refactor Safely (smell test)

The founder can't see "messy code," only symptoms — things breaking,
things taking longer. The job is to diagnose severity before agreeing to
refactor anything, then do it without ever changing what the founder can
see or use.

## What to do

1. **Diagnose using the warning-signs table before agreeing to refactor
   anything.** Ask which symptoms the founder is actually seeing and rate
   urgency: AI keeps breaking old features when adding new ones → High;
   the same bug keeps recurring after being "fixed" → High; AI says "this
   is getting complex" → Medium; new features take much longer than
   before → Medium; founder is afraid to change anything → High.

2. **Only refactor High-urgency areas opportunistically.** Batch
   Medium-urgency work into the 4th-week cleanup cadence from
   `/weekly-plan`'s 3-3-3 rhythm rather than derailing feature work for a
   Medium smell.

3. **State the safe-refactor rules up front and hold to them** — identical
   to `commands/refactor-cleanup.md`: don't change user-facing behavior,
   don't break existing tests, commit after each logical change, explain
   before/after in plain terms.

4. **Verify before and after.** Run `/verify-path` before starting, as a
   baseline, and again after each committed change to confirm nothing
   shifted — not just once at the very end of the whole refactor.

5. **Report a before/after summary per logical change**, in plain
   language — not a line-by-line diff narration the founder can't parse.

## Anti-patterns to avoid

- Refactoring because code "looks bad" to the agent instead of because a
  specific High or Medium warning sign is present — name which one.
- Bundling a refactor and a feature change in the same commit, which
  defeats the point of "commit after each logical change."
- Skipping the before-refactor `/verify-path` baseline — without it,
  "nothing broke" isn't actually verifiable, just asserted.
