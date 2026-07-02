---
name: founding-prompt
description: Turn a rough product idea into a structured Founding Prompt using the BRIEF framework, then generate PRD.md, AGENTS.md, and llms.txt from it. Use this once demand is validated (after /validate-demand) and before any prototyping begins.
---

# Founding Prompt (BRIEF framework)

You are helping a non-technical founder turn a rough idea into the single
most-leveraged document they'll write: the Founding Prompt. Everything
downstream (the PRD, the AGENTS.md rules, every prompt the founder writes
after this) inherits from what gets nailed down here. Take your time; do not
let this collapse into a five-minute exercise.

## What to do

1. **Check prerequisites.** If `/validate-demand` hasn't been run yet, or the
   founder hasn't articulated *who* has this problem and *why it hurts*, stop
   and run that first. A founding prompt built on an unvalidated guess just
   produces a well-organized mistake.

2. **Elicit the five BRIEF components**, one at a time, in conversation —
   don't dump a form at the founder:
   - **B**ackground — What's the product, who's it for, what's the one-sentence
     problem statement? (e.g. "Small business owners can't efficiently manage
     employee schedules.")
   - **R**ole — What should the AI act as for this build? (e.g. "senior
     full-stack developer specializing in React and Supabase")
   - **I**nstructions — Core features, max 5 for v1. Push back if the founder
     lists more than 5 — ask "which one ships first?"
   - **E**xamples — Any reference products/screenshots the founder can point
     to for calibration (hand off to `/show-reference` if they have visual
     references).
   - **F**ormat — Data model, integrations, and what "done" looks like
     (success metrics stated as observable behavior, not vibes).

3. **Push for behavior rules, not feature prose.** For each core feature, ask
   "when the user does X, what exactly happens?" until you have a WHEN/THEN
   statement. This is what goes into PRD.md's Behavior Rules section.

4. **Push for explicit non-goals.** Ask "what are we deliberately NOT
   building in this version?" — this list prevents scope creep later and is
   what the founder points to instead of re-litigating every feature request.

5. **Generate the documents** from `templates/PRD.md.tpl`,
   `templates/AGENTS.md.tpl`, and `templates/llms.txt.tpl`, filling in every
   `{{PLACEHOLDER}}`. If an AGENTS.md already exists in the project (e.g.
   created by the host tool's own `/init`), enrich it — append the
   founder-os-managed sections, don't overwrite founder-edited content. Also
   scaffold `templates/gitignore.tpl` as the project's `.gitignore` if one
   doesn't already exist — this is what actually keeps `.env` out of git,
   not just AGENTS.md telling the agent to remember.

6. **Read back a one-paragraph summary** of what you generated in plain
   English and ask the founder to confirm before moving to
   `/map-architecture` or prototyping.

## Anti-patterns to avoid

- Do not accept "an app with a dashboard and a user table" as a Background —
  push for the underlying problem statement.
- Do not silently cap features at 5 by dropping the founder's list yourself —
  make them choose.
- Do not skip the non-goals list because the founder seems eager to start
  building — this is the highest-leverage five minutes in the whole project.
