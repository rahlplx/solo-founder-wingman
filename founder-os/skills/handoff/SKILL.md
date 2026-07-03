# Handoff Skill

Formal state transfer protocol for multi-agent collaboration or session-to-session continuity. Inspired by gstack and mattpocock.

## When to Activate

- Before ending a long session (`SessionEnd`).
- When switching between different AI agents (e.g., Architect -> Builder).
- When a task is paused and will be resumed by a different model or at a later time.

## The HANDOFF.md Format

Create or update a `HANDOFF.md` file in the project root with the following sections:

1. **Current Intent**: The high-level goal of the active task.
2. **State of Play**:
   - **Done**: What vertical slices are verified and committed?
   - **In Progress**: What file is currently being edited?
   - **Blocked**: Any open questions or technical blockers?
3. **Artifact Trail**: List of files modified in the last 10 turns.
4. **Reasoning Trace**: Why was the current approach chosen over alternatives?
5. **Next Step**: The single most important action for the next agent/session.

## Instructions for Agent

1. **Summarize Truth**: Be objective. Do not omit failures or partial implementations.
2. **Context Anchoring**: Include references to the `PRD.md` and `Plan` status.
3. **Compact & Clear**: Use the RTK pattern (Reasoning-Task-Knowledge) for the summary.

## Success Criteria

A successful handoff allows the next agent to resume work with **zero exploratory turns** (no need to run `ls` or `cat` to "figure out where we are").
