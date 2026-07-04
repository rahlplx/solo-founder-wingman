---
name: ship-retro
description: Run a short retrospective right after a feature actually ships (post /ship-checklist Green, post-deploy) — capture what worked, what didn't, and any surprise, then feed genuine lessons forward into PRD.md's non-goals or behavior rules. Use once per shipped feature/milestone, not on a calendar cadence (that's /weekly-plan's reconciliation step).
---

# Ship Retro

Every other skill in this library points forward: validate the idea, write
the prompt, build the feature, ship it. Nothing closes the loop afterward —
`/ship-checklist` gets a feature out the door, but nothing captures what
that build actually taught, so the same avoidable friction (a vague
behavior rule, a non-goal nobody wrote down, a recurring safety-layer
confirm) can recur silently on the next feature. This skill is that missing
step: short, evidence-based, and only run when something real shipped.

## What to do

1. **Confirm this is the right moment.** Run this once, right after a
   feature actually ships — after `/ship-checklist` gave a Green verdict
   and the deploy happened. Don't run it speculatively mid-build, and
   don't confuse it with `/weekly-plan`'s "reconcile at week's end" step,
   which is about the backlog, not this one feature's lessons.

2. **Gather evidence before asking for gut feel.** Check what actually
   happened during this build, not just how it's remembered:
   - `CHANGELOG.md`'s dated entries for this feature (auto-appended by
     `bin/doc-sync.sh`) — what actually got committed, in what order.
   - `/audit-summary`'s output for this session — did the safety layer
     confirm or block anything repeatedly? A recurring confirm on the same
     shape of action is itself a lesson (e.g., "we kept needing to touch
     `.env`-adjacent files" might mean a non-goal or a documented exception
     is missing).
   - Any `/debug-seb` sessions run during this build — what actually broke
     and why, not just that something broke.

3. **Ask three short questions, conversationally — don't dump a form:**
   - What worked well enough that it's worth doing the same way next time?
   - What was harder or more confusing than expected, and why?
   - Was there a surprise — something the founder or the agent assumed
     going in that turned out wrong?

4. **Feed forward only genuine lessons, not every detail.** Most retros
   surface nothing that needs a document change — that's fine, don't force
   it. When a lesson does reveal a real gap, update the actual document it
   belongs in, with the founder's explicit confirmation before editing
   (never silently assume, same as `/adopt-existing-project`'s rule):
   - A recurring scope fight → add it to `PRD.md`'s **Explicitly NOT
     building in this version** list, so the next similar request points
     at a decision already made instead of re-litigating it.
   - A behavior that had to be clarified mid-build because the original
     WHEN/THEN was too vague → tighten the actual rule in `PRD.md`'s
     **Behavior rules** section, don't just remember it verbally.
   - Nothing else — this skill does not create a new project file, a new
     log, or a new CHANGELOG section. `PRD.md` is the one place lessons
     need to land to actually change future behavior; anywhere else is
     evidence, not architecture.

5. **Say what changed and stop.** Read back, in one or two sentences,
   whatever `PRD.md` edit (if any) resulted, and why. If nothing changed,
   say that plainly too — a retro that confirms "no gaps found" is a valid,
   useful outcome, not a failed one.

## Anti-patterns to avoid

- Do not turn this into a blame-oriented postmortem — the target is the
  next feature's PRD, not an assessment of the founder or the agent.
- Do not run this on a calendar cadence or skip it because shipping felt
  smooth — run it once per shipped feature, briefly, regardless of how the
  build felt.
- Do not invent a new file, log, or CHANGELOG section for this. If a
  lesson is worth keeping, it belongs in `PRD.md` where every other skill
  already looks for behavior rules and non-goals — a separate "retro log"
  nobody else reads is exactly the kind of abstraction this library avoids
  adding without a real need for it.
- Do not treat "nothing to change" as license to skip the three questions
  — the evidence-gathering and the questions are what surface whether
  there's a real lesson, not a foregone conclusion checked after the fact.
