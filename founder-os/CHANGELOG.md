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
