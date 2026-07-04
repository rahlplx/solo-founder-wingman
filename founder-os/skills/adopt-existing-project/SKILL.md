---
name: adopt-existing-project
description: Reverse-engineer a PRD.md/AGENTS.md from a codebase that already exists (with no PRD, or one from another tool/convention), instead of eliciting from scratch. Use this instead of /validate-demand + /founding-prompt whenever a project already has code before founder-os is installed.
---

# Adopt Existing Project

Most of founder-os assumes a founder starts from a rough idea and builds
up: `/validate-demand` → `/founding-prompt` → `/map-architecture`. That
assumption breaks the moment founder-os gets installed into a project
that already has code — a half-built app, something inherited from a
previous developer, or a product that's already live with real users.
Running `/founding-prompt`'s from-scratch elicitation against an existing
codebase produces a PRD that's disconnected from what's actually there.
This skill exists for that situation specifically.

## What to do

1. **Detect what's already here before asking anything.** Check for:
   - A package/dependency manifest (`package.json`, `pyproject.toml`,
     `go.mod`, `Cargo.toml`, etc.) — this tells you the real stack, not
     a guess.
   - An existing `README.md`, route files, schema/migration files, or
     other structural evidence of what the product actually does today.
   - Any existing `AGENTS.md`/`CLAUDE.md` — if one already exists (e.g.
     created by the host tool's own `/init`, or by a previous founder-os
     install), **enrich it, don't overwrite it** — the same idiom
     `/founding-prompt` already uses for this exact situation.
   - Convention files from other AI coding tools this project may have
     used before founder-os: `.cursorrules`, a differently-shaped
     `AGENTS.md`/`CLAUDE.md`, or another tool's PRD-equivalent document.
     If found, treat these as source material to import from, not files
     to ignore or silently replace.

2. **Draft an *inferred* `PRD.md`** from `templates/PRD.md.tpl` by reading
   the actual code — the data model from real schema/route files, the
   core features from what's genuinely built, integrations from real
   config/dependencies — rather than through `/founding-prompt`'s
   conversational BRIEF elicitation. Include the `Compliance & Regulatory
   Scope` section like any other required section — infer it from what
   data the code actually touches (e.g. a payments table implies PCI
   scope worth flagging, even if nobody explicitly asked for it).

   As part of this draft, judge whether the project looks **already
   shipped and live** (real user data, production config, a deployed
   URL) versus **mid-build** (scaffolding present but nothing real using
   it yet):
   - If already shipped: frame the `Explicitly NOT building in this
     version` section as a **post-v1 backlog** — things intentionally
     deferred on a live product, not things "not started yet."
   - If mid-build: frame it the same way `/founding-prompt` would for a
     from-scratch project — a scope boundary for what's still ahead.

3. **Never silently assume — present the inferred draft back to the
   founder for correction before treating anything as fact.** Inference
   from code can be wrong in ways a from-scratch BRIEF conversation
   can't be: a route that exists but is half-finished, a data field that
   used to mean one thing and now means another, an integration that's
   configured but no longer actually used. Read back a plain-English
   summary of what was inferred, section by section, and let the founder
   correct it before moving on — the same "read back and confirm" step
   `/founding-prompt` ends on, just earlier and more load-bearing here
   since the draft came from inference, not conversation.

4. **Run the same PRD quality gate `/founding-prompt` runs** —
   `node <founder-os-plugin-dir>/bin/lint-prd.js <project>/PRD.md` —
   before handing anything to the founder or to `/map-architecture`.
   Downstream skills never need to know which onboarding path produced
   the PRD; it has to pass the same gate either way.

5. **Hand off into `/map-architecture`** exactly as `/founding-prompt`
   step 7 does, once the founder has confirmed the inferred draft.

## Anti-patterns to avoid

- Do not generate a PRD that contradicts what the code actually does —
  if the inference is uncertain, say so explicitly in the draft rather
  than guessing confidently.
- Do not overwrite an existing `AGENTS.md`, `CLAUDE.md`, or
  `founder.config.json` — enrich/append, matching `/founding-prompt`'s
  own rule for this.
- Do not skip the "present back for confirmation" step because the
  codebase seems self-explanatory — an inferred PRD is a guess dressed
  up as a document until the founder has actually confirmed it.
- Do not treat an already-shipped product's existing behavior as
  automatically correct just because it's live — flag anything that
  looks like a real bug or security gap while you're reading the code,
  rather than encoding it into the PRD as intended behavior.
