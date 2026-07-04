# Decisions

Locked engineering decisions for founder-os, with the evidence behind them.
When something here conflicts with anything else (a comment, a README
line, an assumption in a PR description), this file wins — update this
file first, then bring everything else in line with it.

---

## Policy schema validation: hand-rolled, not ajv

**Decision:** `policy.json`'s shape is validated by a hand-rolled, zero-dependency
validator (`bin/validate-policy-schema.js`), not the ajv-based JSON Schema
validator that was built alongside it for comparison
(`bin/validate-policy-schema.ajv.js`).

**Why this needed a real decision, not a default:** the project's existing
philosophy is explicitly zero-extra-dependency (`policy.json`'s own header
comment: "parsed with jq or any language's built-in JSON support, no extra
dependencies"), but a JSON-Schema-plus-validator-library is the more
conventional way to close the actual bug this exists to fix — a malformed
rule (e.g. a typo'd `pattern` field) used to compile to `new
RegExp(undefined)` → `/(?:)/`, silently matching every string, with
`action: "block"` that means denying every single tool call and nothing
catching it. Rather than assume either default, both were built and
benchmarked against the same adversarial fixture
(`tests/schema-validation-cases.json`, 20 cases) via
`scripts/bench-schema-validators.js`.

**Evidence (run on this repo, `founder-os/policy.json`, 20 real rules):**

| | Correctness | Cold-start (median) | Warm per-call | Footprint |
|---|---|---|---|---|
| Hand-rolled | 20/20 | 3.66ms | 20.8us | 0 KB |
| ajv | 20/20 | 74.85ms | 32.1us | ~2.5MB+ |

Both validators are equally correct against the adversarial fixture —
neither misses the bug class this exists to catch. The deciding factor is
cost: `bin/policy-check.js` is invoked as a **fresh process on every single
Claude Code hook call**, so cold-start time is the dominant real-world
cost, and ajv's ~75ms median there would add a noticeable, avoidable delay
to every tool call a founder's agent makes. ajv is also slower warm (used
by `adapters/opencode/plugin.ts`'s long-lived process), and adds real
`node_modules` weight for a check that a ~150-line hand-rolled module does
just as correctly.

**What happens to the ajv version:** kept in the repo
(`bin/validate-policy-schema.ajv.js`), not deleted — it's the reference
implementation this comparison is reproducible against, and `ajv` stays a
devDependency so `scripts/bench-schema-validators.js` keeps working. It is
not required by, or reachable from, the actual hook code paths
(`bin/policy-check.js`, `adapters/opencode/plugin.ts`) — a devDependency
here never ships to an end founder's project either way, since this
`package.json` is dev tooling for founder-os itself, not something
installed downstream.

**Re-run the comparison:** `node scripts/bench-schema-validators.js`

---

## Companion server transport: Server-Sent Events over plain `http`, not WebSocket/`ws`

**Decision:** `companion/server.js`'s live activity stream to the browser
(the Session Overview screen) uses Server-Sent Events over Node's built-in
`http` module, not a WebSocket library.

**Why this needed a real decision, not a default:** WebSocket is the more
familiar default for "stream events to a browser," and a real-time
bidirectional companion UI is easy to picture eventually needing
bidirectional messaging. But founder-os ships **zero runtime
dependencies**, on purpose: `package.json`'s `devDependencies` (`ajv`,
`tsx`, `typescript`, `@types/node`) are dev tooling for founder-os's own
CI only, never installed on a founder's machine — the plugin is
distributed as the raw, git-tracked `founder-os/` directory
(`marketplace.json`'s `"source": "./founder-os"`), and nothing runs `npm
install` inside an installed plugin. A `ws` dependency on the hook code
path (`bin/policy-check.js` → `companion/`) would be this plugin's first
real runtime dependency, with no existing mechanism to deliver it. That's
not a minor tradeoff to accept casually; it's currently broken by
construction.

Phase 1's actual requirement (`audit/companion-ux/` Session Overview) is
unidirectional — server pushes activity to the browser, nothing flows
back. Server-Sent Events over plain `http` covers that completely,
`EventSource` gives auto-reconnect for free, and it needs zero new
dependencies. Implementing WebSocket's framing by hand was also considered
and rejected outright — that's exactly the kind of protocol-level code this
project shouldn't be hand-rolling.

**What would change this decision:** a later phase that's genuinely
bidirectional (not the browser-side approve/deny loop — see
`audit/companion-ux/USER-FLOWS.md` for why that was rejected on its own
merits, independent of transport) would need to revisit this, and should
re-derive the dependency-delivery problem above rather than reach for
`ws` by default.

---

## Skill frontmatter: no per-skill `category` or `version` fields

**Decision:** `skills/*/SKILL.md` frontmatter stays at exactly two fields
(`name`, `description`). No `category` or `version` field is added, even
though both appear in real, community-verified Claude Code plugins
surveyed for comparison.

**Why this needed a real decision, not a default:** a reverse-engineering
pass across 3 real plugin repos (Anthropic's own official marketplace,
`davepoon/buildwithclaude`, and `shopwareLabs/ai-coding-tools`) found both
fields in active use elsewhere, so simply copying what's "out there"
would have added them by default.

**`category` — rejected.** Anthropic's own pattern puts category at the
*marketplace* level (`marketplace.json`'s per-plugin `category` field),
and founder-os already has one there (`"category": "safety"`).
`davepoon/buildwithclaude`'s per-file `category` field exists because
their "plugins" are multi-domain bundles (e.g. one plugin grouping a
business analyst, a legal advisor, a payment-integration agent, and a
quant analyst) that need internal sub-categorization to stay navigable.
founder-os's skills (17 as of this writing) are one domain (solo-founder
lifecycle) inside one plugin that's already correctly categorized once,
at the level that actually needs it. Adding a second, redundant categorization layer here
would recreate the exact "inconsistent metadata across a catalog"
anti-pattern found in Anthropic's own official catalog (many entries
missing `category`/`version` entirely) — self-inflicted, for no
navigability founder-os doesn't already have.

**`version` — rejected.** Anthropic's own official plugins (`code-review`,
`feature-dev`) don't consistently carry a `version` field either — their
own inconsistency here is one of the anti-patterns the survey flagged,
not a model to replicate. founder-os already has one authoritative
version (`.claude-plugin/plugin.json`'s `version`, kept in sync with
`package.json` and the repo-root `marketplace.json` — see
`bin/check-version-sync.js`), plus `CHANGELOG.md` and this file tracking
behavioral history at a finer grain than a bare per-skill semver would
add. 16 independent per-skill versions that must either move in lockstep
with the plugin version or drift independently is new surface area with
no concrete problem behind it today.

**What would change this decision:** if founder-os's skill set later
fragments into genuinely distinct domains (not just more skills within
the existing solo-founder lifecycle), a per-skill `category` might earn
its place — revisit then, against a real navigability problem, not
speculatively.

---

## DECISIONS.md is the tiebreaker

When two files in this repo (a code comment, a README claim, a skill's
instructions) disagree, this file wins. Entries here are added only after
a deliberate decision backed by evidence or an explicit tradeoff
discussion — not auto-generated, not routine.
