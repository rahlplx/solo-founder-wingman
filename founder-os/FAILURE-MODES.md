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

## 20. OpenCode never discovered any of founder-os's skills — MEDIUM — FIXED (found via live testing)

**What happened:** wiring up the OpenCode adapter via `opencode.json`'s
`plugin` array only registers the safety hook (`adapters/opencode/plugin.ts`'s
`tool.execute.before`). OpenCode's skill loader is entirely separate — it
only scans `.opencode/skills/` or an explicit `skills.paths` config entry.
With just `plugin` set, `opencode debug skill` found zero of founder-os's
16 skills; a founder using OpenCode got the safety net but none of the
BRIEF/PATH/HIRE/etc. skill library it's actually built around, with no
error or warning telling them so.

**Fix:** `templates/opencode.jsonc.tpl`, a ready-to-copy config adding
`skills.paths` pointing at founder-os's `skills/` directory alongside the
existing `plugin` entry. Verified live: with `skills.paths` set, all 16
skills appear in `opencode debug skill`. Shipped as `.jsonc` specifically
because `opencode.json` hard-rejects any unrecognized top-level key
(including a `$comment` field) — `opencode.jsonc` is OpenCode's own
supported alternate config filename that tolerates real comments,
confirmed by testing both forms directly.

---

## Accepted risks (not fixed — inherent, disclosed instead)

## 21. Regex-based command interception has a real ceiling — HIGH — ACCEPTED RISK

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

## 22. Codex CLI has no code-level enforcement hook *that founder-os uses* — HIGH — OPEN (was ACCEPTED RISK; downgraded from a settled platform ceiling after live testing found a real mechanism founder-os doesn't use yet)

**Original claim (still true for what founder-os ships today):** Codex's
protection via `config.toml.snippet` is `approval_policy`/`sandbox_mode`
only — a real, human-in-the-loop gate, but it cannot proactively and
automatically block one specific dangerous command the way Claude Code's
PreToolUse hook or OpenCode's `tool.execute.before` can.

**What live testing found, July 2026, that changes the picture:** Codex
CLI's own `codex features list` shows a `hooks` feature flag that is
`stable` and enabled (`true`) by default, distinct from an older `removed`
`plugin_hooks` flag. Binary string inspection of the installed Codex CLI
(`strings` against the vendored binary — there's no public schema doc or
`codex hooks` subcommand to read this from directly) surfaces a wire
vocabulary that closely mirrors Claude Code's own hook contract:
`PreToolUseHookSpecificOutputWire`, `PostToolUseHookSpecificOutputWire`,
`SessionStartHookSpecificOutputWire`, `SubagentStartHookSpecificOutputWire`,
`UserPromptSubmitHookSpecificOutputWire`, `PermissionRequestHookSpecificOutputWire`,
a `hook_event_name`/`stop_hook_active` pair identical in name to Claude
Code's, a `"hooks": "./hooks.json"` config reference (same filename
convention as Claude Code), user-facing strings like `Tool call blocked by
PreToolUse hook:` and `hooks need review before they can run` (a trust/
review workflow, echoed by the `--dangerously-bypass-hook-trust` CLI flag),
and a string fragment suggesting Codex can import project setup from
Claude Code. `codex plugin marketplace add` accepts a local or Git
marketplace source (not just a hosted one), meaning a locally-authored
plugin with its own `hooks.json` is plausibly installable without
publishing anywhere.

**Why this is OPEN, not fixed and not left as the old ACCEPTED RISK:**
none of this could be verified end-to-end in this environment. There's no
`codex hooks` subcommand, no published schema, and no OpenAI credentials
available here (checked: no `OPENAI_API_KEY`/`CODEX_*` env vars, no
working `codex login` path against the proxy-injected credentials used
elsewhere in this environment) to actually author a `hooks.json`, install
it as a local plugin, and confirm it really intercepts a tool call the way
`--strict-config` fuzzing of guessed `hooks.*` TOML shapes couldn't
confirm either (both a guessed `hooks.pre_tool_use=[]` and a guessed
`hooks.on_command=[]` shape were silently accepted with no schema-rejection
signal either way). Building a real Codex plugin-based hook adapter is a
new-adapter-shaped effort (its own marketplace.json, hooks.json, trust
flow), not a quick config fix — this needs a deliberate scope decision, not
a unilateral rewrite of `config.toml.snippet`'s core claim based on string
evidence alone. `config.toml.snippet`, `README.md`, and
`templates/AGENTS.md.tpl`'s per-platform table still describe today's
shipped behavior (sandbox/approval-only) accurately; this entry exists so
that behavior isn't mistaken for a permanent platform ceiling the next time
someone looks at Codex.

## 23. OpenCode has no "ask for confirmation" state — MEDIUM — ACCEPTED RISK

