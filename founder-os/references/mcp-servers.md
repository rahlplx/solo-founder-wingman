# MCP server notes

Connection details and safety notes for `.mcp.json`, verified July 2026.
Update this file if a vendor changes their MCP offering — these move fast.

| Service | Auth | Notes |
|---|---|---|
| **Supabase** | OAuth (browser flow) | Defaults to `read_only=true` in the URL — do not remove this without a specific reason. Vendor docs say not to connect to production. Add `&project_ref=<id>` to scope to one project. |
| **Stripe** | OAuth (interactive) or restricted API key as Bearer token | Can issue refunds and edit subscriptions — real money. Must be enabled per-mode (sandbox/live) in the Stripe Dashboard first. `policy.json` rule `prod-boundary-stripe-live-key` and `cost-stripe-live-mode-toggle` always gate this. |
| **Vercel** | OAuth, client allowlist + consent screen | **Read-only** (public beta) — cannot trigger deploys or change project settings. Use for status/monitoring only; deploys still happen via `git push` → Vercel autodeploy. |
| **Sentry** | OAuth via existing Sentry org login | Use the remote server (`mcp.sentry.dev/mcp`), not the old local `sentry-mcp-stdio` npx package — vendor has deprecated/superseded it. |
| **PostHog** | Login via PostHog auth server (auto-routes US/EU) | Some tools bill as "PostHog AI spend," gated behind an org-level setting — check before enabling broadly. |
| **Playwright** | None — local browser automation, not a SaaS API | Explicitly documented as "not a security boundary." Use `--isolated` if running concurrent sessions. Powers `/debug-seb`. Pinned to `@playwright/mcp@0.0.77`. |
| **GitHub** | OAuth (Claude Code/OpenCode, via remote server) or PAT (Codex, via Docker) | `@modelcontextprotocol/server-github` is **deprecated on the npm registry** ("Package no longer supported" — confirmed via `npm view`, not assumed). Claude Code/OpenCode use the official remote server (`https://api.githubcopilot.com/mcp/`), matching the other vendor-hosted services above. Codex has no confirmed remote-MCP support, so it uses the official Docker image (`ghcr.io/github/github-mcp-server`) instead — this means Codex users need Docker installed, a real added dependency the other two platforms don't have. |
| **Context7** | None required for public docs | Live library/framework documentation lookup — used to keep the agent's knowledge of fast-moving libraries current. Pinned to `@upstash/context7-mcp@3.2.2`. |

## Codex CLI caveat

Local/stdio MCP servers (Playwright, GitHub, Context7) are confirmed to work
in Codex's `config.toml` `[mcp_servers.*]` format — see
`adapters/codex/config.toml.snippet`. Remote/OAuth server support in Codex
was not confirmed at research time; verify current docs before adding
Supabase/Stripe/Vercel/Sentry/PostHog to a Codex config.
