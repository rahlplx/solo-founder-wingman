# Manage Context Skill

Prevent "context rot" and optimize token usage in long-running founder projects. Based on Context Engineering principles for high-fidelity state preservation.

## When to Activate

- When context utilization exceeds 70% of the window limit.
- Before a major `/compact` operation (to ensure signal preservation).
- When the agent starts "forgetting" which files were modified or why decisions were made.
- For high-complexity tasks involving multiple files and sub-systems.

## Core Principles

1. **Tokens-Per-Task vs Tokens-Per-Request**: Optimize for the total cost of completing the task, not the cost of a single turn. Saving tokens by deleting critical info causes expensive re-fetching later.
2. **Artifact Trail Integrity**: Always preserve the exact status of files (Created, Modified, Read).
3. **Observation Masking**: Replace verbose tool outputs (like long build logs or linter noise) with compact summaries once the "Knowledge" has been extracted.

## Instructions for Agent

1. **Anchored Summarization**: Before compacting, update the `PRD.md` or a dedicated `CONTEXT.md` with:
   - **Intent**: What are we currently trying to achieve?
   - **Decisions**: What architectural or product trade-offs were made?
   - **Artifacts**: Which files were touched and what are their current roles?
   - **Next Steps**: What is the immediate priority?
2. **Scoping**: Only load the context needed for the current sub-task. Use `/clear` or `/compact` to drop exploratory "noise" once a decision is reached.
3. **Evidence Extraction**: When running a tool that produces long output (e.g., `npm test`), extract the *Pass/Fail* count and *Specific Errors* immediately, then mask the rest of the log.

## Success Metrics

- Zero "re-fetch" events (agent asking to re-read a file it already processed).
- Context utilization remains below 80% during implementation.
- Decision rationale is preserved across session boundaries.
