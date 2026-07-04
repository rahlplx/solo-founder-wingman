# Software Requirements Specification: founder-os Companion UI

Scope: a web companion UI over a running founder-os CLI/agent session.
Persistent chrome across every screen: left sidebar (navigation + session
health), top header (persona switcher, Dev Mode toggle, global command
bar), and a notification center for pending approvals. No screen below may
present data that could drift from what the CLI session actually did —
this is a visualization and control layer, not a second engine.

Each screen entry: purpose, primary persona(s), layout, functional
requirements, non-functional requirements, empty/loading/error states, and
which founder-os artifact(s) it reads/writes. Anything requiring a
capability founder-os doesn't have today is marked **Dependency**.

---

## 1. Session Overview (Session Timeline) — Phase 1 shipped, `founder-os/companion/`

**Status: implemented, read-only, permanently.** The version below is the
as-shipped Phase 1 spec, revised from the original proposal after a
dedicated design pass rejected a browser-side approve/deny loop (timeout
dilemma + new trust boundary — see `founder-os/DECISIONS.md` and
`founder-os/companion/README.md`). Inline replies, an "Open in CLI"
per-card action, session hashing, and a pending-approvals panel were all
part of the original proposal below and are **not implemented** — they
implied either a control surface or a fidelity guarantee this phase
doesn't attempt. Treat the "Functional requirements" list below as
historical/aspirational except where a line is marked **[shipped]**.

**Purpose:** single window into the active CLI/agent session — a
chronological, plain-English-first feed of every proposed action and
policy decision.
**Primary personas:** Founder, Hired Collaborator, Agent (as represented
actor).

**Layout:** primary content is a vertically scrolling timeline of cards,
each timestamped and attributed. **[shipped, simplified]** Phase 1 has no
sidebar/header chrome yet (see `COMPONENT-INVENTORY.md`'s note that a
framework is deferred until a second, genuinely stateful screen exists) —
just the timeline and a connection-status indicator.

**Functional requirements:**
- **[shipped]** Stream agent actions and policy decisions in real time,
  over Server-Sent Events (`GET /events`), including plain allows — a
  wider scope than the audit log's interventions-only record.
- **[shipped]** Render each platform's actual decision vocabulary (Claude
  Code: allow/ask/deny; OpenCode: allow/block only — no ask state to
  render).
- **[shipped]** Backfill history from `bin/audit-log.js` on server
  startup, honestly labeled as interventions-only (`source:
  "audit-log-backfill"`), distinct from live events going forward.
- *Not shipped, not planned:* inline replies to redirect the agent,
  "Open in CLI" per-card deep links, actionable Allow/Ask/Deny buttons —
  all implied a control surface this phase deliberately doesn't build.

**Non-functional requirements:**
- **[shipped]** Fail-open on the UI's absence: if `founder-os/companion/`
  isn't running, or `settings.json`'s `companionEnabled` is `false` (the
  shipped default), `bin/policy-check.js`/`adapters/opencode/plugin.ts`
  behave byte-for-byte as they do without this feature existing —
  verified by a dedicated regression test
  (`tests/run-companion-tests.js`).
- *Not shipped:* session-hash/signed-timestamp tamper-evidence, and a
  distinct "stale as of [time]" degraded-mode banner — Phase 1's
  `EventSource` auto-reconnects and the status indicator shows
  connected/disconnected, but doesn't yet distinguish "reconnecting" from
  "stale."

**States:** **[shipped]** connection status pill (connecting / connected /
disconnected); empty timeline before any event arrives.

**Reads:** the audit log (backfill, via `bin/audit-log.js`'s
`readEntries()`), the live event stream both adapters report via
`companion/report-event.js`.
**Writes:** nothing. Read-only, by design, permanently — see the
"Why not the interactive loop" note in `USER-FLOWS.md`.

---

## 2. Safety Center (policy rules)

**Purpose:** translate `policy.json` into a plain-English-first view of
what's protected, with full technical detail available on demand.
**Primary personas:** Founder, Hired Collaborator.

**Layout:** a rule list (plain-English name, severity, recent match count)
with a detail panel per rule; a **persistent, non-dismissible** banner
stating the actual current limitation of regex-based interception.

**Functional requirements:**
- Founder can toggle a rule's mode (Block / Ask / Allow) or request
  Collaborator review.
