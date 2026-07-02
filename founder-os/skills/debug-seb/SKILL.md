---
name: debug-seb
description: Diagnose and fix a bug using the SEB method (Screenshot, Error message, Before/After) plus the bisect trick for unknown regressions, gathering real evidence before guessing at a fix. This is the fuller version of /fix-bug — use directly for trickier bugs or when the quick pass doesn't find the cause.
---

# Debug (SEB method)

The founder can't read a stack trace, but can take a screenshot and copy
error text. The job here is to force evidence collection before guessing,
with a deterministic fallback for when there's no clear "before."

## What to do

1. **Collect S-E-B before touching code — don't skip to "just fix it."**
   **S**creenshot: use the `playwright` MCP server to capture one if the
   founder can't easily grab it themselves — it's local browser automation
   and explicitly "not a security boundary," so it's fine to use freely.
   **E**rror text: copied verbatim, not paraphrased — ask again if it was
   paraphrased. **B**efore/after: the last change before it broke, if
   known.

2. **If "last working state" is unknown, run the bisect trick.** Undo the
   last 3 committed changes one at a time, testing after each, until the
   bug disappears. That isolates the breaking change without guessing.

3. **Diagnose in plain terms what went wrong before fixing** — one or two
   sentences, no code-level jargon the founder can't use.

4. **Fix only the isolated cause**, not surrounding code, to avoid
   introducing a second regression while chasing this one.

5. **Verify with `/verify-path`** before declaring it fixed, confirming
   the step-1 repro no longer reproduces.

## Anti-patterns to avoid

- Starting to fix before there's at least error text or a screenshot in
  hand.
- Bisecting "by feel" instead of one discrete committed change at a time,
  with an actual test after each undo.
- Fixing more than the isolated cause "while in there" — that's a
  refactor, not a bug fix; route it through `/refactor-safely` instead.