Only allow/block exist on this platform (confirmed directly against
current docs, and now live: a real `opencode run` against a `"confirm"`
rule and a `"block"` rule both surfaced as an identical thrown tool
error) — a rule authored as `"action":"confirm"` (meant to pause for the
founder's confirmation on Claude Code) becomes a hard block on OpenCode
instead, with no middle option available. Disclosed in `README.md` and
`templates/AGENTS.md.tpl`.

## 24. Secret detection is narrow by design — MEDIUM — ACCEPTED RISK, tracked for expansion

`policy.json` currently recognizes exactly one pattern: a live Stripe
secret key (`sk_live_...`). No generic API-key, AWS-key, or JWT pattern
exists yet — pasting a different provider's live credential into a
command or file won't be caught by this layer at all. Unlike #21/#22/#23,
this is a coverage gap that could be closed (more patterns added), not a
structural platform ceiling — tracked here rather than in `README.md`
alone so it doesn't get lost.

## 25. A `founder.config.json` `testCommand` runs with no sandboxing — LOW — ACCEPTED RISK

`verify-gate.sh` runs whatever `testCommand` a `founder.config.json`
declares via `bash -c`, same trust model as the npm-only `npm test` path
it replaces. A malicious or badly-written test command is arbitrary code
execution — but this is inherent to "run the project's test suite," not
specific to this feature; no test runner in existence sandboxes its own
test code by default.

---

## Open

## 26. GitHub-hosted Actions runners are non-functional on this repo — MEDIUM — OPEN (external, not in founder-os's control)

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

## 27. founder-os's subagents and commands are completely unreachable under OpenCode — MEDIUM — OPEN

**What was found, live:** unlike skills (fixable — see #20), OpenCode's
config schema has no path-override for external agent or command
directories at all. Agents load only from inline `agent: {...}` entries
in `opencode.json`/`opencode.jsonc` or from a fixed `.opencode/agent/`
(or `.opencode/agents/`) directory inside the project; commands work the
same way via `.opencode/command/`. `opencode agent list` shows only
OpenCode's 6 built-in agents — none of `qa-tester`, `code-critic`, or
`security-reviewer` — and a real attempt to invoke `build-feature` (one
of the 5 bundled commands) failed outright with `UnknownError`.

**Why this is OPEN, not an ACCEPTED RISK:** unlike OpenCode's missing
"ask" state (#23), which is a genuine platform ceiling, this one is
theoretically closable — founder-os could copy or symlink its agent/
command files into the founder's `.opencode/agent/` and `.opencode/command/`
at install time. That's a real installer step (touching the document
engine, not just a config template), scoped out of this pass
deliberately rather than built reactively; revisit if OpenCode support
becomes a priority.

## 28. `lint-harness.js`'s known-category allow-list is hand-curated, not derived — LOW — OPEN (deliberate trade-off, revisit if it causes friction)

The list of valid `policy.json` categories lives as a literal array
inside `bin/lint-harness.js`, not generated from the schema or current
rule set — deliberately, so a typo'd or accidental new category is
caught rather than silently accepted. The trade-off: a *legitimate* new
category requires remembering to update this list by hand, or the linter
will (correctly, but confusingly) flag every rule in it. If this causes
real friction, the fix is a documented category registry (e.g. a
`categories` array in `policy.schema.json`) rather than a literal in the
linter — not done yet since it hasn't caused a problem in practice.

## 29. `config.toml.snippet` claimed a project-scoped `.codex/config.toml` works — it doesn't — MEDIUM — FIXED (found via live testing)

**What was found, live:** `config.toml.snippet`'s own header comment said
"merge this into `~/.codex/config.toml` or a project-scoped
`.codex/config.toml`." That second option is false. Verified directly:
with a real `/tmp` project containing `.codex/config.toml`, setting
`model` to a distinguishing non-default value, then separately setting
`approval_policy`/`sandbox_mode` to values clearly different from Codex's
real defaults, `codex doctor --json`'s `config.load` and `sandbox.helpers`
checks never reflected any of it — `model` always reported `<default>`,
`approval policy` always reported `OnRequest` (Codex's actual default)
regardless of what the project file said. Codex CLI only reads
`$CODEX_HOME/config.toml` (default `~/.codex/config.toml`) plus named
global profiles (`$CODEX_HOME/<name>.config.toml`, selected via
`-p`/`--profile`) and CLI `-c` overrides — there is no per-project config
file mechanism analogous to Claude Code's `.claude/settings.json` or
OpenCode's `opencode.json`.

**Fix:** `config.toml.snippet`'s header comment corrected to state
global-only config and point founders at named profiles or `-c` overrides
for per-project differences instead of a nonexistent project file.

**Root cause:** the original claim was written by inference from other
platforms' conventions (Claude Code and OpenCode both support project-
scoped config), not verified against Codex directly — exactly the kind of
assumption this live-testing pass exists to catch.

## 30. OpenCode's patch-tool name/field is an unverified assumption — MEDIUM — OPEN (mitigated, not closed)

**What was found:** `adapters/opencode/plugin.ts`'s `extractCheckableStrings`
only intercepted a patch-shaped edit if `toolName === "apply_patch"`
reading `args.patchText` — hardcoded from inference, not confirmed live
against a real OpenCode session the way every other cross-adapter claim
in this file was (see #20, #27, #29, all found by actually running
OpenCode). Public OpenCode issues describe both an `apply_patch` tool
(Codex-model compatibility) and a separate native `patch` tool, with
model-conditional substitution between them and edit/write that isn't
fully documented. If the real tool/field differs from what's hardcoded,
a patch-based edit bypasses every policy check entirely — the exact
failure this code exists to prevent.

**Mitigation applied (not a full fix):** `extractCheckableStrings` now
checks both `apply_patch` and `patch` tool names, and falls back across
`patchText`/`patch`/`diff`/`input` field names. Per the same
keyword-invariant principle `policy.json`'s own rules rely on
(`AGENTS.md`'s "keywords only ever widen what gets checked, never
narrow it"), widening the set of names/fields checked can only reduce
the bypass risk, never introduce a new false negative — but it's still
a best guess, not a verified fact. Regression coverage:
`tests/policy-cases.json`'s `NativePatch` case exercises the `patch`
tool name with a `diff` field.

**Why this is OPEN, not FIXED:** closing this for real requires the same
live-testing pass #20/#27/#29 got — running a real OpenCode session with
a patch-capable model and observing the actual `tool.execute.before`
payload shape. Revisit and downgrade to FIXED (or correct the
name/field entirely) once that's done.
