# Changelog

All notable changes to the **founder-os plugin itself** are documented here.
This is distinct from `templates/CHANGELOG.md.tpl`, which is scaffolded into
end-user founder projects to track *their* changes, not this plugin's.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Versioning policy

`founder-os` follows [Semantic Versioning](https://semver.org/). Because the
whole point of this plugin is a safety contract between the founder and the
agent, two things always bump at least the **minor** version, even if they'd
otherwise look like a patch:

- Any change to `policy.json`'s rule schema (new field, changed meaning of
  an existing field, changed rule `id`) — a founder or automation depending
  on a specific rule shape needs a signal that it moved.
- Any change to a hook's I/O contract (`hooks/hooks.json`, `bin/*.js`/`*.sh`,
  `adapters/opencode/plugin.ts`'s exported shape) — same reasoning.

Breaking changes to the skill/command interface (renaming a skill, changing
what a command expects) bump the **major** version.

## [Unreleased]

### Added
- New skill `/getting-started` (`skills/getting-started/SKILL.md`) for a
  founder who has never used an AI coding agent (Claude Code, OpenCode, or
  Codex CLI) before — orients them to the basic agent loop, slash
  commands vs. skills, the policy safety pause, and the
  evidence-over-claims expectation, before anything product-shaped comes
  up. `/founding-prompt`'s prerequisite check now points here first when
  the founder seems unfamiliar with the tool itself, ahead of
  `/validate-demand`. 18 skills total.

### Changed



### Fixed

### Security

## [0.4.0] - 2026-07-04

Skill/command interface change (new required PRD section) plus a new
skill — bumping minor per this file's own versioning policy.

### Added
- New skill `/adopt-existing-project` (`skills/adopt-existing-project/
  SKILL.md`) for a project that already has code before founder-os is
  installed — reverse-engineers a PRD.md/AGENTS.md from the existing
  codebase (detecting existing convention files from other tools, e.g.
  `.cursorrules`, to import from) instead of eliciting from scratch,
  distinguishes already-shipped/live projects from mid-build ones when
  framing non-goals, then hands off into `/map-architecture` exactly as
  `/founding-prompt` does. 17 skills total.
- New required PRD section, `## Compliance & Regulatory Scope`
  (`templates/PRD.md.tpl`, enforced by `bin/lint-prd.js`) — surfaces what
  regulated/sensitive data (if any) a founder's product handles and which
  regulations that implies (GDPR/PCI/HIPAA/etc.), or an explicit "none"
  statement. `/founding-prompt`'s BRIEF elicitation now asks for this
  alongside data model/integrations/success metrics.
- `commands/*.md` frontmatter now includes `argument-hint` and
  `allowed-tools` on all 5 commands, matching Claude Code's current
  documented command format (previously only `description`).
  `allowed-tools` here pre-approves each command's actually-used tools to
  reduce permission-prompt friction — per Claude Code's own documentation,
  it does **not** restrict tool access; every tool remains callable
  subject to your own permission settings.
- New `bin/lint-harness.js` check: a skill directory may not contain
  anything besides `SKILL.md` (closes a previously-unenforced gap; all 17
  skill directories already satisfied this on landing).

### Changed
- `audit/companion-ux/*` (the companion UI design proposal) simplified
  from 4 personas to 1: **Non-Technical Solo Builder**. Hired
  Collaborator and Client/Stakeholder, the Dev Mode toggle, and the
  Freelancer Loop Workspace screen are removed from the proposal. This
  does not affect the already-shipped `founder-os/companion/` (Session
  Overview remains read-only) or the actual `/hire-agent`/`/handoff`
  skills, which are unrelated terminal/CLI concerns.

### Fixed
- `bin/lint-harness.js`'s frontmatter parser didn't match hyphenated keys
  (`^[A-Za-z0-9_]+:` excluded `-`), which would have silently made the
  new `argument-hint`/`allowed-tools` checks never pass regardless of
  file content. Fixed before it shipped as a real bug.

