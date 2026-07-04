# User Flows: Personas, Onboarding, and Hybrid Hand-offs

> **Implementation status:** step 4 of "Founder onboarding" below
> originally described approving a paused action from the browser itself.
> That was scoped, designed against, and **deliberately rejected** — see
> `founder-os/DECISIONS.md` and `founder-os/companion/README.md`. The
> step below now describes what Phase 1 (`founder-os/companion/`, shipped)
> actually does: a read-only activity feed, with approvals still made in
> the terminal exactly as before. The rejected design is kept in the
> "Why not the interactive loop" note at the end of this section as a
> record of the decision, not as a future roadmap item.

## Personas

| Persona | Who they are | What they need from the UI |
|---|---|---|
| **Founder** (primary) | Non-technical solo founder; cannot read code | Plain-English status and PASS/FAIL evidence of what the agent is doing and what safety stepped in on, without needing to understand any of it at a code level — approvals themselves still happen in the terminal, not the UI (see "Founder onboarding" below) |
| **Hired Collaborator** | Freelance developer/technical partner brought on via the `/hire-agent` skill | Raw diffs, full audit log detail, policy rule internals — everything the plain-English view intentionally hides from the Founder |
| **The AI Coding Agent** | Not a human — a system actor whose proposed actions, policy decisions, and verify-gate runs need a visual, attributable, timestamped representation | To have its actions represented as things that *happened*, not just chat text |
| **Client / Stakeholder** | External party receiving a packaged deliverable and giving feedback (the Freelancer Loop) | Zero-friction, zero-onboarding access scoped to exactly one deliverable |

Every flow below explicitly marks where personas **branch** (diverge into
persona-specific detail) and **reconverge** (a hand-off point where one
persona's action becomes another's task).

## 1. Founder onboarding

1. **Connect.** Founder opens the companion UI; it detects the running
   founder-os CLI/agent session over a local bridge. Empty state if none
   found: "No active session — start founder-os in your terminal," with a
   copy-paste command.
2. **Project scan (read-only).** UI requests a safe, non-mutating scan and
   shows plain-English progress ("scanning for risks, skills, and tests"),
   sourced from `policy.json` and the project's `founder.config.json`.
3. **Safety primer.** Three plain-English statements: what's blocked by
   default, what always asks first, what the verify-gate requires before
   "done" is accepted. Each has a one-line "Why?" and a "Show technical
   detail" reveal (→ branches toward the Hired Collaborator view, but stays
   reversible with a single "Back to plain-English").
4. **First real intervention, seen live.** Founder is working normally in
   their terminal; the agent proposes an action; a policy rule pauses it;
   the founder answers `ask`'s prompt in the terminal exactly as they
   would without the companion server running. Within about a second, a
   plain-English card for that same decision appears in the browser tab —
   timestamped, attributed, badge-coded. The "aha" moment is more modest
   than originally scoped: not "I approved this from my browser," but "I
   can now see, in plain English, everything my agent has been doing and
   every time safety stepped in" — a live, readable audit trail, not a
   new place decisions get made.

**Why not the interactive loop:** an earlier version of this flow had the
founder approving the paused action directly from the browser card. That
was designed against in detail and rejected: any timeout short enough to
not add a felt delay is too short for a founder to notice a browser tab
and click in time (so it times out almost every time nobody's already
watching, which is the common case); any timeout long enough to plausibly
catch someone's attention adds real, felt latency to every `ask`-triggering
action whenever nobody's watching — strictly worse than today's immediate
terminal prompt. It would also turn the hook into something that trusts a
network response as an authoritative decision, a new local trust boundary,
and would need strict per-session correlation to avoid one founder-os
session's pending action being answered by the wrong browser tab. None of
that is worth building for a feature whose expected value is already near
zero once the timeout problem is accounted for. See `founder-os/DECISIONS.md`
and `founder-os/companion/README.md`.

**Reads:** `policy.json`, the audit log (backfill), and the live
activity stream `founder-os/companion/server.js` relays from both
adapters via `companion/report-event.js`.
**Writes:** nothing — Session Overview is read-only, permanently.

