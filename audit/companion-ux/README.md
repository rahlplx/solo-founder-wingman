# Companion UX Proposal: an Enterprise-Grade Web Layer over founder-os

**Status: proposal, not built.** founder-os is CLI/plugin-only today (v0.3.3
— see `founder-os/README.md`); nothing described in this directory exists
in code yet. This is design research to evaluate before any implementation
work starts, kept here for the same reason `OKF_AUDIT.md` and
`FINAL_REPORT.md` are: a point-in-time proposal, not a description of
current state (see the repo-root `AGENTS.md`'s note on how to read
`audit/`).

## Where this came from

Produced from two independent AI research passes against a prompt that
gave the model founder-os's actual architecture, personas, known
limitations, and stated roadmap gaps (`FAILURE-MODES.md`,
`DECISIONS.md`, `audit/issues/FEATURE-001.md`, `audit/issues/SAFETY-001.md`)
as ground truth, then asked for a full companion-UI spec: personas,
onboarding, sitemap, naming, components, and AI-native interaction
principles. The two passes were consolidated into the files below,
de-duplicated, and corrected in two ways:

1. **Citations stripped.** One of the two research passes cited sources
   like `cloudrepo-io/founder-os`, `naluforge`'s "Founder OS" docs,
   `Sherman95/ai-founder-os`, `design-prism`'s "Founder OS", a Hubify
   template, and a LobeHub skill listing as if they were authoritative
   sources on *this* project's architecture. They are not — they're
   unrelated third-party products/repos that happen to share the
   "founder-os" name, which is exactly the naming collision this repo's
   own `AGENTS.md` already warns about. Nothing in those citations
   describes this codebase; none of their specific claims were carried
   into these documents without independent verification against this
   repo's actual files.
2. **Gaps marked as gaps, not features.** Anywhere the research assumed a
   capability founder-os doesn't have yet (AST-based policy checks,
   generic secret detection beyond one Stripe-key pattern, a
   verified-work-log/invoicing export), it's labeled a **dependency**
   below, not described as buildable today.

## How to read this directory

| File | Answers |
|---|---|
| [`USER-FLOWS.md`](./USER-FLOWS.md) | Who are the users, and what does each one's onboarding and hand-off to the others look like? |
| [`SRS.md`](./SRS.md) | For every screen: purpose, functional/non-functional requirements, states, and which founder-os artifact it reads or writes. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | How does a web UI sit over an authoritative CLI/agent session without the two drifting apart? |
| [`NAMING-GLOSSARY.md`](./NAMING-GLOSSARY.md) | What do we call things, and why would a non-technical founder already recognize the name? |
| [`COMPONENT-INVENTORY.md`](./COMPONENT-INVENTORY.md) | What's the actual design-system component list needed to build the screens in `SRS.md`? |

## Non-negotiable constraints (apply across every file in this directory)

- **The CLI/agent session is authoritative.** The companion UI is a
  visualization and control-surface layer over a running founder-os
  session — never a second source of truth. If the CLI session is
  unreachable, every screen degrades to a read-only, clearly-labeled-stale
  view rather than inventing or caching a divergent state.
- **Plain-English first, technical detail on demand, always.** Every
  founder-facing surface needs a technical escape hatch for the Hired
  Collaborator persona (see `USER-FLOWS.md`) — never force a trade-off
  between the two.
- **No screen invents data.** Every field in `SRS.md` maps to a founder-os
  artifact that already exists or could exist without a new backend
  capability; where it can't, that's called out as a dependency.
- **Disclose gaps, don't paper over them.** Regex-only policy matching,
  uneven protection across Claude Code/OpenCode/Codex, and narrow secret
  detection are real, current, documented limitations
  (`founder-os/FAILURE-MODES.md`) — the UI's job is to make them visible,
  not hide them behind confident-sounding copy.
- **Don't worsen the naming collision.** No new screen, component, or
  product name should incorporate "Founder OS" as a distinct brand — see
  `NAMING-GLOSSARY.md`'s closing note.

## Suggested build order, if this moves forward

Both research passes converged independently on the same five
highest-leverage screens to prototype first (detailed in `SRS.md`):

1. Session Overview (Session Timeline)
2. Verify-Gate / PATH Evidence Viewer
3. Safety Center (policy rules, plain-English first)
4. Freelancer Loop Workspace (package → share → client feedback)
5. Audit Log Explorer

This order front-loads the two things founder-os's own docs already say
matter most: safety and evidence-backed "done" claims, before the
Freelancer Loop expansion.
