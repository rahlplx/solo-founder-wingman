# User Flows: Personas, Onboarding, and Hybrid Hand-offs

## Personas

| Persona | Who they are | What they need from the UI |
|---|---|---|
| **Founder** (primary) | Non-technical solo founder; cannot read code | Plain-English status, PASS/FAIL evidence, a way to say yes/no/wait to a risky action without understanding it at a code level |
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
4. **First real approval.** Founder submits a natural-language request via
   the command bar; the agent proposes an action; a policy rule pauses it;
   the UI shows a plain-English intervention card ("The agent wants to
   edit your `.env` file — Approve / Ask again later / Deny"). Approving
   for the first time is the founder's "aha" moment: safety without having
   to read a diff.

**Reads:** `policy.json`, the audit log (read-only), `founder.config.json`.
**Writes:** founder approval preferences to `founder.config.json`.

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
2. **Dev Mode toggle** (persistent, global) — flipping it swaps every
   plain-English summary in the whole UI for the underlying raw data:
   exact regex rule IDs, raw JSON audit log entries, full CLI output. This
   is the single mechanism that lets the Founder and Collaborator share
   every screen without either being underserved.
3. Any policy exception the Collaborator makes (e.g., temporarily
   permitting an action the Founder's default policy blocks) surfaces back
   to the Founder as a plain-English, undoable card: "Your collaborator
   changed a safety rule for this project — Undo."

**Reads/writes:** `policy.json`, the audit log, `AGENTS.md`, `PRD.md`
milestones.

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
