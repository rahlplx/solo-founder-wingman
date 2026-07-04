# Architecture: Companion UI over an Authoritative CLI Session

The single hardest constraint on this whole proposal: **the CLI/agent
session is the real engine; the companion UI is a window onto it.** Every
diagram below exists to answer one question — how does a browser tab stay
honest about a terminal session it doesn't control?

## System context

```mermaid
flowchart LR
    subgraph CLI["Founder's machine"]
        Agent["AI Coding Agent\n(Claude Code / OpenCode / Codex)"]
        Hooks["founder-os hooks\n(PreToolUse / PostToolUse / Stop)"]
        Policy["policy.json + core/policy-engine.js"]
        Artifacts["PRD.md, AGENTS.md, CHANGELOG.md,\naudit log, verify-gate output"]
        Bridge["Local companion bridge\n(WebSocket + read-only file watch)"]
    end

    subgraph Web["Companion UI (browser)"]
        UI["Session Overview / Safety Center /\nVerify-Gate Viewer / Blueprint / etc."]
    end

    Agent -->|proposes action| Hooks
    Hooks -->|evaluates via| Policy
    Policy -->|allow/ask/deny/block| Hooks
    Hooks -->|writes decision| Artifacts
    Artifacts -->|tail / file-watch| Bridge
    Bridge -->|stream events, session hash| UI
    UI -->|approve/deny/edit policy| Bridge
    Bridge -->|relays decision back to| Hooks
```

Key property this diagram is meant to enforce: **the bridge only ever
relays and streams — it never becomes an independent source of truth.**
Any UI action (approve, deny, edit a policy rule) is sent back through the
bridge to the same hook/policy machinery the CLI already uses, so there is
exactly one place a decision is actually enforced.

## Decision/approval data flow (a single intervention, end to end)

```mermaid
sequenceDiagram
    participant Agent as AI Agent
    participant Hook as PreToolUse hook (bin/policy-check.js)
    participant Bridge as Companion bridge
    participant UI as Session Overview (UI)
    participant Founder

    Agent->>Hook: proposes Bash/Edit/Write/MultiEdit action
    Hook->>Hook: match against policy.json (core/policy-engine.js)
    Hook-->>Bridge: stream decision-pending event (rule id, matched string)
    Bridge-->>UI: render Ask card (plain-English reason)
    UI-->>Founder: "Agent wants to edit .env — Approve / Ask again / Deny"
    Founder->>UI: Approve
    UI->>Bridge: approval response
    Bridge->>Hook: relay approval
    Hook->>Agent: allow
    Hook-->>Bridge: append decision to audit log
    Bridge-->>UI: update timeline card with outcome
```

If the bridge is unreachable at any point in this sequence, the hook still
behaves exactly as it does today with no UI attached — the founder falls
back to answering the prompt in the terminal itself. The UI is additive,
never a required link in the safety chain.

## Session-authority / offline handling

```mermaid
stateDiagram-v2
    [*] --> Connected
    Connected --> Degraded: bridge loses connection to CLI session
    Degraded --> Connected: reconnect succeeds
    Degraded --> Stale: no reconnect within timeout

    state Connected {
        [*] --> Live
        Live: full read/write, live timeline
    }
    state Degraded {
        [*] --> ReadOnlyCached
        ReadOnlyCached: inputs locked, last-known timeline shown,\nbanner: "reconnecting..."
    }
    state Stale {
        [*] --> ReadOnlyStale
        ReadOnlyStale: inputs locked, banner shows exact\ntimestamp of last sync, no silent staleness
    }
```

## Component-tier architecture (maps to `COMPONENT-INVENTORY.md`)

```mermaid
flowchart TB
    subgraph Organisms
        SessionTimeline
        SafetyRuleDetail
        VerifyGatePanel
        PRDMilestoneEditor
        AuditExplorer
        CommandPalette
    end
    subgraph Molecules
        TimelineCard
        RuleCard
        EvidenceRow
        ApprovalDialog
        InlineDiffExplain
    end
    subgraph Atoms
        DecisionBadge
        EvidenceThumbnail
        TimestampHashRow
        SmallCTA
    end

    Organisms --> Molecules --> Atoms
```

## Per-screen artifact dependency map

This is the same reads/writes information as `SRS.md`, laid out as a
single map so a build-order discussion can see all the file-level
coupling at once:

```mermaid
flowchart LR
    PolicyJSON["policy.json"]
    AuditLog["audit log\n(bin/audit-log.js)"]
    PRD["PRD.md"]
    Agents["AGENTS.md"]
    Changelog["CHANGELOG.md"]
    Verify["verify-gate / PATH output"]
    MCP["MCP config\n(.mcp.json / opencode.jsonc / codex config.toml)"]

    SafetyCenter --> PolicyJSON
    SessionOverview --> PolicyJSON
    SessionOverview --> AuditLog
    AuditLogExplorer --> AuditLog
    VerifyGateViewer --> Verify
    VerifyGateViewer --> PRD
    VerifyGateViewer --> Changelog
    Blueprint --> PRD
    Blueprint --> Agents
    Blueprint --> Changelog
    SkillsLibrary --> MCP
```

## Explicit non-goals of this architecture

- **Not a second policy engine.** The UI never evaluates a rule itself;
  it only renders decisions `core/policy-engine.js` already made and
  relays human responses back to it.
- **Not a replacement for the CLI.** Every screen that shows an action
  provides an "Open in CLI" escape hatch; nothing in this UI should ever
  be the *only* way to do something founder-os already supports from the
  terminal.
- **Not a multi-tenant SaaS backend (yet).** This architecture describes a
  single Solo Builder's local project bridged to a browser tab — not a
  hosted, multi-project account system, and not a shared/multi-founder
  session. That would be a separate, later proposal.