**Compatibility note:** any project's `PRD.md` generated before this
release will fail `bin/lint-prd.js`'s new required-section check the
next time `/map-architecture` re-runs the gate, even if nothing about the
product itself changed. Backfill a `## Compliance & Regulatory Scope`
section (a one-line "no regulated data handled" is sufficient if true)
before re-running `/map-architecture` against an older PRD.

## [0.3.3] - 2026-07-03

Third live install/test pass, this time against Codex CLI. No OpenAI
credentials exist in this environment, so this pass verified everything
that's auth-free (`codex doctor --json`, `codex features list`, `codex
sandbox`) and stopped short of a live agentic session. That still caught
one confirmed doc bug and one significant open question.

### Changed
- Newly documented: Codex CLI has its own separate `hooks` feature
  (`codex features list` shows it stable/enabled by default), with a wire
  vocabulary that closely mirrors Claude Code's own hook contract
  (`PreToolUse`/`PostToolUse`/`SessionStart`/`SubagentStart`/
  `UserPromptSubmit`, a `hooks.json` file, a hook-trust/review workflow).
  founder-os does not build against it yet — it's only installable
  through Codex's plugin/marketplace system, not a plain config file, and
  verifying it actually intercepts a tool call needs a real authenticated
  session this environment doesn't have. Tracked as an open question, not
  a settled platform ceiling anymore (`FAILURE-MODES.md` #22).
- Live-confirmed Codex's `sandbox_mode` genuinely enforces at the OS
  level: a real file survives a delete attempt under `read-only` (blocked
  with `Read-only file system`) and is actually removed under
  `workspace-write` (the same command, same file, exit 0).

### Fixed
- `config.toml.snippet` claimed Codex reads a project-scoped
  `.codex/config.toml` in addition to the global one. It doesn't —
  confirmed live via `codex doctor --json`: distinguishing values set in
  a project's `.codex/config.toml` (`model`, then `approval_policy`/
  `sandbox_mode`) never changed what `codex doctor` reported. Corrected
  the snippet's header comment, `README.md`, and `templates/AGENTS.md.tpl`
  to state Codex config is global-only (`~/.codex/config.toml` or a named
  `-p`/`--profile`), not project-scoped (`FAILURE-MODES.md` #29).

### Security

## [0.3.2] - 2026-07-03

Second live install/test pass, this time against OpenCode. This file's
own versioning policy doesn't strictly require a bump here (no hook I/O
contract or rule schema changed), but the fix is real and user-facing,
so it gets a version number rather than sitting unstamped.

### Changed
- Live-confirmed (not just researched) that OpenCode's `"confirm"` and
  `"block"` rule actions surface identically as a thrown tool error —
  no middle "ask" state exists, matching what was already documented.
- Newly documented: founder-os's 3 bundled subagents and 5 commands are
  completely unreachable under OpenCode currently — no config
  path-override exists for either (unlike skills), only fixed
  `.opencode/agent/`/`.opencode/command/` project directories. Tracked
  as an open gap (`FAILURE-MODES.md` #27), deliberately not built this
  pass (would need a real install-time step, not just a config
  template).

### Fixed
- OpenCode never discovered any of founder-os's 16 skills when only the
  safety-hook `plugin` entry was configured — its skill loader is
  entirely separate and only scans `.opencode/skills/` or an explicit
  `skills.paths` config entry. `templates/opencode.jsonc.tpl` adds the
  missing `skills.paths` alongside `plugin`, verified live (`opencode
  debug skill` finds all 16 skills with it set, zero without). Shipped
  as `.jsonc` specifically because plain `opencode.json` hard-rejects
  any unrecognized top-level key, including an inline `$comment` field.

## [0.3.1] - 2026-07-03

First live install/test pass: the plugin was loaded into a real Claude
Code session (`claude --plugin-dir founder-os/`) for the first time,
rather than only tested against its own matching/adapter logic. Bumps
patch-adjacent-but-policy-minimum minor per this file's own versioning
policy (a hook I/O contract changed).

### Added
- `skills/git-save-points/SKILL.md`: commit in small, atomic "save
  points" during any non-trivial task, so a broken step is one
  `git revert`/`reset` away from a known-good state instead of losing a
  whole session's progress. Formalizes a rule that was previously only a
  single buried line in `commands/refactor-cleanup.md`.
- `skills/handoff/SKILL.md`: a structured handoff summary before a
  session ends with unfinished work, right before `/compact`/`/clear`, or
  when `/hire-agent` hands a task to a different role — captures
  in-progress state, what's actually been verified vs. not, and the
  specific next step, so it isn't silently re-derived or dropped at a
  session boundary. Both ideas originated from an external, unreviewed
  PR (#12) whose implementation was rejected wholesale (stale base,
  missing frontmatter, dead config, a masked test-failure bug, and
  fabricated-looking repo statistics — see the PR's closing comment) but
  whose underlying concepts were worth building properly.

### Fixed
- `bin/verify-gate.sh`'s Stop hook emitted `{"decision":"allow"}` on every
  passing turn, but Claude Code's real Stop hook schema only accepts
  `"decision": "approve" | "block"` — `"allow"` isn't a valid value for
  this field (that vocabulary belongs to a different hook event's
  `hookSpecificOutput.permissionDecision`). Claude Code failed open on
  the invalid JSON, so a founder was never actually blocked by this, but
  it surfaced a "Stop hook error" notification on every single passing
  turn. Found via live testing (see `FAILURE-MODES.md` #19); all 5
  "allow" emissions changed to `{"decision":"approve"}`, re-verified live
  with no validation error.

## [0.3.0] - 2026-07-03

Enterprise-hardening pass, informed by a maturity audit of this codebase
plus a pattern-extraction pass over an unrelated repo (`ll-vibekit`).
Bumps at least minor per this file's own versioning policy: `evaluate()`'s
return shape gained a `ruleId` field (hook I/O contract change) and
`policy.json` rules gained an optional `keywords`-adjacent schema
(enforced, not just documented). Full before/after record of every gap
this pass closed (and the ones deliberately left open or accepted as
platform limitations): `FAILURE-MODES.md`.

### Added
- `bin/validate-policy-schema.js`: full schema validation for `policy.json`
  (`schema/policy.schema.json`), not just "is `rules` an array". Catches a
  real bug class: a typo'd rule field (e.g. `patttern` instead of
  `pattern`) used to silently compile to a match-everything regex via `new
  RegExp(undefined)`, which combined with `action:"block"` meant denying
  every tool call with nothing catching it. Chosen over an ajv-based
  competitor after benchmarking both (~20x faster cold-start, zero
  dependency footprint) — see `DECISIONS.md`.
- `founder-os/DECISIONS.md`: new ADR-lite "tiebreaker" doc for
  evidence-based engineering decisions going forward.
- Bash hooks (`verify-gate.sh`, `doc-sync.sh`) are now fail-safe: a
  top-level `trap ... ERR` guarantees graceful degradation (a valid
  `{"decision":"allow"}` for the Stop hook, a skipped-but-non-blocking
  append for the PostToolUse hook) instead of crashing mid-script with no
  output on an unexpected error. Both previously had zero test coverage;
  `tests/run-hook-tests.js` now covers both end-to-end via real temp git
  repos.
- `settings.json`'s 4 fields are now actually read and applied
  (previously dead config): `verifyGateOnDone`/`docSyncOnCommit` can turn
  either hook off entirely; `policyStrictness: "strict"` upgrades a
  would-be "ask" to a hard "deny" on the Claude Code adapter;
  `explainBeforeAct: false` trims a hook's reason to just the rule id.
  Shipped `policyStrictness` default changed from `"strict"` to
  `"normal"` since `"strict"` now has real teeth.
- `bin/check-version-sync.js`: fails if the version string drifts across
  `package.json`/`plugin.json`/`marketplace.json`, previously kept in sync
  only by discipline.
- ReDoS guard-rail test (`tests/run-redos-guard-tests.js`): every
  `scope:"any"` rule (which runs against arbitrary, potentially large file
  content) is benchmarked against large synthetic strings with a time
  budget, to catch a future catastrophic-backtracking pattern before it
  ships.
- `founder-os/core/policy-engine.js`: shared, platform-agnostic matching
  core, extracted from what used to be two independently hand-maintained
  copies in `bin/policy-check.js` and `adapters/opencode/plugin.ts`. A
  future 3rd/4th agent-platform adapter now only needs its own thin
  platform glue, not a full reimplementation. Verified zero behavior
  drift (129 test cases identical before/after).
- Structured audit log (`bin/audit-log.js`): every real policy
  intervention (ask/deny/block, not plain allows) is appended as a
  JSON-line to `founder-os/.audit/audit.log`, gitignored, best-effort and
  never able to affect the actual decision. `bin/audit-summary.js` and the
  new `/audit-summary` skill turn it into a plain-English answer to "what
  has the safety layer actually blocked or asked about?" — previously
  there was no durable record at all, only ad hoc stderr lines scoped to
  a single hook invocation.
- `bin/check-js-syntax.js`: `node --check`s every `.js` file in the repo
  (`tsc --noEmit` already covers `.ts`) — a real bug-catcher, not theater;
  this exact check would have caught the apostrophe-in-string bug in
  `scripts/bench-schema-validators.js` and the sibling of the
  `audit-summary.js` `--days 0` bug before either landed.
- `bin/scan-secrets.js`: reuses `policy.json`'s own `scope:"any"`
  secret/prod-boundary rules against every `git ls-files`-tracked file's
  content, dogfooding existing rule data instead of adding a scanning
  dependency.
- `npm run audit:deps` (`npm audit`, no new dependency) and
  `scripts/local-ci/jobs.json`, a single shared, ordered source of truth
  for the `policy-tests` job's npm-script list — previously hand-duplicated
  between `.github/workflows/ci.yml` and `scripts/local-ci/entrypoint.sh`
  with nothing catching drift between the two.
  `tests/run-ci-drift-tests.js` asserts `ci.yml`'s steps still match
  `jobs.json` exactly, in order.
- `templates/founder.config.json.tpl`, scaffolded into a founder's own
  project by `/founding-prompt` — a single source of truth for that
  project's real test/build commands. `bin/verify-gate.sh` now reads
  `testCommand` from it when present, falling back to the original
  package.json `scripts.test` detection otherwise — previously the Stop
  hook's verify gate only understood npm projects and silently no-op'd
  (allowed the stop with no test run) for anything else.
- `bin/lint-harness.js`: structural health check for the harness itself —
  every skill's `SKILL.md` frontmatter (`name` matching its directory,
  non-empty `description`, an H1 title, a `## What to do` section), every
  agent's frontmatter (`name` matching its filename, `description`,
  `tools`) and required `## Report format` / `## What NOT to do` sections,
  every command's frontmatter, and every `policy.json` rule's `category`
  against a known allow-list. None of this was enforced anywhere before —
  a copy-paste mistake (wrong `name:`, a missing section, a typo'd rule
  category) would only ever be caught by a human noticing, if at all.
