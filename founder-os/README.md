# founder-os

An agent-agnostic plugin — installable in **Claude Code**, **OpenCode**, and
**Codex CLI** — for non-technical solo founders building products with AI
coding agents. It exists because the founder using it usually can't read the
code the agent writes, so the plugin's job is to (a) stop or pause risky
actions before they run, and (b) force "this is done" claims to be backed by
actual evidence instead of the agent's own say-so.

> **Not affiliated with any other project or product sharing a similar
> name.** "Founder OS" / "founder-os" collides with several unrelated
> things already in the wild — a SaaS onboarding-analytics product at
> `founderos.com`, and multiple unrelated GitHub repositories (including at
> least one AI-agent-orchestrator project that also happens to be called
> `founder-os`). If you found this repo by searching for one of those, this
> is not it. This naming collision is a known open issue — see
> [CHANGELOG.md](./CHANGELOG.md) — and the plugin may be renamed before a
> real 1.0 release specifically to resolve it.

## What this is (and isn't)

**In scope:**
- A lifecycle orchestrator and skill library (18 skills implementing named
  frameworks — BRIEF, HIRE, SHOW, LEGO, PLUG, PATH, SHIP, LOCK, SEB,
  3-Layer Review, 3-3-3, smell-test, plus commit-discipline,
  session-handoff, existing-project-adoption, and first-time-tool-
  orientation skills) that guides a
  founder from idea to shipped product using an AI coding agent.
- A safety/policy layer that intercepts destructive, secret-leaking, or
  cost-risky agent actions before they run, on platforms that support it.
- A document engine that generates and maintains `PRD.md`, `AGENTS.md`,
  `llms.txt`, `README.md`, `CHANGELOG.md`, `.gitignore`, and
  `founder.config.json` (the project's real test/build commands, so the
  Stop-hook verify gate works for non-npm projects too) for the founder's
  *own* project (not this repo).
- MCP server wiring for common integrations (Supabase, Stripe, Vercel,
  Sentry, PostHog, Playwright, GitHub, Context7) with safety notes per
  service.

**Out of scope — this plugin does not:**
- Write your product's code for you. It orchestrates and guards the AI
  coding agent that does; it is not itself a code generator.
- Replace a professional security audit. The safety layer is a best-effort
  mitigation against mistakes and momentum (see "Known limitations" below),
  not a guarantee against a determined attacker.
- Handle business formation, legal, accounting, or fundraising. "Founder"
  in the name refers to the target user, not the product's function.
- Guarantee identical protection across Claude Code, OpenCode, and Codex.
  Platform capabilities genuinely differ; the plugin discloses the gaps in
  each project's generated `AGENTS.md` rather than pretending they don't
  exist.

## Known limitations (read before relying on this)

- **Regex-based command interception has a real ceiling.** It recognizes
  patterns in command text; it cannot truly parse shell semantics or intent.
  A sufficiently deliberate attempt to disguise a dangerous command can get
  past it. `policy.json` includes mitigations for the most common evasion
  techniques (see its `obfuscation` rule category), verified against
  `tests/policy-cases.json` — but this is risk reduction, not a proof of
  coverage. This was independently identified by four external audits of
  this codebase; see `CHANGELOG.md` for what was fixed and what's
  structural.