## 2. AI Coding Agent (system persona)

The agent doesn't "onboard" in the human sense, but its first appearance in
the UI needs to teach the founder how to read an agent action for the rest
of the product's life:

1. UI detects the agent's presence and which platform it's running on
   (Claude Code / OpenCode / Codex), immediately surfacing that platform's
   real capability — e.g., a visible "Codex: sandbox-approval only, no
   in-flight block" badge, not a false promise of parity.
2. First completed task triggers the verify-gate (`PATH` skill); the UI
   renders this as a card carrying actual evidence (test output, a
   screenshot from the `SEB` skill flow) — never a bare "done" claim
   without an attached artifact.

**Reads:** the live CLI/agent session stream, `PATH` skill output.
**Writes:** nothing directly — the agent still only acts through the CLI;
the UI only visualizes what already happened.

## 3. Hired Collaborator onboarding

1. Invited via a scoped link (created by the Founder from the `/hire-agent`
   flow). Authenticates into the same project's companion UI, landing on
   a "Developer Handoff" view aggregating `AGENTS.md`, `llms.txt`, and the
   raw diff of any unmerged changes.
2. **Dev Mode toggle** (scoped to the Collaborator's own authenticated
   session, not a global setting) — flipping it swaps plain-English
   summaries for the underlying raw data (exact regex rule IDs, raw JSON
   audit log entries, full CLI output) *in the Collaborator's own view
   only*. A global toggle would leak raw diffs, audit entries, and CLI
   output into the Founder's and Client's views too, defeating the whole
   point of having separate plain-English and technical surfaces — this
   has to be a per-session/per-role state, not a shared one.
3. Any policy exception the Collaborator makes (e.g., temporarily
   permitting an action the Founder's default policy blocks) surfaces back
   to the Founder as a plain-English, undoable card: "Your collaborator
   changed a safety rule for this project — Undo."

**Reads:** the audit log, `AGENTS.md`, `llms.txt` — `AGENTS.md` is
canonical repo guidance surfaced for handoff context, not session state
the UI can mutate.
**Writes:** `policy.json` (scoped exceptions), `PRD.md` milestones.

## 4. Client / Stakeholder onboarding

1. Receives a passwordless, scoped share link (see `SRS.md`'s Freelancer
   Loop Workspace) — no account, no platform onboarding.
2. Lands directly on a stripped, distraction-free "Client Review" view:
   the specific deliverable, its attached verify-gate evidence, and an
   annotation/comment tool. No sidebar, no other project data.
3. Approving a milestone or leaving feedback is the reconvergence point:
   approval generates a "Proof of Work" record (verify-gate evidence +
   approval, timestamped) the Founder can use for invoicing; feedback
   becomes a structured, prioritized task that lands in the Founder's and
   Collaborator's views (in their respective plain-English/technical
   forms) and can be assigned back to the agent.

**Reads:** `PRD.md` (milestone selection), verify-gate evidence.
**Writes:** structured feedback tasks (dependency — see `SRS.md`'s
Freelancer Loop Workspace for what this needs that doesn't exist yet).

## Hybrid hand-off example (all four personas in one loop)

1. Client rejects a milestone via an annotation → becomes a high-priority
   task in `PRD.md`.
2. Founder assigns it to the agent.
3. Agent's attempted fix trips a policy rule (e.g., an env-var edit) →
   Founder sees an Ask card, but lacks context to safely decide.
4. Founder flags the Hired Collaborator, who opens Dev Mode, inspects the
   raw rule and command, adjusts `policy.json` with a scoped exception, and
   tells the agent to proceed.
5. Agent completes the fix, the verify-gate runs, evidence attaches.
6. Founder re-packages the milestone and re-shares with the Client.

This loop is the actual argument for building a UI at all: without one,
steps 3–4 require the Founder to either read a regex rule themselves or
context-switch entirely into a terminal handoff with the Collaborator.
