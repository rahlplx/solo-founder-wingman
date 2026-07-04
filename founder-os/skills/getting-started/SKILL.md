---
name: getting-started
description: Orient a founder who has never used an AI coding agent (Claude Code, OpenCode, or Codex CLI) before to how the *tool* works, before anything about their product idea comes up. Use this first, before /validate-demand, whenever the founder seems unfamiliar with AI coding agents generally — confused by terminal/CLI concepts, unsure what a "slash command" is, or asking how to talk to the agent at all.
---

# Getting Started

Every other skill in this library assumes the founder already knows how to
talk to an AI coding agent — they don't assume anything about the *product*,
but they do assume comfort with the *tool*. That assumption is wrong the
first time someone opens Claude Code, OpenCode, or Codex CLI. This skill
exists for that specific moment: before the idea, before demand validation,
before anything product-shaped. Get this out of the way once, and every
other skill in founder-os can keep assuming it.

## What to do

1. **Confirm this is actually needed.** If the founder is already
   comfortable typing instructions to an agent and getting code back, skip
   this and go straight to `/validate-demand`. This skill is for genuine
   first-timers, not a mandatory gate everyone sits through.

2. **Explain the basic loop in plain English**, with no jargon left
   unexplained: you type what you want in plain language (not code), the
   agent writes and runs the actual code, and you can ask it to explain,
   undo, or redo anything it did. There is no "programming" required from
   the founder — their job is to describe the *what*, not the *how*.

3. **Explain slash commands and skills**, since founder-os leans on both
   constantly: a slash command (like `/build-feature` or `/fix-bug`) is a
   pre-written instruction template you invoke on purpose; a skill (like
   this one) is something the agent can also reach for on its own when it
   fits the moment, without being explicitly asked. Founder-os is a library
   of both, built specifically for someone in the founder's position.

4. **Explain the safety layer, briefly, before it surprises them.** The
   agent will sometimes pause and ask before doing something risky
   (deleting files, force-pushing, touching a database in a way that can't
   be undone) — that pause is a feature, not a bug or an error. Point them
   at `/audit-summary` as the plain-English way to see what's been
   blocked or asked about later, without needing to read any code or
   config themselves.

5. **Explain the evidence-over-claims expectation.** When the agent says a
   task is "done," founder-os is built to make it show its work — test
   output, a screenshot, an actual run — not just assert it in a sentence.
   `/verify-path` and `/ship-checklist` exist for exactly this reason. This
   is the single most load-bearing expectation to set early, since a
   founder who can't read code has no other way to catch a confident-sounding
   but wrong "it's done."

6. **Name what's genuinely different across platforms, honestly.** If the
   founder is on Claude Code or OpenCode, the safety pause in step 4 is a
   real, automatic stop. If they're on Codex CLI, protection today comes
   from its sandbox/approval settings instead — still a real safeguard,
   just a different mechanism. Don't imply identical protection across all
   three; found this out once here rather than assuming it later.

7. **Hand off to `/validate-demand`.** Once the founder can describe back,
   in their own words, roughly what an agent does, what a slash command
   is, and why the agent sometimes pauses, they're ready for the actual
   first step of building something — which starts with the idea, not the
   tool.

## Anti-patterns to avoid

- Do not turn this into a feature tour of every skill in the library —
  the goal is comfort with the tool itself, not a memorized command
  reference. The founder will discover most skills as they're needed.
- Do not skip the safety-layer explanation because it feels like a
  digression from "getting started" — the first time a founder sees an
  agent pause and ask permission with no warning, unexplained, is exactly
  when trust in the whole system is won or lost.
- Do not claim uniform protection across Claude Code, OpenCode, and Codex
  CLI — see `founder-os/FAILURE-MODES.md` and each platform's generated
  `AGENTS.md` "Known Limitations" section for the honest, current
  breakdown, and match that here rather than a simplified but wrong
  "it's all the same" answer.