- `bin/lint-prd.js`: quality gate for a founder's generated `PRD.md`,
  run by `/founding-prompt` right after generating it and again by
  `/map-architecture` before building on top of it. Catches leftover
  `{{PLACEHOLDER}}` tokens, missing or empty required sections, and a
  `## Behavior rules` section with no actual WHEN/THEN-formatted rule
  (vague feature prose instead of exact behavior) — previously nothing
  stopped a rushed pass through `/founding-prompt` from handing off a
  PRD too thin to build from.
- Standardized output contract for the 3 bundled subagents (`qa-tester`,
  `code-critic`, `security-reviewer`): every report now leads with a
  `VERDICT`/`FINDINGS`/`RECOMMENDATION`/`CONFIDENCE` block, in that exact
  shape, before the agent's own domain-specific detail (PATH dimensions,
  Red/Yellow/Green categories, LOCK items). Lets `/multi-model-review` and
  other skills that invoke multiple subagents parse a consistent result
  without re-reading the whole report. `bin/lint-harness.js` now enforces
  the presence of all 4 fields on every agent file.
- `founder-os/FAILURE-MODES.md`: a living, adversarial catalog of every
  gap found in this codebase's two audits (this file's own history and
  the original ll-vibekit-comparison pass), tagged by severity and
  whether it's fixed (linked to the PR that closed it), an accepted
  platform limitation, or still open. Doubles as a QA artifact and this
  project's own before/after record; `README.md`'s "Known limitations"
  section now links to it.

