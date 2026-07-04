# User Flow: Non-Technical Solo Builder Onboarding

> **Implementation status:** step 4 of "Solo Builder onboarding" below
> originally described approving a paused action from the browser itself.
> That was scoped, designed against, and **deliberately rejected** — see
> `founder-os/DECISIONS.md` and `founder-os/companion/README.md`. The
> step below now describes what Phase 1 (`founder-os/companion/`, shipped)
> actually does: a read-only activity feed, with approvals still made in
> the terminal exactly as before. The rejected design is kept in the
> "Why not the interactive loop" note at the end of this section as a
> record of the decision, not as a future roadmap item.

## Persona

`founder-os`'s companion UI has exactly one human persona. There is no
second "technical" audience with a different access level — the UI never
needs to trade off between a plain-English view and a raw/technical one
for two different people, because there's only one.

| Persona | Who they are | What they need from the UI |
|---|---|---|
| **Non-Technical Solo Builder** (only persona) | A solo founder building a product with an AI coding agent; cannot read code | Plain-English status and PASS/FAIL evidence of what the agent is doing and what safety stepped in on, without needing to understand any of it at a code level — approvals themselves still happen in the terminal, not the UI (see "Solo Builder onboarding" below) |
| **The AI Coding Agent** | Not a human — a system actor whose proposed actions, policy decisions, and verify-gate runs need a visual, attributable, timestamped representation | To have its actions represented as things that *happened*, not just chat text |

`/hire-agent` and `/handoff` (terminal/CLI skills) remain how a Solo
Builder brings on paid help or hands off a session — that's unrelated to
this UI's persona model and isn't touched by it. See "Explicitly
unaffected" at the end of this file.

## 1. Solo Builder onboarding

1. **Connect.** Solo Builder opens the companion UI; it detects the
   running founder-os CLI/agent session over a local bridge. Empty state
   if none found: "No active session — start founder-os in your
   terminal," with a copy-paste command.
2. **Project scan (read-only).** UI requests a safe, non-mutating scan and
   shows plain-English progress ("scanning for risks, skills, and tests"),
   sourced from `policy.json` and the project's `founder.config.json`.
3. **Safety primer.** Three plain-English statements: what's blocked by
   default, what always asks first, what the verify-gate requires before
   "done" is accepted. There is no raw/technical reveal on this screen at
   all — the one persona can't read code either way, so a "show technical
   detail" toggle would have nothing useful to show them.
4. **First real intervention, seen live.** Solo Builder is working
   normally in their terminal; the agent proposes an action; a policy
   rule pauses it; they answer `ask`'s prompt in the terminal exactly as
   they would without the companion server running. Within about a
   second, a plain-English card for that same decision appears in the
   browser tab — timestamped, attributed, badge-coded. The "aha" moment
   is more modest than originally scoped: not "I approved this from my
   browser," but "I can now see, in plain English, everything my agent
   has been doing and every time safety stepped in" — a live, readable
   audit trail, not a new place decisions get made.

**Why not the interactive loop:** an earlier version of this flow had the
Solo Builder approving the paused action directly from the browser card.
That was designed against in detail and rejected: any timeout short
enough to not add a felt delay is too short for someone to notice a
browser tab and click in time (so it times out almost every time nobody's
already watching, which is the common case); any timeout long enough to
plausibly catch someone's attention adds real, felt latency to every
`ask`-triggering action whenever nobody's watching — strictly worse than
today's immediate terminal prompt. It would also turn the hook into
something that trusts a network response as an authoritative decision, a
new local trust boundary, and would need strict per-session correlation
to avoid one founder-os session's pending action being answered by the
wrong browser tab. None of that is worth building for a feature whose
expected value is already near zero once the timeout problem is
accounted for. See `founder-os/DECISIONS.md` and
`founder-os/companion/README.md`.

**Reads:** `policy.json`, the audit log (backfill), and the live
activity stream `founder-os/companion/server.js` relays from both
adapters via `companion/report-event.js`.
**Writes:** nothing — Session Overview is read-only, permanently.

## 2. AI Coding Agent (system persona)

The agent doesn't "onboard" in the human sense, but its first appearance in
the UI needs to teach the Solo Builder how to read an agent action for the
rest of the product's life:

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

## Explicitly unaffected

`founder-os/skills/hire-agent/SKILL.md` and `founder-os/skills/handoff/
SKILL.md` — both terminal/CLI skills the Solo Builder uses directly to
decide how to instruct the agent for a task, or to hand off session state
across a context boundary. Neither has anything to do with a web-UI
persona, and neither is touched by this UI being solo-only: a Solo
Builder who brings on paid help still does so through these two skills in
the terminal, just without a corresponding "Hired Collaborator" role
inside the companion UI itself.
