# AGENTS.md

Agent-agnostic guidance for working inside `founder-os/`, the plugin
package. Canonical file — `CLAUDE.md` next to this one is just an
`@AGENTS.md` import for Claude Code's discovery convention; edit this file.
See also the repo-root `AGENTS.md` for the marketplace repo as a whole.

## What this is

founder-os is a lifecycle orchestrator, safety/policy layer, and
founder-friendly skill library, installable in Claude Code, OpenCode, and
Codex CLI, for non-technical solo founders building products with AI
coding agents. `package.json` here is dev tooling for founder-os *itself*
(test runners, CI, benchmarks) — it's private and never ships; the plugin
is distributed via `.claude-plugin/plugin.json` and the repo-root
`marketplace.json`.

## Commands

All run from `founder-os/`:

```sh
npm install
npm test                        # full suite -- everything CI's policy-tests job runs
npm run test:core               # tests/run-core-engine-tests.js
npm run test:schema             # tests/run-schema-validation-tests.js
npm run test:claude-code        # Claude Code adapter (bin/policy-check.js)
npm run test:opencode           # OpenCode adapter (adapters/opencode/plugin.ts) -- parity check, same fixture as test:claude-code
npm run test:hooks              # bin/verify-gate.sh, bin/doc-sync.sh
npm run test:settings           # settings.json-driven behavior
npm run test:redos-guard
npm run test:audit-log
npm run test:companion          # companion/ subsystem (event bus, report-event.js, server.js)
npm run test:repo-scans         # bin/check-js-syntax.js, bin/scan-secrets.js
npm run test:lint-harness
npm run test:lint-prd
npm run test:ci-drift           # catches this file's commands drifting from .github/workflows/ci.yml and scripts/local-ci
npm run check:version-sync

npm run validate:policy-schema  # bin/validate-policy-schema.js against policy.json
npm run check:js-syntax         # node --check on every .js file in the repo
npm run scan:secrets            # bin/scan-secrets.js over git-tracked file content
npm run lint:harness            # structural health: skill/agent/command frontmatter, policy.json categories
npm run typecheck:opencode      # tsc --noEmit over adapters/opencode/plugin.ts
npm run audit:deps              # npm audit

npm run companion:start         # optional local dashboard -- off by default, see companion/README.md
```

To run a single test file directly, call it with the runner its
`package.json` script uses — most are `node tests/run-*.js`, but a few
(`run-audit-log-tests.js`, `run-settings-tests.js`,
`run-opencode-policy-tests.ts`) are run via `tsx` despite the `.js`
extension on some of them. Check the matching `test:*` script in
`package.json` rather than assuming by file extension.

`node scripts/bench-schema-validators.js` (repo root) re-runs the
hand-rolled-vs-ajv benchmark recorded in `DECISIONS.md`.

## Architecture