### Fixed
- `adapters/opencode/plugin.ts`'s `compileRules` silently swallowed a
  bad-pattern compile failure with no log at all, unlike
  `bin/policy-check.js`'s equivalent catch. Now logs consistently (via the
  shared core).
- CI's path-trigger filter missed the root `.claude-plugin/marketplace.json`
  (which `validate-json` actually checks) and `scripts/local-ci/**`.

## [0.2.0] - 2026-07-03

### Added
- `obfuscation` rule category in `policy.json`: catches command substitution
  hiding a destructive keyword, `$IFS` word-splitting, `eval`, and
  base64/hex-decode piped to a shell — the specific bypass classes raised by
  four independent external audits.
- Shared adversarial test fixture (`tests/policy-cases.json`) run against
  both the Claude Code and OpenCode adapters' actual matching logic, to
  catch drift between the two independent implementations instead of
  assuming they stay in sync.
- CI workflow (`.github/workflows/ci.yml`): validates all JSON/TOML config,
  runs both adapters' policy tests, typechecks the OpenCode adapter,
  shellchecks the bash scripts.
- `LICENSE` (MIT, matching `plugin.json`'s declared license — previously
  declared but not actually present).
- `templates/gitignore.tpl`, scaffolded into new founder projects by
  `/founding-prompt` so `.env` exclusion is real, not just documented.
