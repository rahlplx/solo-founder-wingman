---
name: weekly-plan
description: Turn an unstructured backlog into a weekly plan of 3 features to build, 3 bugs to fix, and 3 users to talk to, using the 3-3-3 method. Use at the start of each work week, especially when the founder has more ideas than a week can hold.
---

# Weekly Plan (3-3-3 method)

There's no sprint board here, only an unbounded backlog and a founder who
will happily skip talking to users in favor of building one more thing.
3-3-3 caps scope on purpose and makes user contact non-optional, on
purpose.

## What to do

1. **Cap Build at 3.** If the founder lists more, push back — "which 3
   ship first?" Check each item against PRD.md's non-goals list and the
   `## Status` checkboxes for what's already in flight before adding
   anything new.

2. **Cap Fix at 3.** Pull from known bugs: ask the founder directly, check
   recent `/debug-seb` sessions, or scan CHANGELOG.md's `### Fixed`
   entries. Rank by actual user impact, not founder annoyance.

3. **Require 3 real user contacts — don't let this slot go empty.** This
   is the one founders skip first under build-momentum pressure. State
   explicitly why it stays: as `/validate-demand` already established,
   distribution and demand are the bottleneck here, not speed of building.

4. **Write the plan** using the WEEK OF / BUILD / FIX / LEARN / DONE WHEN
   shape, with a concrete "done when" condition — not just a task list
   with no definition of finished.

5. **Reconcile at week's end.** Compare what got done against what was
   planned. Carry unfinished items forward explicitly rather than letting
   the backlog grow silently in the background.

## Anti-patterns to avoid

- Letting "3 features" quietly become 6 by splitting one feature into
  many sub-tasks.
- Substituting dashboard-watching for real user conversations in the
  Learn column.
- Running this plan internally without reading it back to the founder for
  buy-in before the week starts.
