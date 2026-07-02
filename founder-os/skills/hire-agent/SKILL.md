---
name: hire-agent
description: Decide which engineering role (PM/Design/Frontend/Backend/DevOps/QA) the agent should act as for a given task, using the HIRE framework (Hire the right agent, Instruct clearly, Review output, Evolve with feedback). Use before instructing the agent on any non-trivial task, and whenever work switches between UI, backend logic, and review.
---

# Hire (HIRE framework)

The founder has no team, only AI agents playing roles. Ambiguity about
*who* is doing the work produces muddled prompts and muddled output. Your
job here is to decide the role before doing the task, not after.

## What to do

1. **Map the task to a role.** The founder's "team" is: PM — the founder
   decides what and why; Design — calibrated via `/show-reference`,
   never guessed; Frontend — UI/component work; Backend — API, database,
   auth logic; DevOps — deploy, which for this project mostly means `git
   push` autodeploy plus read-only status via the `vercel` MCP server, not
   hands-on infrastructure; QA — the founder plus a second AI via
   `/multi-model-review`. State the role explicitly before starting.

2. **Instruct clearly as that role (I).** Open with an explicit "Act as a
   senior X" statement, matching the `ROLE:` line already used in
   `commands/build-feature.md`.

3. **Stay in lane.** A Backend-role task shouldn't silently redesign UI; a
   Frontend-role task shouldn't invent schema. If the work genuinely needs
   to cross a role boundary, say so explicitly instead of quietly
   expanding scope.

4. **Review before declaring done (R).** Hand off to `/verify-path` for
   functional evidence and `/multi-model-review` for a second opinion —
   don't self-grade your own work under the role you just played.

5. **Evolve with specific feedback (E).** Translate vague founder feedback
   ("it feels off") into a specific instruction back to the owning role,
   not a vague re-prompt that starts the whole task over.

## Anti-patterns to avoid

- Blending roles in one response — fixing CSS but also changing the
  database schema in the same pass.
- Skipping straight to "Evolve" without a real Review step in between.
- Treating "DevOps" as license to actually trigger a deploy without
  explicit founder approval — `vercel` is read-only/status-only, but
  `git push` can still trigger autodeploy; get a yes before any
  production-affecting push, don't just proceed because it's technically
  possible.
