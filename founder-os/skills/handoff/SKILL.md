---
name: handoff
description: Produce a structured handoff summary before a session ends with unfinished work, right before /compact or /clear, or whenever /hire-agent hands a task to a different role — so in-progress state, what's actually been verified, and what's still open survive the boundary instead of being silently re-derived or dropped.
---

# Handoff

An agent that starts fresh (new session, post-compact, or a different
role taking over) has no memory of what you were actually in the middle
of — only what's committed to disk. Anything real but unwritten (a known
bug you haven't fixed yet, a test you meant to write, a decision you made
but didn't record) is gone the moment the boundary is crossed, and the
next agent will re-derive it, possibly wrong, or skip it entirely.

## What to do

1. **State what's actually done, with evidence, not intent.** Don't
   write "implemented the schedule feature" — write what was verified
   (`/verify-path`'s PASS/FAIL, if it ran) and what wasn't checked yet. A
   handoff is not the place to round up to "done."

2. **State what's in progress and exactly where it stopped.** The next
   agent needs the specific next step, not "continue working on X" — name
   the file, the failing test, or the decision still open.

3. **Name anything committed but not yet verified**, and anything
   verified but not yet committed — these are the two states most likely
   to get silently lost or silently re-done.

4. **Point at the durable record, don't duplicate it.** `PRD.md` and
   `AGENTS.md` already hold the product's committed state; a handoff
   summary is only for what's *not* in those yet — session-local context
   that would otherwise evaporate.

5. **If handing off to a different role** (via `/hire-agent`), say which
   role is picking this up and why — the incoming role should not have to
   re-derive that from the diff.

## Anti-patterns to avoid

- Writing a handoff summary that just restates what's already visible in
  `git log`/`git diff` — its only value is the part that *isn't* on disk
  yet (open questions, verified-vs-not, the specific next step).
- Rounding an untested change up to "done" to make the handoff look
  cleaner — the next agent (or the founder) will trust it and skip
  re-verifying.
- Skipping a handoff before `/compact` or `/clear` on the assumption
  "it's all in the code anyway" — decisions and known-but-unfixed issues
  usually aren't.
