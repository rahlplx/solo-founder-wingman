# Failure Modes

A living, adversarial catalog of ways this harness can fail — what
actually happens, why, and whether it's fixed, an accepted trade-off, or
still open. Borrows the format of `ll-vibekit`'s `CRITIQUE.md` (numbered,
severity-tagged, persona-driven), adapted to this project: seeded from two
audits run against this codebase (a maturity audit of founder-os itself,
and a cross-reference against `ll-vibekit`'s own known gaps), then kept
current as new ones are found. Doubles as a QA artifact and as this
project's own before/after record — don't let entries go stale; when a fix
lands, update its status and link the PR instead of deleting the entry.

## Status legend

- **FIXED** — closed, with the PR/commit that closed it. Kept as a record,
  not deleted, so a regression is checkable against the original failure
  mode.
- **ACCEPTED RISK** — a real, permanent limitation (usually a platform
  constraint or an inherent property of pattern-matching) that isn't going
  away. Disclosed here and in the founder-facing docs (`README.md`,
  `templates/AGENTS.md.tpl`) rather than pretended away.
- **OPEN** — a known gap with no fix landed yet.

## Severity

**CRITICAL** — breaks the safety net entirely, or halts the founder's
session with no clear cause. **HIGH** — a real security/correctness gap
under realistic conditions. **MEDIUM** — degrades silently rather than
failing loudly, or narrows coverage in a way a founder could reasonably
not notice. **LOW** — process/tooling hygiene; doesn't affect a live
session directly.

---

## 1. A typo'd `policy.json` rule matches every string, silently — CRITICAL — FIXED (1a)

**As a founder editing `policy.json` by hand:** a typo in a rule's
`pattern` field (e.g. a field renamed to `patttern`, leaving `pattern`
undefined) compiles via `new RegExp(undefined)` to `/(?:)/` — a regex that
matches every string, including the empty string. Combined with
`"action":"block"`, this denies every single tool call with no error
message pointing at the actual cause; the agent just appears completely
stuck.

**Root cause:** nothing validated a rule's shape before compiling its
pattern.

**Fix:** `bin/validate-policy-schema.js` — full schema validation plus a
universal-match-sentinel check (compiles each rule's pattern and tests it
against sentinel strings no legitimate rule should ever match), run at
load time in both adapters and as a CI/local-ci step
(`validate:policy-schema`).

## 2. A bad rule pattern fails silently in the OpenCode adapter — HIGH — FIXED (1b)

**As a founder relying on OpenCode's protection:** `plugin.ts`'s
`compileRules` caught a pattern-compile failure with a bare `catch {
continue; }` — no log, anywhere. A broken rule just silently stopped
protecting anything, with no signal that it had.

**Root cause:** inconsistent error handling between the two independently
maintained adapters (`bin/policy-check.js` already logged this case).

**Fix:** now logs consistently via the shared `core/policy-engine.js`
(landed alongside 2a's extraction).

## 3. An unexpected bash error crashes a hook with no JSON output — CRITICAL — FIXED (1c)

**As a founder whose environment is missing `node` or `mktemp`:**
`verify-gate.sh`/`doc-sync.sh` ran under `set -euo pipefail` with no
top-level trap. Any unexpected failure aborted mid-script with no output
at all — undefined behavior for a Claude Code Stop hook, and the opposite
of the "fail open, log loudly" contract the JS/TS layer already followed.

**Root cause:** the bash hooks never had a fail-safe path; only the JS
layer did.

**Fix:** a top-level `trap ... ERR` in both scripts guarantees a valid,
loudly-logged `{"decision":"allow"}` on any unexpected error. Covered by
`tests/run-hook-tests.js`, including a case that removes `node` from
`PATH` entirely to force the trap.

## 4. Root `marketplace.json` changes didn't trigger CI — LOW — FIXED (1d)

**What happened:** `.github/workflows/ci.yml`'s `paths:` filter listed
`founder-os/**` but not the root `.claude-plugin/marketplace.json`, even
though the `validate-json` job actually checks that file. A change to it
alone would merge without CI ever running.

**Fix:** filter corrected to include it.

## 5. Version strings could drift across 3 independently-maintained files — MEDIUM — FIXED (1d)

**What happened:** `founder-os/package.json`, `founder-os/.claude-
plugin/plugin.json`, and root `.claude-plugin/marketplace.json` each
declare the plugin's version, kept in sync only by discipline. Nothing
would catch one being bumped without the others.

**Fix:** `bin/check-version-sync.js`, run in CI/local-ci and as
`npm run check:version-sync`.

## 6. A catastrophic-backtracking pattern in a `scope:"any"` rule could hang a hook call — MEDIUM/HIGH — FIXED (1d)

**As an adversarial or just unlucky input:** `scope:"any"` rules run
against arbitrary, potentially large file content (an `Edit`/`Write`
call's body), unlike `scope:"bash"` rules, which only ever see one command
line. A future rule with a nested-quantifier pattern (verified against a
real catastrophic-backtracking example, `/^(a+)+$/`, whose match time
already exceeds this guard's 250ms budget on a string of a few dozen
`a`s and grows exponentially from there) could hang a real hook call on a
large pasted file.

**Fix:** `tests/run-redos-guard-tests.js` benchmarks every current
`scope:"any"` rule against large (200,000-char) synthetic strings with a
250ms time budget, in CI/local-ci — a future pathological pattern fails
the build instead of hanging a session.

## 7. `settings.json`'s tuning knobs were declared but did nothing — MEDIUM — FIXED (1d)

**What happened:** `policyStrictness`, `explainBeforeAct`,
`verifyGateOnDone`, and `docSyncOnCommit` were documented fields nobody
actually read — editing `settings.json` had zero effect, a silent
no-op that looks like working configuration.

**Fix:** all 4 wired into the relevant scripts/adapters; covered by
`tests/run-settings-tests.js` and `tests/run-hook-tests.js`.

## 8. Two independently hand-maintained copies of the matching logic — HIGH — FIXED (2a)

**What happened:** `bin/policy-check.js` (Claude Code) and
`adapters/opencode/plugin.ts` (OpenCode) each reimplemented rule
compilation and matching from scratch. Every fix or rule-shape change had
to be applied twice by hand, with nothing catching the two drifting apart
— and a 3rd/4th platform adapter would have meant a third full
reimplementation.

**Fix:** `founder-os/core/policy-engine.js` — a shared, pure,
platform-agnostic matching core. Verified zero behavior drift (129 shared
test cases, identical pass/fail before and after, across both adapters).
Deliberately kept the platform-specific *decision vocabulary*
(Claude Code's allow/ask/deny vs. OpenCode's allow/block) out of the
shared core — `matchRule()` returns the matched rule, not a decision, so
the two platforms' genuinely different semantics stay adapter-owned.

## 9. No durable record of what the safety layer actually did — MEDIUM — FIXED (2b)

**As a founder who can't read code:** every intervention (a blocked or
confirm-gated tool call) only ever produced an ephemeral stderr line
scoped to that single hook invocation. There was no way to answer "what
has this thing actually stopped me from doing?" after the fact.

**Fix:** `bin/audit-log.js` appends a JSON-line per real intervention
(never a plain allow, to avoid noise) to a local, gitignored log;
`bin/audit-summary.js` and the `/audit-summary` skill turn it into a
plain-English answer.

## 10. Nothing checked JS files for syntax errors outside their own tests — LOW/MEDIUM — FIXED (2c)

**What actually happened, twice, in this codebase:** an apostrophe left
unescaped inside a single-quoted string in `scripts/bench-schema-
validators.js`, and a `--days 0` falsy-coercion bug in `bin/audit-
summary.js` — both real bugs, both would have shipped silently in any file
not directly exercised by a targeted test.

**Fix:** `bin/check-js-syntax.js` runs `node --check` across every `.js`
file in the repo, wired into CI/local-ci.

## 11. No dependency vulnerability scanning, no secret scan of the repo itself — LOW — FIXED (2c)

**Fix:** `npm run audit:deps` (`npm audit`, no new dependency) and
`bin/scan-secrets.js` (dogfoods `policy.json`'s own secret/prod-boundary
rules against every tracked file's content), both wired into CI/local-ci.

## 12. `scan-secrets.js` flagged its own explanatory comment — LOW — FIXED (2c, same PR)

**What happened:** the new secret scanner's own docstring spelled out the
literal fake example key (`sk_live_51ABCDEFGHIJ`) it was describing to
explain the exclusion list — which the rule it dogfoods then matched
against the file itself. A true false positive, caught by actually running
the new check end-to-end in local-ci rather than trusting the ad hoc
manual verification done while writing it.

**Fix:** reworded to explain without embedding a literal matching string.

## 13. The local-ci sandbox itself couldn't run `git` commands inside the container — MEDIUM — FIXED (2c, same PR)

**What happened:** `scripts/local-ci/run.sh` built its isolated checkout
via `git worktree add`, but a linked worktree's `.git` is just a text
pointer back to the host's `.git/worktrees/...` by absolute path —
invalid once copied into the Docker build context. This went unnoticed
until `bin/scan-secrets.js` (2c) became the first local-ci step to
actually shell out to `git` from inside the container.

**Fix:** switched to `git clone --local` (still cheap — hardlinked
objects, same filesystem — but self-contained).

## 14. CI and local-ci's job lists were hand-duplicated with nothing catching drift — LOW — FIXED (2c)

**What actually happened:** `test:audit-log` was added to `.github/
workflows/ci.yml` and `package.json`'s `test` chain in 2b, but briefly
missing from `scripts/local-ci/entrypoint.sh`'s own hardcoded step list —
caught only by noticing its absence in a local-ci run's actual output.

**Fix:** `scripts/local-ci/jobs.json` is now the single shared source of
truth; `entrypoint.sh` reads it directly, and `tests/run-ci-drift-
tests.js` asserts `ci.yml`'s steps still match it exactly, in order.

## 15. `verify-gate.sh` only understood npm projects — MEDIUM — FIXED (3a)

**As a founder building in Python, Go, or Rust:** the Stop-hook verify
gate checked specifically for `package.json`'s `scripts.test` — a project
using anything else silently got an unconditional allow with no test run
at all. Not a crash, not a warning — indistinguishable from "nothing to
verify yet."

**Fix:** `templates/founder.config.json.tpl`, scaffolded by
`/founding-prompt`; `verify-gate.sh` reads a real `testCommand` from it
when present, falling back to the original npm detection otherwise.

## 16. No structural checks on skills/agents/commands/policy categories — LOW — FIXED (3b)

**What happened:** a copy-paste mistake in a skill's frontmatter (wrong
`name:`, a missing required section) or a typo'd `policy.json` rule
category would only ever be caught by a human noticing, if at all.

**Fix:** `bin/lint-harness.js`, wired into CI/local-ci.

## 17. Nothing gated a rushed `PRD.md` before architecture got mapped on top of it — MEDIUM — FIXED (3c)

**As a founder who rushes through `/founding-prompt`:** a `PRD.md` with
leftover `{{PLACEHOLDER}}` tokens, or a "Behavior rules" section left as
vague feature prose instead of an actual `WHEN`/`THEN` statement, could
get handed straight to `/map-architecture` — building real architecture
decisions on top of an incomplete spec.

**Fix:** `bin/lint-prd.js`, run by `/founding-prompt` right after
generating `PRD.md` and again by `/map-architecture` as a prerequisite
check (since the file can be hand-edited between the two).

## 18. Subagent reports had no consistent, parseable shape — LOW — FIXED (3d)

**What happened:** `qa-tester`, `code-critic`, and `security-reviewer`
each had their own report format (PASS/FAIL, Red/Yellow/Green, LOCK
grid) with no shared summary a calling skill could reliably key off of
when consolidating results from more than one.

**Fix:** every report now leads with a standardized `VERDICT`/
`FINDINGS`/`RECOMMENDATION`/`CONFIDENCE` block, enforced structurally by
`bin/lint-harness.js`.

## 19. `verify-gate.sh`'s Stop hook emitted a schema-invalid "allow" decision — HIGH — FIXED (post-3e, found via live testing)

**What happened:** every "allow the stop" path in `verify-gate.sh` emitted
`{"decision":"allow"}`. Claude Code's actual Stop hook schema only accepts
`"decision": "approve" | "block"` — `"allow"` isn't a valid value for
this field at all (that vocabulary — `allow`/`deny`/`ask` — belongs to
`PreToolUse`'s `hookSpecificOutput.permissionDecision`, a different field
on a different hook event). This was previously unnoticed because the
whole test suite validated the hook's own stdout against what the *code*
expected, not against the real host's schema — the exact risk
`README.md`'s "not yet installed and exercised inside a live session"
caveat was flagging, now closed.

**How it was actually found:** loading the plugin into a real, isolated
Claude Code session via `claude -p --plugin-dir founder-os/` and
inspecting `--include-hook-events` output directly. Every "allow" path
produced a live, visible error from Claude Code's own validator:

```text
Hook JSON output validation failed — (root): Invalid input
The hook's output was: {"decision": "allow"}
Expected schema: ... "decision": "approve" | "block" (optional) ...
```

Claude Code fails open on the invalid JSON (the turn still ended), so
this never actually blocked a founder — but it surfaced a "Stop hook
error" notification on every single passing turn, exactly the kind of
visible, trust-eroding noise this safety layer exists to prevent.

**Fix:** all 5 "allow" emissions changed to `{"decision":"approve"}`.
Re-verified live (no validation error, no notification) on both the
passing-tests path and, separately, the failing-tests → `block` →
`stop_hook_active` re-approve sequence, confirming the anti-infinite-loop
protection (finding-mode #7's cousin) actually works end-to-end: a
deliberately-broken test blocked the stop once, the agent investigated
and correctly declined to force the test green just to pass the gate,
and the second Stop attempt approved without re-running tests.

---

## Accepted risks (not fixed — inherent, disclosed instead)

## 20. Regex-based command interception has a real ceiling — HIGH — ACCEPTED RISK

**As a determined adversary, not a careless founder:** detection works by
recognizing patterns in command *text*; it cannot parse shell semantics or
infer intent. A sufficiently deliberate attempt to disguise a dangerous
command (novel obfuscation not yet covered by the `obfuscation` rule
category) can get past it. Independently flagged by four external audits
of this codebase.

**Mitigation, not a fix:** `policy.json`'s `obfuscation` category covers
the common evasion shapes found so far (command substitution, `$IFS`
word-splitting, `eval`, base64/hex-decode piped to a shell), verified
against `tests/policy-cases.json` — but this is risk reduction, not a
coverage proof. Disclosed explicitly in `README.md` and every generated
project's `AGENTS.md`.

## 21. Codex CLI has no code-level enforcement hook — HIGH — ACCEPTED RISK

Codex's protection is `approval_policy`/`sandbox_mode` only — a real,
human-in-the-loop gate, but it cannot proactively and automatically block
one specific dangerous command the way Claude Code's PreToolUse hook or
OpenCode's `tool.execute.before` can. Disclosed in `README.md` and
`templates/AGENTS.md.tpl`'s per-platform table.

## 22. OpenCode has no "ask for confirmation" state — MEDIUM — ACCEPTED RISK

Only allow/block exist on this platform (confirmed directly against
current docs) — a rule authored as `"action":"confirm"` (meant to pause
for the founder's confirmation on Claude Code) becomes a hard block on
OpenCode instead, with no middle option available. Disclosed in
`README.md` and `templates/AGENTS.md.tpl`.

## 23. Secret detection is narrow by design — MEDIUM — ACCEPTED RISK, tracked for expansion

`policy.json` currently recognizes exactly one pattern: a live Stripe
secret key (`sk_live_...`). No generic API-key, AWS-key, or JWT pattern
exists yet — pasting a different provider's live credential into a
command or file won't be caught by this layer at all. Unlike #20/#21/#22,
this is a coverage gap that could be closed (more patterns added), not a
structural platform ceiling — tracked here rather than in `README.md`
alone so it doesn't get lost.

## 24. A `founder.config.json` `testCommand` runs with no sandboxing — LOW — ACCEPTED RISK

`verify-gate.sh` runs whatever `testCommand` a `founder.config.json`
declares via `bash -c`, same trust model as the npm-only `npm test` path
it replaces. A malicious or badly-written test command is arbitrary code
execution — but this is inherent to "run the project's test suite," not
specific to this feature; no test runner in existence sandboxes its own
test code by default.

---

## Open

## 25. GitHub-hosted Actions runners are non-functional on this repo — MEDIUM — OPEN (external, not in founder-os's control)

Every workflow run since early in this project's history completes in
~4 seconds with job logs 404ing — the runner never actually allocates,
consistent with a billing issue on the repository owner's account, not a
defect in `ci.yml` itself. Worked around via `scripts/local-ci/`, a
Docker-based sandbox that replicates the same 3 jobs in isolation and is
the actual merge gate for every PR in this project. Resolving this
requires action on the GitHub account, outside this codebase's scope —
tracked here so it isn't mistaken for "CI is broken" when the real state
is "CI's real host is unavailable, and a working substitute is used
instead."

## 26. `lint-harness.js`'s known-category allow-list is hand-curated, not derived — LOW — OPEN (deliberate trade-off, revisit if it causes friction)

The list of valid `policy.json` categories lives as a literal array
inside `bin/lint-harness.js`, not generated from the schema or current
rule set — deliberately, so a typo'd or accidental new category is
caught rather than silently accepted. The trade-off: a *legitimate* new
category requires remembering to update this list by hand, or the linter
will (correctly, but confusingly) flag every rule in it. If this causes
real friction, the fix is a documented category registry (e.g. a
`categories` array in `policy.schema.json`) rather than a literal in the
linter — not done yet since it hasn't caused a problem in practice.