- **Codex CLI has no code-level enforcement hook that founder-os uses
  today.** Its protection is `approval_policy`/`sandbox_mode` defaults
  only — a real, human-in-the-loop gate, but weaker than Claude Code/
  OpenCode's ability to automatically block a specific command. Codex CLI
  does expose its own separate `hooks` feature (confirmed stable/enabled
  via `codex features list`, with a wire vocabulary that closely mirrors
  Claude Code's own hook contract), but founder-os doesn't build against
  it yet — it's only installable through Codex's plugin/marketplace
  system, not a plain config file, and verifying it actually intercepts a
  tool call requires a real authenticated session that wasn't available
  to test against. See `FAILURE-MODES.md` #22 for the full evidence.
- **OpenCode has no "ask for confirmation" mode** — only allow or hard
  block. Rules meant to just pause for confirmation on Claude Code become
  full blocks on OpenCode. Confirmed live: both a `"block"` rule and a
  `"confirm"` rule surface identically as a thrown tool error.
- **OpenCode doesn't auto-discover founder-os's skills, subagents, or
  commands.** The safety hook works out of the box, but the skill
  library needs `skills.paths` explicitly configured (see
  `templates/opencode.jsonc.tpl`), and the 3 bundled subagents and 5
  commands currently have no working path at all — OpenCode's config
  has no path-override for those two, only fixed
  `.opencode/agent/`/`.opencode/command/` project directories. Confirmed
  live via `opencode debug skill`/`opencode agent list` and a real
  failed command invocation; see `FAILURE-MODES.md`.
- **Secret detection is narrow by design, not exhaustive.** `policy.json`
  currently recognizes one specific pattern (`sk_live_...`, a live Stripe
  secret key) — there's no generic API-key, AWS-key, or JWT pattern yet.
  Pasting a different provider's live credential into a command or file
  won't be caught. This is a real gap in current coverage, not just a
  theoretical evasion ceiling like the regex-interception point above —
  worth knowing if you're integrating a service `policy.json` doesn't
  already have a rule for.
- **Live-verified on all 3 platforms.** Loading the plugin into a real
  Claude Code session (`claude --plugin-dir founder-os/`) confirmed the
  PreToolUse hook's three decision states (allow/ask/deny), the Stop
  hook's approve/block/re-approve sequence including the anti-infinite-loop
  safeguard, and skill/agent/command discovery — and caught a real bug
  in the process (the Stop hook was emitting a decision value Claude
  Code's schema doesn't accept; see `FAILURE-MODES.md` #19). A real
  OpenCode session (`opencode run` with `adapters/opencode/plugin.ts`
  loaded) confirmed the safety hook and audit log, and surfaced the
  skill/subagent/command discovery gaps described above. Codex CLI has no
  usable credentials in this environment, so it was verified as deeply as
  that constraint allows: `codex doctor --json` and `codex sandbox`
  (both auth-free) confirmed `sandbox_mode`'s `read-only` vs
  `workspace-write` distinction genuinely blocks/allows filesystem writes
  at the OS level, and disproved `config.toml.snippet`'s claim that a
  project-scoped `.codex/config.toml` is read at all (it isn't — see
  `FAILURE-MODES.md` #29). It also surfaced a real open question — Codex
  now has its own `hooks` feature that founder-os doesn't use yet — that
  couldn't be resolved without a real authenticated session; see
  `FAILURE-MODES.md` #22.

Every generated project also gets its own copy of the platform-limitations
table in its `AGENTS.md`, in plain language, not just here.

See [FAILURE-MODES.md](./FAILURE-MODES.md) for the full, living catalog
this list is drawn from — every gap found so far in this codebase, tagged
by severity and whether it's fixed, an accepted platform limitation, or
still open.

## Installing

**Claude Code** — via a marketplace (recommended once published): add this
repo as a marketplace source, then install the `founder-os` plugin — see
`.claude-plugin/marketplace.json` at the repo root. For local development,
point your Claude Code plugin config directly at this `founder-os/`
directory.

**OpenCode** — copy `templates/opencode.jsonc.tpl` into the founder's
project root as `opencode.jsonc` (not `.json` — see the template's own
comments for why), filling in `{{FOUNDER_OS_PATH}}`. The `plugin` entry
alone only wires up the safety hook; `skills.paths` is required too, or
none of founder-os's skills will be discoverable (verified live — see
`FAILURE-MODES.md`). Note this only gets you the safety layer and the
skill library — the 3 bundled subagents and 5 commands aren't reachable
under OpenCode at all currently; see `FAILURE-MODES.md` for why.

**Codex CLI** — merge `adapters/codex/config.toml.snippet` into
`~/.codex/config.toml` (global only — Codex does not read a project-scoped
`.codex/config.toml`; verified live, see `FAILURE-MODES.md` #29). Only
sandbox policy defaults are wired up; founder-os doesn't yet build against
Codex's own separate `hooks` feature (see `FAILURE-MODES.md` #22).

## Development

```bash
npm install
npm test              # both adapters' policy tests against the shared fixture
npm run typecheck:opencode
```

See `.github/workflows/ci.yml` for what runs on every PR.

## License

[MIT](./LICENSE)
