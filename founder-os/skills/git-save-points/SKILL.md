---
name: git-save-points
description: Commit in small, atomic "save points" (roughly one logical change each) during any non-trivial task, so a broken step is one git revert/reset away from a known-good state instead of losing a whole session's progress. Use during any multi-step build/fix/refactor, not just at the end.
---

# Git Save Points

The founder can't read a diff to judge whether an in-progress change is
safe to keep going from. A git history of small, clearly-labeled commits
is the only cheap way to say "this specific point worked" and "roll back
to right here" — one large commit at the end of a session gives neither.

## What to do

1. **Commit after every logical unit of change, not just at the end.**
   One schema change, one new endpoint, one UI component — each is its
   own commit, roughly a few hundred lines or less. A commit message that
   needs "and" to describe it is usually two commits.

2. **Write the commit message as the save point's label**, not a
   changelog entry — state what this specific step accomplished, since
   that's what the founder (or a future rollback) needs to identify it
   by.

3. **Only commit a step that's actually working**, not mid-edit or with a
   known-broken intermediate state — a save point that doesn't load is
   worse than no save point, since it looks safe but isn't.

4. **Before a risky next step** (a schema migration, a dependency swap, a
   large refactor), confirm the last commit is clean and pushed if the
   founder wants a true off-machine backup — a local-only commit is still
   at risk if the whole environment is lost.

5. **If a step turns out broken, say so and roll back to the last save
   point** (`git revert` for shared/pushed history, `git reset --hard`
   only on work not yet shared) rather than trying to patch forward on
   top of a state neither of you fully understands anymore.

## Anti-patterns to avoid

- One giant commit at the end of a session — it collapses every
  intermediate save point into one, so a bug introduced halfway through
  can't be isolated by rollback alone.
- Committing a broken intermediate state "to be safe" — it isn't; verify
  it actually works first (see `/verify-path` for anything more than a
  trivial change).
- Using `git reset --hard` on commits that have already been pushed or
  shared — that's `git revert`'s job; `reset --hard` rewrites history out
  from under anyone else looking at it.
