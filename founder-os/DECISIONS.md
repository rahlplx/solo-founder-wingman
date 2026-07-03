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

## DECISIONS.md is the tiebreaker

When two files in this repo (a code comment, a README claim, a skill's
instructions) disagree, this file wins. Entries here are added only after
a deliberate decision backed by evidence or an explicit tradeoff
discussion — not auto-generated, not routine.
