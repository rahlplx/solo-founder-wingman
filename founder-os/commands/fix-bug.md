---
description: Fix a bug using the SEB method (Screenshot, Error message, Before/After) instead of a vague description.
argument-hint: <bug description>
allowed-tools: Read, Grep, Glob, Edit, Bash
---

PROBLEM: $ARGUMENTS

Before fixing, make sure you actually have (ask me for whatever's missing):
- SCREENSHOT: what it looks like when it's broken (if visual)
- ERROR TEXT: the exact red/error text, copied verbatim, not paraphrased
- LAST WORKING STATE: what was the last change before this broke? If
  unclear, use the bisect trick — undo the last 3 changes one at a time and
  test after each until it works again, then fix just that one thing.

TASK: Find and fix this bug without breaking anything else.
VERIFY: Run `/verify-path` and confirm existing tests still pass before
telling me it's fixed.
