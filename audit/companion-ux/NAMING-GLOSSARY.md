# Naming Glossary

Principle: borrow naming patterns from software a non-technical founder has
already used, so the mental model transfers for free. Prioritize
recognizability over originality — and never incorporate "Founder OS" as a
distinct brand on any new surface, given the existing naming collision
documented in the repo-root `AGENTS.md`.

| Concept | Name used in these docs | Borrowed pattern from | Why it transfers |
|---|---|---|---|
| The main activity feed | **Session Timeline** | GitHub Actions / Vercel deployment history | "A running list of recent runs with statuses" is an already-learned pattern. |
| Policy rules dashboard | **Safety Center** | Security dashboards (e.g. Snyk-style rule lists) | Reads immediately as "the security rules for this project," not "a regex config editor." |
| Immutable decision history | **Audit Log** / Audit Trail | Stripe, AWS CloudTrail, PagerDuty | Implies financial/security-grade, append-only, attributable logging. |
| Evidence-gated completion screen | **Verify-Gate** / Evidence Viewer | CI artifact pages (GitHub Actions, Vercel build logs) | "Tests ran, here's the output" is a pattern already learned from any CI experience, even secondhand. |
| Requirements + milestones doc | **Blueprint** (PRD/AGENTS/CHANGELOG view) | Notion pages + Linear milestones | Document-plus-tracker mental model, not a raw text file. |
| Skill/integration marketplace | **Skills Library** | Plugin marketplaces (Vercel/Netlify integrations) | "Browse and enable capabilities" pattern. |
| Global command entry point | **Command Palette** / Command Bar | Linear, Raycast, VS Code | Cmd/Ctrl+K to do anything is now a nearly universal SaaS pattern. |
| Safety/interception concept generally | **Guardrails** | Widely used across the AI industry (OpenAI, Anthropic usage) | More approachable than "policy engine" or "regex ruleset" without hiding what it does. |
| Approve/deny/pause action | **Ask / Allow / Deny / Blocked** | Mirrors founder-os's own existing Claude Code decision vocabulary exactly | No new vocabulary to invent — the UI's language should match `bin/policy-check.js`'s actual decision states, including OpenCode's narrower allow/block-only set where that's the active platform. |

## Naming rules going forward

1. Never name a new screen, component, or product surface "Founder OS
   [anything]" — use the generic, borrowed-pattern names above instead
   (e.g. "Safety Center," not "Founder OS Guardrails").
2. Match existing founder-os vocabulary before inventing new terms — e.g.
   use "verify-gate" and "PATH" as this repo's skills already do, rather
   than a new synonym.
3. Prefer a name that's honest about capability over one that oversells
   it — e.g. "Guardrails" is fine; "Autopilot Safety" or "Guaranteed
   Protection" would misrepresent the documented regex-based ceiling.
