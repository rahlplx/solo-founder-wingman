---
name: integrate-service
description: Connect a third-party service (payments, email, storage, analytics) using the PLUG framework (Pick/Look/Use AI/Guard the keys), preferring the MCP servers already configured in .mcp.json over ad hoc API wiring. Use whenever /map-architecture identifies an integration, or the founder asks to "add" a service.
---

# Integrate a Service (PLUG framework)

Every integration is a place a founder who can't read code has to trust
the agent completely — with real money, real user data, or both. PLUG
exists to make that trust checkable instead of blind.

## What to do

1. **Pick the service — check for a configured MCP server first.**
   `.mcp.json` already wires `supabase`, `stripe`, `vercel`, `sentry`,
   `posthog`, `playwright`, `github`, `context7`. Use the configured server
   directly when the need matches one of these; only reach for raw API
   keys and docs for services outside this list.

2. **Look at docs before writing any code.** Use the `context7` MCP server
   for current library/API documentation rather than relying on
   potentially stale training data — integration APIs change often.

3. **Know each server's safety posture before touching it**, from
   `references/mcp-servers.md`: Supabase defaults to `read_only=true` —
   don't remove that without a stated reason. Stripe can move real money
   and issue refunds; live-mode actions are gated by `policy.json` rules
   `prod-boundary-stripe-live-key` and `cost-stripe-live-mode-toggle` —
   expect and respect the confirmation prompt, don't route around it.
   Vercel is read-only/status-only and cannot trigger deploys.

4. **Use AI to connect it.** Give the agent the specific need plus the
   relevant docs, following PLUG's own phrasing: "Connect X to my app so I
   can Y."

5. **Guard the keys.** Secrets go in environment variables, never
   hardcoded or committed. `policy.json`'s `secrets` category (e.g.
   `secrets-git-add-env`) catches some of this automatically — state
   explicitly where the key ended up stored regardless.

6. **Confirm the connection actually works.** A real test call, not "it
   compiles." Hand off to `/verify-path` for the fuller evidence pass.

## Anti-patterns to avoid

- Disabling Supabase's `read_only=true` or pointing at production data to
  unblock a task faster.
- Treating a Stripe live-mode confirmation prompt as a bug to route
  around instead of a deliberate gate.
- Trying to use the Vercel MCP server to "deploy" — it can't.
- Pasting raw keys into chat or client-side code "just to test quickly."
