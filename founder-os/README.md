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
- A lifecycle orchestrator and skill library (13 skills implementing named
  frameworks — BRIEF, HIRE, SHOW, LEGO, PLUG, PATH, SHIP, LOCK, SEB,
  3-Layer Review, 3-3-3, smell-test) that guides a founder from idea to
  shipped product using an AI coding agent.
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
- **Codex CLI has no code-level enforcement hook at all.** Its protection
  is `approval_policy`/`sandbox_mode` defaults only — a real,
  human-in-the-loop gate, but weaker than Claude Code/OpenCode's ability to
  automatically block a specific command.
- **OpenCode has no "ask for confirmation" mode** — only allow or hard
  block. Rules meant to just pause for confirmation on Claude Code become
  full blocks on OpenCode.
- **Secret detection is narrow by design, not exhaustive.** `policy.json`
  currently recognizes one specific pattern (`sk_live_...`, a live Stripe
  secret key) — there's no generic API-key, AWS-key, or JWT pattern yet.
  Pasting a different provider's live credential into a command or file
  won't be caught. This is a real gap in current coverage, not just a
  theoretical evasion ceiling like the regex-interception point above —
  worth knowing if you're integrating a service `policy.json` doesn't
  already have a rule for.
- **This plugin has not yet been installed and exercised inside a live
  Claude Code, OpenCode, or Codex session.** Everything has been tested
  against the actual matching/adapter logic directly (`npm test`) and
  against live platform documentation where a specific contract could be
  checked, but end-to-end installation is still unverified.

Every generated project also gets its own copy of the platform-limitations
table in its `AGENTS.md`, in plain language, not just here.

See [FAILURE-MODES.md](./FAILURE-MODES.md) for the full, living catalog
this list is drawn from — every gap found so far in this codebase, tagged
by severity and whether it's fixed, an accepted platform limitation, or
still open.

## Installing

Via a marketplace (recommended once published): add this repo as a
marketplace source, then install the `founder-os` plugin — see
`.claude-plugin/marketplace.json` at the repo root.

For local development: point your Claude Code/OpenCode/Codex plugin config
directly at this `founder-os/` directory.

## Development

```bash
npm install
npm test              # both adapters' policy tests against the shared fixture
npm run typecheck:opencode
```

See `.github/workflows/ci.yml` for what runs on every PR.

## License

[MIT](./LICENSE)
