---
description: Safely clean up an area of the codebase that's grown messy, without changing behavior.
---

CONTEXT: This area has grown organically and needs cleanup: $ARGUMENTS

RULES:
1. Do NOT change any user-facing behavior.
2. Do NOT break any existing tests.
3. DO commit after each logical change, so this can be reverted if needed.
4. DO break large files into smaller, focused ones where it makes sense.
5. DO explain what changed and why, in plain terms — a before/after summary,
   not a line-by-line diff narration.

GOAL: Cleaner, more organized, easier to modify in the future — nothing
else changes from the founder's perspective.
VERIFY: Run `/verify-path` after the cleanup to confirm nothing broke.