**Policy engine, split by what's actually platform-specific.**
`core/policy-engine.js` is the pure, I/O-free rule-matching core
(`compileRules`, `lowercaseStrings`, `matchRule`, `buildReason`) shared by
`bin/policy-check.js` (Claude Code's PreToolUse hook entrypoint) and
`adapters/opencode/plugin.ts` (OpenCode's `tool.execute.before`). Before
this module existed, both adapters hand-maintained separate copies of the
same matching logic, kept honest only by a shared test fixture. Each
adapter now owns only its genuinely platform-specific parts: extracting
checkable strings from that platform's tool-call payload shape, loading
`policy.json`, and mapping a matched rule's `action` to that platform's own
decision vocabulary (Claude Code has allow/ask/deny; OpenCode only has
allow/block — its `plugin.ts` collapses "confirm" rules straight to a
block, since there's no middle state to express a pause).

**`policy.json`** is the single source of truth for what's blocked,
confirmed, or allowed — patterns adapted from several external MIT/Apache
projects (see the file's own header comment for attribution), not written
from scratch. Each rule has a `scope` (`"bash"` — only checked against Bash
commands — or `"any"` — also checked against Edit/Write/MultiEdit file
content, for catching a pasted secret) and an optional `keywords`
pre-filter. The keyword invariant matters: every keyword must be a
guaranteed literal substring of any real regex match, because keywords can
only ever *widen* what gets a full regex check — a wrong or missing
keyword can slow matching down but must never produce a false negative.
Regex-based interception has a real, documented ceiling against
deliberate shell obfuscation — this is disclosed, not hidden (see
`FAILURE-MODES.md` and the founder-facing
`templates/AGENTS.md.tpl` "Known Limitations" section).

**Two independent validators exist for `policy.json`'s shape against
`schema/policy.schema.json`**: `bin/validate-policy-schema.js`
(hand-rolled, zero-dependency) and `bin/validate-policy-schema.ajv.js`
(ajv-based). Only the hand-rolled one is wired into the actual loaders
(`bin/policy-check.js`, `adapters/opencode/plugin.ts`) — chosen after
benchmarking both for cold-start cost, since `policy-check.js` runs as a
fresh process on every single Claude Code hook call. The ajv version is
kept only as the benchmark's reference implementation. Full reasoning and
numbers: `DECISIONS.md`.

**`hooks/hooks.json`** wires three Claude Code hook points:
`PreToolUse` (Bash, and Edit|Write|MultiEdit) → `bin/policy-check.js`;
`PostToolUse` (Bash) → `bin/doc-sync.sh`, which appends a dated entry to
`CHANGELOG.md`'s `[Unreleased]` section; `Stop` → `bin/verify-gate.sh`,
which runs the founder's actual project test command before letting the
agent end its turn, blocking a "done" claim that isn't backed by passing
tests.

**`adapters/`** — the two other platforms founder-os targets beyond
native Claude Code:
- `opencode/plugin.ts` — same policy core, allow/block only (no ask/confirm
  state); skills/subagents/commands need explicit `skills.paths` config
  (see `templates/opencode.jsonc.tpl`) since OpenCode doesn't auto-discover
  them.
- `codex/config.toml.snippet` — no code-level interception at all today;
  protection is `approval_policy`/`sandbox_mode` only, a human-in-the-loop
  gate but not a targeted automatic block. Codex CLI does have its own
  separate `hooks` feature with a wire vocabulary close to Claude Code's,
  but founder-os doesn't build against it yet (see `FAILURE-MODES.md`).

**`skills/` (18), `agents/` (3: `qa-tester`, `code-critic`,
`security-reviewer`), `commands/` (5)** — the actual founder-facing
product surface, installed into a consumer's session via the plugin
manifest. Implements named frameworks (BRIEF, HIRE, SHOW, LEGO, PLUG,
PATH, SHIP, LOCK, SEB, 3-Layer Review, 3-3-3, smell-test) plus
commit-discipline, session-handoff, and existing-project-adoption skills.
Every skill/agent/command's frontmatter and section shape is checked
structurally by
`bin/lint-harness.js` — match the existing shape of its kind when adding
one.

**`templates/`** — templates founder-os uses to generate and maintain a
*consumer project's own* docs (`AGENTS.md.tpl`, `PRD.md.tpl`,
`CHANGELOG.md.tpl`, `llms.txt.tpl`, `founder.config.json.tpl`,
`opencode.jsonc.tpl`, `gitignore.tpl`). These are not about founder-os's
own documentation — don't confuse `templates/AGENTS.md.tpl` with this
file or the repo-root `AGENTS.md`.

**`bin/audit-log.js` / `bin/audit-summary.js`** — an append-only JSONL log
of policy decisions that actually intervened (ask/deny/block — not plain
allows, which would drown the signal), plus a plain-English summarizer
over it, closing the "founder can't read code, so can't see what the
safety layer actually did" gap.

**`companion/`** — an optional, off-by-default (`settings.json`'s
`companionEnabled`) local web server: a read-only, live view of policy
decisions (Session Overview), never spawned by a hook, started manually
via `npm run companion:start`. Both adapters report every decision (allow
included, unlike the audit log's interventions-only scope) to it via
`companion/report-event.js`, awaited with a short bounded timeout so it
can never meaningfully affect the actual decision or (in
`bin/policy-check.js`'s case) get killed mid-flight by the immediate
`process.exit(0)` in `respond()`. Deliberately **read-only forever, not
just for now** — a browser-driven approve/deny loop was designed and
rejected (see `audit/companion-ux/USER-FLOWS.md`); the reasoning is a
structural timeout dilemma and a new trust boundary, not a cut corner.
Uses Server-Sent Events over plain `http`, not WebSocket/`ws` — see
`DECISIONS.md` for why (in short: this plugin ships zero runtime
dependencies today, and a `ws` dependency has no delivery mechanism).

**`tests/`** — one runner per subsystem; `package.json`'s `test:*` scripts
are the authoritative index of which runner (`node` vs `tsx`) each needs.

## Before touching `policy.json` or either adapter

- `DECISIONS.md` is the tiebreaker — when a comment, README line, or PR
  description conflicts with it, `DECISIONS.md` wins.
- `FAILURE-MODES.md` is a living, severity-tagged catalog of real failure
  modes (status: FIXED / ACCEPTED RISK / OPEN) found across multiple
  audits of this codebase. Check it before assuming a gap you've found is
  new, and update an entry's status rather than deleting it when you fix
  something it describes.