- Collaborator, via Dev Mode, sees and can edit the raw regex pattern,
  `scope`, and `keywords` fields exactly as they exist in `policy.json`.
- Visually distinguish platform coverage — e.g. flag plainly when the
  active session is Codex, which has no code-level block today
  (`approval_policy`/`sandbox_mode` only).
- Display the actual current secret-detection scope truthfully: today
  that's a single Stripe live-key pattern, not generic secret detection —
  say so on this screen, don't imply broader coverage.

**Non-functional requirements:**
- Language calibration: no absolute-safety claims ("bulletproof," "100%
  secure") anywhere on this screen — founder-os's own `policy.json` header
  and four external audits already establish this ceiling exists.
- Every toggle requires founder re-confirmation and writes an immutable
  audit log entry (before/after).

**States:** empty = "no rules loaded — import recommended policy"; error =
"policy.json failed to parse — restore defaults" fallback so the project
is never left with no protection at all.

**Reads/writes:** `policy.json`.
**Dependency:** a real AST/structural check tier does not exist yet
(`founder-os/FAILURE-MODES.md`) — if this screen ever shows an "AST check"
toggle, it must be visibly labeled "planned," not offered as live.

---

## 3. Audit Log Explorer

**Purpose:** searchable, filterable record of every policy decision that
actually intervened (ask/deny/block — not plain allows, matching how
`bin/audit-log.js` already scopes what it records).
**Primary personas:** Hired Collaborator (primary), Founder (summary view).

**Layout:** filterable list (decision type, agent, time range) on the left;
selected entry expands into raw intercepted command, matched rule ID, and
any attached evidence.

**Functional requirements:**
- Export a filtered view.
- Link any entry to a `PRD.md` milestone.
- Surface the plain-English summary founder-os's own `bin/audit-summary.js`
  already generates as the default view; raw JSON only in Dev Mode.

**Non-functional requirements:** every entry shows an immutable hash and
its origin (agent ID, platform, session); this is the accountability
record the whole trust model depends on, so it must never be user-editable,
only annotatable.

**States:** empty = "no interventions yet" (a genuinely good state, framed
as such, not as missing data).

**Reads:** the audit log (`bin/audit-log.js` output) only.
**Writes:** bookmarks/annotations only, not the log itself.

---

## 4. Verify-Gate / PATH Evidence Viewer

**Purpose:** structurally enforce founder-os's central premise — a "done"
claim is meaningless without attached, mechanically-generated evidence.
**Primary personas:** Founder, Agent (claims), Hired Collaborator, Client
(read-only, via the Freelancer Loop Workspace).

**Layout:** split view — left is the agent's plain-English completion
claim; right is reserved *exclusively* for evidence: test output (ANSI
codes rendered as readable HTML), screenshots (`SEB` skill,
before/after slider), or curl/API responses.

**Functional requirements:**
- The "Accept & Commit" action is disabled until at least one evidence
  artifact is attached — this is a structural rule, not a suggestion.
- "Run tests again" re-invokes the project's actual verify command through
  the CLI (`bin/verify-gate.sh`'s underlying test command), not a
  simulated result.
- Founder or Collaborator can attach manual evidence (e.g. a screen
  recording) alongside automated evidence.

**Non-functional requirements:** every evidence artifact must be visibly
tamper-evident — a system-generated badge distinguishing "produced by the
test runner" from anything a human or the agent's chat text asserts.

**States:** empty/error = a prominent "Missing Evidence" state that
disables acceptance outright, not a soft warning.

**Reads:** `PATH` skill / verify-gate output, test runner logs, `SEB` skill
image artifacts.
**Writes:** task status → `PRD.md`; a dated entry → `CHANGELOG.md`.

---

## 5. Blueprint (PRD, AGENTS, & Milestones)

**Purpose:** the living source of truth for requirements, milestones, and
risk — kept in sync with the actual `PRD.md`/`AGENTS.md`/`CHANGELOG.md`
files the document engine already generates.
**Primary personas:** Founder, Hired Collaborator; Client in read-only
milestone view.

**Layout:** rich-text block editor over `PRD.md`, serialized back to
strict Markdown; a milestone progress bar; tabs for `PRD.md` / `AGENTS.md`
/ `CHANGELOG.md`; a risk-matrix panel.

**Functional requirements:**
- Founder edits in rich text; changes serialize to Markdown identical to
  what `templates/PRD.md.tpl` produces, so the file stays agent-readable.
- Agent-proposed edits (e.g., marking a milestone complete) appear as an
  inline suggestion requiring explicit founder approval — never a silent
  write.

**Non-functional requirements:** the UI must poll the filesystem to detect
external changes (the agent editing `PRD.md` directly via the CLI) and
never let its rendered view silently diverge from the file on disk.

**States:** empty = "no PRD yet" → launches the `BRIEF`/founding-prompt
skill wizard.

**Reads/writes:** `PRD.md`, `AGENTS.md`, `CHANGELOG.md`, `llms.txt`.

---

## 6. Skills Library

**Purpose:** discover, run, and review the 16 skills and MCP integrations.
**Primary personas:** Founder.

**Layout:** grid of skill cards (BRIEF, HIRE, SHOW, LEGO, PLUG, PATH, SHIP,
LOCK, SEB, etc.); selecting one opens a step-by-step run wizard.

**Functional requirements:**
- Surface MCP connection status (Supabase, Stripe, Vercel, Sentry,
  PostHog, Playwright, GitHub, Context7) with a clear connected/
  disconnected indicator.
- Running a skill from the UI maps form inputs to the same prompt/skill
  invocation the CLI would use — it does not reimplement skill logic in
  the UI layer.

**Non-functional requirements:** long-running skill runs show persistent
progress, never a silent hang.

**States:** empty = "no skills detected — run founder-os discover."

**Reads:** skill output, `.mcp.json`/`opencode.jsonc`/Codex MCP config.
**Writes:** run metadata → audit log.

---

## 7. Freelancer Loop Workspace (Package → Share → Feedback)

**Purpose:** close the gap identified in `audit/issues/FEATURE-001.md` —
packaging a verified deliverable for client review and turning feedback
back into backlog work.
**Primary personas:** Founder, Client; Hired Collaborator (visibility).

**Layout (Founder view):** Kanban board — Draft / Sent for Review /
Feedback Received / Approved.
**Layout (Client view):** a stripped single-deliverable page: the artifact,
its attached verify-gate evidence, and a comment/annotation tool. No
sidebar, no other project data reachable from this view.

**Functional requirements:**
- Generate a scoped, expiring, passwordless share link.
- Convert client annotations into structured `PRD.md` tasks automatically
  (title, description, priority, linked evidence).
- On client approval, correlate the approval with the underlying
  verify-gate evidence to produce a "Proof of Work" record.

**Non-functional requirements:** the client-facing view must never expose
policy internals, raw audit log entries, or any other project's data —
its whole design goal is zero technical or platform exposure.

**States:** expired link → polite "ask the founder for a new link" page,
no error jargon.

**Reads:** `PRD.md`, verify-gate evidence.
**Writes:** structured feedback tasks; a Proof of Work record.
**Dependency:** there is no verified-work-log/invoicing export in
founder-os today — this screen's "generate an invoice-ready bundle" action
requires that backend capability to exist first. Until then, this screen
can package evidence + approval into a plain export file, but should not
claim to produce invoicing-system-ready output.

---

## 8. Command Palette / Quick Actions

**Purpose:** a single global entry point for natural-language requests
(Founder) and direct CLI-equivalent commands (Collaborator).
**Primary personas:** Hired Collaborator (direct commands), Founder
(natural language, limited scope).

**Functional requirements:** maps a founder's natural-language request to
a pre-authorized skill run where possible, and surfaces any policy rule
likely to trigger *before* submission, not after.

**Non-functional requirements:** keyboard-first; full functionality without
a mouse.

**Reads:** triggers CLI commands via the same interface the CLI itself
uses; does not bypass the policy engine.

---

## Cross-cutting non-functional requirements

- **Accessibility:** WCAG AA contrast on all status badges (Allow/Ask/
  Deny/Blocked color coding needs a non-color-only indicator too — icon or
  label, not color alone).
- **Trust/provenance:** every screen that shows "what happened" carries a
  timestamp and session/agent attribution; nothing is presented as fact
  without a traceable origin.
- **Platform parity honesty:** any screen whose behavior differs by
  platform (Claude Code vs. OpenCode vs. Codex) must show which platform
  is active and what that means for this specific screen — never a
  one-size-fits-all claim.
