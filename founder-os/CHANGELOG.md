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

Enterprise-hardening pass, informed by a maturity audit of this codebase
plus a pattern-extraction pass over an unrelated repo (`ll-vibekit`).
Bumps at least minor per this file's own versioning policy: `evaluate()`'s
return shape gained a `ruleId` field (hook I/O contract change) and
`policy.json` rules gained an optional `keywords`-adjacent schema
(enforced, not just documented).

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
