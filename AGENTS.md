# AGENTS.md

Agent-agnostic guidance for working in this repository. This is the
canonical instructions file — readable by Claude Code, Codex CLI,
OpenCode, Cursor, or any other AGENTS.md-aware tool. `CLAUDE.md` at this
same path is just a thin pointer into this file (see "Agent-agnostic
infrastructure" below); edit this file, not that one.

## What this repo is

`lab-launchpad-ai-sdk` is a single-plugin Claude Code marketplace repo. The
one plugin it ships is **founder-os**: a lifecycle orchestrator, safety
layer, and skill library for non-technical solo founders building products
with AI coding agents (Claude Code, OpenCode, and Codex CLI). Nearly all
engineering work in this repo happens inside `founder-os/` — see
`founder-os/AGENTS.md` for the deep dive on its architecture. This file
covers the repo as a whole.

## Layout of every top-level directory

- **`.claude-plugin/marketplace.json`** — the marketplace manifest. Lists
  exactly one plugin, `founder-os`, sourced from `./founder-os`. Its
  `version` field must stay identical to `founder-os/package.json` and
  `founder-os/.claude-plugin/plugin.json` — drift is checked (not
  auto-fixed) by `founder-os/bin/check-version-sync.js`.
- **`founder-os/`** — the plugin itself: policy engine, hooks, adapters,
  skills/agents/commands, doc-generation templates, and its own
  `package.json`/tests/CI target. See `founder-os/AGENTS.md`.
- **`audit/`** — historical/external audit reports: `OKF_AUDIT.md`,
  `FINAL_REPORT.md`, `REPORT.md`, and `issues/SAFETY-001.md`,
  `PLATFORM-001.md`, `FEATURE-001.md`. These are point-in-time findings and
  proposals, not a description of current state — cross-check against
  `founder-os/CHANGELOG.md`, `founder-os/DECISIONS.md`, and
  `founder-os/FAILURE-MODES.md` before assuming something an audit
  describes has actually been implemented.
- **`scripts/`** — repo-level tooling that lives outside the plugin
  package: `scripts/local-ci/` (a Docker sandbox that replicates
  `.github/workflows/ci.yml`'s three jobs locally — see "Commands" below)
  and `scripts/bench-schema-validators.js` (the benchmark behind the
  hand-rolled-vs-ajv call recorded in `founder-os/DECISIONS.md`).
- **`.github/workflows/ci.yml`** — CI definition (`validate-json`,
  `policy-tests`, `shellcheck` jobs), triggered only on changes under
  `founder-os/**`, `.claude-plugin/marketplace.json`, or
  `scripts/local-ci/**`.

## Commands

GitHub Actions on this repo currently cannot allocate a runner (an account
billing issue — jobs 404 instead of executing). Until that's resolved,
**`scripts/local-ci/run.sh` is the real merge gate**, run before merging to
`main`:

```sh
scripts/local-ci/run.sh                 # verify current branch/HEAD
scripts/local-ci/run.sh some-branch     # verify a specific branch/commit
scripts/local-ci/run.sh --pr 5          # fetch and verify a PR's head commit
```

All plugin development commands run from inside `founder-os/` — see
`founder-os/AGENTS.md` for the full list (install, test suite, individual
test runners, schema/version/secret checks, linting).

## Version sync

The version string is independently maintained in three places:
`founder-os/package.json`, `founder-os/.claude-plugin/plugin.json`, and
`.claude-plugin/marketplace.json`. Nothing auto-syncs them — bump all
three together; `npm run check:version-sync` (from `founder-os/`) only
detects drift.

## Naming collision (read before assuming this is a different project)

"Founder OS" / "founder-os" collides with unrelated things already in the
wild — a SaaS onboarding-analytics product at `founderos.com`, and at
least one unrelated GitHub AI-agent-orchestrator repo with the same name.
This repo is not affiliated with either. See `founder-os/README.md` and
`founder-os/CHANGELOG.md`.

## Agent-agnostic infrastructure

This repo practices what founder-os itself preaches to consumer projects:
one canonical, tool-neutral instructions file rather than a
Claude-specific one. `AGENTS.md` (this file, at repo root and again inside
`founder-os/`) is the source of truth. `CLAUDE.md` at each of those same
locations exists only so Claude Code's own file-discovery convention finds
something, and its entire body is an `@AGENTS.md` import — no content is
duplicated or forked between the two. If you're updating instructions for
agents working in this repo, edit the relevant `AGENTS.md`, never the
`CLAUDE.md` next to it.