- `.claude-plugin/marketplace.json` at the repo root, for real marketplace
  distribution (previously only supported local-path installation).
- This file.

### Changed
- Pinned `@playwright/mcp` and `@upstash/context7-mcp` to specific versions
  instead of unpinned `npx -y package@latest`.
- Switched the `github` MCP server from `@modelcontextprotocol/server-github`
  (confirmed **deprecated** on the npm registry) to the official remote
  server (`https://api.githubcopilot.com/mcp/`) for Claude Code/OpenCode,
  and the official Docker image (`ghcr.io/github/github-mcp-server`) for
  Codex, which only confirms local/stdio MCP support.
- `bin/verify-gate.sh` now checks the `stop_hook_active` field before
  re-running tests, preventing a Stop hook loop on a persistently failing
  test suite (confirmed real via live docs and a filed upstream bug during
  external audit review).

### Fixed
- `destructive-sql-unscoped-write` regex in `policy.json` never matched a
  real `UPDATE ... SET` or `DELETE FROM` statement — only a bare table name
  followed by `;` or end of string.
- `destructive-rm-rf` regex only caught combined flags (`rm -rf`), not
  separated ones (`rm -r -f`).
- `bin/verify-gate.sh` used a hardcoded `/tmp` path for test output instead
  of `mktemp`.
- `adapters/opencode/plugin.ts` now accepts both camelCase and snake_case
  arg names from the host, and fails open (logged, not crashed) if
  `policy.json` fails to load.
- `bin/policy-check.js` now guards against a valid-but-`null` JSON payload.

## [0.1.0] - 2026-07-02

Initial scaffold: Document Engine (PRD/AGENTS/llms.txt/README/CHANGELOG
templates), Safety & Policy Engine (`policy.json` + Claude Code hook),
Agent Adapter Layer (OpenCode + Codex), all 13 skills, 5 commands, 3
bundled subagent personas, 2 bundled calibration examples, `.mcp.json`
wired to 8 verified MCP servers.
